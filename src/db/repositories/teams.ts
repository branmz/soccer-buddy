import { asc, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { teams, type Team } from '@/db/schema';
import type { FieldSize } from '@/domain/types';
import { cleanName, isFieldSize } from '@/domain/validation';

import { NotFoundError, unwrap, ValidationError } from './errors';

function checkFieldSize(fieldSize: number): FieldSize {
  if (!isFieldSize(fieldSize)) throw new ValidationError('Field size must be 5, 7, 9 or 11');
  return fieldSize;
}

/** All teams, alphabetical. Pass to useLiveQuery or call `.all()`. */
export function teamsQuery() {
  return db.select().from(teams).orderBy(asc(teams.name));
}

export function getTeam(id: number): Team | undefined {
  return db.select().from(teams).where(eq(teams.id, id)).get();
}

export function createTeam(input: { name: string; fieldSize?: number }): Team {
  return db
    .insert(teams)
    .values({
      name: unwrap(cleanName(input.name, 'Team name')),
      fieldSize: checkFieldSize(input.fieldSize ?? 11),
    })
    .returning()
    .get();
}

/**
 * Changing field size keeps existing formations; screens only list formations matching the
 * team's current size.
 */
export function updateTeam(id: number, patch: { name?: string; fieldSize?: number }): Team {
  const values: Partial<Pick<Team, 'name' | 'fieldSize'>> = {};
  if (patch.name !== undefined) values.name = unwrap(cleanName(patch.name, 'Team name'));
  if (patch.fieldSize !== undefined) values.fieldSize = checkFieldSize(patch.fieldSize);

  const updated =
    Object.keys(values).length === 0
      ? getTeam(id)
      : db.update(teams).set(values).where(eq(teams.id, id)).returning().get();
  if (!updated) throw new NotFoundError('Team', id);
  return updated;
}

/** Deletes the team and, via cascades, its players, formations, matches and presets. */
export function deleteTeam(id: number): void {
  db.delete(teams).where(eq(teams.id, id)).run();
}
