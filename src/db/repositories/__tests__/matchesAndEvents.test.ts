/**
 * @jest-environment node
 */
import { eq } from 'drizzle-orm';

import { matches } from '@/db/schema';
import { createTestDb, type TestDb } from '@/db/testing/createTestDb';

import { ValidationError } from '../errors';
import { eventsQuery, recordEventGroup, undoLastEventGroup, type EventInput } from '../events';
import {
  createMatch,
  deleteMatch,
  getMatch,
  liveMatchQuery,
  matchesQuery,
  updateMatchSetup,
} from '../matches';
import { addPlayer } from '../players';
import { createTeam } from '../teams';

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

const setup = { opponentName: 'Rivals', periodCount: 2, periodLengthMinutes: 25, maxSubs: 3 };

describe('matches repository', () => {
  it('creates a match in setup with the computed game length', () => {
    const team = createTeam({ name: 'U12' });
    expect(createMatch(team.id, setup)).toMatchObject({
      status: 'setup',
      opponentName: 'Rivals',
      gameLengthMinutes: 50,
      maxSubs: 3,
    });
  });

  it('validates setup input', () => {
    const team = createTeam({ name: 'U12' });
    expect(() => createMatch(team.id, { ...setup, opponentName: '' })).toThrow(
      'Opponent is required',
    );
    expect(() => createMatch(team.id, { ...setup, periodCount: 0 })).toThrow(ValidationError);
  });

  it('allows setup changes only before kickoff', () => {
    const team = createTeam({ name: 'U12' });
    const match = createMatch(team.id, setup);
    expect(
      updateMatchSetup(match.id, { ...setup, periodCount: 4, periodLengthMinutes: 12 }),
    ).toMatchObject({ gameLengthMinutes: 48 });

    mockTest.db.update(matches).set({ status: 'live' }).where(eq(matches.id, match.id)).run();
    expect(() => updateMatchSetup(match.id, setup)).toThrow('before kickoff');
  });

  it('lists matches newest first, filters by status and finds the live match', () => {
    const team = createTeam({ name: 'U12' });
    const first = createMatch(team.id, { ...setup, opponentName: 'First' });
    const second = createMatch(team.id, { ...setup, opponentName: 'Second' });
    mockTest.db
      .update(matches)
      .set({ status: 'live', startedAt: Date.now() + 1000 })
      .where(eq(matches.id, first.id))
      .run();

    expect(
      matchesQuery(team.id)
        .all()
        .map((m) => m.opponentName),
    ).toEqual(['First', 'Second']);
    expect(
      matchesQuery(team.id, 'setup')
        .all()
        .map((m) => m.id),
    ).toEqual([second.id]);
    expect(liveMatchQuery().get()?.id).toBe(first.id);
  });

  it('deletes a match and its events', () => {
    const team = createTeam({ name: 'U12' });
    const match = createMatch(team.id, setup);
    recordEventGroup(match.id, [
      { eventType: 'opponent_goal', periodNumber: 1, gameTimeMs: 5000, matchMinute: 1 },
    ]);
    deleteMatch(match.id);
    expect(getMatch(match.id)).toBeUndefined();
    expect(eventsQuery(match.id).all()).toHaveLength(0);
  });
});

describe('events repository', () => {
  let matchId: number;
  let ana: number;
  let bea: number;
  let cam: number;

  beforeEach(() => {
    const team = createTeam({ name: 'U12' });
    ana = addPlayer(team.id, { name: 'Ana' }).id;
    bea = addPlayer(team.id, { name: 'Bea' }).id;
    cam = addPlayer(team.id, { name: 'Cam' }).id;
    matchId = createMatch(team.id, setup).id;
  });

  const at = (gameTimeMs: number) => ({
    periodNumber: 1,
    gameTimeMs,
    matchMinute: Math.floor(gameTimeMs / 60000) + 1,
  });

  it('records a goal and assist under one group, in game order', () => {
    recordEventGroup(matchId, [{ eventType: 'yellow_card', playerId: cam, ...at(120000) }]);
    const [goal, assist] = recordEventGroup(matchId, [
      { eventType: 'goal', playerId: ana, ...at(60000) },
      { eventType: 'assist', playerId: bea, ...at(60000) },
    ]);
    expect(goal.groupId).toBeTruthy();
    expect(assist.groupId).toBe(goal.groupId);

    const timeline = eventsQuery(matchId).all();
    expect(timeline.map((e) => e.eventType)).toEqual(['goal', 'assist', 'yellow_card']);
  });

  it('rejects an empty group', () => {
    expect(() => recordEventGroup(matchId, [])).toThrow('Nothing to record');
  });

  it('records nothing when one event in the group is invalid', () => {
    const events: EventInput[] = [
      { eventType: 'substitution', playerId: bea, relatedPlayerId: ana, ...at(1000) },
      { eventType: 'substitution', playerId: 9999, relatedPlayerId: cam, ...at(1000) },
    ];
    expect(() => recordEventGroup(matchId, events)).toThrow(/FOREIGN KEY/);
    expect(eventsQuery(matchId).all()).toHaveLength(0);
  });

  it('undoes the most recent group as a unit, then the one before it', () => {
    recordEventGroup(matchId, [{ eventType: 'goal', playerId: ana, ...at(1000) }]);
    recordEventGroup(matchId, [
      { eventType: 'substitution', playerId: bea, relatedPlayerId: ana, ...at(2000) },
      { eventType: 'substitution', playerId: ana, relatedPlayerId: cam, ...at(2000) },
    ]);

    expect(undoLastEventGroup(matchId)).toHaveLength(2);
    expect(
      eventsQuery(matchId)
        .all()
        .map((e) => e.eventType),
    ).toEqual(['goal']);
    expect(undoLastEventGroup(matchId)).toHaveLength(1);
    expect(undoLastEventGroup(matchId)).toEqual([]);
  });

  it('only undoes events from the given match', () => {
    const team = createTeam({ name: 'Other' });
    const otherMatch = createMatch(team.id, setup).id;
    recordEventGroup(matchId, [{ eventType: 'opponent_goal', ...at(1000) }]);
    recordEventGroup(otherMatch, [{ eventType: 'opponent_goal', ...at(1000) }]);
    undoLastEventGroup(matchId);
    expect(eventsQuery(matchId).all()).toHaveLength(0);
    expect(eventsQuery(otherMatch).all()).toHaveLength(1);
  });
});
