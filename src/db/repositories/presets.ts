import { asc, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { quickSubPresets, type QuickSubPreset } from '@/db/schema';
import { parseQuickSubPairs } from '@/domain/formations';
import { checkPresetPairs } from '@/domain/subRules';
import type { QuickSubPair } from '@/domain/types';
import { cleanName } from '@/domain/validation';

import { NotFoundError, unwrap } from './errors';

/** A preset is reusable across a team's matches, or belongs to a single match. */
export type PresetScope = { teamId: number } | { matchId: number };

export type PresetWithPairs = Omit<QuickSubPreset, 'substitutionsJson'> & {
  substitutions: QuickSubPair[];
};

function withPairs(row: QuickSubPreset): PresetWithPairs {
  const { substitutionsJson, ...rest } = row;
  return { ...rest, substitutions: unwrap(parseQuickSubPairs(substitutionsJson)) };
}

function cleanPairs(pairs: QuickSubPair[]): QuickSubPair[] {
  return unwrap(checkPresetPairs(unwrap(parseQuickSubPairs(pairs))));
}

/** Rows carry raw `substitutionsJson`; parse with parseQuickSubPairs when rendering. */
export function teamPresetsQuery(teamId: number) {
  return db
    .select()
    .from(quickSubPresets)
    .where(eq(quickSubPresets.teamId, teamId))
    .orderBy(asc(quickSubPresets.presetName));
}

export function matchPresetsQuery(matchId: number) {
  return db
    .select()
    .from(quickSubPresets)
    .where(eq(quickSubPresets.matchId, matchId))
    .orderBy(asc(quickSubPresets.presetName));
}

export function getPreset(id: number): PresetWithPairs | undefined {
  const row = db.select().from(quickSubPresets).where(eq(quickSubPresets.id, id)).get();
  return row && withPairs(row);
}

export function createPreset(
  scope: PresetScope,
  input: { name: string; substitutions: QuickSubPair[] },
): PresetWithPairs {
  const row = db
    .insert(quickSubPresets)
    .values({
      teamId: 'teamId' in scope ? scope.teamId : null,
      matchId: 'matchId' in scope ? scope.matchId : null,
      presetName: unwrap(cleanName(input.name, 'Preset name')),
      substitutionsJson: JSON.stringify(cleanPairs(input.substitutions)),
    })
    .returning()
    .get();
  return withPairs(row);
}

export function updatePreset(
  id: number,
  patch: { name?: string; substitutions?: QuickSubPair[] },
): PresetWithPairs {
  const values: Partial<Pick<QuickSubPreset, 'presetName' | 'substitutionsJson'>> = {};
  if (patch.name !== undefined) values.presetName = unwrap(cleanName(patch.name, 'Preset name'));
  if (patch.substitutions !== undefined) {
    values.substitutionsJson = JSON.stringify(cleanPairs(patch.substitutions));
  }

  const row =
    Object.keys(values).length === 0
      ? db.select().from(quickSubPresets).where(eq(quickSubPresets.id, id)).get()
      : db.update(quickSubPresets).set(values).where(eq(quickSubPresets.id, id)).returning().get();
  if (!row) throw new NotFoundError('Preset', id);
  return withPairs(row);
}

export function deletePreset(id: number): void {
  db.delete(quickSubPresets).where(eq(quickSubPresets.id, id)).run();
}

/** The quick subs offered in a match: its own first, then the team's. Read with useLiveData. */
export function presetsForMatch(teamId: number, matchId: number): PresetWithPairs[] {
  return [...matchPresetsQuery(matchId).all(), ...teamPresetsQuery(teamId).all()].flatMap((row) => {
    const pairs = parseQuickSubPairs(row.substitutionsJson);
    const { substitutionsJson: _json, ...rest } = row;
    return pairs.ok ? [{ ...rest, substitutions: pairs.value }] : [];
  });
}
