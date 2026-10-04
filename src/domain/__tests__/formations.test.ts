import {
  clampCoordinate,
  COORD_MAX,
  COORD_MIN,
  parseFormationLayout,
  parseQuickSubPairs,
  parseStartingLineup,
} from '../formations';
import type { FormationSlot } from '../types';

function slot(overrides: Partial<FormationSlot> = {}): FormationSlot {
  return { slotId: 's1', role: 'DEF', label: 'CB', x: 0.5, y: 0.7, ...overrides };
}

const fiveASide: FormationSlot[] = [
  slot({ slotId: 'gk', role: 'GK', label: 'GK', y: 0.92 }),
  slot({ slotId: 'd1', x: 0.3 }),
  slot({ slotId: 'd2', x: 0.7 }),
  slot({ slotId: 'f1', role: 'FWD', label: 'ST', x: 0.3, y: 0.3 }),
  slot({ slotId: 'f2', role: 'FWD', label: 'ST', x: 0.7, y: 0.3 }),
];

describe('clampCoordinate', () => {
  it('keeps values inside the touchline margins', () => {
    expect(clampCoordinate(-1)).toBe(COORD_MIN);
    expect(clampCoordinate(2)).toBe(COORD_MAX);
    expect(clampCoordinate(0.5)).toBe(0.5);
  });
});

describe('parseFormationLayout', () => {
  it('parses a valid layout from a JSON string', () => {
    const result = parseFormationLayout(JSON.stringify({ slots: fiveASide }));
    expect(result).toEqual({ ok: true, value: { slots: fiveASide } });
  });

  it('accepts an already-parsed object and keeps player assignments', () => {
    const slots = fiveASide.map((s, i) => ({ ...s, playerId: i + 1 }));
    const result = parseFormationLayout({ slots });
    expect(result.ok && result.value.slots[2].playerId).toBe(3);
  });

  it('drops null playerIds', () => {
    const slots = fiveASide.map((s) => ({ ...s, playerId: null }));
    const result = parseFormationLayout({ slots });
    expect(result.ok && 'playerId' in result.value.slots[0]).toBe(false);
  });

  it('enforces the field size when given', () => {
    expect(parseFormationLayout({ slots: fiveASide }, { fieldSize: 5 }).ok).toBe(true);
    expect(parseFormationLayout({ slots: fiveASide }, { fieldSize: 7 })).toEqual({
      ok: false,
      error: 'expected 7 slots, got 5',
    });
  });

  it.each([
    ['invalid JSON', '{not json'],
    ['non-object', 42],
    ['missing slots', {}],
    ['bad role', { slots: [slot({ role: 'XX' as never })] }],
    ['out-of-range coordinate', { slots: [slot({ role: 'GK', x: 1.2 })] }],
    ['empty slotId', { slots: [slot({ role: 'GK', slotId: '' })] }],
    ['fractional playerId', { slots: [slot({ role: 'GK', playerId: 1.5 })] }],
    ['no goalkeeper', { slots: [slot()] }],
    ['two goalkeepers', { slots: [slot({ role: 'GK' }), slot({ slotId: 's2', role: 'GK' })] }],
    ['duplicate slotIds', { slots: [slot({ role: 'GK' }), slot()] }],
    [
      'player in two slots',
      { slots: [slot({ role: 'GK', playerId: 4 }), slot({ slotId: 's2', playerId: 4 })] },
    ],
  ])('rejects %s', (_label, input) => {
    expect(parseFormationLayout(input).ok).toBe(false);
  });
});

describe('parseStartingLineup', () => {
  const slots = fiveASide.map((s, i) => ({ ...s, playerId: i + 1 }));

  it('parses slots and bench', () => {
    const result = parseStartingLineup(JSON.stringify({ slots, bench: [6, 7] }));
    expect(result).toEqual({ ok: true, value: { slots, bench: [6, 7] } });
  });

  it('allows empty slots when playing short-handed', () => {
    const shortHanded = slots.map((s) => (s.slotId === 'f2' ? { ...s, playerId: undefined } : s));
    expect(parseStartingLineup({ slots: shortHanded, bench: [] }).ok).toBe(true);
  });

  it('rejects a player who is both on the field and on the bench', () => {
    expect(parseStartingLineup({ slots, bench: [1] }).ok).toBe(false);
  });

  it('rejects duplicate or invalid bench entries', () => {
    expect(parseStartingLineup({ slots, bench: [6, 6] }).ok).toBe(false);
    expect(parseStartingLineup({ slots, bench: ['6'] }).ok).toBe(false);
    expect(parseStartingLineup({ slots }).ok).toBe(false);
  });
});

describe('parseQuickSubPairs', () => {
  it('parses valid pairs', () => {
    const pairs = [
      { outPlayerId: 1, inPlayerId: 6 },
      { outPlayerId: 2, inPlayerId: 7 },
    ];
    expect(parseQuickSubPairs(JSON.stringify(pairs))).toEqual({ ok: true, value: pairs });
  });

  it('accepts an empty preset', () => {
    expect(parseQuickSubPairs('[]')).toEqual({ ok: true, value: [] });
  });

  it.each([
    ['non-array', { outPlayerId: 1, inPlayerId: 2 }],
    ['missing ids', [{ outPlayerId: 1 }]],
    ['same player in and out', [{ outPlayerId: 3, inPlayerId: 3 }]],
    [
      'player subbed off twice',
      [
        { outPlayerId: 1, inPlayerId: 6 },
        { outPlayerId: 1, inPlayerId: 7 },
      ],
    ],
    [
      'player subbed on twice',
      [
        { outPlayerId: 1, inPlayerId: 6 },
        { outPlayerId: 2, inPlayerId: 6 },
      ],
    ],
  ])('rejects %s', (_label, input) => {
    expect(parseQuickSubPairs(input).ok).toBe(false);
  });
});
