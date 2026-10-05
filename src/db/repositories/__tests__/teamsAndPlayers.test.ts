/**
 * @jest-environment node
 */
import { createTestDb, type TestDb } from '@/db/testing/createTestDb';

import { ValidationError } from '../errors';
import { recordEventGroup } from '../events';
import { createMatch } from '../matches';
import {
  addPlayer,
  deletePlayer,
  playerHasMatchHistory,
  playersQuery,
  setPlayerActive,
  updatePlayer,
} from '../players';
import { createTeam, deleteTeam, getTeam, teamsQuery, updateTeam } from '../teams';

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

describe('teams repository', () => {
  it('creates teams with cleaned names and a default field size of 11', () => {
    const team = createTeam({ name: '  Blue  Lions ' });
    expect(team).toMatchObject({ name: 'Blue Lions', fieldSize: 11 });
  });

  it('lists teams alphabetically', () => {
    createTeam({ name: 'Zebras' });
    createTeam({ name: 'Ants', fieldSize: 5 });
    expect(
      teamsQuery()
        .all()
        .map((t) => t.name),
    ).toEqual(['Ants', 'Zebras']);
  });

  it('validates names and field sizes', () => {
    expect(() => createTeam({ name: ' ' })).toThrow(ValidationError);
    expect(() => createTeam({ name: 'U9', fieldSize: 8 })).toThrow('Field size must be');
  });

  it('updates name and field size', () => {
    const team = createTeam({ name: 'U10', fieldSize: 7 });
    expect(updateTeam(team.id, { name: 'U11', fieldSize: 9 })).toMatchObject({
      name: 'U11',
      fieldSize: 9,
    });
    expect(updateTeam(team.id, {})).toMatchObject({ name: 'U11' });
    expect(() => updateTeam(999, { name: 'Ghost' })).toThrow('Team 999 not found');
  });

  it('deletes a team together with its roster', () => {
    const team = createTeam({ name: 'U12' });
    addPlayer(team.id, { name: 'Ana' });
    deleteTeam(team.id);
    expect(getTeam(team.id)).toBeUndefined();
    expect(playersQuery(team.id).all()).toHaveLength(0);
  });
});

describe('players repository', () => {
  let teamId: number;
  beforeEach(() => {
    teamId = createTeam({ name: 'U12', fieldSize: 7 }).id;
  });

  it('orders the roster: active first, then jersey number, unnumbered last', () => {
    addPlayer(teamId, { name: 'Zoe' });
    addPlayer(teamId, { name: 'Ana', jerseyNumber: 10 });
    const bea = addPlayer(teamId, { name: 'Bea', jerseyNumber: 2 });
    addPlayer(teamId, { name: 'Cam', jerseyNumber: 7 });
    setPlayerActive(bea.id, false);

    expect(
      playersQuery(teamId)
        .all()
        .map((p) => p.name),
    ).toEqual(['Cam', 'Ana', 'Zoe', 'Bea']);
    expect(playersQuery(teamId, { activeOnly: true }).all()).toHaveLength(3);
  });

  it('validates names and jersey numbers', () => {
    expect(() => addPlayer(teamId, { name: '' })).toThrow('Player name is required');
    expect(() => addPlayer(teamId, { name: 'Ana', jerseyNumber: 100 })).toThrow(ValidationError);
  });

  it('updates fields and can clear a jersey number', () => {
    const ana = addPlayer(teamId, { name: 'Ana', jerseyNumber: 9 });
    expect(updatePlayer(ana.id, { name: 'Ana B', jerseyNumber: null })).toMatchObject({
      name: 'Ana B',
      jerseyNumber: null,
    });
  });

  it('deletes players without history but blocks those with match events', () => {
    const ana = addPlayer(teamId, { name: 'Ana' });
    const bea = addPlayer(teamId, { name: 'Bea' });
    const match = createMatch(teamId, {
      opponentName: 'Rivals',
      periodCount: 2,
      periodLengthMinutes: 25,
      maxSubs: null,
    });
    recordEventGroup(match.id, [
      { eventType: 'goal', playerId: bea.id, periodNumber: 1, gameTimeMs: 1000, matchMinute: 1 },
    ]);

    expect(playerHasMatchHistory(ana.id)).toBe(false);
    deletePlayer(ana.id);
    expect(
      playersQuery(teamId)
        .all()
        .map((p) => p.name),
    ).toEqual(['Bea']);

    expect(playerHasMatchHistory(bea.id)).toBe(true);
    expect(() => deletePlayer(bea.id)).toThrow('Mark them inactive');
  });
});
