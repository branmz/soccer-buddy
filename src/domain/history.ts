// Finished matches looked back on: final game time, minutes played and the season table
// (per-player totals merged with the roster, sortable by any column).

import { periodElapsedMs, type ClockPeriod } from './clock';
import type { LineupEvent } from './lineup';
import { playingTime } from './playingTime';
import { sortSeasonTotals, type SeasonPlayerTotals, type SeasonSortKey } from './stats';
import type { StartingLineup } from './types';

const MS_PER_MINUTE = 60_000;

/** Game time at full time: every period's active time. Pauses and breaks don't count. */
export function finalGameMs(periods: readonly ClockPeriod[]): number {
  // A finished match has every period ended; an unended one counts as zero-length.
  return periods.reduce((sum, p) => sum + periodElapsedMs(p, p.endedAt ?? p.startedAt), 0);
}

export type MinutesPlayed = { playerId: number; minutes: number };

/** Whole minutes for everyone who was on the pitch, most first. Ties keep lineup order. */
export function minutesPlayed(
  starting: StartingLineup,
  events: readonly LineupEvent[],
  totalGameMs: number,
): MinutesPlayed[] {
  const { msByPlayer, appeared } = playingTime(starting, events, totalGameMs);
  return [...appeared]
    .map((playerId) => ({
      playerId,
      minutes: Math.floor((msByPlayer.get(playerId) ?? 0) / MS_PER_MINUTE),
    }))
    .sort((a, b) => b.minutes - a.minutes);
}

/**
 * A `minutesPlayed` value for display: "23'". Everyone listed got on the pitch, so 0 whole
 * minutes means under a minute: "<1'", not a "0'" that reads as if they never played.
 */
export function formatMinutesPlayed(minutes: number): string {
  return minutes === 0 ? "<1'" : `${minutes}'`;
}

/** `minutesPlayed` with each player looked up; ids missing from `playersById` are left out. */
export function minutesWithPlayers<P>(
  minutes: readonly MinutesPlayed[],
  playersById: ReadonlyMap<number, P>,
): { player: P; minutes: number }[] {
  return minutes.flatMap(({ playerId, minutes: played }) => {
    const player = playersById.get(playerId);
    return player === undefined ? [] : [{ player, minutes: played }];
  });
}

type TablePlayer = { id: number; name: string; isActive: boolean };

export type SeasonRow<P extends TablePlayer> = SeasonPlayerTotals & { player: P };

/**
 * One row per active player (zeros if they haven't played) plus any inactive player with a
 * season to show. Rows keep the roster's order.
 */
export function seasonTable<P extends TablePlayer>(
  roster: readonly P[],
  totals: ReadonlyMap<number, SeasonPlayerTotals>,
): SeasonRow<P>[] {
  return roster.flatMap((player) => {
    const found = totals.get(player.id);
    if (!found && !player.isActive) return [];
    return [
      {
        playerId: player.id,
        appearances: 0,
        starts: 0,
        playingTimeMs: 0,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        ...found,
        player,
      },
    ];
  });
}

export type SeasonTableSort = SeasonSortKey | 'name';
export type SortDirection = 'asc' | 'desc';

/** Numbers start high-to-low, names A–Z. */
export function defaultSortDirection(key: SeasonTableSort): SortDirection {
  return key === 'name' ? 'asc' : 'desc';
}

/**
 * Tapping the sorted column flips its direction; tapping another column sorts by it in its
 * default direction.
 */
export function nextSeasonSort(
  current: { key: SeasonTableSort; direction: SortDirection },
  tapped: SeasonTableSort,
): { key: SeasonTableSort; direction: SortDirection } {
  if (current.key !== tapped) return { key: tapped, direction: defaultSortDirection(tapped) };
  return { key: tapped, direction: current.direction === 'asc' ? 'desc' : 'asc' };
}

/** A sorted copy. Ties keep input order (pass rows in roster order). */
export function sortSeasonTable<P extends TablePlayer>(
  rows: readonly SeasonRow<P>[],
  key: SeasonTableSort,
  direction: SortDirection,
): SeasonRow<P>[] {
  if (key !== 'name') return sortSeasonTotals(rows, key, direction);
  const sign = direction === 'desc' ? -1 : 1;
  return [...rows].sort(
    (a, b) => sign * a.player.name.localeCompare(b.player.name, undefined, { sensitivity: 'base' }),
  );
}
