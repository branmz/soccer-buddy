import { moveSlot, changeSlotPosition } from '../board';
import { deriveLineup } from '../lineup';
import {
  applyLiveLayout,
  fitToFormation,
  liveLayoutFrom,
  parseLiveLayout,
  type SpotShape,
} from '../liveLayout';
import type { StartingLineup } from '../types';

// GK 1 · LM 2 · ST 3
const start: StartingLineup = {
  slots: [
    { slotId: 'gk', role: 'GK', label: 'GK', x: 0.5, y: 0.9, playerId: 1 },
    { slotId: 'lm', role: 'MID', label: 'LM', x: 0.2, y: 0.5, playerId: 2 },
    { slotId: 'st', role: 'FWD', label: 'ST', x: 0.5, y: 0.3, playerId: 3 },
  ],
  bench: [4],
};
const lineup = deriveLineup(start, []);
const ids = start.slots.map((s) => s.slotId);

describe('applyLiveLayout', () => {
  it('keeps the lineup when there is no live layout', () => {
    expect(applyLiveLayout(lineup, null)).toBe(lineup);
    expect(applyLiveLayout(lineup, [])).toBe(lineup);
  });

  it('moves and relabels spots by id, keeping players and locks', () => {
    const redCard = deriveLineup(start, [
      {
        id: 1,
        eventType: 'red_card',
        playerId: 3,
        relatedPlayerId: null,
        slotId: null,
        gameTimeMs: 0,
      },
    ]);
    const next = applyLiveLayout(redCard, [
      { slotId: 'lm', role: 'FWD', label: 'LW', x: 0.2, y: 0.3 },
      { slotId: 'st', role: 'FWD', label: 'ST', x: 0.6, y: 0.25 },
      { slotId: 'gone', role: 'DEF', label: 'CB', x: 0.5, y: 0.7 },
    ]);
    expect(next.slots).toEqual([
      { slotId: 'gk', role: 'GK', label: 'GK', x: 0.5, y: 0.9, playerId: 1, locked: false },
      { slotId: 'lm', role: 'FWD', label: 'LW', x: 0.2, y: 0.3, playerId: 2, locked: false },
      { slotId: 'st', role: 'FWD', label: 'ST', x: 0.6, y: 0.25, locked: true },
    ]);
    expect(next.bench).toEqual([4]);
  });
});

describe('liveLayoutFrom', () => {
  it('stores the shape of every spot, without players', () => {
    const edited = changeSlotPosition(moveSlot(lineup.slots, 'lm', 0.2, 0.3), 'lm', 'LW');
    const result = liveLayoutFrom(edited, ids);
    expect(result).toEqual({
      ok: true,
      value: [
        { slotId: 'gk', role: 'GK', label: 'GK', x: 0.5, y: 0.9 },
        { slotId: 'lm', role: 'FWD', label: 'LW', x: 0.2, y: 0.3 },
        { slotId: 'st', role: 'FWD', label: 'ST', x: 0.5, y: 0.3 },
      ],
    });
  });

  it('rejects spots that are not the match’s', () => {
    expect(liveLayoutFrom(lineup.slots.slice(1), ids).ok).toBe(false);
    expect(liveLayoutFrom([...lineup.slots.slice(1), { ...lineup.slots[1] }], ids).ok).toBe(false);
    expect(
      liveLayoutFrom([{ ...lineup.slots[0], slotId: 'x' }, ...lineup.slots.slice(1)], ids).ok,
    ).toBe(false);
  });
});

describe('fitToFormation', () => {
  // 1-2-1 → 2-1-1 style switch on 5 spots.
  const current: SpotShape[] = [
    { slotId: 'gk', role: 'GK', label: 'GK', x: 0.5, y: 0.9 },
    { slotId: 'cb', role: 'DEF', label: 'CB', x: 0.5, y: 0.75 },
    { slotId: 'lm', role: 'MID', label: 'LM', x: 0.2, y: 0.5 },
    { slotId: 'rm', role: 'MID', label: 'RM', x: 0.8, y: 0.5 },
    { slotId: 'st', role: 'FWD', label: 'ST', x: 0.5, y: 0.25 },
  ];
  const target: SpotShape[] = [
    { slotId: 'gk', role: 'GK', label: 'GK', x: 0.5, y: 0.92 },
    { slotId: 'lb', role: 'DEF', label: 'LB', x: 0.3, y: 0.75 },
    { slotId: 'rb', role: 'DEF', label: 'RB', x: 0.7, y: 0.75 },
    { slotId: 'cm', role: 'MID', label: 'CM', x: 0.5, y: 0.5 },
    { slotId: 'st2', role: 'FWD', label: 'ST', x: 0.5, y: 0.2 },
  ];

  const fit = () => {
    const result = fitToFormation(current, target);
    if (!result.ok) throw new Error(result.error);
    return new Map(result.value.map((s) => [s.slotId, s]));
  };

  it('keeps the current slot ids and takes the new shape', () => {
    const result = fit();
    expect([...result.keys()]).toEqual(['gk', 'cb', 'lm', 'rm', 'st']);
    expect(result.get('gk')).toEqual({ slotId: 'gk', role: 'GK', label: 'GK', x: 0.5, y: 0.92 });
  });

  it('matches by position, then line, then distance', () => {
    const result = fit();
    expect(result.get('st')?.label).toBe('ST');
    expect(result.get('cb')?.role).toBe('DEF');
    // One midfielder keeps the middle; the other drops to the open full-back spot.
    const mids = ['lm', 'rm'].map((id) => result.get(id)?.label).sort();
    expect(mids[0]).toBe('CM');
    expect(['LB', 'RB']).toContain(mids[1]);
    expect(new Set([...result.values()].map((s) => `${s.x},${s.y}`)).size).toBe(5);
  });

  it('lets spots with players choose before empty or red-card spots', () => {
    // Two CM spots compete for one CM: the hole is nearer, but the player gets it.
    const mids: SpotShape[] = [
      { slotId: 'gk', role: 'GK', label: 'GK', x: 0.5, y: 0.9 },
      { slotId: 'player', role: 'MID', label: 'CM', x: 0.5, y: 0.6 },
      { slotId: 'hole', role: 'MID', label: 'CM', x: 0.5, y: 0.5 },
    ];
    const shape: SpotShape[] = [
      { slotId: 'g', role: 'GK', label: 'GK', x: 0.5, y: 0.9 },
      { slotId: 'm', role: 'MID', label: 'CM', x: 0.5, y: 0.5 },
      { slotId: 's', role: 'FWD', label: 'ST', x: 0.5, y: 0.2 },
    ];
    const label = (result: ReturnType<typeof fitToFormation>, id: string) =>
      result.ok ? result.value.find((x) => x.slotId === id)?.label : undefined;
    expect(label(fitToFormation(mids, shape), 'player')).toBe('ST');
    expect(label(fitToFormation(mids, shape, new Set(['hole'])), 'player')).toBe('CM');
  });

  it('needs the same number of spots and one goalkeeper each', () => {
    expect(fitToFormation(current, target.slice(1)).ok).toBe(false);
    const noKeeper = target.map((s) =>
      s.role === 'GK' ? { ...s, role: 'DEF' as const, label: 'CB' } : s,
    );
    expect(fitToFormation(current, noKeeper).ok).toBe(false);
  });
});

describe('parseLiveLayout', () => {
  const slots = start.slots.map(({ playerId: _p, ...s }) => s);

  it('reads the spots and the switched-to formation name', () => {
    expect(parseLiveLayout(JSON.stringify({ slots, name: '4-3-3', formationId: 7 }))).toEqual({
      ok: true,
      value: { slots, name: '4-3-3', formationId: 7 },
    });
    expect(parseLiveLayout({ slots, formationId: 'x' })).toEqual({
      ok: true,
      value: { slots, name: null, formationId: null },
    });
  });

  it('rejects bad JSON or a bad shape', () => {
    expect(parseLiveLayout('{').ok).toBe(false);
    expect(parseLiveLayout({ slots: slots.slice(1) }).ok).toBe(false);
  });
});
