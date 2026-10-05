import type { LineupEvent } from '../lineup';
import {
  matchResult,
  matchScore,
  playerMatchStats,
  seasonStats,
  sortSeasonTotals,
  type SeasonPlayerTotals,
} from '../stats';
import type { StartingLineup } from '../types';

const MIN = 60_000;

// GK 1 · ST 2; bench 3
const start: StartingLineup = {
  slots: [
    { slotId: 'gk', role: 'GK', label: 'GK', x: 0.5, y: 0.9, playerId: 1 },
    { slotId: 'st', role: 'FWD', label: 'ST', x: 0.5, y: 0.3, playerId: 2 },
  ],
  bench: [3],
};

let nextId = 1;
const event = (
  minute: number,
  e: Partial<LineupEvent> & Pick<LineupEvent, 'eventType'>,
): LineupEvent => ({
  id: nextId++,
  playerId: null,
  relatedPlayerId: null,
  slotId: null,
  gameTimeMs: minute * MIN,
  ...e,
});

const win = [
  event(10, { eventType: 'goal', playerId: 2 }),
  event(10, { eventType: 'assist', playerId: 1 }),
  event(20, { eventType: 'opponent_goal' }),
  event(30, { eventType: 'substitution', playerId: 3, relatedPlayerId: 2 }),
  event(35, { eventType: 'goal', playerId: 3 }),
  event(40, { eventType: 'yellow_card', playerId: 3 }),
];

const loss = [
  event(5, { eventType: 'opponent_goal' }),
  event(15, { eventType: 'red_card', playerId: 2 }),
  event(25, { eventType: 'yellow_card', playerId: 1 }),
];

describe('matchScore', () => {
  it('counts goals for and against', () => {
    expect(matchScore(win)).toEqual({ us: 2, them: 1 });
    expect(matchScore([])).toEqual({ us: 0, them: 0 });
  });
});

describe('matchResult', () => {
  it('compares the score', () => {
    expect(matchResult({ us: 2, them: 1 })).toBe('win');
    expect(matchResult({ us: 1, them: 1 })).toBe('draw');
    expect(matchResult({ us: 0, them: 3 })).toBe('loss');
  });
});

describe('playerMatchStats', () => {
  it('totals goals, assists and cards per player', () => {
    const stats = playerMatchStats([...win, event(45, { eventType: 'red_card', playerId: 3 })]);
    expect(stats.get(1)).toEqual({ goals: 0, assists: 1, yellowCards: 0, redCards: 0 });
    expect(stats.get(2)).toEqual({ goals: 1, assists: 0, yellowCards: 0, redCards: 0 });
    expect(stats.get(3)).toEqual({ goals: 1, assists: 0, yellowCards: 1, redCards: 1 });
  });

  it('skips events without a player', () => {
    expect(playerMatchStats([event(1, { eventType: 'opponent_goal' })]).size).toBe(0);
  });
});

describe('seasonStats', () => {
  const season = seasonStats([
    { startingLineup: start, events: win, totalGameMs: 50 * MIN },
    { startingLineup: start, events: loss, totalGameMs: 40 * MIN },
    { startingLineup: start, events: [], totalGameMs: 40 * MIN },
  ]);

  it('builds the team record', () => {
    expect(season.record).toEqual({
      played: 3,
      wins: 1,
      draws: 1,
      losses: 1,
      goalsFor: 2,
      goalsAgainst: 2,
    });
  });

  it('totals each player across matches', () => {
    expect(season.players.get(1)).toEqual({
      playerId: 1,
      appearances: 3,
      starts: 3,
      playingTimeMs: 130 * MIN,
      goals: 0,
      assists: 1,
      yellowCards: 1,
      redCards: 0,
    });
    expect(season.players.get(2)).toMatchObject({
      appearances: 3,
      starts: 3,
      playingTimeMs: (30 + 15 + 40) * MIN,
      goals: 1,
      redCards: 1,
    });
    expect(season.players.get(3)).toMatchObject({
      appearances: 1,
      starts: 0,
      playingTimeMs: 20 * MIN,
      goals: 1,
      yellowCards: 1,
    });
  });

  it('records a card for a bench player who never came on', () => {
    const bench = seasonStats([
      {
        startingLineup: start,
        events: [event(10, { eventType: 'yellow_card', playerId: 3 })],
        totalGameMs: 40 * MIN,
      },
    ]);
    expect(bench.players.get(3)).toMatchObject({ appearances: 0, starts: 0, yellowCards: 1 });
  });

  it('is empty with no matches', () => {
    const empty = seasonStats([]);
    expect(empty.record.played).toBe(0);
    expect(empty.players.size).toBe(0);
  });
});

describe('sortSeasonTotals', () => {
  const row = (playerId: number, goals: number, playingTimeMs: number): SeasonPlayerTotals => ({
    playerId,
    appearances: 1,
    starts: 1,
    playingTimeMs,
    goals,
    assists: 0,
    yellowCards: 0,
    redCards: 0,
  });
  const rows = [row(1, 1, 30), row(2, 3, 10), row(3, 1, 50)];

  it('sorts descending by the chosen column, keeping input order on ties', () => {
    expect(sortSeasonTotals(rows, 'goals').map((r) => r.playerId)).toEqual([2, 1, 3]);
    expect(sortSeasonTotals(rows, 'playingTimeMs').map((r) => r.playerId)).toEqual([3, 1, 2]);
  });

  it('can sort ascending', () => {
    expect(sortSeasonTotals(rows, 'goals', 'asc').map((r) => r.playerId)).toEqual([1, 3, 2]);
  });

  it('does not mutate the input', () => {
    sortSeasonTotals(rows, 'goals');
    expect(rows.map((r) => r.playerId)).toEqual([1, 2, 3]);
  });
});
