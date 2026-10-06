import { timelineEntries, type TimelineEvent } from '../timeline';

const HALF = 45 * 60_000;
const NAMES: Record<number, string> = { 1: 'Ana', 2: 'Bea', 3: 'Cam', 4: 'Dee', 5: 'Eve' };
const names = { player: (id: number) => NAMES[id] ?? '?', slot: (id: string) => id.toUpperCase() };

let nextId = 1;
const ev = (
  eventType: TimelineEvent['eventType'],
  groupId: string | null,
  extra: Partial<TimelineEvent> = {},
): TimelineEvent => ({
  id: nextId++,
  eventType,
  groupId,
  playerId: null,
  relatedPlayerId: null,
  slotId: null,
  gameTimeMs: 0,
  periodNumber: 1,
  matchMinute: 10,
  ...extra,
});

const texts = (events: TimelineEvent[]) =>
  timelineEntries(events, HALF, names).map((e) => `${e.minute} ${e.kind} ${e.text}`);

describe('timelineEntries', () => {
  it('describes each kind of group, newest first', () => {
    const events = [
      ev('goal', 'a', { playerId: 3 }),
      ev('assist', 'a', { playerId: 2 }),
      ev('opponent_goal', 'b', { matchMinute: 12 }),
      ev('substitution', 'c', { playerId: 4, relatedPlayerId: 2, matchMinute: 20 }),
      ev('substitution', 'c', { playerId: 5, relatedPlayerId: 3, matchMinute: 20 }),
      ev('substitution', 'd', { playerId: 2, slotId: 'cm', matchMinute: 21 }),
      ev('yellow_card', 'e', { playerId: 1, matchMinute: 30 }),
      ev('yellow_card', 'f', { playerId: 1, matchMinute: 47 }),
      ev('red_card', 'f', { playerId: 1, matchMinute: 47 }),
      ev('red_card', 'g', { playerId: 4, periodNumber: 2, matchMinute: 50 }),
      ev('position_swap', 'h', {
        playerId: 5,
        relatedPlayerId: 2,
        periodNumber: 2,
        matchMinute: 51,
      }),
      ev('position_swap', 'i', { playerId: 5, slotId: 'st', periodNumber: 2, matchMinute: 52 }),
      ev('goal', 'j', { periodNumber: 2, matchMinute: 60 }),
    ];
    expect(texts(events)).toEqual([
      "60' goal Goal",
      "52' swap Eve moved to ST",
      "51' swap Eve swapped with Bea",
      "50' red Red card: Dee",
      "45+2' red Second yellow: Ana (sent off)",
      "30' yellow Yellow card: Ana",
      "21' sub Sub: Bea on at CM",
      "20' sub Subs: Dee on for Bea, Eve on for Cam",
      "12' opponentGoal Opponent goal",
      "10' goal Goal: Cam (assist Bea)",
    ]);
  });

  it('describes a late arrival', () => {
    expect(texts([ev('late_arrival', 'x', { playerId: 4, matchMinute: 12 })])).toEqual([
      "12' arrival Dee arrived (on the bench)",
    ]);
  });

  it('keeps ungrouped events apart', () => {
    const events = [ev('opponent_goal', null), ev('opponent_goal', null)];
    expect(timelineEntries(events, HALF, names)).toHaveLength(2);
  });
});
