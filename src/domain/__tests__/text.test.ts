import { capitalizeWords } from '../text';

describe('capitalizeWords', () => {
  it('capitalizes the first letter of each word', () => {
    expect(capitalizeWords('Set up match')).toBe('Set Up Match');
    expect(capitalizeWords('add and add another')).toBe('Add And Add Another');
    expect(capitalizeWords('Yellow + red (sent off)')).toBe('Yellow + Red (Sent Off)');
    expect(capitalizeWords('Opp. goal')).toBe('Opp. Goal');
  });

  it('leaves the rest of each word alone', () => {
    expect(capitalizeWords('Make the 2 OK subs')).toBe('Make The 2 OK Subs');
    expect(capitalizeWords('Delete McDonald')).toBe('Delete McDonald');
    expect(capitalizeWords('Start 2nd half')).toBe('Start 2nd Half');
    expect(capitalizeWords('4-3-3')).toBe('4-3-3');
    expect(capitalizeWords('élan vital')).toBe('Élan Vital');
    expect(capitalizeWords('')).toBe('');
  });
});
