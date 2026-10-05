import {
  cleanPositions,
  formatPositions,
  isPlayerPosition,
  PLAYER_POSITIONS,
  POSITION_LINE,
  POSITION_NAMES,
} from '../positions';

describe('positions', () => {
  it('maps every position to a name and a formation line', () => {
    for (const position of PLAYER_POSITIONS) {
      expect(POSITION_NAMES[position]).toBeTruthy();
      expect(['GK', 'DEF', 'MID', 'FWD']).toContain(POSITION_LINE[position]);
    }
    expect(POSITION_LINE.CDM).toBe('MID');
    expect(POSITION_LINE.RW).toBe('FWD');
  });

  it('recognizes only known positions', () => {
    expect(isPlayerPosition('ST')).toBe(true);
    expect(isPlayerPosition('st')).toBe(false);
    expect(isPlayerPosition('SW')).toBe(false);
    expect(isPlayerPosition(null)).toBe(false);
  });
});

describe('cleanPositions', () => {
  it('allows no positions, a primary only, or both', () => {
    expect(cleanPositions({})).toEqual({
      ok: true,
      value: { primaryPosition: null, secondaryPosition: null },
    });
    expect(cleanPositions({ primaryPosition: 'CM' })).toEqual({
      ok: true,
      value: { primaryPosition: 'CM', secondaryPosition: null },
    });
    expect(cleanPositions({ primaryPosition: 'CM', secondaryPosition: 'CB' }).ok).toBe(true);
  });

  it.each([
    ['unknown primary', { primaryPosition: 'SW' }],
    ['unknown secondary', { primaryPosition: 'CM', secondaryPosition: 'XX' }],
    ['secondary without primary', { secondaryPosition: 'CB' }],
    ['same position twice', { primaryPosition: 'CB', secondaryPosition: 'CB' }],
  ])('rejects %s', (_label, input) => {
    expect(cleanPositions(input).ok).toBe(false);
  });
});

describe('formatPositions', () => {
  it('joins the positions that are set', () => {
    expect(formatPositions({ primaryPosition: 'CM', secondaryPosition: 'CB' })).toBe('CM / CB');
    expect(formatPositions({ primaryPosition: 'GK', secondaryPosition: null })).toBe('GK');
    expect(formatPositions({ primaryPosition: null, secondaryPosition: null })).toBe('');
  });
});
