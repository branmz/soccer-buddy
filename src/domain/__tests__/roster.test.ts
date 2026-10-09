import {
  distinctNames,
  findJerseyConflict,
  findNameConflict,
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

describe('findNameConflict', () => {
  const named = (id: number, name: string, isActive = true): RosterEntry => ({
    id,
    name,
    jerseyNumber: id,
    isActive,
  });
  const roster = [named(3, 'Michael'), named(6, 'Diego'), named(9, 'Sam', false)];

  it('finds an active player with the same name, ignoring case and spaces', () => {
    expect(findNameConflict(roster, 'michael')?.id).toBe(3);
    expect(findNameConflict(roster, '  MICHAEL ')?.id).toBe(3);
  });

  it('ignores the player being edited and inactive players', () => {
    expect(findNameConflict(roster, 'Michael', 3)).toBeUndefined();
    expect(findNameConflict(roster, 'Sam')).toBeUndefined();
  });

  it('never matches a blank or different name', () => {
    expect(findNameConflict(roster, '')).toBeUndefined();
    expect(findNameConflict(roster, '   ')).toBeUndefined();
    expect(findNameConflict(roster, 'Mike')).toBeUndefined();
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

describe('distinctNames', () => {
  const named = (id: number, name: string, jerseyNumber: number | null) => ({
    id,
    name,
    jerseyNumber,
  });

  it('keeps unique names as they are', () => {
    const names = distinctNames([named(1, 'Diego', 12), named(2, 'Lea', 20)]);
    expect([...names.entries()]).toEqual([
      [1, 'Diego'],
      [2, 'Lea'],
    ]);
  });

  it('adds the number to players who share a name', () => {
    const names = distinctNames([
      named(1, 'Michael', 3),
      named(2, 'Diego', 12),
      named(3, 'Michael', 6),
    ]);
    expect(names.get(1)).toBe('Michael #3');
    expect(names.get(2)).toBe('Diego');
    expect(names.get(3)).toBe('Michael #6');
  });

  it('matches names ignoring case and surrounding spaces', () => {
    const names = distinctNames([named(1, 'Michael', 3), named(2, ' michael ', 6)]);
    expect(names.get(1)).toBe('Michael #3');
    expect(names.get(2)).toBe('michael #6');
  });

  it('leaves a clashing player without a number as they are', () => {
    const names = distinctNames([named(1, 'Michael', null), named(2, 'Michael', 6)]);
    expect(names.get(1)).toBe('Michael');
    expect(names.get(2)).toBe('Michael #6');
  });

  it('handles more than two players with the same name', () => {
    const names = distinctNames([named(1, 'Sam', 4), named(2, 'Sam', 9), named(3, 'Sam', 0)]);
    expect([...names.values()]).toEqual(['Sam #4', 'Sam #9', 'Sam #0']);
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
