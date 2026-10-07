import { and, asc, count, eq, getTableColumns, max } from 'drizzle-orm';

import { db } from '@/db/client';
import { players, teams, type Team } from '@/db/schema';
import { cleanKitColor } from '@/domain/colors';
import { isSameSet } from '@/domain/ordering';
import type { FieldSize } from '@/domain/types';
import { cleanName, isFieldSize } from '@/domain/validation';

import { NotFoundError, unwrap, ValidationError } from './errors';

function checkFieldSize(fieldSize: number): FieldSize {
  if (!isFieldSize(fieldSize)) throw new ValidationError('Field size must be 5, 7, 9 or 11');
  return fieldSize;
}

/** The coach's order; teams never reordered (all 0) fall back to alphabetical. */
const teamOrder = [asc(teams.sortOrder), asc(teams.name), asc(teams.id)];

/** All teams, in the coach's order. Call `.all()`, or read through useLiveData. */
export function teamsQuery() {
  return db
    .select()
    .from(teams)
    .orderBy(...teamOrder);
}

export type TeamSummary = Team & { activePlayerCount: number };

/** All teams, in the coach's order, with their active player counts. Depends on `players` too. */
export function teamSummariesQuery() {
  return db
    .select({ ...getTableColumns(teams), activePlayerCount: count(players.id) })
    .from(teams)
    .leftJoin(players, and(eq(players.teamId, teams.id), eq(players.isActive, true)))
    .groupBy(teams.id)
    .orderBy(...teamOrder);
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

/** New teams go to the end of the list. */
export function createTeam(input: TeamInput): Team {
  const last = db
    .select({ value: max(teams.sortOrder) })
    .from(teams)
    .get();
  return db
    .insert(teams)
    .values({
      sortOrder: (last?.value ?? -1) + 1,
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

/**
 * Saves the Teams list order: `ids` must be every team, once, in the order to show. Throws a
 * ValidationError otherwise (e.g. a team was added or deleted meanwhile).
 */
export function setTeamOrder(ids: readonly number[]): void {
  db.transaction((tx) => {
    const existing = tx
      .select({ id: teams.id })
      .from(teams)
      .all()
      .map((t) => t.id);
    if (!isSameSet(ids, existing)) throw new ValidationError('The team list changed. Try again.');
    ids.forEach((teamId, index) => {
      tx.update(teams).set({ sortOrder: index }).where(eq(teams.id, teamId)).run();
    });
  });
}

/** Deletes the team and, via cascades, its players, formations, matches and presets. */
export function deleteTeam(id: number): void {
  db.delete(teams).where(eq(teams.id, id)).run();
}
