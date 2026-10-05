import { applyLineupEvent, deriveLineup, type LineupEvent, type LiveLineup } from '../lineup';
import { canFillSlot, canSubstitute, canSwap, SUB_ERRORS, subsRemaining } from '../subRules';
import type { StartingLineup } from '../types';

// GK 1 · CB 2 · CM empty · ST 3; bench 4, 5, 6
const start: StartingLineup = {
  slots: [
    { slotId: 'gk', role: 'GK', label: 'GK', x: 0.5, y: 0.9, playerId: 1 },
    { slotId: 'cb', role: 'DEF', label: 'CB', x: 0.5, y: 0.7, playerId: 2 },
    { slotId: 'cm', role: 'MID', label: 'CM', x: 0.5, y: 0.5 },
    { slotId: 'st', role: 'FWD', label: 'ST', x: 0.5, y: 0.3, playerId: 3 },
  ],
  bench: [4, 5, 6],
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

const lineup = deriveLineup(start, []);
const withSubsUsed = (subsUsed: number): LiveLineup => ({ ...lineup, subsUsed });
const pair = (outPlayerId: number, inPlayerId: number) => ({ outPlayerId, inPlayerId });

describe('subsUsed (from the replay)', () => {
  it('counts substitutions that took a player off', () => {
    const after = deriveLineup(start, [
      event({ eventType: 'substitution', playerId: 4, relatedPlayerId: 2 }),
      event({ eventType: 'substitution', playerId: 5, slotId: 'cm' }), // fills an empty slot
      event({ eventType: 'goal', playerId: 3 }),
      event({ eventType: 'substitution', playerId: 2, relatedPlayerId: 4 }),
    ]);
    expect(after.subsUsed).toBe(2);
  });

  it('does not count subs that did not apply', () => {
    const after = deriveLineup(start, [
      event({ eventType: 'substitution', playerId: 4, relatedPlayerId: 6 }), // 6 is on the bench
    ]);
    expect(after.subsUsed).toBe(0);
  });
});

describe('subsRemaining', () => {
  it('is null when unlimited', () => {
    expect(subsRemaining(null, 7)).toBeNull();
  });

  it('never goes below zero', () => {
    expect(subsRemaining(3, 1)).toBe(2);
    expect(subsRemaining(3, 5)).toBe(0);
  });
});

describe('canSubstitute', () => {
  it('accepts valid pairs', () => {
    expect(canSubstitute(lineup, null, [pair(2, 4), pair(3, 5)])).toEqual({
      ok: true,
      errors: [null, null],
    });
  });

  it('rejects an empty list', () => {
    expect(canSubstitute(lineup, null, []).ok).toBe(false);
  });

  it('allows re-entry of a player who came off earlier', () => {
    const after = deriveLineup(start, [
      event({ eventType: 'substitution', playerId: 4, relatedPlayerId: 2 }),
    ]);
    expect(canSubstitute(after, null, [pair(4, 2)]).ok).toBe(true);
  });

  it('allows a player who was not on the kickoff bench', () => {
    expect(canSubstitute(lineup, null, [pair(3, 9)]).ok).toBe(true);
  });

  it('reports an error per pair', () => {
    const result = canSubstitute(lineup, null, [
      pair(2, 4),
      pair(5, 6), // 5 is on the bench
      pair(3, 1), // 1 is on the pitch
      pair(3, 3),
    ]);
    expect(result).toEqual({
      ok: false,
      errors: [null, SUB_ERRORS.outNotOnPitch, SUB_ERRORS.inOnPitch, SUB_ERRORS.samePlayer],
    });
  });

  it('rejects a player used twice in one group', () => {
    const result = canSubstitute(lineup, null, [pair(2, 4), pair(3, 4), pair(2, 5)]);
    expect(result.errors).toEqual([null, SUB_ERRORS.duplicatePlayer, SUB_ERRORS.duplicatePlayer]);
  });

  it('rejects sent-off players', () => {
    const after = deriveLineup(start, [
      event({ eventType: 'red_card', playerId: 4 }),
      event({ eventType: 'red_card', playerId: 2 }),
    ]);
    const result = canSubstitute(after, null, [pair(3, 4), pair(2, 5)]);
    expect(result.errors).toEqual([SUB_ERRORS.inSentOff, SUB_ERRORS.outNotOnPitch]);
  });

  it('enforces the sub limit across the group', () => {
    const result = canSubstitute(withSubsUsed(2), 3, [pair(2, 4), pair(3, 5)]);
    expect(result).toEqual({ ok: false, errors: [null, SUB_ERRORS.limitReached] });
  });

  it('does not count invalid pairs toward the limit', () => {
    const result = canSubstitute(withSubsUsed(2), 3, [pair(5, 6), pair(2, 4)]);
    expect(result.errors).toEqual([SUB_ERRORS.outNotOnPitch, null]);
  });

  it('blocks every sub when the limit is zero', () => {
    expect(canSubstitute(lineup, 0, [pair(2, 4)]).errors).toEqual([SUB_ERRORS.limitReached]);
  });
});

describe('canFillSlot', () => {
  const redCarded = deriveLineup(start, [event({ eventType: 'red_card', playerId: 2 })]);

  it('accepts an open spot, even with no subs left', () => {
    expect(canFillSlot(withSubsUsed(99), 'cm', 4)).toBeNull();
  });

  it('rejects taken, missing and locked spots', () => {
    expect(canFillSlot(lineup, 'cb', 4)).toBe(SUB_ERRORS.slotUnavailable);
    expect(canFillSlot(lineup, 'nope', 4)).toBe(SUB_ERRORS.slotUnavailable);
    expect(canFillSlot(redCarded, 'cb', 4)).toBe(SUB_ERRORS.slotLocked);
  });

  it('rejects players already on or sent off', () => {
    expect(canFillSlot(lineup, 'cm', 3)).toBe(SUB_ERRORS.inOnPitch);
    expect(canFillSlot(redCarded, 'cm', 2)).toBe(SUB_ERRORS.inSentOff);
  });
});

describe('canSwap', () => {
  const redCarded = deriveLineup(start, [event({ eventType: 'red_card', playerId: 2 })]);

  it('accepts two players on the pitch, or a move into an open spot', () => {
    expect(canSwap(lineup, 2, { playerId: 3 })).toBeNull();
    expect(canSwap(lineup, 2, { slotId: 'cm' })).toBeNull();
  });

  it('rejects bench players, the same player and closed spots', () => {
    expect(canSwap(lineup, 4, { playerId: 3 })).toBe(SUB_ERRORS.notOnPitch);
    expect(canSwap(lineup, 3, { playerId: 4 })).toBe(SUB_ERRORS.notOnPitch);
    expect(canSwap(lineup, 3, { playerId: 3 })).toBe(SUB_ERRORS.samePlayer);
    expect(canSwap(lineup, 3, { slotId: 'gk' })).toBe(SUB_ERRORS.slotUnavailable);
    expect(canSwap(redCarded, 3, { slotId: 'cb' })).toBe(SUB_ERRORS.slotLocked);
  });
});

describe('checks agree with the replay', () => {
  it('a passing check always changes the lineup', () => {
    const fill = event({ eventType: 'substitution', playerId: 4, slotId: 'cm' });
    const move = event({ eventType: 'position_swap', playerId: 3, slotId: 'cm' });
    const swap = event({ eventType: 'position_swap', playerId: 2, relatedPlayerId: 3 });
    const sub = event({ eventType: 'substitution', playerId: 5, relatedPlayerId: 2 });
    expect(canFillSlot(lineup, 'cm', 4)).toBeNull();
    expect(applyLineupEvent(lineup, fill)).not.toBe(lineup);
    expect(canSwap(lineup, 3, { slotId: 'cm' })).toBeNull();
    expect(applyLineupEvent(lineup, move)).not.toBe(lineup);
    expect(canSwap(lineup, 2, { playerId: 3 })).toBeNull();
    expect(applyLineupEvent(lineup, swap)).not.toBe(lineup);
    expect(canSubstitute(lineup, null, [pair(2, 5)]).ok).toBe(true);
    expect(applyLineupEvent(lineup, sub)).not.toBe(lineup);
  });
});
