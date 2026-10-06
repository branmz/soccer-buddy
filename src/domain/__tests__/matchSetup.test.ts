import {
  kickoffLineup,
  lineupFromFormation,
  lineupPlayerIds,
  matchKitColor,
  setSquad,
} from '../matchSetup';
import type { FormationSlot, StartingLineup } from '../types';

const shape: FormationSlot[] = [
  { slotId: 'gk', role: 'GK', label: 'GK', x: 0.5, y: 0.9 },
  { slotId: 'cb', role: 'DEF', label: 'CB', x: 0.5, y: 0.7 },
  { slotId: 'st', role: 'FWD', label: 'ST', x: 0.5, y: 0.3 },
];
const withPlayers = (ids: (number | undefined)[]): FormationSlot[] =>
  shape.map((s, i) => (ids[i] === undefined ? s : { ...s, playerId: ids[i] }));
const ids = (lineup: StartingLineup) => lineup.slots.map((s) => s.playerId);

describe('lineupFromFormation', () => {
  it('puts the whole squad on the bench for an empty shape', () => {
    const lineup = lineupFromFormation(shape, null, [1, 2, 3]);
    expect(ids(lineup)).toEqual([undefined, undefined, undefined]);
    expect(lineup.bench).toEqual([1, 2, 3]);
  });

  it('uses a saved formation’s players who are in the squad', () => {
    const lineup = lineupFromFormation(withPlayers([1, 9, 3]), null, [1, 2, 3]);
    expect(ids(lineup)).toEqual([1, undefined, 3]);
    expect(lineup.bench).toEqual([2]);
  });

  it('keeps current players by slot id when switching to an empty shape', () => {
    const current = { slots: withPlayers([1, 2, undefined]), bench: [3] };
    const other: FormationSlot[] = [
      shape[0],
      { ...shape[2], slotId: 'cb' },
      { ...shape[1], slotId: 'lw' },
    ];
    const lineup = lineupFromFormation(other, current, [1, 2, 3]);
    expect(ids(lineup)).toEqual([1, 2, undefined]);
    expect(lineup.bench).toEqual([3]);
  });
});

describe('setSquad', () => {
  const lineup = { slots: withPlayers([1, 2, undefined]), bench: [3] };

  it('removes absent players and adds new ones to the bench', () => {
    const next = setSquad(lineup, [1, 3, 4]);
    expect(ids(next)).toEqual([1, undefined, undefined]);
    expect(next.bench).toEqual([3, 4]);
  });

  it('returns the same lineup when nothing changed', () => {
    expect(setSquad(lineup, [3, 2, 1])).toBe(lineup);
  });
});

describe('kickoffLineup', () => {
  it('drops inactive players', () => {
    const result = kickoffLineup(
      { slots: withPlayers([1, 2, 3]), bench: [4, 5] },
      new Set([1, 3, 5]),
    );
    expect(result).toEqual({
      ok: true,
      value: { slots: withPlayers([1, undefined, 3]), bench: [5] },
    });
  });

  it('needs someone on the pitch', () => {
    expect(kickoffLineup({ slots: shape, bench: [1] }, new Set([1])).ok).toBe(false);
  });
});

describe('lineupPlayerIds', () => {
  it('lists pitch then bench players', () => {
    expect(lineupPlayerIds({ slots: withPlayers([1, undefined, 3]), bench: [2] })).toEqual([
      1, 3, 2,
    ]);
  });
});

describe('matchKitColor', () => {
  it('uses the away kit away, falling back to home', () => {
    expect(matchKitColor({ homeColor: '#ff0000', awayColor: '#0000ff' }, true)).toBe('#ff0000');
    expect(matchKitColor({ homeColor: '#ff0000', awayColor: '#0000ff' }, false)).toBe('#0000ff');
    expect(matchKitColor({ homeColor: '#ff0000', awayColor: null }, false)).toBe('#ff0000');
  });
});
