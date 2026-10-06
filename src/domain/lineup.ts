// Live lineup, event-sourced: the current lineup is never stored. It is the kickoff snapshot
// with every substitution, position swap and red card replayed on top, so undoing an event
// (deleting its group) is all it takes to rewind.

import type { FormationSlot, MatchEventType, StartingLineup } from './types';

/** The fields of a `match_events` row that lineup replay, playing time and stats read. */
export type LineupEvent = {
  /** Insertion order: the order things really happened. Game time can run backwards if the
   * phone's clock changes mid-match. */
  id: number;
  eventType: MatchEventType;
  /** Substitution: the player coming on. Swap: the player moving. Card/goal: the player. */
  playerId: number | null;
  /** Substitution: the player going off (null fills an empty slot). Swap: the other player. */
  relatedPlayerId: number | null;
  /** Target slot when no player is going off (substitution) or being swapped with (swap). */
  slotId: string | null;
  gameTimeMs: number;
};

/** A red card leaves its slot empty and locked: the team plays a player down. */
export type LiveSlot = FormationSlot & { locked: boolean };

export type LiveLineup = {
  slots: LiveSlot[];
  bench: number[];
  /** Red-carded players, in order. They can't come back on. */
  sentOff: number[];
  /** Substitutions that took a player off. Filling an empty slot is free. */
  subsUsed: number;
};

/**
 * Replay order is insertion order (id): the order the coach recorded things and the order undo
 * walks back. Game time only measures intervals.
 */
export function sortEvents<T extends Pick<LineupEvent, 'id'>>(events: readonly T[]): T[] {
  return [...events].sort((a, b) => a.id - b.id);
}

export function findPlayerSlot(lineup: LiveLineup, playerId: number): LiveSlot | undefined {
  return lineup.slots.find((s) => s.playerId === playerId);
}

export function onPitchPlayerIds(lineup: LiveLineup): number[] {
  return lineup.slots.flatMap((s) => (s.playerId === undefined ? [] : [s.playerId]));
}

function withPlayer(slot: LiveSlot, playerId: number | undefined): LiveSlot {
  const { playerId: _previous, ...rest } = slot;
  return playerId === undefined ? rest : { ...rest, playerId };
}

function substitute(lineup: LiveLineup, event: LineupEvent): LiveLineup {
  const inId = event.playerId;
  if (inId === null || lineup.sentOff.includes(inId) || findPlayerSlot(lineup, inId)) {
    return lineup;
  }
  const outId = event.relatedPlayerId;
  const target =
    outId === null
      ? lineup.slots.find((s) => s.slotId === event.slotId && s.playerId === undefined)
      : findPlayerSlot(lineup, outId);
  if (!target || target.locked) return lineup;

  const bench = lineup.bench.filter((id) => id !== inId);
  return {
    ...lineup,
    slots: lineup.slots.map((s) => (s === target ? withPlayer(s, inId) : s)),
    bench: outId === null ? bench : [...bench, outId],
    subsUsed: outId === null ? lineup.subsUsed : lineup.subsUsed + 1,
  };
}

function swap(lineup: LiveLineup, event: LineupEvent): LiveLineup {
  if (event.playerId === null) return lineup;
  const from = findPlayerSlot(lineup, event.playerId);
  const to =
    event.relatedPlayerId === null
      ? lineup.slots.find((s) => s.slotId === event.slotId && s.playerId === undefined)
      : findPlayerSlot(lineup, event.relatedPlayerId);
  if (!from || !to || from === to) return lineup;
  if (to.locked) {
    // Moving into a spot closed by a red card (e.g. an outfielder going in goal after the keeper
    // is sent off): the spot reopens with them in it, and the one they left closes instead. The
    // team stays a player down.
    return {
      ...lineup,
      slots: lineup.slots.map((s) => {
        if (s === from) return { ...withPlayer(s, undefined), locked: true };
        if (s === to) return { ...withPlayer(s, from.playerId), locked: false };
        return s;
      }),
    };
  }
  return {
    ...lineup,
    slots: lineup.slots.map((s) => {
      if (s === from) return withPlayer(s, to.playerId);
      if (s === to) return withPlayer(s, from.playerId);
      return s;
    }),
  };
}

/** A late arrival joins the end of the bench (once; never someone already in the match). */
function joinBench(lineup: LiveLineup, event: LineupEvent): LiveLineup {
  const playerId = event.playerId;
  if (playerId === null || isInMatch(lineup, playerId)) return lineup;
  return { ...lineup, bench: [...lineup.bench, playerId] };
}

/** On the pitch, on the bench, or sent off. */
export function isInMatch(lineup: LiveLineup, playerId: number): boolean {
  return (
    findPlayerSlot(lineup, playerId) !== undefined ||
    lineup.bench.includes(playerId) ||
    lineup.sentOff.includes(playerId)
  );
}

function sendOff(lineup: LiveLineup, event: LineupEvent): LiveLineup {
  const playerId = event.playerId;
  if (playerId === null || lineup.sentOff.includes(playerId)) return lineup;
  const slot = findPlayerSlot(lineup, playerId);
  return {
    ...lineup,
    slots: lineup.slots.map((s) =>
      s === slot ? { ...withPlayer(s, undefined), locked: true } : s,
    ),
    bench: lineup.bench.filter((id) => id !== playerId),
    sentOff: [...lineup.sentOff, playerId],
  };
}

/**
 * Applies one event. Events that don't change the lineup (goals, yellows) and events that no
 * longer apply (e.g. a sub for a player who isn't on the pitch) return the same lineup.
 */
export function applyLineupEvent(lineup: LiveLineup, event: LineupEvent): LiveLineup {
  switch (event.eventType) {
    case 'substitution':
      return substitute(lineup, event);
    case 'position_swap':
      return swap(lineup, event);
    case 'red_card':
      return sendOff(lineup, event);
    case 'late_arrival':
      return joinBench(lineup, event);
    default:
      return lineup;
  }
}

export function startLineup(starting: StartingLineup): LiveLineup {
  return {
    slots: starting.slots.map((s) => ({ ...s, locked: false })),
    bench: [...starting.bench],
    sentOff: [],
    subsUsed: 0,
  };
}

export function deriveLineup(starting: StartingLineup, events: readonly LineupEvent[]): LiveLineup {
  return sortEvents(events).reduce(applyLineupEvent, startLineup(starting));
}
