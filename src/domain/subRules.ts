// Substitution rules. Re-entry is allowed (youth rolling subs); a red-carded player can't come
// back, and `matches.max_subs` (null = unlimited) caps how many players can be taken off.
// Check here before recording an event: replay silently skips events that don't apply.

import { findPlayerSlot, type LiveLineup } from './lineup';
import type { QuickSubPair } from './types';

export const SUB_ERRORS = {
  samePlayer: 'Pick two different players',
  duplicatePlayer: 'Player is already in another sub',
  outNotOnPitch: "Player going off isn't on the pitch",
  inOnPitch: 'Player coming on is already on the pitch',
  inSentOff: 'Player coming on was sent off',
  limitReached: 'No substitutions left',
  slotUnavailable: 'That spot is taken or closed',
  slotLocked: 'That spot is closed after a red card',
  notOnPitch: "Player isn't on the pitch",
} as const;

export type SubError = (typeof SUB_ERRORS)[keyof typeof SUB_ERRORS];

export type SubCheck = {
  ok: boolean;
  /** One entry per pair, in order: null when that pair is fine. */
  errors: (SubError | null)[];
};

/** null = unlimited. */
export function subsRemaining(maxSubs: number | null, subsUsed: number): number | null {
  return maxSubs === null ? null : Math.max(0, maxSubs - subsUsed);
}

/**
 * Checks a group of substitutions made together (one tap of a quick-sub preset, or a single
 * manual sub). Each pair is checked against the current lineup; a player can appear in only
 * one pair, and only valid pairs count toward the limit.
 */
export function canSubstitute(
  lineup: LiveLineup,
  maxSubs: number | null,
  pairs: readonly QuickSubPair[],
): SubCheck {
  const seen = new Set<number>();
  let used = lineup.subsUsed;

  const errors = pairs.map(({ outPlayerId, inPlayerId }): SubError | null => {
    const error = pairError(lineup, outPlayerId, inPlayerId, seen);
    seen.add(outPlayerId).add(inPlayerId);
    if (error) return error;
    if (maxSubs !== null && used >= maxSubs) return SUB_ERRORS.limitReached;
    used += 1;
    return null;
  });

  return { ok: pairs.length > 0 && errors.every((e) => e === null), errors };
}

function pairError(
  lineup: LiveLineup,
  outId: number,
  inId: number,
  seen: ReadonlySet<number>,
): SubError | null {
  if (outId === inId) return SUB_ERRORS.samePlayer;
  if (seen.has(outId) || seen.has(inId)) return SUB_ERRORS.duplicatePlayer;
  if (!findPlayerSlot(lineup, outId)) return SUB_ERRORS.outNotOnPitch;
  return incomingError(lineup, inId);
}

function incomingError(lineup: LiveLineup, inId: number): SubError | null {
  if (lineup.sentOff.includes(inId)) return SUB_ERRORS.inSentOff;
  if (findPlayerSlot(lineup, inId)) return SUB_ERRORS.inOnPitch;
  return null;
}

function openSlotError(lineup: LiveLineup, slotId: string): SubError | null {
  const slot = lineup.slots.find((s) => s.slotId === slotId);
  if (!slot || slot.playerId !== undefined) return SUB_ERRORS.slotUnavailable;
  if (slot.locked) return SUB_ERRORS.slotLocked;
  return null;
}

/** A substitution with nobody going off: puts a player into an empty spot. Doesn't use a sub. */
export function canFillSlot(lineup: LiveLineup, slotId: string, inId: number): SubError | null {
  return openSlotError(lineup, slotId) ?? incomingError(lineup, inId);
}

/** A position swap: with another player on the pitch, or into an empty spot. */
export function canSwap(
  lineup: LiveLineup,
  playerId: number,
  target: { playerId: number } | { slotId: string },
): SubError | null {
  if (!findPlayerSlot(lineup, playerId)) return SUB_ERRORS.notOnPitch;
  if ('slotId' in target) return openSlotError(lineup, target.slotId);
  if (target.playerId === playerId) return SUB_ERRORS.samePlayer;
  return findPlayerSlot(lineup, target.playerId) ? null : SUB_ERRORS.notOnPitch;
}
