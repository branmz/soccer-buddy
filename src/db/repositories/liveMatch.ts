// Live-match writes: kickoff, the clock, and events. Every write is checked by `src/domain`
// against the state stored in SQLite, so the screen can't record something replay would skip.

import { and, eq, inArray } from 'drizzle-orm';

import { db } from '@/db/client';
import { matches, matchPeriods, players, type Match, type MatchEvent } from '@/db/schema';
import { clockTransition, getClockState, type ClockAction } from '@/domain/clock';
import { deriveLineup } from '@/domain/lineup';
import {
  fitToFormation,
  liveLayoutFrom,
  parseLiveLayout,
  type LiveFormation,
} from '@/domain/liveLayout';
import { buildLiveEvents, eventStamp, type LiveAction } from '@/domain/matchEvents';
import { kickoffLineup, lineupPlayerIds } from '@/domain/matchSetup';
import type { FormationSlot } from '@/domain/types';

import { NotFoundError, unwrap, ValidationError } from './errors';
import { eventsQuery, recordEventGroup, undoLastEventGroup } from './events';
import {
  getMatch,
  liveMatchQuery,
  matchLineup,
  matchLiveLayout,
  matchPeriodsQuery,
} from './matches';

const MS_PER_MINUTE = 60_000;

function requireMatch(id: number): Match {
  const match = getMatch(id);
  if (!match) throw new NotFoundError('Match', id);
  return match;
}

function requireLive(id: number): Match {
  const match = requireMatch(id);
  if (match.status !== 'live') throw new ValidationError("This match isn't live");
  return match;
}

/**
 * Starts the match: one transaction snapshots the lineup (dropping players deactivated since
 * setup), sets it live and starts period 1. Only one match can be live at a time.
 */
export function kickoff(matchId: number, now = Date.now()): Match {
  const match = requireMatch(matchId);
  if (match.status !== 'setup') throw new ValidationError('This match has already kicked off');
  const live = liveMatchQuery().get();
  if (live) throw new ValidationError(`Finish the match against ${live.opponentName} first`);

  const draft = matchLineup(match);
  if (!draft) throw new ValidationError('Pick a formation and lineup first');
  const ids = lineupPlayerIds(draft);
  const active = db
    .select({ id: players.id })
    .from(players)
    .where(
      and(eq(players.teamId, match.teamId), eq(players.isActive, true), inArray(players.id, ids)),
    )
    .all();
  const lineup = unwrap(kickoffLineup(draft, new Set(active.map((p) => p.id))));

  return db.transaction((tx) => {
    tx.insert(matchPeriods).values({ matchId, periodNumber: 1, startedAt: now }).run();
    return tx
      .update(matches)
      .set({ status: 'live', startedAt: now, startingLineupJson: JSON.stringify(lineup) })
      .where(eq(matches.id, matchId))
      .returning()
      .get();
  });
}

/** Pause, resume, end a period, start the next, or finish: one write per action. */
export function applyClockAction(matchId: number, action: ClockAction, now = Date.now()): void {
  const match = requireLive(matchId);
  const periods = matchPeriodsQuery(matchId).all();
  const change = unwrap(clockTransition(periods, action, now, match.periodCount));

  db.transaction((tx) => {
    if (change.update) {
      tx.update(matchPeriods)
        .set(change.update.patch)
        .where(
          and(
            eq(matchPeriods.matchId, matchId),
            eq(matchPeriods.periodNumber, change.update.periodNumber),
          ),
        )
        .run();
    }
    if (change.insert)
      tx.insert(matchPeriods)
        .values({ matchId, ...change.insert })
        .run();
    if (change.finishMatch) {
      tx.update(matches)
        .set({ status: 'finished', endedAt: now })
        .where(eq(matches.id, matchId))
        .run();
    }
  });
}

/**
 * Records what the coach did (goal, card, subs, …) as one event group, stamped with the clock
 * now. Throws a ValidationError (with a message for the coach) if it isn't allowed.
 */
export function recordLiveAction(
  matchId: number,
  action: LiveAction,
  now = Date.now(),
): MatchEvent[] {
  const match = requireLive(matchId);
  const starting = matchLineup(match);
  if (!starting) throw new ValidationError('This match has no lineup');
  const lineup = deriveLineup(starting, eventsQuery(matchId).all());
  const clock = getClockState(
    matchPeriodsQuery(matchId).all(),
    match.periodLengthMinutes * MS_PER_MINUTE,
    now,
  );
  const stamp = unwrap(eventStamp(clock));
  if (action.kind === 'lateArrival') {
    const player = db
      .select({ id: players.id })
      .from(players)
      .where(
        and(
          eq(players.id, action.playerId),
          eq(players.teamId, match.teamId),
          eq(players.isActive, true),
        ),
      )
      .get();
    if (!player) throw new ValidationError("That player isn't on this team's active roster");
  }
  const drafts = unwrap(buildLiveEvents(action, lineup, match.maxSubs));
  return recordEventGroup(
    matchId,
    drafts.map((d) => ({ ...d, ...stamp })),
  );
}

/** Undoes the most recent event group (a goal with its assist, a quick-sub preset, …). */
export function undoLastAction(matchId: number): MatchEvent[] {
  requireLive(matchId);
  return undoLastEventGroup(matchId);
}

function currentFormation(match: Match): LiveFormation {
  const layout = matchLiveLayout(match);
  return { name: layout?.name ?? null, formationId: layout?.formationId ?? null };
}

/**
 * Saves the formation's shape mid-match (spots moved or relabelled). Players stay in their
 * spots; the starting lineup snapshot is never changed. `formation` is the formation switched
 * to; left out, the current one is kept.
 */
export function setLiveLayout(
  matchId: number,
  slots: readonly FormationSlot[],
  formation?: LiveFormation,
): Match {
  const match = requireLive(matchId);
  const starting = matchLineup(match);
  if (!starting) throw new ValidationError('This match has no lineup');
  const shape = unwrap(
    liveLayoutFrom(
      slots,
      starting.slots.map((s) => s.slotId),
    ),
  );
  const layout = unwrap(
    parseLiveLayout({
      slots: shape,
      ...(formation ?? currentFormation(match)),
    }),
  );
  return db
    .update(matches)
    .set({ liveLayoutJson: JSON.stringify(layout) })
    .where(eq(matches.id, matchId))
    .returning()
    .get();
}

/**
 * Switches to another formation mid-match: each spot (with its player) takes the best
 * matching spot in the new shape. Players aren't moved by events, so history stays valid.
 */
export function switchLiveFormation(
  matchId: number,
  formation: { name: string; formationId: number | null; slots: readonly FormationSlot[] },
): Match {
  const match = requireLive(matchId);
  const starting = matchLineup(match);
  if (!starting) throw new ValidationError('This match has no lineup');
  const current = matchLiveLayout(match)?.slots ?? starting.slots;
  // Spots with nobody in them (empty or a red-card hole) pick last.
  const lineup = deriveLineup(starting, eventsQuery(matchId).all());
  const empty = new Set(lineup.slots.filter((s) => s.playerId === undefined).map((s) => s.slotId));
  const fitted = unwrap(fitToFormation(current, formation.slots, empty));
  return setLiveLayout(matchId, fitted, {
    name: formation.name,
    formationId: formation.formationId,
  });
}
