// Playing time per player, from the lineup replay: everyone on the pitch accrues game time
// (`game_time_ms`, pauses and breaks excluded) between consecutive events.

import {
  applyLineupEvent,
  onPitchPlayerIds,
  sortEvents,
  startLineup,
  type LineupEvent,
} from './lineup';
import type { StartingLineup } from './types';

export type PlayingTime = {
  /** Every player in the lineup, on the kickoff bench or brought on; 0 if they never played. */
  msByPlayer: Map<number, number>;
  /** Players who were on the pitch at any point (a sub at the final whistle counts). */
  appeared: Set<number>;
};

/**
 * @param nowGameMs total game time so far: the clock's `totalGameMs` for a live match, or the
 * final game time for a finished one.
 */
export function playingTime(
  starting: StartingLineup,
  events: readonly LineupEvent[],
  nowGameMs: number,
): PlayingTime {
  let lineup = startLineup(starting);
  let onPitch = onPitchPlayerIds(lineup);
  const msByPlayer = new Map<number, number>();
  const appeared = new Set(onPitch);
  for (const id of [...onPitch, ...lineup.bench]) msByPlayer.set(id, 0);

  let lastMs = 0;
  const accrueUntil = (gameMs: number) => {
    const until = Math.min(Math.max(gameMs, lastMs), nowGameMs);
    const delta = Math.max(0, until - lastMs);
    for (const id of onPitch) msByPlayer.set(id, (msByPlayer.get(id) ?? 0) + delta);
    lastMs = Math.max(lastMs, until);
  };

  for (const event of sortEvents(events)) {
    const next = applyLineupEvent(lineup, event);
    if (next === lineup) continue;
    accrueUntil(event.gameTimeMs);
    lineup = next;
    onPitch = onPitchPlayerIds(lineup);
    for (const id of onPitch) {
      appeared.add(id);
      if (!msByPlayer.has(id)) msByPlayer.set(id, 0);
    }
  }
  accrueUntil(nowGameMs);

  return { msByPlayer, appeared };
}
