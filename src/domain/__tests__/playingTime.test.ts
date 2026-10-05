import type { LineupEvent } from '../lineup';
import { playingTime } from '../playingTime';
import type { StartingLineup } from '../types';

const MIN = 60_000;

// GK 1 · CB 2 · ST 3; bench 4, 5
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
const event = (
  minute: number,
  e: Partial<LineupEvent> & Pick<LineupEvent, 'eventType'>,
): LineupEvent => ({
  id: nextId++,
  playerId: null,
  relatedPlayerId: null,
  slotId: null,
  gameTimeMs: minute * MIN,
  ...e,
});
const sub = (minute: number, inId: number, outId: number | null, slotId: string | null = null) =>
  event(minute, { eventType: 'substitution', playerId: inId, relatedPlayerId: outId, slotId });

const minutes = (map: Map<number, number>) =>
  Object.fromEntries([...map].map(([id, ms]) => [id, ms / MIN]));

describe('playingTime', () => {
  it('gives starters the full game and the bench zero', () => {
    const { msByPlayer, appeared } = playingTime(start, [], 50 * MIN);
    expect(minutes(msByPlayer)).toEqual({ 1: 50, 2: 50, 3: 50, 4: 0, 5: 0 });
    expect([...appeared]).toEqual([1, 2, 3]);
  });

  it('splits time at a substitution', () => {
    const { msByPlayer } = playingTime(start, [sub(20, 4, 2)], 50 * MIN);
    expect(minutes(msByPlayer)).toMatchObject({ 2: 20, 4: 30 });
  });

  it('adds up separate stints after re-entry', () => {
    const events = [sub(10, 4, 2), sub(25, 2, 4), sub(40, 4, 3)];
    const { msByPlayer } = playingTime(start, events, 50 * MIN);
    expect(minutes(msByPlayer)).toEqual({ 1: 50, 2: 35, 3: 40, 4: 25, 5: 0 });
  });

  it('stops the clock for a red-carded player', () => {
    const events = [event(30, { eventType: 'red_card', playerId: 3 })];
    expect(minutes(playingTime(start, events, 50 * MIN).msByPlayer)).toMatchObject({ 3: 30 });
  });

  it('starts the clock for a player filling an empty slot', () => {
    const { msByPlayer, appeared } = playingTime(start, [sub(15, 5, null, 'cm')], 50 * MIN);
    expect(minutes(msByPlayer)).toMatchObject({ 5: 35 });
    expect(appeared.has(5)).toBe(true);
  });

  it('ignores position swaps and non-lineup events', () => {
    const events = [
      event(5, { eventType: 'position_swap', playerId: 2, relatedPlayerId: 3 }),
      event(6, { eventType: 'goal', playerId: 3 }),
    ];
    expect(minutes(playingTime(start, events, 50 * MIN).msByPlayer)).toMatchObject({
      2: 50,
      3: 50,
    });
  });

  it('counts a player who came on at the final whistle as appeared', () => {
    const { msByPlayer, appeared } = playingTime(start, [sub(50, 4, 2)], 50 * MIN);
    expect(msByPlayer.get(4)).toBe(0);
    expect(appeared.has(4)).toBe(true);
  });

  it('includes players brought on from outside the kickoff bench', () => {
    expect(playingTime(start, [sub(40, 9, 3)], 50 * MIN).msByPlayer.get(9)).toBe(10 * MIN);
  });

  it('works for a live match (time so far)', () => {
    const { msByPlayer } = playingTime(start, [sub(10, 4, 2)], 12 * MIN);
    expect(minutes(msByPlayer)).toMatchObject({ 2: 10, 4: 2 });
  });

  it('handles several subs at the same moment (half-time changes)', () => {
    const events = [sub(25, 4, 2), sub(25, 5, 3)];
    expect(minutes(playingTime(start, events, 50 * MIN).msByPlayer)).toEqual({
      1: 50,
      2: 25,
      3: 25,
      4: 25,
      5: 25,
    });
  });

  it('does not double count when the phone clock jumped back', () => {
    // Recorded in this order, but the second event got an earlier game time.
    const events = [sub(20, 4, 2), sub(18, 2, 3)];
    const { msByPlayer } = playingTime(start, events, 50 * MIN);
    expect(minutes(msByPlayer)).toEqual({ 1: 50, 2: 50, 3: 20, 4: 30, 5: 0 });
  });

  it('ignores a red card for a bench player', () => {
    const events = [event(10, { eventType: 'red_card', playerId: 4 })];
    const { msByPlayer, appeared } = playingTime(start, events, 50 * MIN);
    expect(msByPlayer.get(4)).toBe(0);
    expect(appeared.has(4)).toBe(false);
  });

  it('never counts time past now or backwards', () => {
    const { msByPlayer } = playingTime(start, [sub(30, 4, 2)], 20 * MIN);
    expect(minutes(msByPlayer)).toMatchObject({ 1: 20, 2: 20, 4: 0 });
  });
});
