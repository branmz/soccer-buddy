import type { ClockPeriod } from '../clock';
import {
  finalGameMs,
  formatMinutesPlayed,
  minutesPlayed,
  minutesWithPlayers,
  nextSeasonSort,
  seasonTable,
  sortSeasonTable,
} from '../history';
import type { LineupEvent } from '../lineup';
import type { SeasonPlayerTotals } from '../stats';
import type { StartingLineup } from '../types';

const MIN = 60_000;
const T0 = 1_700_000_000_000;

describe('finalGameMs', () => {
  it('sums active time across periods, leaving out pauses and the break', () => {
    const periods: ClockPeriod[] = [
      {
        periodNumber: 1,
        startedAt: T0,
        endedAt: T0 + 27 * MIN,
        pausedAt: null,
        pausedTotalMs: 2 * MIN,
      },
      {
        periodNumber: 2,
        startedAt: T0 + 35 * MIN,
        endedAt: T0 + 61 * MIN,
        pausedAt: null,
        pausedTotalMs: 0,
      },
    ];
    expect(finalGameMs(periods)).toBe(51 * MIN);
  });

  it('is zero with no periods', () => {
    expect(finalGameMs([])).toBe(0);
  });
});

describe('minutesWithPlayers', () => {
  it('pairs minutes with players, in order, and leaves out unknown ids', () => {
    const byId = new Map([
      [1, 'Ana'],
      [3, 'Cam'],
    ]);
    expect(
      minutesWithPlayers(
        [
          { playerId: 3, minutes: 40 },
          { playerId: 2, minutes: 30 },
          { playerId: 1, minutes: 12 },
        ],
        byId,
      ),
    ).toEqual([
      { player: 'Cam', minutes: 40 },
      { player: 'Ana', minutes: 12 },
    ]);
  });
});

describe('formatMinutesPlayed', () => {
  it('shows whole minutes', () => {
    expect(formatMinutesPlayed(1)).toBe("1'");
    expect(formatMinutesPlayed(45)).toBe("45'");
  });

  it("shows under a minute as <1' rather than a 0 that looks like they never played", () => {
    expect(formatMinutesPlayed(0)).toBe("<1'");
  });
});

describe('minutesPlayed', () => {
  const start: StartingLineup = {
    slots: [
      { slotId: 'gk', role: 'GK', label: 'GK', x: 0.5, y: 0.9, playerId: 1 },
      { slotId: 'st', role: 'FWD', label: 'ST', x: 0.5, y: 0.3, playerId: 2 },
    ],
    bench: [3, 4],
  };
  const sub: LineupEvent = {
    id: 1,
    eventType: 'substitution',
    playerId: 3,
    relatedPlayerId: 2,
    slotId: null,
    gameTimeMs: 20.5 * MIN,
  };

  it('lists everyone who played, most minutes first, in whole minutes', () => {
    expect(minutesPlayed(start, [sub], 50 * MIN)).toEqual([
      { playerId: 1, minutes: 50 },
      { playerId: 3, minutes: 29 },
      { playerId: 2, minutes: 20 },
    ]);
  });

  it('leaves out unused subs and ignores late arrivals', () => {
    const arrival: LineupEvent = {
      ...sub,
      id: 2,
      eventType: 'late_arrival',
      playerId: 5,
      relatedPlayerId: null,
    };
    const ids = minutesPlayed(start, [arrival], 50 * MIN).map((m) => m.playerId);
    expect(ids).toEqual([1, 2]);
  });
});

describe('season table', () => {
  const roster = [
    { id: 1, name: 'ana', isActive: true },
    { id: 2, name: 'Bea', isActive: true },
    { id: 3, name: 'Cam', isActive: false },
    { id: 4, name: 'Dee', isActive: false },
  ];
  const totals = (playerId: number, t: Partial<SeasonPlayerTotals>): SeasonPlayerTotals => ({
    playerId,
    appearances: 1,
    starts: 1,
    playingTimeMs: 0,
    goals: 0,
    assists: 0,
    yellowCards: 0,
    redCards: 0,
    ...t,
  });
  const season = new Map([
    [2, totals(2, { goals: 3, playingTimeMs: 40 * MIN })],
    [3, totals(3, { goals: 1, playingTimeMs: 90 * MIN })],
  ]);

  it('lists active players (zeros if unplayed) and inactive ones with a season', () => {
    const rows = seasonTable(roster, season);
    expect(rows.map((r) => r.player.id)).toEqual([1, 2, 3]);
    expect(rows[0]).toMatchObject({ playerId: 1, appearances: 0, goals: 0, playingTimeMs: 0 });
    expect(rows[1]).toMatchObject({ goals: 3, playingTimeMs: 40 * MIN });
  });

  it('sorts by any column, ties keeping roster order', () => {
    const rows = seasonTable(roster, season);
    const ids = (key: Parameters<typeof sortSeasonTable>[1], dir: 'asc' | 'desc') =>
      sortSeasonTable(rows, key, dir).map((r) => r.player.id);
    expect(ids('goals', 'desc')).toEqual([2, 3, 1]);
    expect(ids('playingTimeMs', 'desc')).toEqual([3, 2, 1]);
    expect(ids('appearances', 'desc')).toEqual([2, 3, 1]);
    expect(ids('name', 'asc')).toEqual([1, 2, 3]);
    expect(ids('name', 'desc')).toEqual([3, 2, 1]);
  });

  it('flips the sorted column and starts others in their default direction', () => {
    expect(nextSeasonSort({ key: 'goals', direction: 'desc' }, 'goals')).toEqual({
      key: 'goals',
      direction: 'asc',
    });
    expect(nextSeasonSort({ key: 'goals', direction: 'asc' }, 'name')).toEqual({
      key: 'name',
      direction: 'asc',
    });
    expect(nextSeasonSort({ key: 'name', direction: 'asc' }, 'assists')).toEqual({
      key: 'assists',
      direction: 'desc',
    });
  });
});
