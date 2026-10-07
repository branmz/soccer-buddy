// Formation-board edits as pure transforms over a slot list. Every transform returns the same
// array when nothing changed, so callers can detect no-ops with `===`.

import { clampCoordinate } from './formations';
import {
  PLAYER_POSITIONS,
  POSITION_LINE,
  type PlayerPosition,
  type PlayerPositions,
} from './positions';
import type { FormationSlot, SlotRole } from './types';

/** Something the coach can pick up: a pitch slot (with or without a player) or a bench player. */
export type BoardItem = { kind: 'slot'; slotId: string } | { kind: 'bench'; playerId: number };

/** Where a dragged item was released. `grass` coordinates are normalized to the pitch. */
export type DropTarget =
  | { kind: 'slot'; slotId: string }
  | { kind: 'bench' }
  | { kind: 'grass'; x: number; y: number }
  | { kind: 'none' };

/** What a tap landed on: an item, the bench's drop zone, or open grass. */
export type TapTarget = BoardItem | { kind: 'benchZone' } | { kind: 'grass'; x: number; y: number };

export function sameItem(a: BoardItem | null, b: BoardItem | null): boolean {
  if (a === null || b === null) return a === b;
  if (a.kind === 'slot' && b.kind === 'slot') return a.slotId === b.slotId;
  if (a.kind === 'bench' && b.kind === 'bench') return a.playerId === b.playerId;
  return false;
}

function withPlayer(slot: FormationSlot, playerId: number | undefined): FormationSlot {
  const { playerId: _previous, ...rest } = slot;
  return playerId === undefined ? rest : { ...rest, playerId };
}

/**
 * Puts a player in a slot. If the player was in another slot, the target's previous occupant
 * moves there (a swap); otherwise the previous occupant goes to the bench.
 */
export function assignPlayer(
  slots: FormationSlot[],
  slotId: string,
  playerId: number,
): FormationSlot[] {
  const target = slots.find((s) => s.slotId === slotId);
  const from = slots.find((s) => s.playerId === playerId);
  if (!target || from?.slotId === slotId) return slots;
  return slots.map((s) => {
    if (s.slotId === slotId) return withPlayer(s, playerId);
    if (s.slotId === from?.slotId) return withPlayer(s, target.playerId);
    return s;
  });
}

/** Swaps the players in two slots (either may be empty). Slots keep their positions. */
export function swapSlotPlayers(slots: FormationSlot[], a: string, b: string): FormationSlot[] {
  const first = slots.find((s) => s.slotId === a);
  const second = slots.find((s) => s.slotId === b);
  if (!first || !second || a === b) return slots;
  if (first.playerId !== undefined) return assignPlayer(slots, b, first.playerId);
  if (second.playerId !== undefined) return assignPlayer(slots, a, second.playerId);
  return slots;
}

/** Moves a slot to new pitch coordinates, kept inside the touchlines. */
export function moveSlot(
  slots: FormationSlot[],
  slotId: string,
  x: number,
  y: number,
): FormationSlot[] {
  const target = slots.find((s) => s.slotId === slotId);
  if (!target) return slots;
  const next = { x: clampCoordinate(x), y: clampCoordinate(y) };
  if (target.x === next.x && target.y === next.y) return slots;
  return slots.map((s) => (s.slotId === slotId ? { ...s, ...next } : s));
}

/** Sends a slot's player to the bench. */
export function unassignSlot(slots: FormationSlot[], slotId: string): FormationSlot[] {
  if (slots.find((s) => s.slotId === slotId)?.playerId === undefined) return slots;
  return slots.map((s) => (s.slotId === slotId ? withPlayer(s, undefined) : s));
}

/** Empties every slot, keeping the shape. */
export function clearPlayers(slots: FormationSlot[]): FormationSlot[] {
  if (slots.every((s) => s.playerId === undefined)) return slots;
  return slots.map((s) => withPlayer(s, undefined));
}

/**
 * Drops players who can't play (deactivated or removed from the roster), e.g. when loading a
 * saved formation.
 */
export function keepAvailablePlayers(
  slots: FormationSlot[],
  availableIds: ReadonlySet<number>,
): FormationSlot[] {
  if (slots.every((s) => s.playerId === undefined || availableIds.has(s.playerId))) return slots;
  return slots.map((s) =>
    s.playerId === undefined || availableIds.has(s.playerId) ? s : withPlayer(s, undefined),
  );
}

/**
 * The editor's two modes. `players` (default): spots are locked in place and drags move
 * players. `positions`: drags move spots, and players stay where they are.
 */
export type BoardMode = 'players' | 'positions';

/**
 * What a drag does. Players mode: bench → slot assigns; slot → slot swaps players; slot →
 * bench sends its player to the bench. Positions mode: slot → grass moves the slot.
 * Anything else is a no-op, so the token snaps back.
 */
export function applyDrop(
  slots: FormationSlot[],
  source: BoardItem,
  target: DropTarget,
  mode: BoardMode = 'players',
): FormationSlot[] {
  if (mode === 'positions') {
    return source.kind === 'slot' && target.kind === 'grass'
      ? moveSlot(slots, source.slotId, target.x, target.y)
      : slots;
  }
  if (source.kind === 'bench') {
    return target.kind === 'slot' ? assignPlayer(slots, target.slotId, source.playerId) : slots;
  }
  switch (target.kind) {
    case 'slot':
      return swapSlotPlayers(slots, source.slotId, target.slotId);
    case 'bench':
      return unassignSlot(slots, source.slotId);
    case 'grass':
    case 'none':
      return slots;
  }
}

/**
 * Tap-to-select fallback for every drag: the first tap selects an item, the second tap says
 * where it goes. Tapping the selected item again, or empty space, cancels.
 */
export function applyTap(
  slots: FormationSlot[],
  selection: BoardItem | null,
  tapped: TapTarget,
  mode: BoardMode = 'players',
): { slots: FormationSlot[]; selection: BoardItem | null } {
  if (mode === 'positions') return applyPositionsTap(slots, selection, tapped);
  const item = tapped.kind === 'slot' || tapped.kind === 'bench' ? tapped : null;
  if (selection === null) return { slots, selection: item };
  if (sameItem(selection, item)) return { slots, selection: null };

  const done = (next: FormationSlot[]) => ({ slots: next, selection: null });
  if (selection.kind === 'bench') {
    if (tapped.kind === 'slot') return done(assignPlayer(slots, tapped.slotId, selection.playerId));
    // Another bench player takes over the selection; anything else cancels.
    return { slots, selection: item };
  }

  const from = selection.slotId;
  switch (tapped.kind) {
    case 'slot':
      return done(swapSlotPlayers(slots, from, tapped.slotId));
    case 'bench':
      return done(assignPlayer(slots, from, tapped.playerId));
    case 'benchZone':
      return done(unassignSlot(slots, from));
    case 'grass':
      // Spots are locked in players mode: tapping the grass just cancels.
      return { slots, selection: null };
  }
}

/** Positions mode: tap a spot, then the grass to move it there. The bench is inactive. */
function applyPositionsTap(
  slots: FormationSlot[],
  selection: BoardItem | null,
  tapped: TapTarget,
): { slots: FormationSlot[]; selection: BoardItem | null } {
  if (tapped.kind === 'slot') {
    return { slots, selection: sameItem(selection, tapped) ? null : tapped };
  }
  if (tapped.kind === 'grass' && selection?.kind === 'slot') {
    return { slots: moveSlot(slots, selection.slotId, tapped.x, tapped.y), selection: null };
  }
  return { slots, selection: tapped.kind === 'grass' ? null : selection };
}

export type DropPoint = {
  /** Release point normalized to the pitch (may fall outside 0–1). */
  x: number;
  y: number;
  /** True when released over the bench sidebar. */
  overBench: boolean;
  pitchWidth: number;
  pitchHeight: number;
};

/** How far past the touchline a release still counts as the grass (fraction of the pitch). */
const GRASS_MARGIN = 0.06;

/**
 * Hit-tests a release point: the bench wins, then the nearest slot centre within `hitRadius`
 * pixels (ignoring the slot being dragged, so small nudges move it), then the grass.
 * In positions mode only the grass counts, so a spot can be placed right next to another.
 */
export function findDropTarget(
  point: DropPoint,
  slots: readonly FormationSlot[],
  options: { hitRadius: number; draggedSlotId?: string; mode?: BoardMode },
): DropTarget {
  const positionsMode = options.mode === 'positions';
  if (point.overBench) return positionsMode ? { kind: 'none' } : { kind: 'bench' };

  let nearest: { slotId: string; distance: number } | null = null;
  for (const slot of positionsMode ? [] : slots) {
    if (slot.slotId === options.draggedSlotId) continue;
    const distance = Math.hypot(
      (slot.x - point.x) * point.pitchWidth,
      (slot.y - point.y) * point.pitchHeight,
    );
    if (distance <= options.hitRadius && (nearest === null || distance < nearest.distance)) {
      nearest = { slotId: slot.slotId, distance };
    }
  }
  if (nearest) return { kind: 'slot', slotId: nearest.slotId };

  const onGrass = (v: number) => v >= -GRASS_MARGIN && v <= 1 + GRASS_MARGIN;
  if (onGrass(point.x) && onGrass(point.y)) {
    return { kind: 'grass', x: clampCoordinate(point.x), y: clampCoordinate(point.y) };
  }
  return { kind: 'none' };
}

/** Active players not on the pitch, in roster order. */
export function benchPlayers<T extends { id: number }>(
  roster: readonly T[],
  slots: readonly FormationSlot[],
): T[] {
  const onPitch = new Set(slots.flatMap((s) => (s.playerId === undefined ? [] : [s.playerId])));
  return roster.filter((p) => !onPitch.has(p.id));
}

export type SlotFit = 'primary' | 'secondary' | null;

/** Whether a player's main or second position is on the slot's line. */
export function slotFit(role: SlotRole, positions: PlayerPositions): SlotFit {
  if (positions.primaryPosition && POSITION_LINE[positions.primaryPosition] === role) {
    return 'primary';
  }
  if (positions.secondaryPosition && POSITION_LINE[positions.secondaryPosition] === role) {
    return 'secondary';
  }
  return null;
}

const fitRank = (fit: SlotFit) => (fit === 'primary' ? 0 : fit === 'secondary' ? 1 : 2);

/** Bench order for filling a slot: main-position fits first, then second-position fits. */
export function suggestForRole<T extends PlayerPositions>(
  players: readonly T[],
  role: SlotRole,
): T[] {
  return [...players].sort((a, b) => fitRank(slotFit(role, a)) - fitRank(slotFit(role, b)));
}

/**
 * Open spots that suit a player, for highlighting on the pitch: spots labelled with their
 * main or second position. If none of those are free, any open spot on those positions'
 * lines (e.g. LB for a CB). Spots with a player already in them are never suggested.
 */
export function suggestedSlots(
  slots: readonly FormationSlot[],
  positions: PlayerPositions,
): Map<string, Exclude<SlotFit, null>> {
  return suggestAmong(
    slots.filter((s) => s.playerId === undefined),
    positions,
  );
}

/**
 * The rule behind the spot highlights, over the spots that can take the player: exact
 * position matches if any, otherwise spots on those positions' lines.
 */
export function suggestAmong(
  open: readonly FormationSlot[],
  positions: PlayerPositions,
): Map<string, Exclude<SlotFit, null>> {
  const exact = new Map<string, Exclude<SlotFit, null>>();
  for (const slot of open) {
    if (slot.label === positions.primaryPosition) exact.set(slot.slotId, 'primary');
    else if (slot.label === positions.secondaryPosition) exact.set(slot.slotId, 'secondary');
  }
  if (exact.size > 0) return exact;

  const byLine = new Map<string, Exclude<SlotFit, null>>();
  for (const slot of open) {
    const fit = slotFit(slot.role, positions);
    if (fit) byLine.set(slot.slotId, fit);
  }
  return byLine;
}

/**
 * Positions a spot can be changed to. A formation has exactly one goalkeeper, so the GK spot
 * can't change and no other spot can become GK. Empty for the GK spot.
 */
export function positionOptionsFor(slot: FormationSlot): PlayerPosition[] {
  if (slot.role === 'GK') return [];
  return PLAYER_POSITIONS.filter((p) => p !== 'GK');
}

/** Relabels a spot (e.g. CDM → CM); its line follows the new position. Keeps its player. */
export function changeSlotPosition(
  slots: FormationSlot[],
  slotId: string,
  position: PlayerPosition,
): FormationSlot[] {
  const slot = slots.find((s) => s.slotId === slotId);
  if (!slot || slot.label === position || !positionOptionsFor(slot).includes(position)) {
    return slots;
  }
  return slots.map((s) =>
    s.slotId === slotId ? { ...s, label: position, role: POSITION_LINE[position] } : s,
  );
}

/**
 * For read-only previews: squeezes the slots vertically (keeping their spacing in proportion)
 * so every y lies within [top, 1 − bottom]. Margins are normalized to the pitch height and
 * make room for labels that hang above and below tokens. Slots already inside are unchanged.
 */
export function fitSlotsVertically<T extends Pick<FormationSlot, 'y'>>(
  slots: readonly T[],
  top: number,
  bottom: number,
): T[] {
  if (slots.length === 0) return [...slots];
  const ys = slots.map((s) => s.y);
  const lo = Math.min(...ys);
  const hi = Math.max(...ys);
  const clamp = (y: number) => Math.min(Math.max(y, top), 1 - bottom);
  const min = clamp(lo);
  const max = Math.max(min, clamp(hi));
  if (min === lo && max === hi) return [...slots];
  const scale = hi === lo ? 0 : (max - min) / (hi - lo);
  return slots.map((s) => ({ ...s, y: min + (s.y - lo) * scale }));
}
