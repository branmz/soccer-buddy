/**
 * @jest-environment node
 */
import { eq } from 'drizzle-orm';

import { players, teams } from '../schema';
import { createTestDb, type TestDb } from '../testing/createTestDb';

// Guards the test adapter itself, so repository test failures point at repositories.
describe('createTestDb', () => {
  let test: TestDb;

  beforeEach(async () => {
    test = await createTestDb();
  });

  afterEach(() => test.sqlite.close());

  it('applies migrations and round-trips rows through Drizzle', () => {
    const team = test.db.insert(teams).values({ name: 'U12', fieldSize: 7 }).returning().get();
    expect(team).toMatchObject({ id: 1, name: 'U12', fieldSize: 7 });
    expect(typeof team.createdAt).toBe('number');

    test.db.insert(players).values({ teamId: team.id, name: 'Ana', jerseyNumber: 9 }).run();
    const roster = test.db.select().from(players).where(eq(players.teamId, team.id)).all();
    expect(roster).toEqual([expect.objectContaining({ name: 'Ana', isActive: true })]);
  });

  it('supports relational queries', () => {
    const team = test.db.insert(teams).values({ name: 'U12' }).returning().get();
    test.db.insert(players).values({ teamId: team.id, name: 'Bea' }).run();
    const found = test.db.query.teams.findFirst({ with: { players: true } }).sync();
    expect(found?.players.map((p) => p.name)).toEqual(['Bea']);
  });

  it('rolls back failed transactions', () => {
    expect(() =>
      test.db.transaction((tx) => {
        tx.insert(teams).values({ name: 'Kept?' }).run();
        throw new Error('boom');
      }),
    ).toThrow('boom');
    expect(test.db.select().from(teams).all()).toHaveLength(0);
  });
});
