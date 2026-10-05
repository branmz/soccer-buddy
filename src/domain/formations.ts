import {
  SLOT_ROLES,
  type FieldSize,
  type FormationLayout,
  type FormationSlot,
  type ParseResult,
  type QuickSubPair,
  type SlotRole,
  type StartingLineup,
} from './types';

/** Tokens are kept slightly inside the touchlines so they never render half off the pitch. */
export const COORD_MIN = 0.03;
export const COORD_MAX = 0.97;

export function clampCoordinate(value: number): number {
  return Math.min(COORD_MAX, Math.max(COORD_MIN, value));
}

function fail<T>(error: string): ParseResult<T> {
  return { ok: false, error };
}

/** Accepts a JSON string (as stored in SQLite) or an already-parsed value. */
function decode(input: unknown): ParseResult<unknown> {
  if (typeof input !== 'string') return { ok: true, value: input };
  try {
    return { ok: true, value: JSON.parse(input) as unknown };
  } catch {
    return fail('invalid JSON');
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPlayerId(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isUnitCoordinate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

function parseSlot(raw: unknown, index: number): ParseResult<FormationSlot> {
  if (!isRecord(raw)) return fail(`slot ${index} is not an object`);
  const { slotId, role, label, x, y, playerId } = raw;
  if (typeof slotId !== 'string' || slotId.length === 0) {
    return fail(`slot ${index} has no slotId`);
  }
  if (typeof role !== 'string' || !SLOT_ROLES.includes(role as SlotRole)) {
    return fail(`slot ${slotId} has invalid role`);
  }
  if (typeof label !== 'string') return fail(`slot ${slotId} has no label`);
  if (!isUnitCoordinate(x) || !isUnitCoordinate(y)) {
    return fail(`slot ${slotId} coordinates must be between 0 and 1`);
  }
  if (playerId !== undefined && playerId !== null && !isPlayerId(playerId)) {
    return fail(`slot ${slotId} has invalid playerId`);
  }
  const slot: FormationSlot = { slotId, role: role as SlotRole, label, x, y };
  if (isPlayerId(playerId)) slot.playerId = playerId;
  return { ok: true, value: slot };
}

function parseSlots(raw: unknown): ParseResult<FormationSlot[]> {
  if (!Array.isArray(raw)) return fail('slots must be an array');
  const slots: FormationSlot[] = [];
  for (const [index, item] of raw.entries()) {
    const parsed = parseSlot(item, index);
    if (!parsed.ok) return parsed;
    slots.push(parsed.value);
  }

  const slotIds = new Set(slots.map((s) => s.slotId));
  if (slotIds.size !== slots.length) return fail('slotIds must be unique');

  const playerIds = slots.flatMap((s) => (s.playerId === undefined ? [] : [s.playerId]));
  if (new Set(playerIds).size !== playerIds.length) {
    return fail('a player is assigned to more than one slot');
  }

  const goalkeepers = slots.filter((s) => s.role === 'GK').length;
  if (goalkeepers !== 1) return fail('a formation needs exactly one GK slot');

  return { ok: true, value: slots };
}

export function parseFormationLayout(
  input: unknown,
  options: { fieldSize?: FieldSize } = {},
): ParseResult<FormationLayout> {
  const decoded = decode(input);
  if (!decoded.ok) return decoded;
  if (!isRecord(decoded.value)) return fail('layout must be an object');

  const slots = parseSlots(decoded.value.slots);
  if (!slots.ok) return slots;
  if (options.fieldSize !== undefined && slots.value.length !== options.fieldSize) {
    return fail(`expected ${options.fieldSize} slots, got ${slots.value.length}`);
  }
  return { ok: true, value: { slots: slots.value } };
}

export function parseStartingLineup(input: unknown): ParseResult<StartingLineup> {
  const decoded = decode(input);
  if (!decoded.ok) return decoded;
  if (!isRecord(decoded.value)) return fail('lineup must be an object');

  const slots = parseSlots(decoded.value.slots);
  if (!slots.ok) return slots;

  const { bench } = decoded.value;
  if (!Array.isArray(bench) || !bench.every(isPlayerId)) {
    return fail('bench must be an array of player ids');
  }
  if (new Set(bench).size !== bench.length) return fail('bench has duplicate players');

  const onField = new Set(slots.value.flatMap((s) => (s.playerId ? [s.playerId] : [])));
  if (bench.some((id) => onField.has(id))) {
    return fail('a player cannot be on the field and the bench');
  }
  return { ok: true, value: { slots: slots.value, bench } };
}

export function parseQuickSubPairs(input: unknown): ParseResult<QuickSubPair[]> {
  const decoded = decode(input);
  if (!decoded.ok) return decoded;
  if (!Array.isArray(decoded.value)) return fail('substitutions must be an array');

  const pairs: QuickSubPair[] = [];
  for (const [index, raw] of decoded.value.entries()) {
    if (!isRecord(raw) || !isPlayerId(raw.outPlayerId) || !isPlayerId(raw.inPlayerId)) {
      return fail(`substitution ${index} needs outPlayerId and inPlayerId`);
    }
    if (raw.outPlayerId === raw.inPlayerId) {
      return fail(`substitution ${index} swaps a player with themselves`);
    }
    pairs.push({ outPlayerId: raw.outPlayerId, inPlayerId: raw.inPlayerId });
  }

  const outs = new Set(pairs.map((p) => p.outPlayerId));
  const ins = new Set(pairs.map((p) => p.inPlayerId));
  if (outs.size !== pairs.length || ins.size !== pairs.length) {
    return fail('each player can appear only once per side of a preset');
  }
  return { ok: true, value: pairs };
}
