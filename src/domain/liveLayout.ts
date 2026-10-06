// The formation's shape during a live match. Spots can be moved or relabelled mid-game (e.g.
// LM pushed up to LW); that's stored in `matches.live_layout_json` and laid over the replayed
// lineup by slot id. Players never move here: who is in which spot comes from the events.

import { parseFormationLayout } from './formations';
import type { LiveLineup, LiveSlot } from './lineup';
import type { FormationSlot, ParseResult } from './types';

/** A spot's shape: everything but who's in it. */
export type SpotShape = Omit<FormationSlot, 'playerId'>;

/**
 * Stored in `matches.live_layout_json`. `name` is the formation switched to mid-match (null:
 * the spots were only moved, so the match's formation name still applies).
 */
export type LiveLayout = { slots: SpotShape[] } & LiveFormation;

/** Which formation the match switched to (all null: no switch, the match's own applies). */
export type LiveFormation = { name: string | null; formationId: number | null };

/** Accepts the stored JSON string or a parsed value. */
export function parseLiveLayout(input: unknown): ParseResult<LiveLayout> {
  let value = input;
  if (typeof input === 'string') {
    try {
      value = JSON.parse(input) as unknown;
    } catch {
      return { ok: false, error: 'invalid JSON' };
    }
  }
  const layout = parseFormationLayout(value);
  if (!layout.ok) return layout;
  const { name, formationId } = value as { name?: unknown; formationId?: unknown };
  return {
    ok: true,
    value: {
      slots: layout.value.slots.map(shapeOf),
      name: typeof name === 'string' && name.trim() !== '' ? name : null,
      formationId:
        typeof formationId === 'number' && Number.isInteger(formationId) && formationId > 0
          ? formationId
          : null,
    },
  };
}

function shapeOf({ slotId, role, label, x, y }: FormationSlot): SpotShape {
  return { slotId, role, label, x, y };
}

/** The lineup with spots where the coach moved them. Unknown slot ids are ignored. */
export function applyLiveLayout(
  lineup: LiveLineup,
  layout: readonly SpotShape[] | null,
): LiveLineup {
  if (!layout || layout.length === 0) return lineup;
  const byId = new Map(layout.map((s) => [s.slotId, s]));
  const slots = lineup.slots.map((slot): LiveSlot => {
    const shape = byId.get(slot.slotId);
    return shape ? { ...slot, ...shapeOf(shape) } : slot;
  });
  return { ...lineup, slots };
}

/**
 * The shape to store after an edit: one entry per spot, players and red-card locks left out.
 * The edited spots must be exactly the match's spots.
 */
export function liveLayoutFrom(
  edited: readonly FormationSlot[],
  matchSlotIds: readonly string[],
): ParseResult<SpotShape[]> {
  const ids = new Set(edited.map((s) => s.slotId));
  if (ids.size !== edited.length || ids.size !== matchSlotIds.length) {
    return { ok: false, error: "The formation's spots don't match this match" };
  }
  if (matchSlotIds.some((id) => !ids.has(id))) {
    return { ok: false, error: "The formation's spots don't match this match" };
  }
  return { ok: true, value: edited.map(shapeOf) };
}

/** Lower is a better match: same position, then same line, then anything. */
function matchTier(from: SpotShape, to: SpotShape): number {
  if (from.label === to.label) return 0;
  if (from.role === to.role) return 1;
  return 2;
}

/**
 * Switches the shape to another formation mid-match. Each current spot (and so its player, or
 * its red-card lock) takes a spot in the new formation: the goalkeeper stays in goal, then
 * spots match by position, then by line, then by distance. Spots with players choose first;
 * empty ones (including red-card holes) take what's left. The result keeps the current slot
 * ids, so the events that put players in those spots stay valid.
 */
export function fitToFormation(
  current: readonly SpotShape[],
  target: readonly SpotShape[],
  emptySlotIds: ReadonlySet<string> = new Set(),
): ParseResult<SpotShape[]> {
  if (current.length !== target.length) {
    return { ok: false, error: `Pick a formation with ${current.length} spots` };
  }
  const pairs: { from: number; to: number; cost: number }[] = [];
  current.forEach((from, i) => {
    target.forEach((to, j) => {
      // The goalkeeper only ever swaps with the other formation's goalkeeper.
      if ((from.role === 'GK') !== (to.role === 'GK')) return;
      const distance = Math.hypot(from.x - to.x, from.y - to.y);
      const emptyLast = emptySlotIds.has(from.slotId) ? 100 : 0;
      pairs.push({ from: i, to: j, cost: emptyLast + matchTier(from, to) * 10 + distance });
    });
  });
  pairs.sort((a, b) => a.cost - b.cost);

  const assigned = new Map<number, number>();
  const taken = new Set<number>();
  for (const { from, to } of pairs) {
    if (assigned.has(from) || taken.has(to)) continue;
    assigned.set(from, to);
    taken.add(to);
  }
  if (assigned.size !== current.length) {
    return { ok: false, error: 'Both formations need exactly one goalkeeper' };
  }
  return {
    ok: true,
    value: current.map((from, i) => {
      const { role, label, x, y } = target[assigned.get(i) ?? i];
      return { slotId: from.slotId, role, label, x, y };
    }),
  };
}
