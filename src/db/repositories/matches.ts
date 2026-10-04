import { and, desc, eq, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { matches, type Match } from '@/db/schema';
import type { MatchStatus } from '@/domain/types';
import { cleanName, validateMatchSettings } from '@/domain/validation';

import { NotFoundError, unwrap, ValidationError } from './errors';

export type MatchSetupInput = {
  opponentName: string;
  formationId?: number | null;
  periodCount: number;
  periodLengthMinutes: number;
  /** null = unlimited. */
  maxSubs: number | null;
};

function cleanSetup(input: MatchSetupInput) {
  const settings = unwrap(validateMatchSettings(input));
  return {
    opponentName: unwrap(cleanName(input.opponentName, 'Opponent')),
    formationId: input.formationId ?? null,
    ...settings,
    gameLengthMinutes: settings.periodCount * settings.periodLengthMinutes,
  };
}

/** A team's matches, newest first, optionally filtered by status. */
export function matchesQuery(teamId: number, status?: MatchStatus) {
  const filter =
    status === undefined
      ? eq(matches.teamId, teamId)
      : and(eq(matches.teamId, teamId), eq(matches.status, status));
  return db
    .select()
    .from(matches)
    .where(filter)
    .orderBy(desc(sql`coalesce(${matches.startedAt}, ${matches.createdAt})`), desc(matches.id));
}

/** The match currently being played, if any. Only one match is live at a time. */
export function liveMatchQuery() {
  return db.select().from(matches).where(eq(matches.status, 'live')).limit(1);
}

export function getMatch(id: number): Match | undefined {
  return db.select().from(matches).where(eq(matches.id, id)).get();
}

export function createMatch(teamId: number, input: MatchSetupInput): Match {
  return db
    .insert(matches)
    .values({ teamId, ...cleanSetup(input) })
    .returning()
    .get();
}

/** Setup details can only change before kickoff. */
export function updateMatchSetup(id: number, input: MatchSetupInput): Match {
  const existing = getMatch(id);
  if (!existing) throw new NotFoundError('Match', id);
  if (existing.status !== 'setup') {
    throw new ValidationError('Match settings can only be changed before kickoff');
  }
  const updated = db
    .update(matches)
    .set(cleanSetup(input))
    .where(eq(matches.id, id))
    .returning()
    .get();
  return updated ?? existing;
}

/** Deletes the match with its periods, events and match-scoped presets. */
export function deleteMatch(id: number): void {
  db.delete(matches).where(eq(matches.id, id)).run();
}
