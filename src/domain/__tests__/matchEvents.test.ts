import { getClockState, type ClockPeriod } from '../clock';
import { applyLineupEvent, deriveLineup, type LineupEvent } from '../lineup';
import {
  buildLiveEvents,
  eventStamp,
  yellowCardCount,
  type EventDraft,
  type LiveAction,
} from '../matchEvents';
import { SUB_ERRORS } from '../subRules';
import type { StartingLineup } from '../types';

const MIN = 60_000;

// GK 1 · CB 2 · CM empty · ST 3; bench 4, 5
const start: StartingLineup = {
  slots: [
    { slotId: 'gk', role: 'GK', label: 'GK', x: 0.5, y: 0.9, playerId: 1 },
    { slotId: 'cb', role: 'DEF', label: 'CB', x: 0.5, y: 0.7, playerId: 2 },
    { slotId: 'cm', role: 'MID', label: 'CM', x: 0.5, y: 0.5 },
    { slotId: 'st', role: 'FWD', label: 'ST', x: 0.5, y: 0.3, playerId: 3 },
  ],
  bench: [4, 5],
};
const lineup = deriveLineup(start, []);

const events = (action: LiveAction, maxSubs: number | null = null): EventDraft[] => {
  const result = buildLiveEvents(action, lineup, maxSubs);
  if (!result.ok) throw new Error(result.error);
  return result.value;
};
const error = (action: LiveAction, l = lineup, maxSubs: number | null = null) => {
  const result = buildLiveEvents(action, l, maxSubs);
  return result.ok ? null : result.error;
};
const ev = (eventType: EventDraft['eventType'], playerId: number | null, extra = {}) => ({
  eventType,
  playerId,
  relatedPlayerId: null,
  slotId: null,
  ...extra,
});

describe('eventStamp', () => {
  const period: ClockPeriod = {
    periodNumber: 1,
    startedAt: 0,
    endedAt: null,
    pausedAt: null,
    pausedTotalMs: 0,
  };

  it('stamps the period, total game time and match minute', () => {
    expect(eventStamp(getClockState([period], 45 * MIN, 47 * MIN))).toEqual({
      ok: true,
      value: { periodNumber: 1, gameTimeMs: 47 * MIN, matchMinute: 48 },
    });
  });

  it('stamps half-time events with the period that just ended', () => {
    const ended = { ...period, endedAt: 46 * MIN };
    expect(eventStamp(getClockState([ended], 45 * MIN, 60 * MIN))).toMatchObject({
      value: { periodNumber: 1, gameTimeMs: 46 * MIN },
    });
  });

  it('refuses before kickoff', () => {
    expect(eventStamp(getClockState([], 45 * MIN, 0)).ok).toBe(false);
  });
});

describe('buildLiveEvents', () => {
  it('records a goal with an optional assist', () => {
    expect(events({ kind: 'goal', scorerId: 3, assistId: null })).toEqual([ev('goal', 3)]);
    expect(events({ kind: 'goal', scorerId: 3, assistId: 2 })).toEqual([
      ev('goal', 3),
      ev('assist', 2),
    ]);
    expect(events({ kind: 'goal', scorerId: null, assistId: null })).toEqual([ev('goal', null)]);
  });

  it('checks the scorer and assist', () => {
    expect(error({ kind: 'goal', scorerId: 4, assistId: null })).toBe("Scorer isn't on the pitch");
    expect(error({ kind: 'goal', scorerId: 3, assistId: 3 })).toMatch(/own goal/);
    expect(error({ kind: 'goal', scorerId: 3, assistId: 5 })).toMatch(/Assist/);
    expect(error({ kind: 'goal', scorerId: null, assistId: 2 })).toBe('Pick the scorer');
  });

  it('records a late arrival for someone not in the match', () => {
    expect(events({ kind: 'lateArrival', playerId: 9 })).toEqual([ev('late_arrival', 9)]);
    expect(error({ kind: 'lateArrival', playerId: 4 })).toBe('Player is already in this match');
    expect(error({ kind: 'lateArrival', playerId: 2 })).toBe('Player is already in this match');
  });

  it('records an opponent goal', () => {
    expect(events({ kind: 'opponentGoal' })).toEqual([ev('opponent_goal', null)]);
  });

  it('records cards for players on the pitch or the bench', () => {
    expect(events({ kind: 'yellowCard', playerId: 4 })).toEqual([ev('yellow_card', 4)]);
    expect(events({ kind: 'redCard', playerId: 2 })).toEqual([ev('red_card', 2)]);
    expect(events({ kind: 'secondYellow', playerId: 2 })).toEqual([
      ev('yellow_card', 2),
      ev('red_card', 2),
    ]);
  });

  it('rejects cards for sent-off players and players outside the squad', () => {
    const sentOff = deriveLineup(start, [
      {
        id: 1,
        eventType: 'red_card',
        playerId: 2,
        relatedPlayerId: null,
        slotId: null,
        gameTimeMs: 0,
      },
    ]);
    expect(error({ kind: 'yellowCard', playerId: 2 }, sentOff)).toMatch(/already sent off/);
    expect(error({ kind: 'redCard', playerId: 99 })).toMatch(/isn't in this match/);
  });

  it('records subs with the slot of the player going off', () => {
    expect(
      events({
        kind: 'subs',
        pairs: [
          { outPlayerId: 2, inPlayerId: 4 },
          { outPlayerId: 3, inPlayerId: 5 },
        ],
      }),
    ).toEqual([
      ev('substitution', 4, { relatedPlayerId: 2, slotId: 'cb' }),
      ev('substitution', 5, { relatedPlayerId: 3, slotId: 'st' }),
    ]);
  });

  it('rejects subs that break the rules', () => {
    expect(error({ kind: 'subs', pairs: [{ outPlayerId: 2, inPlayerId: 4 }] }, lineup, 0)).toBe(
      SUB_ERRORS.limitReached,
    );
    expect(error({ kind: 'subs', pairs: [] })).toBeTruthy();
  });

  it('fills an empty slot and moves players', () => {
    expect(events({ kind: 'fillSlot', slotId: 'cm', playerId: 4 })).toEqual([
      ev('substitution', 4, { slotId: 'cm' }),
    ]);
    expect(events({ kind: 'swap', playerId: 2, target: { playerId: 3 } })).toEqual([
      ev('position_swap', 2, { relatedPlayerId: 3 }),
    ]);
    expect(events({ kind: 'swap', playerId: 3, target: { slotId: 'cm' } })).toEqual([
      ev('position_swap', 3, { slotId: 'cm' }),
    ]);
    expect(error({ kind: 'fillSlot', slotId: 'cb', playerId: 4 })).toBe(SUB_ERRORS.slotUnavailable);
    expect(error({ kind: 'swap', playerId: 4, target: { playerId: 3 } })).toBe(
      SUB_ERRORS.notOnPitch,
    );
  });

  it('builds events that the replay applies', () => {
    const actions: LiveAction[] = [
      { kind: 'subs', pairs: [{ outPlayerId: 2, inPlayerId: 4 }] },
      { kind: 'fillSlot', slotId: 'cm', playerId: 5 },
      { kind: 'swap', playerId: 1, target: { playerId: 3 } },
      { kind: 'redCard', playerId: 3 },
    ];
    let current = lineup;
    let id = 1;
    for (const action of actions) {
      const result = buildLiveEvents(action, current, null);
      if (!result.ok) throw new Error(result.error);
      for (const d of result.value) {
        const next = applyLineupEvent(current, { ...d, id: id++, gameTimeMs: 0 });
        expect(next).not.toBe(current);
        current = next;
      }
    }
  });
});

describe('yellowCardCount', () => {
  it('counts a player’s yellow cards', () => {
    const list: Pick<LineupEvent, 'eventType' | 'playerId'>[] = [
      { eventType: 'yellow_card', playerId: 2 },
      { eventType: 'yellow_card', playerId: 3 },
      { eventType: 'goal', playerId: 2 },
      { eventType: 'yellow_card', playerId: 2 },
    ];
    expect(yellowCardCount(list, 2)).toBe(2);
    expect(yellowCardCount(list, 4)).toBe(0);
  });
});
