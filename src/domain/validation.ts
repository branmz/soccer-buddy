import { FIELD_SIZES, type FieldSize, type ParseResult } from './types';

export const MAX_NAME_LENGTH = 60;
export const MAX_JERSEY_NUMBER = 99;

/** Trims and validates a user-entered name (team, player, opponent, formation, preset). */
export function cleanName(input: string, label = 'Name'): ParseResult<string> {
  const value = input.trim().replace(/\s+/g, ' ');
  if (value.length === 0) return { ok: false, error: `${label} is required` };
  if (value.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `${label} must be ${MAX_NAME_LENGTH} characters or fewer` };
  }
  return { ok: true, value };
}

/** Jersey numbers are optional; null means "no number". */
export function cleanJerseyNumber(input: number | null | undefined): ParseResult<number | null> {
  if (input === null || input === undefined) return { ok: true, value: null };
  if (!Number.isInteger(input) || input < 0 || input > MAX_JERSEY_NUMBER) {
    return {
      ok: false,
      error: `Jersey number must be a whole number from 0 to ${MAX_JERSEY_NUMBER}`,
    };
  }
  return { ok: true, value: input };
}

export function isFieldSize(value: number): value is FieldSize {
  return (FIELD_SIZES as readonly number[]).includes(value);
}

export type MatchSettingsInput = {
  periodCount: number;
  periodLengthMinutes: number;
  maxSubs: number | null;
};

export const MAX_PERIODS = 4;
export const MAX_PERIOD_LENGTH_MINUTES = 60;

export function validateMatchSettings(input: MatchSettingsInput): ParseResult<MatchSettingsInput> {
  const { periodCount, periodLengthMinutes, maxSubs } = input;
  if (!Number.isInteger(periodCount) || periodCount < 1 || periodCount > MAX_PERIODS) {
    return { ok: false, error: `Periods must be between 1 and ${MAX_PERIODS}` };
  }
  if (
    !Number.isInteger(periodLengthMinutes) ||
    periodLengthMinutes < 1 ||
    periodLengthMinutes > MAX_PERIOD_LENGTH_MINUTES
  ) {
    return {
      ok: false,
      error: `Period length must be between 1 and ${MAX_PERIOD_LENGTH_MINUTES} minutes`,
    };
  }
  if (maxSubs !== null && (!Number.isInteger(maxSubs) || maxSubs < 0)) {
    return { ok: false, error: 'Max subs must be blank (unlimited) or a whole number' };
  }
  return { ok: true, value: input };
}
