// Roster rules. Duplicate jersey numbers are allowed (kits get lost, guests play) but the UI
// warns about them, so these helpers only report conflicts; they never reject.

import { PLAYER_POSITIONS, type PlayerPosition } from './positions';

export type RosterEntry = {
  id: number;
  name: string;
  jerseyNumber: number | null;
  isActive: boolean;
};

export const ROSTER_SORTS = ['number', 'name', 'position'] as const;
export type RosterSort = (typeof ROSTER_SORTS)[number];

export function isRosterSort(value: unknown): value is RosterSort {
  return typeof value === 'string' && (ROSTER_SORTS as readonly string[]).includes(value);
}

/** Front to back: strikers first, goalkeeper last. */
const POSITION_RANK = new Map([...PLAYER_POSITIONS].reverse().map((p, i) => [p, i]));

type SortableEntry = RosterEntry & { primaryPosition: PlayerPosition | null };

const byName = (a: SortableEntry, b: SortableEntry) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });

/** Missing values sort last. */
function compareNullable(a: number | null | undefined, b: number | null | undefined): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  return a - b;
}

const COMPARATORS: Record<RosterSort, (a: SortableEntry, b: SortableEntry) => number> = {
  number: (a, b) => compareNullable(a.jerseyNumber, b.jerseyNumber) || byName(a, b),
  name: (a, b) => byName(a, b) || compareNullable(a.jerseyNumber, b.jerseyNumber),
  position: (a, b) =>
    compareNullable(
      a.primaryPosition && POSITION_RANK.get(a.primaryPosition),
      b.primaryPosition && POSITION_RANK.get(b.primaryPosition),
    ) ||
    compareNullable(a.jerseyNumber, b.jerseyNumber) ||
    byName(a, b),
};

/**
 * Returns a sorted copy. `number`: lowest first, unnumbered last. `name`: A–Z, case-insensitive.
 * `position`: by main position from strikers back to goalkeeper, no position last.
 */
export function sortRoster<T extends SortableEntry>(players: readonly T[], sort: RosterSort): T[] {
  return [...players].sort(COMPARATORS[sort]);
}

/** Active players sharing a jersey number with at least one other active player. */
export function playersWithDuplicateJersey(players: readonly RosterEntry[]): Set<number> {
  const idsByNumber = new Map<number, number[]>();
  for (const player of players) {
    if (!player.isActive || player.jerseyNumber === null) continue;
    const ids = idsByNumber.get(player.jerseyNumber) ?? [];
    ids.push(player.id);
    idsByNumber.set(player.jerseyNumber, ids);
  }
  const duplicates = new Set<number>();
  for (const ids of idsByNumber.values()) {
    if (ids.length > 1) ids.forEach((id) => duplicates.add(id));
  }
  return duplicates;
}

/**
 * The first other active player already wearing `jerseyNumber`, for a warning while editing.
 * `excludeId` is the player being edited.
 */
export function findJerseyConflict(
  players: readonly RosterEntry[],
  jerseyNumber: number | null,
  excludeId?: number,
): RosterEntry | undefined {
  if (jerseyNumber === null) return undefined;
  return players.find((p) => p.isActive && p.id !== excludeId && p.jerseyNumber === jerseyNumber);
}

/**
 * Another active player with the same name (ignoring case and spaces), for a warning while
 * editing: two "Michael"s look the same on the pitch. `excludeId` is the player being edited.
 */
export function findNameConflict(
  players: readonly RosterEntry[],
  name: string,
  excludeId?: number,
): RosterEntry | undefined {
  const key = name.trim().toLowerCase();
  if (key === '') return undefined;
  return players.find(
    (p) => p.isActive && p.id !== excludeId && p.name.trim().toLowerCase() === key,
  );
}

/**
 * Names that tell players apart in plain text (the match log, toasts): when two players share
 * a name (ignoring case and spaces), each gets their number, e.g. "Michael #3" / "Michael #6".
 * Unique names, and a clashing player with no number, stay as they are.
 */
export function distinctNames(
  players: readonly Pick<RosterEntry, 'id' | 'name' | 'jerseyNumber'>[],
): Map<number, string> {
  const key = (name: string) => name.trim().toLowerCase();
  const counts = new Map<string, number>();
  for (const player of players) {
    counts.set(key(player.name), (counts.get(key(player.name)) ?? 0) + 1);
  }
  return new Map(
    players.map((player) => {
      const clashes = (counts.get(key(player.name)) ?? 0) > 1;
      const name = player.name.trim();
      return [
        player.id,
        clashes && player.jerseyNumber !== null ? `${name} #${player.jerseyNumber}` : name,
      ];
    }),
  );
}

/** Parses the jersey text field: blank means no number. Returns undefined if not a number. */
export function parseJerseyInput(text: string): number | null | undefined {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  if (!/^\d+$/.test(trimmed)) return undefined;
  return Number(trimmed);
}

/**
 * The team the app should treat as active: the stored one if it still exists, otherwise the
 * first team (e.g. after the active team was deleted), or null when there are no teams.
 *
 * `teams` can lag behind the database (change events arrive asynchronously), so a stored id
 * missing from it is checked with `teamExists` before being discarded.
 */
export function resolveActiveTeamId(
  storedId: number | null,
  teams: readonly { id: number }[],
  teamExists: (id: number) => boolean = () => false,
): number | null {
  if (storedId !== null && (teams.some((t) => t.id === storedId) || teamExists(storedId))) {
    return storedId;
  }
  return teams[0]?.id ?? null;
}
