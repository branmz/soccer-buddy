import {
  applyLineupEvent,
  deriveLineup,
  findPlayerSlot,
  onPitchPlayerIds,
  sortEvents,
  type LineupEvent,
} from '../lineup';
import type { StartingLineup } from '../types';

// GK 1 · CB 2 · CM empty · ST 3; bench 4, 5
const start: StartingLineup = {
  slots: [
    { slotId: 'gk', role: 'GK', label: 'GK', x: 0.5, y: 0.9, playerId: 1 },
    { slotId: 'cb', role: 'DEF', label: 'CB', x: 0.5, y: 0.7, playerId: 2 },
    { slotId: 'cm', role: 'MID', label: 'CM', x: 0.5, y: 0.5 },
    { slotId: 'st', role: 'FWD', label: 'ST', x: 0.5, y: 0.3, playerId: 3 },
  ],
  bench: [4, 5],
};

let nextId = 1;
const event = (e: Partial<LineupEvent> & Pick<LineupEvent, 'eventType'>): LineupEvent => ({
  id: nextId++,
  playerId: null,
  relatedPlayerId: null,
  slotId: null,
  gameTimeMs: 0,
  ...e,
});
const sub = (inId: number, outId: number | null, extra: Partial<LineupEvent> = {}) =>
  event({ eventType: 'substitution', playerId: inId, relatedPlayerId: outId, ...extra });

const playerIn = (lineup: ReturnType<typeof deriveLineup>, slotId: string) =>
  lineup.slots.find((s) => s.slotId === slotId)?.playerId;

describe('deriveLineup', () => {
  it('returns the starting lineup with no events', () => {
    const lineup = deriveLineup(start, []);
    expect(lineup.slots.map((s) => s.playerId)).toEqual([1, 2, undefined, 3]);
    expect(lineup.slots.every((s) => !s.locked)).toBe(true);
    expect(lineup.bench).toEqual([4, 5]);
    expect(lineup.sentOff).toEqual([]);
    expect(lineup.subsUsed).toBe(0);
  });

  it('does not mutate the starting lineup', () => {
    const copy = structuredClone(start);
    deriveLineup(start, [sub(4, 2), event({ eventType: 'red_card', playerId: 3 })]);
    expect(start).toEqual(copy);
  });

  it('replays a substitution into the outgoing player’s slot', () => {
    const lineup = deriveLineup(start, [sub(4, 2)]);
    expect(playerIn(lineup, 'cb')).toBe(4);
    expect(lineup.bench).toEqual([5, 2]);
  });

  it('allows re-entry', () => {
    const lineup = deriveLineup(start, [
      sub(4, 2, { gameTimeMs: 10 }),
      sub(2, 3, { gameTimeMs: 20 }),
    ]);
    expect(playerIn(lineup, 'cb')).toBe(4);
    expect(playerIn(lineup, 'st')).toBe(2);
    expect(lineup.bench).toEqual([5, 3]);
  });

  it('fills an empty slot when nobody goes off', () => {
    const lineup = deriveLineup(start, [sub(5, null, { slotId: 'cm' })]);
    expect(playerIn(lineup, 'cm')).toBe(5);
    expect(lineup.bench).toEqual([4]);
  });

  it('brings on a player who was not on the kickoff bench', () => {
    const lineup = deriveLineup(start, [sub(9, 3)]);
    expect(playerIn(lineup, 'st')).toBe(9);
    expect(lineup.bench).toEqual([4, 5, 3]);
  });

  it('swaps positions between two players on the pitch', () => {
    const lineup = deriveLineup(start, [
      event({ eventType: 'position_swap', playerId: 2, relatedPlayerId: 3 }),
    ]);
    expect(playerIn(lineup, 'cb')).toBe(3);
    expect(playerIn(lineup, 'st')).toBe(2);
  });

  it('moves a player into an empty slot', () => {
    const lineup = deriveLineup(start, [
      event({ eventType: 'position_swap', playerId: 3, slotId: 'cm' }),
    ]);
    expect(playerIn(lineup, 'cm')).toBe(3);
    expect(playerIn(lineup, 'st')).toBeUndefined();
  });

  it('leaves a locked empty slot after a red card', () => {
    const lineup = deriveLineup(start, [event({ eventType: 'red_card', playerId: 2 })]);
    const cb = lineup.slots.find((s) => s.slotId === 'cb');
    expect(cb?.playerId).toBeUndefined();
    expect(cb?.locked).toBe(true);
    expect(lineup.sentOff).toEqual([2]);
    expect(lineup.bench).toEqual([4, 5]);
  });

  it('removes a red-carded bench player from the bench', () => {
    const lineup = deriveLineup(start, [event({ eventType: 'red_card', playerId: 4 })]);
    expect(lineup.bench).toEqual([5]);
    expect(lineup.sentOff).toEqual([4]);
    expect(lineup.slots.some((s) => s.locked)).toBe(false);
  });

  it('ignores events that no longer apply', () => {
    const lineup = deriveLineup(start, [
      event({ eventType: 'red_card', playerId: 2 }),
      sub(4, 2), // player 2 is gone
      sub(2, 3), // sent-off players can't return
      sub(4, null, { slotId: 'cb' }), // locked slot
      sub(1, 3), // player 1 is already on the pitch
      event({ eventType: 'position_swap', playerId: 3, slotId: 'cb' }), // locked slot
      event({ eventType: 'position_swap', playerId: 4, relatedPlayerId: 3 }), // 4 on bench
    ]);
    expect(lineup.slots.map((s) => s.playerId)).toEqual([1, undefined, undefined, 3]);
    expect(lineup.bench).toEqual([4, 5]);
  });

  it('ignores events that do not change the lineup', () => {
    const lineup = deriveLineup(start, [
      event({ eventType: 'goal', playerId: 3 }),
      event({ eventType: 'yellow_card', playerId: 2 }),
      event({ eventType: 'opponent_goal' }),
    ]);
    expect(lineup.slots.map((s) => s.playerId)).toEqual([1, 2, undefined, 3]);
  });

  it('replays in recorded (id) order regardless of input order', () => {
    const first = sub(4, 2);
    const second = sub(2, 4);
    const lineup = deriveLineup(start, [second, first]);
    expect(playerIn(lineup, 'cb')).toBe(2);
    expect(lineup.bench).toEqual([5, 4]);
  });

  it('keeps recorded order when the phone clock jumped back', () => {
    const lineup = deriveLineup(start, [
      sub(4, 2, { gameTimeMs: 10 * 60_000 }),
      sub(2, 3, { gameTimeMs: 9 * 60_000 + 40_000 }),
    ]);
    expect(playerIn(lineup, 'cb')).toBe(4);
    expect(playerIn(lineup, 'st')).toBe(2);
    expect(lineup.subsUsed).toBe(2);
  });

  it('ignores a sub with nobody going off and no slot', () => {
    const lineup = deriveLineup(start, [sub(4, null)]);
    expect(lineup.bench).toEqual([4, 5]);
  });

  it('ignores a second red card for the same player', () => {
    const lineup = deriveLineup(start, [
      event({ eventType: 'red_card', playerId: 2 }),
      event({ eventType: 'red_card', playerId: 2 }),
    ]);
    expect(lineup.sentOff).toEqual([2]);
  });

  it('ignores a player swapped with themselves', () => {
    const lineup = deriveLineup(start, []);
    const swap = event({ eventType: 'position_swap', playerId: 2, relatedPlayerId: 2 });
    expect(applyLineupEvent(lineup, swap)).toBe(lineup);
  });
});

describe('applyLineupEvent', () => {
  it('returns the same lineup for a no-op', () => {
    const lineup = deriveLineup(start, []);
    expect(applyLineupEvent(lineup, event({ eventType: 'goal', playerId: 3 }))).toBe(lineup);
    expect(applyLineupEvent(lineup, sub(4, 99))).toBe(lineup);
  });
});

describe('sortEvents', () => {
  it('orders by id, ignoring game time', () => {
    const a = event({ eventType: 'goal', gameTimeMs: 1, id: 3 });
    const b = event({ eventType: 'goal', gameTimeMs: 5, id: 2 });
    const c = event({ eventType: 'goal', gameTimeMs: 9, id: 1 });
    expect(sortEvents([a, b, c])).toEqual([c, b, a]);
  });
});

describe('helpers', () => {
  const lineup = deriveLineup(start, [event({ eventType: 'red_card', playerId: 2 })]);

  it('lists players on the pitch', () => {
    expect(onPitchPlayerIds(lineup)).toEqual([1, 3]);
  });

  it('finds a player’s slot', () => {
    expect(findPlayerSlot(lineup, 3)?.slotId).toBe('st');
    expect(findPlayerSlot(lineup, 4)).toBeUndefined();
  });
});
