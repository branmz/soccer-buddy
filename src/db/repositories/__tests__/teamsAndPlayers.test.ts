/**
 * @jest-environment node
 */
import { teams } from '@/db/schema';
import { createTestDb, type TestDb } from '@/db/testing/createTestDb';

import { ValidationError } from '../errors';
import { recordEventGroup } from '../events';
import { kickoff } from '../liveMatch';
import { createMatch } from '../matches';
import {
  addPlayer,
  deletePlayer,
  playerHasMatchHistory,
  playersQuery,
  setPlayerActive,
  updatePlayer,
} from '../players';
import {
  createTeam,
  deleteTeam,
  getTeam,
  setTeamOrder,
  teamSummariesQuery,
  teamsQuery,
  updateTeam,
} from '../teams';

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

  const names = () =>
    teamsQuery()
      .all()
      .map((t) => t.name);

  it('lists teams in the order they were added', () => {
    createTeam({ name: 'Zebras' });
    createTeam({ name: 'Ants', fieldSize: 5 });
    expect(names()).toEqual(['Zebras', 'Ants']);
  });

  it('falls back to alphabetical for teams that were never ordered', () => {
    createTeam({ name: 'Zebras' });
    createTeam({ name: 'Ants' });
    mockTest.db.update(teams).set({ sortOrder: 0 }).run();
    expect(names()).toEqual(['Ants', 'Zebras']);
  });

  it('saves a new order and puts later teams at the end', () => {
    const [a, b, c] = ['A', 'B', 'C'].map((name) => createTeam({ name }));
    setTeamOrder([c.id, a.id, b.id]);
    expect(names()).toEqual(['C', 'A', 'B']);
    createTeam({ name: 'D' });
    expect(names()).toEqual(['C', 'A', 'B', 'D']);
  });

  it('rejects an order that is not exactly every team', () => {
    const [a, b] = ['A', 'B'].map((name) => createTeam({ name }));
    expect(() => setTeamOrder([a.id])).toThrow(ValidationError);
    expect(() => setTeamOrder([a.id, a.id])).toThrow(ValidationError);
    expect(() => setTeamOrder([a.id, b.id, 999])).toThrow(ValidationError);
    expect(names()).toEqual(['A', 'B']);
  });

  it('summarizes teams with active player counts, including empty teams', () => {
    const lions = createTeam({ name: 'Lions' });
    createTeam({ name: 'Bears' });
    addPlayer(lions.id, { name: 'Ana' });
    addPlayer(lions.id, { name: 'Bea' });
    setPlayerActive(addPlayer(lions.id, { name: 'Cam' }).id, false);

    expect(
      teamSummariesQuery()
        .all()
        .map((t) => [t.name, t.activePlayerCount]),
    ).toEqual([
      ['Lions', 2],
      ['Bears', 0],
    ]);
  });

  it('stores optional kit colors, keeps them when unpatched and clears them with null', () => {
    const team = createTeam({ name: 'Lions', homeColor: '#1E3A8A', awayColor: '#ffffff' });
    expect(team).toMatchObject({ homeColor: '#1e3a8a', awayColor: '#ffffff' });
    expect(createTeam({ name: 'Plain' })).toMatchObject({ homeColor: null, awayColor: null });

    expect(updateTeam(team.id, { name: 'Lions FC' })).toMatchObject({ homeColor: '#1e3a8a' });
    expect(updateTeam(team.id, { awayColor: null })).toMatchObject({
      homeColor: '#1e3a8a',
      awayColor: null,
    });
    expect(teamSummariesQuery().all()[0]).toMatchObject({ name: 'Lions FC', homeColor: '#1e3a8a' });
    expect(() => createTeam({ name: 'Bad', homeColor: 'blue' })).toThrow(ValidationError);
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

  it('stores primary and secondary positions, and leaves them alone when not patched', () => {
    const ana = addPlayer(teamId, {
      name: 'Ana',
      positions: { primaryPosition: 'CM', secondaryPosition: 'CB' },
    });
    expect(ana).toMatchObject({ primaryPosition: 'CM', secondaryPosition: 'CB' });

    expect(updatePlayer(ana.id, { name: 'Ana B' })).toMatchObject({ primaryPosition: 'CM' });
    expect(
      updatePlayer(ana.id, { positions: { primaryPosition: 'ST', secondaryPosition: null } }),
    ).toMatchObject({ primaryPosition: 'ST', secondaryPosition: null });
    expect(addPlayer(teamId, { name: 'Bea' })).toMatchObject({
      primaryPosition: null,
      secondaryPosition: null,
    });
  });

  it('rejects invalid positions', () => {
    expect(() =>
      addPlayer(teamId, { name: 'Ana', positions: { secondaryPosition: 'CB' } }),
    ).toThrow('Choose a main position');
    expect(() => addPlayer(teamId, { name: 'Ana', positions: { primaryPosition: 'SW' } })).toThrow(
      ValidationError,
    );
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

  it('blocks deleting a player who was in a kicked-off lineup, even with no events', () => {
    const [cam, dee, eve] = ['Cam', 'Dee', 'Eve'].map((name) => addPlayer(teamId, { name }));
    const lineup = (playerId: number) => ({
      slots: [{ slotId: 'gk', role: 'GK' as const, label: 'GK', x: 0.5, y: 0.9, playerId }],
      bench: [],
    });
    const setup = {
      opponentName: 'Rivals',
      periodCount: 2,
      periodLengthMinutes: 25,
      maxSubs: null,
    };
    kickoff(createMatch(teamId, setup, { ...lineup(cam.id), bench: [dee.id] }).id);
    // A draft that never kicked off isn't history.
    createMatch(teamId, setup, lineup(eve.id));

    expect(playerHasMatchHistory(cam.id)).toBe(true);
    expect(playerHasMatchHistory(dee.id)).toBe(true);
    expect(() => deletePlayer(cam.id)).toThrow('Mark them inactive');
    expect(playerHasMatchHistory(eve.id)).toBe(false);
  });
});
