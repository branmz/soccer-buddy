// What the coach does during a live match, turned into validated `match_events` rows. Replay
// skips events that don't apply, so everything is checked here before it is recorded.

import type { ClockState } from './clock';
import { findPlayerSlot, isInMatch, type LineupEvent, type LiveLineup } from './lineup';
import { canFillSlot, canSubstitute, canSwap } from './subRules';
import type { MatchEventType, ParseResult, QuickSubPair } from './types';

export type LiveAction =
  /** `scorerId` null: our goal, scorer not recorded (e.g. an own goal by the opponent). */
  | { kind: 'goal'; scorerId: number | null; assistId: number | null }
  | { kind: 'opponentGoal' }
  | { kind: 'yellowCard'; playerId: number }
  /** A second yellow: recorded as a yellow and a red together, so one undo removes both. */
  | { kind: 'secondYellow'; playerId: number }
  | { kind: 'redCard'; playerId: number }
  | { kind: 'subs'; pairs: QuickSubPair[] }
  | { kind: 'fillSlot'; slotId: string; playerId: number }
  | { kind: 'swap'; playerId: number; target: { playerId: number } | { slotId: string } }
  /** Someone absent at kickoff turns up: they join the bench and can then come on. */
  | { kind: 'lateArrival'; playerId: number };

/** When an event happened, from the clock at the moment it was recorded. */
export type EventStamp = { periodNumber: number; gameTimeMs: number; matchMinute: number };

export type EventDraft = {
  eventType: MatchEventType;
  playerId: number | null;
  relatedPlayerId: number | null;
  slotId: string | null;
};

const fail = <T>(error: string): ParseResult<T> => ({ ok: false, error });

/** Events are stamped with the clock: during a period, a pause, or the break after one. */
export function eventStamp(clock: ClockState): ParseResult<EventStamp> {
  if (clock.phase === 'notStarted') return fail("The match hasn't kicked off");
  return {
    ok: true,
    value: {
      periodNumber: clock.currentPeriod,
      gameTimeMs: clock.totalGameMs,
      matchMinute: clock.matchMinute,
    },
  };
}

export function yellowCardCount(
  events: readonly Pick<LineupEvent, 'eventType' | 'playerId'>[],
  playerId: number,
): number {
  return events.filter((e) => e.eventType === 'yellow_card' && e.playerId === playerId).length;
}

const isInSquad = (lineup: LiveLineup, playerId: number) =>
  findPlayerSlot(lineup, playerId) !== undefined || lineup.bench.includes(playerId);

const draft = (
  eventType: MatchEventType,
  playerId: number | null,
  relatedPlayerId: number | null = null,
  slotId: string | null = null,
): EventDraft => ({ eventType, playerId, relatedPlayerId, slotId });

function cardEvents(lineup: LiveLineup, playerId: number, types: MatchEventType[]) {
  if (lineup.sentOff.includes(playerId)) return fail<EventDraft[]>('Player was already sent off');
  if (!isInSquad(lineup, playerId)) return fail<EventDraft[]>("Player isn't in this match");
  return { ok: true as const, value: types.map((t) => draft(t, playerId)) };
}

/** The events for one action, recorded together as one group (one undo). */
export function buildLiveEvents(
  action: LiveAction,
  lineup: LiveLineup,
  maxSubs: number | null,
): ParseResult<EventDraft[]> {
  switch (action.kind) {
    case 'goal': {
      const { scorerId, assistId } = action;
      if (scorerId === null) {
        return assistId === null
          ? { ok: true, value: [draft('goal', null)] }
          : fail('Pick the scorer');
      }
      if (!findPlayerSlot(lineup, scorerId)) return fail("Scorer isn't on the pitch");
      if (assistId === null) return { ok: true, value: [draft('goal', scorerId)] };
      if (assistId === scorerId) return fail("A player can't assist their own goal");
      if (!findPlayerSlot(lineup, assistId)) return fail("Assist player isn't on the pitch");
      return { ok: true, value: [draft('goal', scorerId), draft('assist', assistId)] };
    }
    case 'opponentGoal':
      return { ok: true, value: [draft('opponent_goal', null)] };
    case 'lateArrival':
      if (isInMatch(lineup, action.playerId)) return fail('Player is already in this match');
      return { ok: true, value: [draft('late_arrival', action.playerId)] };
    case 'yellowCard':
      return cardEvents(lineup, action.playerId, ['yellow_card']);
    case 'secondYellow':
      return cardEvents(lineup, action.playerId, ['yellow_card', 'red_card']);
    case 'redCard':
      return cardEvents(lineup, action.playerId, ['red_card']);
    case 'subs': {
      const check = canSubstitute(lineup, maxSubs, action.pairs);
      if (!check.ok) return fail(check.errors.find((e) => e !== null) ?? 'Pick a substitution');
      return {
        ok: true,
        value: action.pairs.map((p) =>
          draft(
            'substitution',
            p.inPlayerId,
            p.outPlayerId,
            findPlayerSlot(lineup, p.outPlayerId)?.slotId ?? null,
          ),
        ),
      };
    }
    case 'fillSlot': {
      const error = canFillSlot(lineup, action.slotId, action.playerId);
      if (error) return fail(error);
      return { ok: true, value: [draft('substitution', action.playerId, null, action.slotId)] };
    }
    case 'swap': {
      const { playerId, target } = action;
      const error = canSwap(lineup, playerId, target);
      if (error) return fail(error);
      return {
        ok: true,
        value: [
          'slotId' in target
            ? draft('position_swap', playerId, null, target.slotId)
            : draft('position_swap', playerId, target.playerId),
        ],
      };
    }
  }
}
