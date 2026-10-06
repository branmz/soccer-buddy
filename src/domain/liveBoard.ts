// The live board: drags and taps on the pitch and bench, turned into live actions. Nothing
// changes here; the screen records the action and the lineup is replayed from events.

import {
  suggestAmong,
  type BoardItem,
  type DropTarget,
  type SlotFit,
  type TapTarget,
} from './board';
import type { LiveLineup } from './lineup';
import type { LiveAction } from './matchEvents';
import type { PlayerPositions } from './positions';

const slotById = (lineup: LiveLineup, slotId: string) =>
  lineup.slots.find((s) => s.slotId === slotId);

/** Bench player onto a slot: a sub for its player, or filling it when it's empty. */
function benchToSlot(lineup: LiveLineup, playerId: number, slotId: string): LiveAction | null {
  const slot = slotById(lineup, slotId);
  if (!slot || slot.locked) return null;
  if (slot.playerId === undefined) return { kind: 'fillSlot', slotId, playerId };
  return { kind: 'subs', pairs: [{ outPlayerId: slot.playerId, inPlayerId: playerId }] };
}

/** Player in one slot onto another: swap with its player, or move into it when empty. */
function slotToSlot(lineup: LiveLineup, fromId: string, toId: string): LiveAction | null {
  const from = slotById(lineup, fromId);
  const to = slotById(lineup, toId);
  // A locked (red-card) spot can be moved into: the lock moves to the spot left behind.
  if (!from || !to || fromId === toId || from.playerId === undefined) return null;
  return {
    kind: 'swap',
    playerId: from.playerId,
    target: to.playerId === undefined ? { slotId: toId } : { playerId: to.playerId },
  };
}

/**
 * What a drag does: bench → slot subs or fills; slot → slot swaps or moves. Dropping a pitch
 * player on the bench does nothing: a sub always says who comes on.
 */
export function liveDropAction(
  lineup: LiveLineup,
  source: BoardItem,
  target: DropTarget,
): LiveAction | null {
  if (target.kind !== 'slot') return null;
  return source.kind === 'bench'
    ? benchToSlot(lineup, source.playerId, target.slotId)
    : slotToSlot(lineup, source.slotId, target.slotId);
}

/** Whether an item can be picked up: bench players, and slots with a player in them. */
function selectable(lineup: LiveLineup, item: BoardItem): boolean {
  if (item.kind === 'bench') return lineup.bench.includes(item.playerId);
  return slotById(lineup, item.slotId)?.playerId !== undefined;
}

/**
 * Tap-to-select fallback for every drag. First tap picks up a player (bench or pitch), the
 * second says where they go. The same tap again, or the grass, cancels.
 */
export function applyLiveTap(
  lineup: LiveLineup,
  selection: BoardItem | null,
  tapped: TapTarget,
): { selection: BoardItem | null; action: LiveAction | null } {
  const item = tapped.kind === 'slot' || tapped.kind === 'bench' ? tapped : null;
  const pick = (next: BoardItem | null) => ({
    selection: next && selectable(lineup, next) ? next : null,
    action: null,
  });
  if (selection === null || item === null) return pick(selection === null ? item : null);

  if (selection.kind === 'bench') {
    if (item.kind === 'bench') return pick(item.playerId === selection.playerId ? null : item);
    return { selection: null, action: benchToSlot(lineup, selection.playerId, item.slotId) };
  }
  if (item.kind === 'slot') {
    if (item.slotId === selection.slotId) return pick(null);
    return { selection: null, action: slotToSlot(lineup, selection.slotId, item.slotId) };
  }
  // A pitch player, then a bench player: that bench player comes on for them.
  return { selection: null, action: benchToSlot(lineup, item.playerId, selection.slotId) };
}

/**
 * Where a bench player fits, to highlight while they're picked up: spots labelled with their
 * main or second position, filled or empty (a sub replaces whoever is there). If none match,
 * spots on those positions' lines. Spots closed by a red card are never suggested.
 */
export function suggestedLiveSlots(
  lineup: LiveLineup,
  positions: PlayerPositions,
): Map<string, Exclude<SlotFit, null>> {
  return suggestAmong(
    lineup.slots.filter((s) => !s.locked),
    positions,
  );
}
