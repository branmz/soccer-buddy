// Shared domain types. Pure TS: no React, no DB imports.

export const FIELD_SIZES = [5, 7, 9, 11] as const;
export type FieldSize = (typeof FIELD_SIZES)[number];

export const SLOT_ROLES = ['GK', 'DEF', 'MID', 'FWD'] as const;
export type SlotRole = (typeof SLOT_ROLES)[number];

export const MATCH_STATUSES = ['setup', 'live', 'finished'] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export const MATCH_EVENT_TYPES = [
  'goal',
  'assist',
  'yellow_card',
  'red_card',
  'substitution',
  'opponent_goal',
  'position_swap',
] as const;
export type MatchEventType = (typeof MATCH_EVENT_TYPES)[number];

/** One position on the pitch. x/y are normalized 0–1; y = 1 is the team's own goal line. */
export type FormationSlot = {
  slotId: string;
  role: SlotRole;
  label: string;
  x: number;
  y: number;
  playerId?: number;
};

/** Stored in `formations.layout_json` and `matches.live_layout_json`. */
export type FormationLayout = {
  slots: FormationSlot[];
};

/** Stored in `matches.starting_lineup_json`: a snapshot taken at kickoff. */
export type StartingLineup = {
  slots: FormationSlot[];
  bench: number[];
};

/** One pair in `quick_sub_presets.substitutions_json`. */
export type QuickSubPair = {
  outPlayerId: number;
  inPlayerId: number;
};

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };
