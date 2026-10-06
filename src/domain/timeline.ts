// The match log: event groups (a goal with its assist, a quick-sub preset, …) as one line
// each, newest first. Names are looked up by the caller so this stays free of DB rows.

import { formatMatchMinute } from './clock';
import type { LineupEvent } from './lineup';

export type TimelineEvent = LineupEvent & {
  groupId: string | null;
  periodNumber: number;
  matchMinute: number;
};

export type TimelineKind = 'goal' | 'opponentGoal' | 'yellow' | 'red' | 'sub' | 'swap' | 'arrival';

export type TimelineEntry = {
  /** The group id, or the event id for ungrouped events. */
  key: string;
  kind: TimelineKind;
  /** `23'` or `45+2'`. */
  minute: string;
  text: string;
};

type Names = {
  player: (playerId: number) => string;
  slot: (slotId: string) => string;
};

/** Events in recorded order, grouped. Ungrouped events stand alone. */
function groupEvents(events: readonly TimelineEvent[]): TimelineEvent[][] {
  const groups = new Map<string, TimelineEvent[]>();
  for (const event of [...events].sort((a, b) => a.id - b.id)) {
    const key = event.groupId ?? `event-${event.id}`;
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }
  return [...groups.values()];
}

function describe(group: TimelineEvent[], names: Names): { kind: TimelineKind; text: string } {
  const first = group[0];
  const name = (id: number | null) => (id === null ? 'Unknown' : names.player(id));
  const of = (type: LineupEvent['eventType']) => group.filter((e) => e.eventType === type);

  switch (first.eventType) {
    case 'goal':
    case 'assist': {
      const scorer = of('goal')[0];
      const assist = of('assist')[0];
      const who = scorer?.playerId == null ? '' : `: ${name(scorer.playerId)}`;
      return {
        kind: 'goal',
        text: `Goal${who}${assist ? ` (assist ${name(assist.playerId)})` : ''}`,
      };
    }
    case 'opponent_goal':
      return { kind: 'opponentGoal', text: 'Opponent goal' };
    case 'yellow_card':
      return of('red_card').length > 0
        ? { kind: 'red', text: `Second yellow: ${name(first.playerId)} (sent off)` }
        : { kind: 'yellow', text: `Yellow card: ${name(first.playerId)}` };
    case 'red_card':
      return { kind: 'red', text: `Red card: ${name(first.playerId)}` };
    case 'substitution': {
      const parts = group.map((e) =>
        e.relatedPlayerId === null
          ? `${name(e.playerId)} on${e.slotId ? ` at ${names.slot(e.slotId)}` : ''}`
          : `${name(e.playerId)} on for ${name(e.relatedPlayerId)}`,
      );
      return { kind: 'sub', text: `${group.length > 1 ? 'Subs' : 'Sub'}: ${parts.join(', ')}` };
    }
    case 'late_arrival':
      return { kind: 'arrival', text: `${name(first.playerId)} arrived (on the bench)` };
    case 'position_swap': {
      const target =
        first.relatedPlayerId !== null
          ? `swapped with ${name(first.relatedPlayerId)}`
          : `moved to ${first.slotId ? names.slot(first.slotId) : 'another spot'}`;
      return { kind: 'swap', text: `${name(first.playerId)} ${target}` };
    }
  }
}

/** One entry per event group, newest first. */
export function timelineEntries(
  events: readonly TimelineEvent[],
  periodLengthMs: number,
  names: Names,
): TimelineEntry[] {
  return groupEvents(events)
    .map((group) => ({
      key: group[0].groupId ?? `event-${group[0].id}`,
      minute: formatMatchMinute(group[0].matchMinute, group[0].periodNumber, periodLengthMs),
      ...describe(group, names),
    }))
    .reverse();
}
