import {
  applyDrop,
  applyTap,
  assignPlayer,
  benchPlayers,
  changeSlotPosition,
  clearPlayers,
  findDropTarget,
  fitSlotsVertically,
  keepAvailablePlayers,
  moveSlot,
  positionOptionsFor,
  sameItem,
  suggestedSlots,
  slotFit,
  suggestForRole,
  swapSlotPlayers,
  unassignSlot,
  type DropPoint,
} from '../board';
import { COORD_MAX, COORD_MIN, parseFormationLayout } from '../formations';
import type { PlayerPosition } from '../positions';
import type { FormationSlot } from '../types';

// GK (player 1) · CB (player 2) · CM (empty) · ST (player 3)
const slots: FormationSlot[] = [
  { slotId: 'gk', role: 'GK', label: 'GK', x: 0.5, y: 0.9, playerId: 1 },
  { slotId: 'cb', role: 'DEF', label: 'CB', x: 0.5, y: 0.7, playerId: 2 },
  { slotId: 'cm', role: 'MID', label: 'CM', x: 0.5, y: 0.5 },
  { slotId: 'st', role: 'FWD', label: 'ST', x: 0.5, y: 0.3, playerId: 3 },
];

const playerIn = (list: FormationSlot[], slotId: string) =>
  list.find((s) => s.slotId === slotId)?.playerId;

describe('assignPlayer', () => {
  it('puts a bench player in an empty slot', () => {
    expect(playerIn(assignPlayer(slots, 'cm', 9), 'cm')).toBe(9);
  });

  it('sends the previous occupant to the bench', () => {
    const next = assignPlayer(slots, 'cb', 9);
    expect(playerIn(next, 'cb')).toBe(9);
    expect(next.some((s) => s.playerId === 2)).toBe(false);
  });

  it('swaps when the player is already on the pitch', () => {
    const next = assignPlayer(slots, 'st', 2);
    expect(playerIn(next, 'st')).toBe(2);
    expect(playerIn(next, 'cb')).toBe(3);
  });

  it('moves a player into an empty slot, leaving their old slot empty', () => {
    const next = assignPlayer(slots, 'cm', 2);
    expect(playerIn(next, 'cm')).toBe(2);
    expect(next.find((s) => s.slotId === 'cb')).not.toHaveProperty('playerId');
  });

  it('returns the same array for no-ops', () => {
    expect(assignPlayer(slots, 'cb', 2)).toBe(slots);
    expect(assignPlayer(slots, 'missing', 9)).toBe(slots);
  });
});

describe('swapSlotPlayers', () => {
  it('swaps two filled slots', () => {
    const next = swapSlotPlayers(slots, 'cb', 'st');
    expect([playerIn(next, 'cb'), playerIn(next, 'st')]).toEqual([3, 2]);
  });

  it('moves a player into an empty slot from either side', () => {
    expect(playerIn(swapSlotPlayers(slots, 'cb', 'cm'), 'cm')).toBe(2);
    expect(playerIn(swapSlotPlayers(slots, 'cm', 'cb'), 'cm')).toBe(2);
  });

  it('keeps slot coordinates', () => {
    const next = swapSlotPlayers(slots, 'cb', 'st');
    expect(next.map((s) => [s.x, s.y])).toEqual(slots.map((s) => [s.x, s.y]));
  });

  it('is a no-op for the same slot or two empty slots', () => {
    expect(swapSlotPlayers(slots, 'cb', 'cb')).toBe(slots);
    const empty = clearPlayers(slots);
    expect(swapSlotPlayers(empty, 'cb', 'st')).toBe(empty);
  });
});

describe('moveSlot', () => {
  it('moves a slot and clamps it inside the touchlines', () => {
    const next = moveSlot(slots, 'cm', -0.2, 1.4);
    expect(next.find((s) => s.slotId === 'cm')).toMatchObject({ x: COORD_MIN, y: COORD_MAX });
  });

  it('keeps the player in the moved slot', () => {
    expect(moveSlot(slots, 'st', 0.2, 0.2).find((s) => s.slotId === 'st')?.playerId).toBe(3);
  });

  it('is a no-op when the position is unchanged', () => {
    expect(moveSlot(slots, 'cm', 0.5, 0.5)).toBe(slots);
  });
});

describe('unassignSlot / clearPlayers / keepAvailablePlayers', () => {
  it('unassigns one slot', () => {
    expect(playerIn(unassignSlot(slots, 'cb'), 'cb')).toBeUndefined();
    expect(unassignSlot(slots, 'cm')).toBe(slots);
  });

  it('clears every slot', () => {
    expect(clearPlayers(slots).every((s) => s.playerId === undefined)).toBe(true);
  });

  it('drops players who are no longer available', () => {
    const next = keepAvailablePlayers(slots, new Set([1, 3]));
    expect(next.map((s) => s.playerId)).toEqual([1, undefined, undefined, 3]);
    expect(keepAvailablePlayers(slots, new Set([1, 2, 3]))).toBe(slots);
  });
});

describe('applyDrop', () => {
  it('bench → slot assigns', () => {
    const next = applyDrop(slots, { kind: 'bench', playerId: 9 }, { kind: 'slot', slotId: 'cm' });
    expect(playerIn(next, 'cm')).toBe(9);
  });

  it('bench → anywhere else does nothing', () => {
    const bench = { kind: 'bench', playerId: 9 } as const;
    expect(applyDrop(slots, bench, { kind: 'grass', x: 0.1, y: 0.1 })).toBe(slots);
    expect(applyDrop(slots, bench, { kind: 'bench' })).toBe(slots);
  });

  it('token → token swaps', () => {
    const next = applyDrop(slots, { kind: 'slot', slotId: 'gk' }, { kind: 'slot', slotId: 'st' });
    expect([playerIn(next, 'gk'), playerIn(next, 'st')]).toEqual([3, 1]);
  });

  it('token → grass is ignored while spots are locked (players mode)', () => {
    const grass = { kind: 'grass', x: 0.2, y: 0.4 } as const;
    expect(applyDrop(slots, { kind: 'slot', slotId: 'cm' }, grass)).toBe(slots);
  });

  describe('positions mode', () => {
    const grass = { kind: 'grass', x: 0.2, y: 0.4 } as const;

    it('token → grass moves the slot, keeping its player', () => {
      const next = applyDrop(slots, { kind: 'slot', slotId: 'st' }, grass, 'positions');
      expect(next.find((s) => s.slotId === 'st')).toMatchObject({ x: 0.2, y: 0.4, playerId: 3 });
    });

    it('never moves players', () => {
      const cb = { kind: 'slot', slotId: 'cb' } as const;
      expect(applyDrop(slots, cb, { kind: 'slot', slotId: 'st' }, 'positions')).toBe(slots);
      expect(applyDrop(slots, cb, { kind: 'bench' }, 'positions')).toBe(slots);
      const fromBench = { kind: 'bench', playerId: 9 } as const;
      expect(applyDrop(slots, fromBench, { kind: 'slot', slotId: 'cm' }, 'positions')).toBe(slots);
    });
  });

  it('token → bench unassigns', () => {
    const next = applyDrop(slots, { kind: 'slot', slotId: 'cb' }, { kind: 'bench' });
    expect(playerIn(next, 'cb')).toBeUndefined();
  });

  it('a cancelled drop does nothing', () => {
    expect(applyDrop(slots, { kind: 'slot', slotId: 'cb' }, { kind: 'none' })).toBe(slots);
  });
});

describe('applyTap', () => {
  const cb = { kind: 'slot', slotId: 'cb' } as const;
  const benchPlayer = { kind: 'bench', playerId: 9 } as const;

  it('selects the first tapped item', () => {
    expect(applyTap(slots, null, cb)).toEqual({ slots, selection: cb });
    expect(applyTap(slots, null, benchPlayer).selection).toEqual(benchPlayer);
  });

  it('ignores taps on grass or the bench zone with nothing selected', () => {
    expect(applyTap(slots, null, { kind: 'grass', x: 0.5, y: 0.5 }).selection).toBeNull();
    expect(applyTap(slots, null, { kind: 'benchZone' }).selection).toBeNull();
  });

  it('tapping the selection again cancels it', () => {
    expect(applyTap(slots, cb, cb)).toEqual({ slots, selection: null });
  });

  it('bench player, then slot: assigns', () => {
    const result = applyTap(slots, benchPlayer, { kind: 'slot', slotId: 'cm' });
    expect(playerIn(result.slots, 'cm')).toBe(9);
    expect(result.selection).toBeNull();
  });

  it('bench player, then another bench player: switches selection', () => {
    const other = { kind: 'bench', playerId: 8 } as const;
    expect(applyTap(slots, benchPlayer, other)).toEqual({ slots, selection: other });
  });

  it('slot, then slot: swaps', () => {
    const result = applyTap(slots, cb, { kind: 'slot', slotId: 'st' });
    expect([playerIn(result.slots, 'cb'), playerIn(result.slots, 'st')]).toEqual([3, 2]);
  });

  it('slot, then bench player: puts that player in the slot', () => {
    expect(playerIn(applyTap(slots, cb, benchPlayer).slots, 'cb')).toBe(9);
  });

  it('slot, then bench zone: benches its player', () => {
    expect(playerIn(applyTap(slots, cb, { kind: 'benchZone' }).slots, 'cb')).toBeUndefined();
  });

  it('slot, then grass: cancels without moving while spots are locked', () => {
    expect(applyTap(slots, cb, { kind: 'grass', x: 0.3, y: 0.6 })).toEqual({
      slots,
      selection: null,
    });
  });

  describe('positions mode', () => {
    const grass = { kind: 'grass', x: 0.3, y: 0.6 } as const;

    it('slot, then grass: moves the slot', () => {
      const result = applyTap(slots, cb, grass, 'positions');
      expect(result.slots.find((s) => s.slotId === 'cb')).toMatchObject({ x: 0.3, y: 0.6 });
      expect(result.selection).toBeNull();
    });

    it('tapping slots selects, switches and deselects; never swaps', () => {
      const st = { kind: 'slot', slotId: 'st' } as const;
      expect(applyTap(slots, null, cb, 'positions')).toEqual({ slots, selection: cb });
      expect(applyTap(slots, cb, st, 'positions')).toEqual({ slots, selection: st });
      expect(applyTap(slots, cb, cb, 'positions')).toEqual({ slots, selection: null });
    });

    it('ignores the bench', () => {
      expect(applyTap(slots, null, benchPlayer, 'positions')).toEqual({ slots, selection: null });
      expect(applyTap(slots, cb, { kind: 'benchZone' }, 'positions')).toEqual({
        slots,
        selection: cb,
      });
    });
  });
});

describe('findDropTarget', () => {
  const pitch = { pitchWidth: 200, pitchHeight: 300, overBench: false };
  const at = (x: number, y: number, overrides: Partial<DropPoint> = {}): DropPoint => ({
    ...pitch,
    x,
    y,
    ...overrides,
  });

  it('prefers the bench', () => {
    expect(findDropTarget(at(0.5, 0.7, { overBench: true }), slots, { hitRadius: 30 })).toEqual({
      kind: 'bench',
    });
  });

  it('hits the nearest slot within the radius (in pixels)', () => {
    // 0.05 * 300 = 15px from cb, 45px from cm.
    expect(findDropTarget(at(0.5, 0.65), slots, { hitRadius: 30 })).toEqual({
      kind: 'slot',
      slotId: 'cb',
    });
  });

  it('ignores the dragged slot so small nudges move it', () => {
    expect(findDropTarget(at(0.52, 0.7), slots, { hitRadius: 30, draggedSlotId: 'cb' })).toEqual({
      kind: 'grass',
      x: 0.52,
      y: 0.7,
    });
  });

  it('in positions mode, only the grass counts (so spots can sit close together)', () => {
    const options = { hitRadius: 30, draggedSlotId: 'cm', mode: 'positions' } as const;
    expect(findDropTarget(at(0.5, 0.65), slots, options)).toEqual({
      kind: 'grass',
      x: 0.5,
      y: 0.65,
    });
    expect(findDropTarget(at(0.5, 0.5, { overBench: true }), slots, options)).toEqual({
      kind: 'none',
    });
  });

  it('falls back to the grass, clamped, just past the touchline', () => {
    expect(findDropTarget(at(1.03, 0.1), slots, { hitRadius: 30 })).toEqual({
      kind: 'grass',
      x: COORD_MAX,
      y: 0.1,
    });
  });

  it('returns none well outside the pitch', () => {
    expect(findDropTarget(at(1.5, 0.5), slots, { hitRadius: 30 })).toEqual({ kind: 'none' });
  });
});

describe('bench helpers', () => {
  const roster = [
    { id: 1, primaryPosition: 'GK', secondaryPosition: null },
    { id: 4, primaryPosition: 'ST', secondaryPosition: null },
    { id: 5, primaryPosition: 'CM', secondaryPosition: 'CB' },
    { id: 6, primaryPosition: 'CB', secondaryPosition: null },
    { id: 7, primaryPosition: null, secondaryPosition: null },
  ] as const;

  it('lists players not on the pitch', () => {
    expect(benchPlayers(roster, slots).map((p) => p.id)).toEqual([4, 5, 6, 7]);
  });

  it('rates how a player fits a line', () => {
    expect(slotFit('DEF', roster[3])).toBe('primary');
    expect(slotFit('DEF', roster[2])).toBe('secondary');
    expect(slotFit('DEF', roster[4])).toBeNull();
  });

  it('orders main-position fits first, then second-position fits, keeping roster order', () => {
    expect(suggestForRole(roster, 'DEF').map((p) => p.id)).toEqual([6, 5, 1, 4, 7]);
  });
});

describe('sameItem', () => {
  it('compares items by kind and id', () => {
    expect(sameItem({ kind: 'slot', slotId: 'a' }, { kind: 'slot', slotId: 'a' })).toBe(true);
    expect(sameItem({ kind: 'bench', playerId: 1 }, { kind: 'slot', slotId: '1' })).toBe(false);
    expect(sameItem(null, null)).toBe(true);
  });
});

describe('suggestedSlots', () => {
  const layout: FormationSlot[] = [
    { slotId: 'gk', role: 'GK', label: 'GK', x: 0.5, y: 0.9 },
    { slotId: 'lb', role: 'DEF', label: 'LB', x: 0.2, y: 0.7 },
    { slotId: 'cb', role: 'DEF', label: 'CB', x: 0.5, y: 0.7 },
    { slotId: 'cb-taken', role: 'DEF', label: 'CB', x: 0.7, y: 0.7, playerId: 2 },
    { slotId: 'cdm', role: 'MID', label: 'CDM', x: 0.5, y: 0.5 },
    { slotId: 'st', role: 'FWD', label: 'ST', x: 0.5, y: 0.3 },
  ];
  const fits = (primaryPosition: PlayerPosition | null, secondaryPosition: PlayerPosition | null) =>
    Object.fromEntries(suggestedSlots(layout, { primaryPosition, secondaryPosition }));

  it('suggests open spots matching the main and second positions exactly', () => {
    expect(fits('CB', 'ST')).toEqual({ cb: 'primary', st: 'secondary' });
  });

  it('prefers an open spot on the line over a taken one with the exact label', () => {
    const cbsTaken = layout.map((s) => (s.slotId === 'cb' ? { ...s, playerId: 3 } : s));
    // Both CB spots taken: the open defensive spot fills the lineup.
    expect(
      Object.fromEntries(
        suggestedSlots(cbsTaken, { primaryPosition: 'CB', secondaryPosition: null }),
      ),
    ).toEqual({ lb: 'primary' });
  });

  it('suggests taken spots when no open one suits them (a full lineup: they would swap in)', () => {
    const full = layout.map((s, i) => ({ ...s, playerId: s.playerId ?? 10 + i }));
    expect(
      Object.fromEntries(suggestedSlots(full, { primaryPosition: 'CB', secondaryPosition: 'ST' })),
    ).toEqual({ cb: 'primary', 'cb-taken': 'primary', st: 'secondary' });
    // An open spot that doesn't suit them doesn't count: the GK spot is free here.
    const gkOpen = full.map((s) => (s.slotId === 'gk' ? { ...s, playerId: undefined } : s));
    expect(
      Object.fromEntries(
        suggestedSlots(gkOpen, { primaryPosition: 'CDM', secondaryPosition: null }),
      ),
    ).toEqual({ cdm: 'primary' });
  });

  it('falls back to open spots on the same lines when no label matches', () => {
    expect(fits('CM', 'RB')).toEqual({ cdm: 'primary', lb: 'secondary', cb: 'secondary' });
  });

  it('suggests nothing for a player without positions', () => {
    expect(fits(null, null)).toEqual({});
  });
});

describe('changeSlotPosition', () => {
  it('relabels a spot and moves it to the new line, keeping its player and place', () => {
    const next = changeSlotPosition(slots, 'cb', 'CDM');
    expect(next.find((s) => s.slotId === 'cb')).toEqual({
      slotId: 'cb',
      role: 'MID',
      label: 'CDM',
      x: 0.5,
      y: 0.7,
      playerId: 2,
    });
  });

  it('never creates a second goalkeeper', () => {
    expect(changeSlotPosition(slots, 'cb', 'GK')).toBe(slots);
  });

  it('never changes the goalkeeper spot', () => {
    expect(changeSlotPosition(slots, 'gk', 'CB')).toBe(slots);
  });

  it('is a no-op for the same position or an unknown spot', () => {
    expect(changeSlotPosition(slots, 'cb', 'CB')).toBe(slots);
    expect(changeSlotPosition(slots, 'missing', 'CM')).toBe(slots);
  });

  it('keeps the layout valid', () => {
    let next = changeSlotPosition(slots, 'cm', 'LW');
    next = changeSlotPosition(next, 'st', 'CAM');
    expect(parseFormationLayout({ slots: next }).ok).toBe(true);
  });
});

describe('positionOptionsFor', () => {
  it('offers every outfield position to outfield spots', () => {
    const options = positionOptionsFor(slots[1]);
    expect(options).toHaveLength(11);
    expect(options).not.toContain('GK');
  });

  it('offers nothing for the goalkeeper spot', () => {
    expect(positionOptionsFor(slots[0])).toEqual([]);
  });
});

describe('fitSlotsVertically', () => {
  const ys = (slots: { y: number }[]) => slots.map((s) => Number(s.y.toFixed(3)));

  it('leaves slots that already fit alone', () => {
    const slots = [{ y: 0.2 }, { y: 0.8 }];
    expect(fitSlotsVertically(slots, 0.1, 0.1)).toEqual(slots);
  });

  it('squeezes the formation evenly to keep labels on the pitch', () => {
    // GK at 0.92 with 0.12 needed below: the shape shrinks towards the top, spacing kept.
    expect(ys(fitSlotsVertically([{ y: 0.2 }, { y: 0.5 }, { y: 0.92 }], 0.1, 0.12))).toEqual([
      0.2, 0.483, 0.88,
    ]);
    expect(ys(fitSlotsVertically([{ y: 0.05 }, { y: 0.5 }], 0.1, 0.1))).toEqual([0.1, 0.5]);
  });

  it('handles a single row and an empty list', () => {
    expect(ys(fitSlotsVertically([{ y: 0.95 }, { y: 0.95 }], 0.1, 0.1))).toEqual([0.9, 0.9]);
    expect(fitSlotsVertically([], 0.1, 0.1)).toEqual([]);
  });
});
