/**
 * @jest-environment node
 */
import { createTestDb, type TestDb } from '@/db/testing/createTestDb';
import type { FormationLayout } from '@/domain/types';

import {
  createFormation,
  deleteFormation,
  formationsQuery,
  getFormation,
  updateFormation,
} from '../formations';
import { createMatch, getMatch } from '../matches';
import {
  createPreset,
  deletePreset,
  getPreset,
  matchPresetsQuery,
  teamPresetsQuery,
  updatePreset,
} from '../presets';
import { createTeam, updateTeam } from '../teams';

let mockTest: TestDb;
jest.mock('@/db/client', () => ({
  get db() {
    return mockTest.db;
  },
}));

beforeEach(async () => {
  mockTest = await createTestDb();
});
afterEach(() => mockTest.sqlite.close());

const fiveASide: FormationLayout = {
  slots: [
    { slotId: 'gk', role: 'GK', label: 'GK', x: 0.5, y: 0.92 },
    { slotId: 'd1', role: 'DEF', label: 'LB', x: 0.3, y: 0.7 },
    { slotId: 'd2', role: 'DEF', label: 'RB', x: 0.7, y: 0.7 },
    { slotId: 'f1', role: 'FWD', label: 'LS', x: 0.3, y: 0.3 },
    { slotId: 'f2', role: 'FWD', label: 'RS', x: 0.7, y: 0.3 },
  ],
};

describe('formations repository', () => {
  it('saves a formation using the team field size and returns the parsed layout', () => {
    const team = createTeam({ name: 'Futsal', fieldSize: 5 });
    const formation = createFormation(team.id, { name: '2-2', layout: fiveASide });
    expect(formation).toMatchObject({ name: '2-2', fieldSize: 5, layout: fiveASide });
    expect(getFormation(formation.id)?.layout).toEqual(fiveASide);
  });

  it('rejects a layout that does not match the team field size', () => {
    const team = createTeam({ name: 'U12', fieldSize: 7 });
    expect(() => createFormation(team.id, { name: '2-2', layout: fiveASide })).toThrow(
      'expected 7 slots, got 5',
    );
  });

  it('updates name and layout, validating against the stored field size', () => {
    const team = createTeam({ name: 'Futsal', fieldSize: 5 });
    const formation = createFormation(team.id, { name: '2-2', layout: fiveASide });
    const moved = {
      slots: fiveASide.slots.map((s) => (s.slotId === 'f1' ? { ...s, x: 0.4 } : s)),
    };
    const updated = updateFormation(formation.id, { name: 'Box', layout: moved });
    expect(updated.name).toBe('Box');
    expect(updated.layout.slots.find((s) => s.slotId === 'f1')?.x).toBe(0.4);
    expect(() =>
      updateFormation(formation.id, { layout: { slots: fiveASide.slots.slice(0, 4) } }),
    ).toThrow('expected 5 slots');
  });

  it('filters by field size so old formations stay saved after a team changes size', () => {
    const team = createTeam({ name: 'Futsal', fieldSize: 5 });
    createFormation(team.id, { name: '2-2', layout: fiveASide });
    updateTeam(team.id, { fieldSize: 7 });
    expect(formationsQuery(team.id).all()).toHaveLength(1);
    expect(formationsQuery(team.id, 7).all()).toHaveLength(0);
  });

  it('keeps matches when their formation is deleted', () => {
    const team = createTeam({ name: 'Futsal', fieldSize: 5 });
    const formation = createFormation(team.id, { name: '2-2', layout: fiveASide });
    const match = createMatch(team.id, {
      opponentName: 'Rivals',
      formationId: formation.id,
      periodCount: 2,
      periodLengthMinutes: 20,
      maxSubs: null,
    });
    deleteFormation(formation.id);
    expect(getMatch(match.id)?.formationId).toBeNull();
  });
});

describe('presets repository', () => {
  const pairs = [
    { outPlayerId: 1, inPlayerId: 6 },
    { outPlayerId: 2, inPlayerId: 7 },
  ];

  it('creates team-scoped and match-scoped presets', () => {
    const team = createTeam({ name: 'U12' });
    const match = createMatch(team.id, {
      opponentName: 'Rivals',
      periodCount: 2,
      periodLengthMinutes: 30,
      maxSubs: 5,
    });
    const teamPreset = createPreset(
      { teamId: team.id },
      { name: 'Half-time', substitutions: pairs },
    );
    const matchPreset = createPreset({ matchId: match.id }, { name: 'Plan B', substitutions: [] });

    expect(teamPreset).toMatchObject({ teamId: team.id, matchId: null, substitutions: pairs });
    expect(
      teamPresetsQuery(team.id)
        .all()
        .map((p) => p.id),
    ).toEqual([teamPreset.id]);
    expect(
      matchPresetsQuery(match.id)
        .all()
        .map((p) => p.id),
    ).toEqual([matchPreset.id]);
  });

  it('validates substitution pairs', () => {
    const team = createTeam({ name: 'U12' });
    expect(() =>
      createPreset(
        { teamId: team.id },
        { name: 'Bad', substitutions: [{ outPlayerId: 3, inPlayerId: 3 }] },
      ),
    ).toThrow('swaps a player with themselves');
  });

  it('updates and deletes presets', () => {
    const team = createTeam({ name: 'U12' });
    const preset = createPreset({ teamId: team.id }, { name: 'Half-time', substitutions: pairs });
    const updated = updatePreset(preset.id, { name: '60th min', substitutions: pairs.slice(1) });
    expect(updated).toMatchObject({ presetName: '60th min', substitutions: [pairs[1]] });
    deletePreset(preset.id);
    expect(getPreset(preset.id)).toBeUndefined();
    expect(() => updatePreset(preset.id, { name: 'Gone' })).toThrow('not found');
  });
});
