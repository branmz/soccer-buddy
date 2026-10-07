import { and, asc, eq, max } from 'drizzle-orm';

import { db } from '@/db/client';
import { formations, teams, type Formation } from '@/db/schema';
import { parseFormationLayout } from '@/domain/formations';
import type { FieldSize, FormationLayout } from '@/domain/types';
import { isSameSet } from '@/domain/ordering';
import { cleanName } from '@/domain/validation';

import { NotFoundError, unwrap, ValidationError } from './errors';

export type FormationWithLayout = Omit<Formation, 'layoutJson'> & { layout: FormationLayout };

function withLayout(row: Formation): FormationWithLayout {
  const { layoutJson, ...rest } = row;
  return { ...rest, layout: unwrap(parseFormationLayout(layoutJson)) };
}

/** The coach's order; formations never reordered (all 0) fall back to alphabetical. */
const formationOrder = [asc(formations.sortOrder), asc(formations.name), asc(formations.id)];

function teamFilter(teamId: number, fieldSize?: FieldSize) {
  return fieldSize === undefined
    ? eq(formations.teamId, teamId)
    : and(eq(formations.teamId, teamId), eq(formations.fieldSize, fieldSize));
}

/**
 * A team's saved formations in the coach's order, optionally only one field size.
 * Rows carry raw `layoutJson`; parse with parseFormationLayout when rendering.
 */
export function formationsQuery(teamId: number, fieldSize?: FieldSize) {
  return db
    .select()
    .from(formations)
    .where(teamFilter(teamId, fieldSize))
    .orderBy(...formationOrder);
}

export function getFormation(id: number): FormationWithLayout | undefined {
  const row = db.select().from(formations).where(eq(formations.id, id)).get();
  return row && withLayout(row);
}

/** Saves a new formation, last in the team's order; its field size is taken from the team. */
export function createFormation(
  teamId: number,
  input: { name: string; layout: FormationLayout },
): FormationWithLayout {
  const team = db
    .select({ fieldSize: teams.fieldSize })
    .from(teams)
    .where(eq(teams.id, teamId))
    .get();
  if (!team) throw new NotFoundError('Team', teamId);
  const layout = unwrap(parseFormationLayout(input.layout, { fieldSize: team.fieldSize }));
  const last = db
    .select({ value: max(formations.sortOrder) })
    .from(formations)
    .where(eq(formations.teamId, teamId))
    .get();

  const row = db
    .insert(formations)
    .values({
      teamId,
      sortOrder: (last?.value ?? -1) + 1,
      name: unwrap(cleanName(input.name, 'Formation name')),
      fieldSize: team.fieldSize,
      layoutJson: JSON.stringify(layout),
    })
    .returning()
    .get();
  return withLayout(row);
}

export function updateFormation(
  id: number,
  patch: { name?: string; layout?: FormationLayout },
): FormationWithLayout {
  const existing = db.select().from(formations).where(eq(formations.id, id)).get();
  if (!existing) throw new NotFoundError('Formation', id);

  const values: Partial<Pick<Formation, 'name' | 'layoutJson'>> = {};
  if (patch.name !== undefined) values.name = unwrap(cleanName(patch.name, 'Formation name'));
  if (patch.layout !== undefined) {
    const layout = unwrap(parseFormationLayout(patch.layout, { fieldSize: existing.fieldSize }));
    values.layoutJson = JSON.stringify(layout);
  }
  if (Object.keys(values).length === 0) return withLayout(existing);

  const row = db.update(formations).set(values).where(eq(formations.id, id)).returning().get();
  return withLayout(row ?? existing);
}

/**
 * Saves the order of a team's formations for one field size (the Tactics list): `ids` must be
 * all of them, once. Other field sizes keep their places after these.
 */
export function setFormationOrder(
  teamId: number,
  fieldSize: FieldSize,
  ids: readonly number[],
): void {
  db.transaction((tx) => {
    const shown = tx
      .select({ id: formations.id })
      .from(formations)
      .where(teamFilter(teamId, fieldSize))
      .all()
      .map((f) => f.id);
    if (!isSameSet(ids, shown)) {
      throw new ValidationError('The formation list changed. Try again.');
    }
    const others = tx
      .select({ id: formations.id })
      .from(formations)
      .where(eq(formations.teamId, teamId))
      .orderBy(...formationOrder)
      .all()
      .map((f) => f.id)
      .filter((id) => !shown.includes(id));
    [...ids, ...others].forEach((id, index) => {
      tx.update(formations).set({ sortOrder: index }).where(eq(formations.id, id)).run();
    });
  });
}

/** Matches that used this formation keep their starting-lineup snapshot. */
export function deleteFormation(id: number): void {
  db.delete(formations).where(eq(formations.id, id)).run();
}
