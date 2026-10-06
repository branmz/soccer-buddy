/**
 * @jest-environment node
 */
import { PRESET_FORMATIONS } from '@/constants/presetFormations';
import type { StartingLineup } from '@/domain/types';
import { createTestDb, type TestDb } from '@/db/testing/createTestDb';

import { eventsQuery } from '../events';
import {
  applyClockAction,
  kickoff,
  recordLiveAction,
  setLiveLayout,
  switchLiveFormation,
  undoLastAction,
} from '../liveMatch';
import { createFormation } from '../formations';
import { createPreset, presetsForMatch } from '../presets';
import {
  createMatch,
  createMatchDraft,
  getMatch,
  latestMatch,
  matchLineup,
  matchLiveLayout,
  matchPeriodsQuery,
  setMatchFormation,
  setMatchLineup,
  setMatchSquad,
  updateMatchSetup,
} from '../matches';
import { addPlayer, setPlayerActive } from '../players';
import { createTeam } from '../teams';

let mockTest: TestDb;
jest.mock('@/db/client', () => ({
  get db() {
    return mockTest.db;
  },
}));

const MIN = 60_000;
const T0 = 1_700_000_000_000;
const setup = { opponentName: 'Rivals', periodCount: 2, periodLengthMinutes: 25, maxSubs: 1 };

let teamId: number;
let p: number[];

function lineupFor(onPitch: number[], bench: number[]): StartingLineup {
  const shape = [
    { slotId: 'gk', role: 'GK' as const, label: 'GK', x: 0.5, y: 0.9 },
    { slotId: 'cb', role: 'DEF' as const, label: 'CB', x: 0.5, y: 0.7 },
    { slotId: 'st', role: 'FWD' as const, label: 'ST', x: 0.5, y: 0.3 },
  ];
  return {
    slots: shape.map((s, i) => (onPitch[i] === undefined ? s : { ...s, playerId: onPitch[i] })),
    bench,
  };
}

beforeEach(async () => {
  mockTest = await createTestDb();
  teamId = createTeam({ name: 'U12' }).id;
  p = ['Ana', 'Bea', 'Cam', 'Dee', 'Eve'].map((name) => addPlayer(teamId, { name }).id);
});
afterEach(() => mockTest.sqlite.close());

function liveMatch() {
  const match = createMatch(teamId, setup, lineupFor([p[0], p[1], p[2]], [p[3], p[4]]));
  kickoff(match.id, T0);
  return match.id;
}

describe('match setup', () => {
  it('stores the venue and updates single fields', () => {
    const match = createMatch(teamId, { ...setup, isHome: false });
    expect(match.isHome).toBe(false);
    expect(updateMatchSetup(match.id, { maxSubs: null })).toMatchObject({
      isHome: false,
      maxSubs: null,
      opponentName: 'Rivals',
    });
  });

  it('saves the draft lineup and validates it', () => {
    const match = createMatch(teamId, setup);
    setMatchLineup(match.id, lineupFor([p[0]], [p[1]]));
    expect(matchLineup(getMatch(match.id)!)?.bench).toEqual([p[1]]);
    expect(() => setMatchLineup(match.id, lineupFor([p[0]], [p[0]]))).toThrow(
      /field and the bench/,
    );
  });

  it('switches formation keeping players by slot, and updates the squad', () => {
    const match = createMatch(teamId, setup, lineupFor([p[0], p[1]], [p[2]]));
    const slots = matchLineup(match)!.slots.map(({ playerId: _p, ...s }) => s);
    const switched = setMatchFormation(match.id, {
      formationId: null,
      name: 'Flat',
      slots: [slots[0], { ...slots[2], slotId: 'cb' }],
    });
    expect(switched.formationName).toBe('Flat');
    expect(matchLineup(switched)).toMatchObject({ bench: [p[2]] });
    expect(matchLineup(switched)?.slots.map((s) => s.playerId)).toEqual([p[0], p[1]]);

    const squad = setMatchSquad(match.id, [p[0], p[2], p[3]]);
    expect(matchLineup(squad)?.slots.map((s) => s.playerId)).toEqual([p[0], undefined]);
    expect(matchLineup(squad)?.bench).toEqual([p[2], p[3]]);
  });

  it('finds the latest match to copy settings from', () => {
    createMatch(teamId, setup);
    const second = createMatch(teamId, { ...setup, opponentName: 'Next' });
    expect(latestMatch(teamId)?.id).toBe(second.id);
  });
});

describe('kickoff', () => {
  it('goes live, snapshots the lineup and starts period 1', () => {
    setPlayerActive(p[4], false);
    const id = liveMatch();
    const match = getMatch(id)!;
    expect(match).toMatchObject({ status: 'live', startedAt: T0 });
    expect(matchLineup(match)?.bench).toEqual([p[3]]);
    expect(matchPeriodsQuery(id).all()).toMatchObject([{ periodNumber: 1, startedAt: T0 }]);
    expect(() => updateMatchSetup(id, { maxSubs: 3 })).toThrow('before kickoff');
  });

  it('allows only one live match', () => {
    liveMatch();
    const other = createMatch(teamId, setup, lineupFor([p[0]], []));
    expect(() => kickoff(other.id, T0)).toThrow(/Finish the match against Rivals/);
  });

  it('needs a lineup with a player on the pitch', () => {
    expect(() => kickoff(createMatch(teamId, setup).id)).toThrow(/Pick a formation/);
    const empty = createMatch(teamId, setup, lineupFor([], [p[0]]));
    expect(() => kickoff(empty.id)).toThrow(/at least one player/);
  });
});

describe('clock', () => {
  it('pauses, resumes, ends a period, starts the next and finishes', () => {
    const id = liveMatch();
    applyClockAction(id, 'pause', T0 + 10 * MIN);
    applyClockAction(id, 'resume', T0 + 12 * MIN);
    applyClockAction(id, 'endPeriod', T0 + 27 * MIN);
    applyClockAction(id, 'startNextPeriod', T0 + 40 * MIN);
    applyClockAction(id, 'finish', T0 + 65 * MIN);

    expect(matchPeriodsQuery(id).all()).toMatchObject([
      { periodNumber: 1, endedAt: T0 + 27 * MIN, pausedAt: null, pausedTotalMs: 2 * MIN },
      { periodNumber: 2, startedAt: T0 + 40 * MIN, endedAt: T0 + 65 * MIN },
    ]);
    expect(getMatch(id)).toMatchObject({ status: 'finished', endedAt: T0 + 65 * MIN });
  });

  it('rejects actions that do not fit the clock or a match that is not live', () => {
    const id = liveMatch();
    expect(() => applyClockAction(id, 'resume', T0)).toThrow("can't be done");
    expect(() => applyClockAction(createMatch(teamId, setup).id, 'pause')).toThrow("isn't live");
  });
});

describe('recording live actions', () => {
  it('stamps events with the clock', () => {
    const id = liveMatch();
    applyClockAction(id, 'pause', T0 + 10 * MIN);
    const [goal, assist] = recordLiveAction(
      id,
      { kind: 'goal', scorerId: p[2], assistId: p[1] },
      T0 + 20 * MIN,
    );
    expect(goal).toMatchObject({
      eventType: 'goal',
      playerId: p[2],
      gameTimeMs: 10 * MIN,
      matchMinute: 11,
    });
    expect(assist.groupId).toBe(goal.groupId);
  });

  it('validates against the replayed lineup and the sub limit', () => {
    const id = liveMatch();
    recordLiveAction(
      id,
      { kind: 'subs', pairs: [{ outPlayerId: p[1], inPlayerId: p[3] }] },
      T0 + MIN,
    );
    expect(() =>
      recordLiveAction(
        id,
        { kind: 'subs', pairs: [{ outPlayerId: p[2], inPlayerId: p[4] }] },
        T0 + 2 * MIN,
      ),
    ).toThrow('No substitutions left');
    expect(() =>
      recordLiveAction(id, { kind: 'goal', scorerId: p[1], assistId: null }, T0 + 2 * MIN),
    ).toThrow("Scorer isn't on the pitch");
    expect(eventsQuery(id).all()).toHaveLength(1);
  });

  it('rejects a team preset naming a player who is not here today', () => {
    const match = createMatch(teamId, setup, lineupFor([p[0], p[1], p[2]], [p[3]]));
    kickoff(match.id, T0);
    const preset = createPreset(
      { teamId },
      { name: 'Usual', substitutions: [{ outPlayerId: p[1], inPlayerId: p[4] }] },
    );
    expect(() =>
      recordLiveAction(match.id, { kind: 'subs', pairs: preset.substitutions }, T0 + MIN),
    ).toThrow("isn't on the bench");
    expect(presetsForMatch(teamId, match.id).map((x) => x.id)).toEqual([preset.id]);
  });

  it('lets a late arrival join the bench and then come on', () => {
    const match = createMatch(teamId, setup, lineupFor([p[0], p[1], p[2]], [p[3]]));
    kickoff(match.id, T0);
    const sub = { kind: 'subs' as const, pairs: [{ outPlayerId: p[1], inPlayerId: p[4] }] };
    expect(() => recordLiveAction(match.id, sub, T0 + MIN)).toThrow("isn't on the bench");
    recordLiveAction(match.id, { kind: 'lateArrival', playerId: p[4] }, T0 + 2 * MIN);
    recordLiveAction(match.id, sub, T0 + 3 * MIN);
    expect(
      eventsQuery(match.id)
        .all()
        .map((e) => e.eventType),
    ).toEqual(['late_arrival', 'substitution']);
  });

  it('only lets active players on the team arrive late', () => {
    const match = createMatch(teamId, setup, lineupFor([p[0]], []));
    kickoff(match.id, T0);
    setPlayerActive(p[4], false);
    const other = addPlayer(createTeam({ name: 'Other' }).id, { name: 'Zed' }).id;
    for (const playerId of [p[4], other]) {
      expect(() => recordLiveAction(match.id, { kind: 'lateArrival', playerId }, T0)).toThrow(
        'active roster',
      );
    }
    expect(() => recordLiveAction(match.id, { kind: 'lateArrival', playerId: p[0] }, T0)).toThrow(
      'already in this match',
    );
  });

  it('undoes the last group', () => {
    const id = liveMatch();
    recordLiveAction(id, { kind: 'secondYellow', playerId: p[0] }, T0 + MIN);
    expect(undoLastAction(id)).toHaveLength(2);
    expect(eventsQuery(id).all()).toHaveLength(0);
  });

  it('refuses events once the match is finished', () => {
    const id = liveMatch();
    applyClockAction(id, 'finish', T0 + MIN);
    expect(() => recordLiveAction(id, { kind: 'opponentGoal' })).toThrow("isn't live");
  });
});

describe('createMatchDraft', () => {
  it('starts from defaults and a preset with everyone on the bench', () => {
    setPlayerActive(p[4], false);
    const match = createMatchDraft(teamId, 'Rivals');
    expect(match).toMatchObject({
      status: 'setup',
      isHome: true,
      formationId: null,
      formationName: '4-4-2',
      periodCount: 2,
      periodLengthMinutes: 40,
      maxSubs: null,
    });
    const lineup = matchLineup(match);
    expect(lineup?.slots).toHaveLength(11);
    expect(lineup?.bench).toEqual(p.slice(0, 4));
  });

  it('copies the last match’s settings and saved formation', () => {
    const slots = PRESET_FORMATIONS[11][1].slots.map((s, i) =>
      i === 0 ? { ...s, playerId: p[0] } : s,
    );
    const formation = createFormation(teamId, { name: 'Sunday', layout: { slots } });
    createMatch(teamId, { ...setup, formationId: formation.id, formationName: 'Sunday' });
    const match = createMatchDraft(teamId, 'Next');
    expect(match).toMatchObject({ formationId: formation.id, formationName: 'Sunday', maxSubs: 1 });
    expect(matchLineup(match)?.slots[0].playerId).toBe(p[0]);
    expect(() => createMatchDraft(teamId, ' ')).toThrow('Opponent is required');
  });
});

describe('setLiveLayout', () => {
  it('saves moved and relabelled spots without touching the starting lineup', () => {
    const id = liveMatch();
    const before = getMatch(id)!.startingLineupJson;
    const slots = matchLineup(getMatch(id)!)!.slots.map((s) =>
      s.slotId === 'st' ? { ...s, label: 'CAM', role: 'MID' as const, y: 0.4 } : s,
    );
    const saved = setLiveLayout(id, slots);
    expect(matchLiveLayout(saved)?.slots.find((s) => s.slotId === 'st')).toEqual({
      slotId: 'st',
      role: 'MID',
      label: 'CAM',
      x: 0.5,
      y: 0.4,
    });
    expect(matchLiveLayout(saved)?.slots.some((s) => 'playerId' in s)).toBe(false);
    expect(matchLiveLayout(saved)?.name).toBeNull();
    expect(saved.startingLineupJson).toBe(before);
  });

  it('rejects other spots, a second GK, or a match that is not live', () => {
    const id = liveMatch();
    const slots = matchLineup(getMatch(id)!)!.slots;
    expect(() => setLiveLayout(id, slots.slice(1))).toThrow("don't match");
    expect(() =>
      setLiveLayout(
        id,
        slots.map((s) => (s.slotId === 'cb' ? { ...s, role: 'GK' as const, label: 'GK' } : s)),
      ),
    ).toThrow(/GK/);
    expect(() => setLiveLayout(createMatch(teamId, setup).id, slots)).toThrow("isn't live");
  });
});

describe('switchLiveFormation', () => {
  it('fits the current spots onto the new shape and keeps the name until the next switch', () => {
    const id = liveMatch();
    const target = [
      { slotId: 'g', role: 'GK' as const, label: 'GK', x: 0.5, y: 0.92 },
      { slotId: 'm', role: 'MID' as const, label: 'CM', x: 0.5, y: 0.5 },
      { slotId: 'f', role: 'FWD' as const, label: 'ST', x: 0.5, y: 0.2, playerId: p[4] },
    ];
    const switched = switchLiveFormation(id, { name: 'Diamond', formationId: 42, slots: target });
    const layout = matchLiveLayout(switched);
    expect(layout).toMatchObject({ name: 'Diamond', formationId: 42 });
    expect(layout?.slots.map((s) => [s.slotId, s.label])).toEqual([
      ['gk', 'GK'],
      ['cb', 'CM'],
      ['st', 'ST'],
    ]);
    // Moving a spot afterwards keeps the switched-to name.
    const moved = setLiveLayout(
      id,
      layout!.slots.map((s) => ({ ...s, x: 0.4 })),
    );
    expect(matchLiveLayout(moved)).toMatchObject({ name: 'Diamond', formationId: 42 });
    expect(() =>
      switchLiveFormation(id, { name: 'Small', formationId: null, slots: target.slice(1) }),
    ).toThrow('Pick a formation with 3 spots');
  });
});
