import type { ParseResult, SlotRole } from './types';

/** A player's preferred positions, ordered back to front. */
export const PLAYER_POSITIONS = [
  'GK',
  'CB',
  'LB',
  'RB',
  'CDM',
  'CM',
  'CAM',
  'LM',
  'RM',
  'LW',
  'RW',
  'ST',
] as const;
export type PlayerPosition = (typeof PLAYER_POSITIONS)[number];

export const POSITION_NAMES: Record<PlayerPosition, string> = {
  GK: 'Goalkeeper',
  CB: 'Center back',
  LB: 'Left back',
  RB: 'Right back',
  CDM: 'Defensive midfielder',
  CM: 'Central midfielder',
  CAM: 'Attacking midfielder',
  LM: 'Left midfielder',
  RM: 'Right midfielder',
  LW: 'Left winger',
  RW: 'Right winger',
  ST: 'Striker',
};

/** The formation line each position belongs to (matches formation slot roles). */
export const POSITION_LINE: Record<PlayerPosition, SlotRole> = {
  GK: 'GK',
  CB: 'DEF',
  LB: 'DEF',
  RB: 'DEF',
  CDM: 'MID',
  CM: 'MID',
  CAM: 'MID',
  LM: 'MID',
  RM: 'MID',
  LW: 'FWD',
  RW: 'FWD',
  ST: 'FWD',
};

export function isPlayerPosition(value: unknown): value is PlayerPosition {
  return typeof value === 'string' && (PLAYER_POSITIONS as readonly string[]).includes(value);
}

export type PlayerPositions = {
  primaryPosition: PlayerPosition | null;
  secondaryPosition: PlayerPosition | null;
};

/**
 * Both positions are optional, but a secondary needs a primary and must differ from it.
 * `undefined` and `null` both mean "none".
 */
export function cleanPositions(input: {
  primaryPosition?: string | null;
  secondaryPosition?: string | null;
}): ParseResult<PlayerPositions> {
  const primary = input.primaryPosition ?? null;
  const secondary = input.secondaryPosition ?? null;
  if (primary !== null && !isPlayerPosition(primary)) {
    return { ok: false, error: `Unknown position: ${primary}` };
  }
  if (secondary !== null && !isPlayerPosition(secondary)) {
    return { ok: false, error: `Unknown position: ${secondary}` };
  }
  if (secondary !== null && primary === null) {
    return { ok: false, error: 'Choose a main position before a second one' };
  }
  if (secondary !== null && secondary === primary) {
    return { ok: false, error: 'The second position must differ from the main one' };
  }
  return { ok: true, value: { primaryPosition: primary, secondaryPosition: secondary } };
}

/** Short label for lists, e.g. "CM / CB", or "" when no position is set. */
export function formatPositions(positions: PlayerPositions): string {
  return [positions.primaryPosition, positions.secondaryPosition].filter(Boolean).join(' / ');
}
