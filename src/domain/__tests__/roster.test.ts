import {
  findJerseyConflict,
  parseJerseyInput,
  playersWithDuplicateJersey,
  isRosterSort,
  resolveActiveTeamId,
  sortRoster,
  type RosterEntry,
} from '../roster';
import type { PlayerPosition } from '../positions';

const player = (id: number, jerseyNumber: number | null, isActive = true): RosterEntry => ({
  id,
  name: `P${id}`,
  jerseyNumber,
  isActive,
});

describe('playersWithDuplicateJersey', () => {
  it('flags every active player sharing a number', () => {
    const roster = [player(1, 7), player(2, 7), player(3, 9), player(4, 7)];
    expect([...playersWithDuplicateJersey(roster)].sort()).toEqual([1, 2, 4]);
  });

  it('ignores inactive players and players without numbers', () => {
    const roster = [player(1, 7), player(2, 7, false), player(3, null), player(4, null)];
    expect(playersWithDuplicateJersey(roster).size).toBe(0);
  });

  it('treats 0 as a real number', () => {
    expect(playersWithDuplicateJersey([player(1, 0), player(2, 0)]).size).toBe(2);
  });
});

describe('findJerseyConflict', () => {
  const roster = [player(1, 7), player(2, 9), player(3, 10, false)];

  it('finds another active player with the number', () => {
    expect(findJerseyConflict(roster, 7)?.id).toBe(1);
  });

  it('ignores the player being edited, inactive players and blank numbers', () => {
    expect(findJerseyConflict(roster, 7, 1)).toBeUndefined();
    expect(findJerseyConflict(roster, 10)).toBeUndefined();
    expect(findJerseyConflict(roster, null)).toBeUndefined();
  });
});

describe('isRosterSort', () => {
  it('accepts only known sorts (persisted values may be stale)', () => {
    expect(['number', 'name', 'position'].every(isRosterSort)).toBe(true);
    expect(isRosterSort('age')).toBe(false);
    expect(isRosterSort(undefined)).toBe(false);
  });
});

describe('sortRoster', () => {
  const entry = (
    id: number,
    name: string,
    jerseyNumber: number | null,
    primaryPosition: PlayerPosition | null,
  ) => ({ id, name, jerseyNumber, isActive: true, primaryPosition });

  const roster = [
    entry(1, 'zoe', 9, 'ST'),
    entry(2, 'Ana', 1, 'GK'),
    entry(3, 'Cam', null, 'CM'),
    entry(4, 'Bea', 4, null),
    entry(5, 'Dee', 7, 'CB'),
    entry(6, 'Eve', 11, 'RW'),
    entry(7, 'Fay', 5, 'CM'),
  ];
  const names = (sorted: { name: string }[]) => sorted.map((p) => p.name);

  it('sorts by number, unnumbered last', () => {
    expect(names(sortRoster(roster, 'number'))).toEqual([
      'Ana',
      'Bea',
      'Fay',
      'Dee',
      'zoe',
      'Eve',
      'Cam',
    ]);
  });

  it('sorts by name, ignoring case', () => {
    expect(names(sortRoster(roster, 'name'))).toEqual([
      'Ana',
      'Bea',
      'Cam',
      'Dee',
      'Eve',
      'Fay',
      'zoe',
    ]);
  });

  it('sorts by main position from strikers to goalkeeper, then number, no position last', () => {
    expect(names(sortRoster(roster, 'position'))).toEqual([
      'zoe', // ST
      'Eve', // RW
      'Fay', // CM #5
      'Cam', // CM, no number
      'Dee', // CB
      'Ana', // GK
      'Bea', // no position
    ]);
  });

  it('returns a copy and keeps every player', () => {
    const sorted = sortRoster(roster, 'position');
    expect(sorted).not.toBe(roster);
    expect(sorted).toHaveLength(roster.length);
    expect(roster[0].name).toBe('zoe');
  });
});

describe('parseJerseyInput', () => {
  it.each([
    ['', null],
    ['  ', null],
    ['7', 7],
    [' 07 ', 7],
    ['0', 0],
    ['7a', undefined],
    ['-1', undefined],
    ['1.5', undefined],
  ])('parses %p as %p', (input, expected) => {
    expect(parseJerseyInput(input)).toBe(expected);
  });
});

describe('resolveActiveTeamId', () => {
  const teams = [{ id: 3 }, { id: 5 }];

  it('keeps a stored team that still exists', () => {
    expect(resolveActiveTeamId(5, teams)).toBe(5);
  });

  it('falls back to the first team when the stored one is gone or unset', () => {
    expect(resolveActiveTeamId(99, teams)).toBe(3);
    expect(resolveActiveTeamId(null, teams)).toBe(3);
  });

  it('returns null when there are no teams', () => {
    expect(resolveActiveTeamId(5, [])).toBeNull();
  });

  it('keeps a just-created team the list has not caught up with yet', () => {
    // Regression: the stale list made the hook overwrite a new team's id with the first team.
    const exists = (id: number) => id === 7;
    expect(resolveActiveTeamId(7, teams, exists)).toBe(7);
    expect(resolveActiveTeamId(7, [], exists)).toBe(7);
    expect(resolveActiveTeamId(8, teams, exists)).toBe(3);
  });
});
