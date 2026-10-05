import type { FormationSlot } from '@/domain/types';

import { UNDO_LIMIT, useBoardStore } from '../boardStore';

const slots: FormationSlot[] = [
  { slotId: 'gk', role: 'GK', label: 'GK', x: 0.5, y: 0.9 },
  { slotId: 'cb', role: 'DEF', label: 'CB', x: 0.5, y: 0.7 },
];

const store = () => useBoardStore.getState();
const playerIn = (slotId: string) => store().slots.find((s) => s.slotId === slotId)?.playerId;

beforeEach(() => {
  store().reset();
  store().load('1', '2-0', slots);
});

describe('boardStore undo', () => {
  it('starts with nothing to undo', () => {
    expect(store().undoStack).toEqual([]);
    store().undo();
    expect(store().slots).toBe(slots);
  });

  it('undoes player moves one step at a time', () => {
    store().drop({ kind: 'bench', playerId: 7 }, { kind: 'slot', slotId: 'gk' });
    store().drop({ kind: 'bench', playerId: 8 }, { kind: 'slot', slotId: 'cb' });
    expect([playerIn('gk'), playerIn('cb')]).toEqual([7, 8]);

    store().undo();
    expect([playerIn('gk'), playerIn('cb')]).toEqual([7, undefined]);
    store().undo();
    expect(store().slots).toBe(slots);
  });

  it('undoes moved spots and tap-placed players', () => {
    store().setMode('positions');
    store().drop({ kind: 'slot', slotId: 'cb' }, { kind: 'grass', x: 0.2, y: 0.6 });
    store().setMode('players');
    store().tap({ kind: 'bench', playerId: 7 });
    store().tap({ kind: 'slot', slotId: 'gk' });
    expect(store().undoStack).toHaveLength(2);

    store().undo();
    expect(playerIn('gk')).toBeUndefined();
    expect(store().slots.find((s) => s.slotId === 'cb')).toMatchObject({ x: 0.2, y: 0.6 });
    store().undo();
    expect(store().slots).toBe(slots);
  });

  it('undoes "clear all players"', () => {
    store().drop({ kind: 'bench', playerId: 7 }, { kind: 'slot', slotId: 'gk' });
    store().clearPlayers();
    store().undo();
    expect(playerIn('gk')).toBe(7);
  });

  it('ignores no-op changes and selection-only taps', () => {
    store().drop({ kind: 'slot', slotId: 'cb' }, { kind: 'grass', x: 0.1, y: 0.1 }); // locked
    store().tap({ kind: 'slot', slotId: 'cb' });
    expect(store().undoStack).toEqual([]);
  });

  it(`keeps at most ${UNDO_LIMIT} steps`, () => {
    for (let i = 0; i < UNDO_LIMIT + 5; i++) {
      store().drop({ kind: 'bench', playerId: 100 + i }, { kind: 'slot', slotId: 'gk' });
    }
    expect(store().undoStack).toHaveLength(UNDO_LIMIT);
  });

  it('undoes position changes', () => {
    store().changePosition('cb', 'CDM');
    expect(store().slots.find((s) => s.slotId === 'cb')).toMatchObject({
      label: 'CDM',
      role: 'MID',
    });
    store().undo();
    expect(store().slots).toBe(slots);
  });

  it('starts a fresh history when another formation loads', () => {
    store().drop({ kind: 'bench', playerId: 7 }, { kind: 'slot', slotId: 'gk' });
    store().load('2', 'Other', slots);
    expect(store().undoStack).toEqual([]);
  });
});

describe('boardStore dirty', () => {
  it('is clean again after undoing back to the loaded layout', () => {
    store().drop({ kind: 'bench', playerId: 7 }, { kind: 'slot', slotId: 'gk' });
    expect(store().dirty).toBe(true);
    store().undo();
    expect(store().dirty).toBe(false);
  });

  it('compares against the last save, and undo past it is a change', () => {
    store().drop({ kind: 'bench', playerId: 7 }, { kind: 'slot', slotId: 'gk' });
    store().markSaved('1');
    expect(store().dirty).toBe(false);
    store().undo();
    expect(store().dirty).toBe(true);
  });

  it('tracks renames separately from undo', () => {
    store().setName('New name');
    expect(store().dirty).toBe(true);
    store().setName('2-0');
    expect(store().dirty).toBe(false);
  });
});
