// Coach-chosen order for lists (e.g. teams): move one item to another place.

/**
 * The ids with `id` moved to `index` (clamped to the list), the others shifting to make room.
 * Returns the list unchanged (a copy) if `id` isn't in it.
 */
export function moveToIndex<T>(ids: readonly T[], id: T, index: number): T[] {
  const from = ids.indexOf(id);
  if (from === -1) return [...ids];
  const rest = ids.filter((_, i) => i !== from);
  const to = Math.min(Math.max(index, 0), rest.length);
  return [...rest.slice(0, to), id, ...rest.slice(to)];
}

/** True when both lists hold the same ids, in any order, without duplicates. */
export function isSameSet<T>(a: readonly T[], b: readonly T[]): boolean {
  const set = new Set(a);
  return set.size === a.length && a.length === b.length && b.every((id) => set.has(id));
}

/** Item id → index on a list. Keys are numbers (stored as strings, like any object key). */
export type Positions = Record<number, number>;

export function positionsOf(ids: readonly number[]): Positions {
  const positions: Positions = {};
  ids.forEach((id, index) => {
    positions[id] = index;
  });
  return positions;
}

/**
 * `id` moved from one index to another, the items in between shifting by one. Runs on the UI
 * thread during a drag, hence the worklet directive (a plain string to everything else).
 */
export function movePosition(
  positions: Positions,
  id: number,
  from: number,
  to: number,
): Positions {
  'worklet';
  const next: Positions = {};
  for (const key of Object.keys(positions)) {
    const itemId = Number(key);
    const p = positions[itemId];
    if (itemId === id) next[itemId] = to;
    else if (from < to && p > from && p <= to) next[itemId] = p - 1;
    else if (from > to && p < from && p >= to) next[itemId] = p + 1;
    else next[itemId] = p;
  }
  return next;
}

/** The ids sorted by their positions. */
export function idsInOrder(positions: Positions): number[] {
  'worklet';
  return Object.keys(positions)
    .map(Number)
    .sort((a, b) => positions[a] - positions[b]);
}
