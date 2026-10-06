import { and, asc, desc, eq, sql } from 'drizzle-orm';

import { PRESET_FORMATIONS } from '@/constants/presetFormations';
import { db } from '@/db/client';
import { matches, matchPeriods, type Match } from '@/db/schema';
import { parseStartingLineup } from '@/domain/formations';
import { parseLiveLayout, type LiveLayout } from '@/domain/liveLayout';
import {
  DEFAULT_MATCH_SETTINGS,
  lineupFromFormation,
  lineupPlayerIds,
  setSquad,
} from '@/domain/matchSetup';
import type { FormationSlot, MatchStatus, StartingLineup } from '@/domain/types';
import { cleanName, validateMatchSettings } from '@/domain/validation';

import { NotFoundError, unwrap, ValidationError } from './errors';
import { formationsQuery, getFormation } from './formations';
import { playersQuery } from './players';
import { getTeam } from './teams';

export type MatchSetupInput = {
  opponentName: string;
  formationId?: number | null;
  formationName?: string | null;
  /** Defaults to a home game. */
  isHome?: boolean;
  periodCount: number;
  periodLengthMinutes: number;
  /** null = unlimited. */
  maxSubs: number | null;
};

function cleanSetup(input: MatchSetupInput) {
  const settings = unwrap(validateMatchSettings(input));
  return {
    opponentName: unwrap(cleanName(input.opponentName, 'Opponent')),
    formationId: input.formationId ?? null,
    formationName: input.formationName ?? null,
    isHome: input.isHome ?? true,
    ...settings,
    gameLengthMinutes: settings.periodCount * settings.periodLengthMinutes,
  };
}

/** A team's matches, newest first, optionally filtered by status. */
export function matchesQuery(teamId: number, status?: MatchStatus) {
  const filter =
    status === undefined
      ? eq(matches.teamId, teamId)
      : and(eq(matches.teamId, teamId), eq(matches.status, status));
  return db
    .select()
    .from(matches)
    .where(filter)
    .orderBy(desc(sql`coalesce(${matches.startedAt}, ${matches.createdAt})`), desc(matches.id));
}

/** The match currently being played, if any. Only one match is live at a time. */
export function liveMatchQuery() {
  return db.select().from(matches).where(eq(matches.status, 'live')).limit(1);
}

/** A match's periods in order (clock timestamps). */
export function matchPeriodsQuery(matchId: number) {
  return db
    .select()
    .from(matchPeriods)
    .where(eq(matchPeriods.matchId, matchId))
    .orderBy(asc(matchPeriods.periodNumber));
}

export function getMatch(id: number): Match | undefined {
  return db.select().from(matches).where(eq(matches.id, id)).get();
}

/** The formation's shape after mid-match edits or a switch (null: the starting shape). */
export function matchLiveLayout(match: Match): LiveLayout | null {
  if (match.liveLayoutJson === null) return null;
  return unwrap(parseLiveLayout(match.liveLayoutJson));
}

/** The match's lineup: the draft before kickoff, the snapshot after. */
export function matchLineup(match: Match): StartingLineup | null {
  if (match.startingLineupJson === null) return null;
  return unwrap(parseStartingLineup(match.startingLineupJson));
}

/** The team's most recent match, to copy its settings into a new one. */
export function latestMatch(teamId: number): Match | undefined {
  return matchesQuery(teamId).limit(1).get();
}

/** Creates a match in setup, optionally with its draft lineup. */
export function createMatch(
  teamId: number,
  input: MatchSetupInput,
  lineup?: StartingLineup,
): Match {
  return db
    .insert(matches)
    .values({
      teamId,
      ...cleanSetup(input),
      startingLineupJson: lineup ? JSON.stringify(unwrap(parseStartingLineup(lineup))) : null,
    })
    .returning()
    .get();
}

/**
 * A new match in setup, ready to edit: settings and formation copied from the team's last
 * match (or defaults for its field size), venue home, every active player in the squad.
 */
export function createMatchDraft(teamId: number, opponentName: string): Match {
  const team = getTeam(teamId);
  if (!team) throw new NotFoundError('Team', teamId);
  const previous = latestMatch(teamId);
  const settings = previous ?? DEFAULT_MATCH_SETTINGS[team.fieldSize];
  const previousFormation = previous?.formationId ? getFormation(previous.formationId) : undefined;
  const firstSaved = formationsQuery(teamId, team.fieldSize).get();
  const formation =
    previousFormation?.fieldSize === team.fieldSize
      ? previousFormation
      : firstSaved && getFormation(firstSaved.id);
  const preset = PRESET_FORMATIONS[team.fieldSize][0];
  const squad = playersQuery(teamId, { activeOnly: true })
    .all()
    .map((p) => p.id);

  return createMatch(
    teamId,
    {
      opponentName,
      formationId: formation?.id ?? null,
      formationName: formation?.name ?? preset.name,
      periodCount: settings.periodCount,
      periodLengthMinutes: settings.periodLengthMinutes,
      maxSubs: settings.maxSubs,
    },
    lineupFromFormation(formation?.layout.slots ?? preset.slots, null, squad),
  );
}

function setupMatch(id: number): Match {
  const existing = getMatch(id);
  if (!existing) throw new NotFoundError('Match', id);
  if (existing.status !== 'setup') {
    throw new ValidationError('Match settings can only be changed before kickoff');
  }
  return existing;
}

/** Setup details can only change before kickoff. Fields left out keep their values. */
export function updateMatchSetup(id: number, patch: Partial<MatchSetupInput>): Match {
  const existing = setupMatch(id);
  const updated = db
    .update(matches)
    .set(cleanSetup({ ...existing, ...patch }))
    .where(eq(matches.id, id))
    .returning()
    .get();
  return updated ?? existing;
}

/** Saves the draft lineup (and with it, who's here) before kickoff. */
export function setMatchLineup(id: number, lineup: StartingLineup): Match {
  const existing = setupMatch(id);
  const updated = db
    .update(matches)
    .set({ startingLineupJson: JSON.stringify(unwrap(parseStartingLineup(lineup))) })
    .where(eq(matches.id, id))
    .returning()
    .get();
  return updated ?? existing;
}

/**
 * Switches the match to a formation (saved, or a preset with `formationId` null) and rebuilds
 * the draft lineup for it, keeping the squad.
 */
export function setMatchFormation(
  id: number,
  formation: { formationId: number | null; name: string; slots: FormationSlot[] },
): Match {
  const existing = setupMatch(id);
  const current = matchLineup(existing);
  const squad = current ? lineupPlayerIds(current) : [];
  const lineup = lineupFromFormation(formation.slots, current, squad);
  return db.transaction((tx) =>
    tx
      .update(matches)
      .set({
        formationId: formation.formationId,
        formationName: formation.name,
        startingLineupJson: JSON.stringify(unwrap(parseStartingLineup(lineup))),
      })
      .where(eq(matches.id, id))
      .returning()
      .get(),
  );
}

/** Sets who's here: absent players leave the lineup, newly available ones join the bench. */
export function setMatchSquad(id: number, squad: number[]): Match {
  const existing = setupMatch(id);
  const current = matchLineup(existing);
  if (!current) throw new ValidationError('Pick a formation first');
  return setMatchLineup(id, setSquad(current, squad));
}

/** Deletes the match with its periods, events and match-scoped presets. */
export function deleteMatch(id: number): void {
  db.delete(matches).where(eq(matches.id, id)).run();
}
