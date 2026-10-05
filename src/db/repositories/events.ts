import { asc, desc, eq, and } from 'drizzle-orm';

import { db } from '@/db/client';
import { matchEvents, type MatchEvent, type NewMatchEvent } from '@/db/schema';

import { ValidationError } from './errors';

export type EventInput = Omit<NewMatchEvent, 'id' | 'matchId' | 'groupId' | 'createdAt'>;

/** Unique enough for one device's local history. */
export function createGroupId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** A match's events in game order. Call `.all()`, or read through useLiveData. */
export function eventsQuery(matchId: number) {
  return db
    .select()
    .from(matchEvents)
    .where(eq(matchEvents.matchId, matchId))
    .orderBy(asc(matchEvents.gameTimeMs), asc(matchEvents.id));
}

/**
 * Records events that belong together (a goal and its assist, every sub in a quick-sub
 * preset) under one group id, atomically. Undo removes the whole group.
 */
export function recordEventGroup(matchId: number, events: EventInput[]): MatchEvent[] {
  if (events.length === 0) throw new ValidationError('Nothing to record');
  const groupId = createGroupId();
  return db.transaction((tx) =>
    events.map((event) =>
      tx
        .insert(matchEvents)
        .values({ ...event, matchId, groupId })
        .returning()
        .get(),
    ),
  );
}

/**
 * Undoes the most recently recorded group for a match. Returns the deleted events (empty if
 * there was nothing to undo).
 */
export function undoLastEventGroup(matchId: number): MatchEvent[] {
  return db.transaction((tx) => {
    const latest = tx
      .select({ groupId: matchEvents.groupId })
      .from(matchEvents)
      .where(eq(matchEvents.matchId, matchId))
      .orderBy(desc(matchEvents.id))
      .limit(1)
      .get();
    if (!latest?.groupId) return [];
    return tx
      .delete(matchEvents)
      .where(and(eq(matchEvents.matchId, matchId), eq(matchEvents.groupId, latest.groupId)))
      .returning()
      .all();
  });
}
