// Score, per-player match stats and season totals, all derived from match events.

import type { LineupEvent } from './lineup';
import { playingTime } from './playingTime';
import type { StartingLineup } from './types';

export type Score = { us: number; them: number };
export type MatchResult = 'win' | 'draw' | 'loss';

export type PlayerMatchStats = {
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
};

export type SeasonPlayerTotals = PlayerMatchStats & {
  playerId: number;
  appearances: number;
  starts: number;
  playingTimeMs: number;
};

export type SeasonRecord = {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
};

/** What season stats need from one finished match. */
export type SeasonMatch = {
  startingLineup: StartingLineup;
  events: readonly LineupEvent[];
  /** Final game time (the clock's `totalGameMs` at full time). */
  totalGameMs: number;
};

export type SeasonStats = {
  record: SeasonRecord;
  players: Map<number, SeasonPlayerTotals>;
};

export function matchScore(events: readonly Pick<LineupEvent, 'eventType'>[]): Score {
  let us = 0;
  let them = 0;
  for (const e of events) {
    if (e.eventType === 'goal') us += 1;
    else if (e.eventType === 'opponent_goal') them += 1;
  }
  return { us, them };
}

export function matchResult({ us, them }: Score): MatchResult {
  if (us > them) return 'win';
  return us === them ? 'draw' : 'loss';
}

const emptyMatchStats = (): PlayerMatchStats => ({
  goals: 0,
  assists: 0,
  yellowCards: 0,
  redCards: 0,
});

const STAT_FOR_EVENT: Partial<Record<LineupEvent['eventType'], keyof PlayerMatchStats>> = {
  goal: 'goals',
  assist: 'assists',
  yellow_card: 'yellowCards',
  red_card: 'redCards',
};

/** Goals, assists and cards per player. Players with none are left out. */
export function playerMatchStats(
  events: readonly Pick<LineupEvent, 'eventType' | 'playerId'>[],
): Map<number, PlayerMatchStats> {
  const stats = new Map<number, PlayerMatchStats>();
  for (const e of events) {
    const key = STAT_FOR_EVENT[e.eventType];
    if (!key || e.playerId === null) continue;
    const entry = stats.get(e.playerId) ?? emptyMatchStats();
    entry[key] += 1;
    stats.set(e.playerId, entry);
  }
  return stats;
}

/**
 * Team record and per-player totals. Pass finished matches only: every match given counts as
 * played. Players with no appearances, starts or events are left out, so merge in the roster
 * for the season table.
 */
export function seasonStats(matches: readonly SeasonMatch[]): SeasonStats {
  const record: SeasonRecord = {
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
  };
  const players = new Map<number, SeasonPlayerTotals>();
  const totalsFor = (playerId: number) => {
    let entry = players.get(playerId);
    if (!entry) {
      entry = { playerId, appearances: 0, starts: 0, playingTimeMs: 0, ...emptyMatchStats() };
      players.set(playerId, entry);
    }
    return entry;
  };

  for (const match of matches) {
    const score = matchScore(match.events);
    const result = matchResult(score);
    record.played += 1;
    record.goalsFor += score.us;
    record.goalsAgainst += score.them;
    if (result === 'win') record.wins += 1;
    else if (result === 'draw') record.draws += 1;
    else record.losses += 1;

    const time = playingTime(match.startingLineup, match.events, match.totalGameMs);
    for (const id of time.appeared) {
      const totals = totalsFor(id);
      totals.appearances += 1;
      totals.playingTimeMs += time.msByPlayer.get(id) ?? 0;
    }
    for (const slot of match.startingLineup.slots) {
      if (slot.playerId !== undefined) totalsFor(slot.playerId).starts += 1;
    }
    for (const [id, stats] of playerMatchStats(match.events)) {
      const totals = totalsFor(id);
      totals.goals += stats.goals;
      totals.assists += stats.assists;
      totals.yellowCards += stats.yellowCards;
      totals.redCards += stats.redCards;
    }
  }

  return { record, players };
}

export type SeasonSortKey = Exclude<keyof SeasonPlayerTotals, 'playerId'>;

/** Sorts the season table by a column (descending by default). Ties keep input order. */
export function sortSeasonTotals<T extends SeasonPlayerTotals>(
  rows: readonly T[],
  key: SeasonSortKey,
  direction: 'asc' | 'desc' = 'desc',
): T[] {
  const sign = direction === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => sign * (a[key] - b[key]));
}
