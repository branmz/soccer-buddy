import {
  cleanJerseyNumber,
  cleanName,
  isFieldSize,
  MAX_NAME_LENGTH,
  validateMatchSettings,
} from '../validation';

describe('cleanName', () => {
  it('trims and collapses whitespace', () => {
    expect(cleanName('  Blue   Lions  ')).toEqual({ ok: true, value: 'Blue Lions' });
  });

  it('rejects blank names with the given label', () => {
    expect(cleanName('   ', 'Team name')).toEqual({ ok: false, error: 'Team name is required' });
  });

  it('rejects names over the length limit', () => {
    expect(cleanName('x'.repeat(MAX_NAME_LENGTH)).ok).toBe(true);
    expect(cleanName('x'.repeat(MAX_NAME_LENGTH + 1)).ok).toBe(false);
  });
});

describe('cleanJerseyNumber', () => {
  it('treats missing numbers as null', () => {
    expect(cleanJerseyNumber(undefined)).toEqual({ ok: true, value: null });
    expect(cleanJerseyNumber(null)).toEqual({ ok: true, value: null });
  });

  it('accepts 0 through 99', () => {
    expect(cleanJerseyNumber(0)).toEqual({ ok: true, value: 0 });
    expect(cleanJerseyNumber(99)).toEqual({ ok: true, value: 99 });
  });

  it.each([-1, 100, 7.5, Number.NaN])('rejects %p', (input) => {
    expect(cleanJerseyNumber(input).ok).toBe(false);
  });
});

describe('isFieldSize', () => {
  it('accepts only supported sizes', () => {
    expect([5, 7, 9, 11].every(isFieldSize)).toBe(true);
    expect(isFieldSize(8)).toBe(false);
  });
});

describe('validateMatchSettings', () => {
  const valid = { periodCount: 2, periodLengthMinutes: 25, maxSubs: null };

  it('accepts typical youth and adult settings', () => {
    expect(validateMatchSettings(valid).ok).toBe(true);
    expect(validateMatchSettings({ periodCount: 4, periodLengthMinutes: 12, maxSubs: 5 }).ok).toBe(
      true,
    );
  });

  it.each([
    ['zero periods', { ...valid, periodCount: 0 }],
    ['too many periods', { ...valid, periodCount: 5 }],
    ['zero-length periods', { ...valid, periodLengthMinutes: 0 }],
    ['fractional period length', { ...valid, periodLengthMinutes: 22.5 }],
    ['negative max subs', { ...valid, maxSubs: -1 }],
  ])('rejects %s', (_label, input) => {
    expect(validateMatchSettings(input).ok).toBe(false);
  });
});
