import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { formations, teams, type Formation } from '@/db/schema';
import { parseFormationLayout } from '@/domain/formations';
import type { FieldSize, FormationLayout } from '@/domain/types';
import { cleanName } from '@/domain/validation';

import { NotFoundError, unwrap } from './errors';

export type FormationWithLayout = Omit<Formation, 'layoutJson'> & { layout: FormationLayout };

function withLayout(row: Formation): FormationWithLayout {
  const { layoutJson, ...rest } = row;
  return { ...rest, layout: unwrap(parseFormationLayout(layoutJson)) };
}

/**
 * A team's saved formations, alphabetical, optionally only one field size.
 * Rows carry raw `layoutJson`; parse with parseFormationLayout when rendering.
 */
export function formationsQuery(teamId: number, fieldSize?: FieldSize) {
  const filter =
    fieldSize === undefined
      ? eq(formations.teamId, teamId)
      : and(eq(formations.teamId, teamId), eq(formations.fieldSize, fieldSize));
  return db.select().from(formations).where(filter).orderBy(asc(formations.name));
}

export function getFormation(id: number): FormationWithLayout | undefined {
  const row = db.select().from(formations).where(eq(formations.id, id)).get();
  return row && withLayout(row);
}

/** Saves a new formation; its field size is taken from the team. */
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

  const row = db
    .insert(formations)
    .values({
      teamId,
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

/** Matches that used this formation keep their starting-lineup snapshot. */
export function deleteFormation(id: number): void {
  db.delete(formations).where(eq(formations.id, id)).run();
}
