import { asc, inArray } from 'drizzle-orm';

import { db } from '@/db/client';
import { matchEvents, matchPeriods, type Match } from '@/db/schema';
import { parseStartingLineup } from '@/domain/formations';
import { finalGameMs } from '@/domain/history';
import {
  matchResult,
  matchScore,
  type MatchResult,
  type Score,
  type SeasonMatch,
} from '@/domain/stats';

import { matchesQuery } from './matches';

export type FinishedMatch = { match: Match; score: Score; result: MatchResult };

function groupByMatch<T extends { matchId: number }>(rows: readonly T[]): Map<number, T[]> {
  const byMatch = new Map<number, T[]>();
  for (const row of rows) {
    const group = byMatch.get(row.matchId);
    if (group) group.push(row);
    else byMatch.set(row.matchId, [row]);
  }
  return byMatch;
}

/** Events of several matches in recorded order, by match. */
function eventsByMatch(matchIds: number[]) {
  return groupByMatch(
    matchIds.length === 0
      ? []
      : db
          .select()
          .from(matchEvents)
          .where(inArray(matchEvents.matchId, matchIds))
          .orderBy(asc(matchEvents.id))
          .all(),
  );
}

function periodsByMatch(matchIds: number[]) {
  return groupByMatch(
    matchIds.length === 0
      ? []
      : db.select().from(matchPeriods).where(inArray(matchPeriods.matchId, matchIds)).all(),
  );
}

export type TeamHistory = {
  /** Finished matches, newest first, with their scores. */
  results: FinishedMatch[];
  /** What season stats need from each finished match. */
  season: SeasonMatch[];
};

/**
 * The team's finished matches, read once for both the results list and season stats.
 * Reads matches, match_events and match_periods: watch all three.
 */
export function teamHistory(teamId: number): TeamHistory {
  const finished = matchesQuery(teamId, 'finished').all();
  const ids = finished.map((m) => m.id);
  const events = eventsByMatch(ids);
  const periods = periodsByMatch(ids);
  const results = finished.map((match) => {
    const score = matchScore(events.get(match.id) ?? []);
    return { match, score, result: matchResult(score) };
  });
  const season = finished.flatMap((match) => {
    // A snapshot that can't be read leaves that match out instead of breaking the tab.
    if (match.startingLineupJson === null) return [];
    const startingLineup = parseStartingLineup(match.startingLineupJson);
    if (!startingLineup.ok) return [];
    return [
      {
        startingLineup: startingLineup.value,
        events: events.get(match.id) ?? [],
        totalGameMs: finalGameMs(periods.get(match.id) ?? []),
      },
    ];
  });
  return { results, season };
}
