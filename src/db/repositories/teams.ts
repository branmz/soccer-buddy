import { and, asc, count, eq, getTableColumns } from 'drizzle-orm';

import { db } from '@/db/client';
import { players, teams, type Team } from '@/db/schema';
import { cleanKitColor } from '@/domain/colors';
import type { FieldSize } from '@/domain/types';
import { cleanName, isFieldSize } from '@/domain/validation';

import { NotFoundError, unwrap, ValidationError } from './errors';

function checkFieldSize(fieldSize: number): FieldSize {
  if (!isFieldSize(fieldSize)) throw new ValidationError('Field size must be 5, 7, 9 or 11');
  return fieldSize;
}

/** All teams, alphabetical. Call `.all()`, or read through useLiveData. */
export function teamsQuery() {
  return db.select().from(teams).orderBy(asc(teams.name));
}

export type TeamSummary = Team & { activePlayerCount: number };

/** All teams, alphabetical, with how many active players each has. Depends on `players` too. */
export function teamSummariesQuery() {
  return db
    .select({ ...getTableColumns(teams), activePlayerCount: count(players.id) })
    .from(teams)
    .leftJoin(players, and(eq(players.teamId, teams.id), eq(players.isActive, true)))
    .groupBy(teams.id)
    .orderBy(asc(teams.name));
}

export function getTeam(id: number): Team | undefined {
  return db.select().from(teams).where(eq(teams.id, id)).get();
}

/** Kit colors are optional #rrggbb values; null means not set. */
export type TeamInput = {
  name: string;
  fieldSize?: number;
  homeColor?: string | null;
  awayColor?: string | null;
};

export function createTeam(input: TeamInput): Team {
  return db
    .insert(teams)
    .values({
      name: unwrap(cleanName(input.name, 'Team name')),
      fieldSize: checkFieldSize(input.fieldSize ?? 11),
      homeColor: unwrap(cleanKitColor(input.homeColor)),
      awayColor: unwrap(cleanKitColor(input.awayColor)),
    })
    .returning()
    .get();
}

/**
 * Changing field size keeps existing formations; screens only list formations matching the
 * team's current size.
 */
export function updateTeam(id: number, patch: Partial<TeamInput>): Team {
  const values: Partial<Pick<Team, 'name' | 'fieldSize' | 'homeColor' | 'awayColor'>> = {};
  if (patch.name !== undefined) values.name = unwrap(cleanName(patch.name, 'Team name'));
  if (patch.fieldSize !== undefined) values.fieldSize = checkFieldSize(patch.fieldSize);
  // undefined = unchanged; null = clear the color.
  if (patch.homeColor !== undefined) values.homeColor = unwrap(cleanKitColor(patch.homeColor));
  if (patch.awayColor !== undefined) values.awayColor = unwrap(cleanKitColor(patch.awayColor));

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
