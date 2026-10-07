/**
 * @jest-environment node
 */
import type { StartingLineup } from '@/domain/types';
import { seasonStats } from '@/domain/stats';
import { createTestDb, type TestDb } from '@/db/testing/createTestDb';

import { finishedMatches, seasonMatches } from '../history';
import { applyClockAction, kickoff, recordLiveAction } from '../liveMatch';
import { createMatch } from '../matches';
import { addPlayer } from '../players';
import { createTeam } from '../teams';

let mockTest: TestDb;
jest.mock('@/db/client', () => ({
  get db() {
    return mockTest.db;
  },
}));

const MIN = 60_000;
const T0 = 1_700_000_000_000;
const setup = { periodCount: 1, periodLengthMinutes: 40, maxSubs: null };

let teamId: number;
let p: number[];

const lineup = (gk: number, st: number, bench: number[]): StartingLineup => ({
  slots: [
    { slotId: 'gk', role: 'GK', label: 'GK', x: 0.5, y: 0.9, playerId: gk },
    { slotId: 'st', role: 'FWD', label: 'ST', x: 0.5, y: 0.3, playerId: st },
  ],
  bench,
});

beforeEach(async () => {
  mockTest = await createTestDb();
  teamId = createTeam({ name: 'U12' }).id;
  p = ['Ana', 'Bea', 'Cam'].map((name) => addPlayer(teamId, { name }).id);
});
afterEach(() => mockTest.sqlite.close());

/** Kicks off at `start`, scores `us`–`them` and (unless `live`) finishes after 40 minutes. */
function playMatch(opponentName: string, start: number, us: number, them: number, live = false) {
  const match = createMatch(teamId, { ...setup, opponentName }, lineup(p[0], p[1], [p[2]]));
  kickoff(match.id, start);
  for (let i = 0; i < us; i++) {
    recordLiveAction(match.id, { kind: 'goal', scorerId: p[1], assistId: null }, start + MIN);
  }
  for (let i = 0; i < them; i++) {
    recordLiveAction(match.id, { kind: 'opponentGoal' }, start + 2 * MIN);
  }
  if (!live) applyClockAction(match.id, 'finish', start + 40 * MIN);
  return match.id;
}

describe('finishedMatches', () => {
  it('lists finished matches newest first with score and result', () => {
    playMatch('Old', T0, 2, 1);
    playMatch('New', T0 + 7 * 24 * 60 * MIN, 0, 0);
    playMatch('Now', T0 + 14 * 24 * 60 * MIN, 1, 0, true);
    createMatch(teamId, { ...setup, opponentName: 'Draft' });

    expect(finishedMatches(teamId).map((m) => [m.match.opponentName, m.score, m.result])).toEqual([
      ['New', { us: 0, them: 0 }, 'draw'],
      ['Old', { us: 2, them: 1 }, 'win'],
    ]);
  });

  it("leaves out other teams' matches", () => {
    playMatch('Old', T0, 2, 1);
    expect(finishedMatches(createTeam({ name: 'U14' }).id)).toEqual([]);
  });
});

describe('seasonMatches', () => {
  it('feeds season stats with each match lineup, events and final game time', () => {
    playMatch('A', T0, 2, 1);
    playMatch('B', T0 + 7 * 24 * 60 * MIN, 0, 3);

    const season = seasonStats(seasonMatches(teamId));
    expect(season.record).toEqual({
      played: 2,
      wins: 1,
      draws: 0,
      losses: 1,
      goalsFor: 2,
      goalsAgainst: 4,
    });
    expect(season.players.get(p[1])).toMatchObject({
      appearances: 2,
      starts: 2,
      goals: 2,
      playingTimeMs: 80 * MIN,
    });
    expect(season.players.has(p[2])).toBe(false);
  });

  it('leaves out a match whose lineup snapshot cannot be read instead of throwing', () => {
    playMatch('A', T0, 2, 1);
    const broken = playMatch('B', T0 + 7 * 24 * 60 * MIN, 0, 3);
    mockTest.sqlite
      .prepare('UPDATE matches SET starting_lineup_json = ? WHERE id = ?')
      .run('{"slots":"oops"}', broken);

    expect(seasonMatches(teamId)).toHaveLength(1);
  });

  it('is empty with no finished matches', () => {
    playMatch('Now', T0, 1, 0, true);
    expect(seasonMatches(teamId)).toEqual([]);
  });
});
