import { deriveLineup } from '../lineup';
import { applyLiveTap, liveDropAction, suggestedLiveSlots } from '../liveBoard';
import type { StartingLineup } from '../types';

// GK 1 · CB 2 · CM empty · ST 3 (sent off below in `withRed`); bench 4, 5
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
const withRed = deriveLineup(start, [
  { id: 1, eventType: 'red_card', playerId: 3, relatedPlayerId: null, slotId: null, gameTimeMs: 0 },
]);

const bench = (playerId: number) => ({ kind: 'bench' as const, playerId });
const slot = (slotId: string) => ({ kind: 'slot' as const, slotId });

describe('liveDropAction', () => {
  it('subs a bench player on for the player in the slot', () => {
    expect(liveDropAction(lineup, bench(4), slot('cb'))).toEqual({
      kind: 'subs',
      pairs: [{ outPlayerId: 2, inPlayerId: 4 }],
    });
  });

  it('fills an empty slot from the bench', () => {
    expect(liveDropAction(lineup, bench(4), slot('cm'))).toEqual({
      kind: 'fillSlot',
      slotId: 'cm',
      playerId: 4,
    });
  });

  it('swaps or moves players on the pitch', () => {
    expect(liveDropAction(lineup, slot('cb'), slot('st'))).toEqual({
      kind: 'swap',
      playerId: 2,
      target: { playerId: 3 },
    });
    expect(liveDropAction(lineup, slot('cb'), slot('cm'))).toEqual({
      kind: 'swap',
      playerId: 2,
      target: { slotId: 'cm' },
    });
  });

  it('does nothing for the bench, the grass, locked or empty slots', () => {
    expect(liveDropAction(lineup, slot('cb'), { kind: 'bench' })).toBeNull();
    expect(liveDropAction(lineup, bench(4), { kind: 'grass', x: 0.5, y: 0.5 })).toBeNull();
    expect(liveDropAction(withRed, bench(4), slot('st'))).toBeNull();
    expect(liveDropAction(lineup, slot('cm'), slot('cb'))).toBeNull();
    expect(liveDropAction(lineup, slot('cb'), slot('cb'))).toBeNull();
  });
});

describe('moving into a red-card spot', () => {
  it('is a move into that spot (the lock moves to the spot left)', () => {
    expect(liveDropAction(withRed, slot('cb'), slot('st'))).toEqual({
      kind: 'swap',
      playerId: 2,
      target: { slotId: 'st' },
    });
  });
});

describe('applyLiveTap', () => {
  it('selects bench players and filled slots only', () => {
    expect(applyLiveTap(lineup, null, bench(4)).selection).toEqual(bench(4));
    expect(applyLiveTap(lineup, null, slot('cb')).selection).toEqual(slot('cb'));
    expect(applyLiveTap(lineup, null, slot('cm')).selection).toBeNull();
    expect(applyLiveTap(withRed, null, slot('st')).selection).toBeNull();
    expect(applyLiveTap(lineup, null, { kind: 'grass', x: 0, y: 0 }).selection).toBeNull();
  });

  it('bench then slot subs or fills', () => {
    expect(applyLiveTap(lineup, bench(4), slot('cb'))).toEqual({
      selection: null,
      action: { kind: 'subs', pairs: [{ outPlayerId: 2, inPlayerId: 4 }] },
    });
    expect(applyLiveTap(lineup, bench(4), slot('cm')).action).toEqual({
      kind: 'fillSlot',
      slotId: 'cm',
      playerId: 4,
    });
  });

  it('slot then bench player subs that player on', () => {
    expect(applyLiveTap(lineup, slot('st'), bench(5)).action).toEqual({
      kind: 'subs',
      pairs: [{ outPlayerId: 3, inPlayerId: 5 }],
    });
  });

  it('slot then slot swaps', () => {
    expect(applyLiveTap(lineup, slot('cb'), slot('st')).action).toEqual({
      kind: 'swap',
      playerId: 2,
      target: { playerId: 3 },
    });
  });

  it('switches between bench players and cancels on the same item or the grass', () => {
    expect(applyLiveTap(lineup, bench(4), bench(5))).toEqual({ selection: bench(5), action: null });
    expect(applyLiveTap(lineup, bench(4), bench(4))).toEqual({ selection: null, action: null });
    expect(applyLiveTap(lineup, slot('cb'), slot('cb'))).toEqual({ selection: null, action: null });
    expect(applyLiveTap(lineup, slot('cb'), { kind: 'grass', x: 0, y: 0 })).toEqual({
      selection: null,
      action: null,
    });
  });
});

describe('suggestedLiveSlots', () => {
  it('suggests spots with the player’s positions, filled or empty', () => {
    expect(suggestedLiveSlots(lineup, { primaryPosition: 'ST', secondaryPosition: 'CM' })).toEqual(
      new Map([
        ['cm', 'secondary'],
        ['st', 'primary'],
      ]),
    );
  });

  it('falls back to the positions’ lines', () => {
    expect(suggestedLiveSlots(lineup, { primaryPosition: 'LB', secondaryPosition: null })).toEqual(
      new Map([['cb', 'primary']]),
    );
  });

  it('skips spots closed by a red card, and players with no positions', () => {
    expect(
      suggestedLiveSlots(withRed, { primaryPosition: 'ST', secondaryPosition: null }).size,
    ).toBe(0);
    expect(
      suggestedLiveSlots(lineup, { primaryPosition: null, secondaryPosition: null }).size,
    ).toBe(0);
  });
});
