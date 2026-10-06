// Match setup before kickoff. The draft lineup lives in `matches.starting_lineup_json` while
// the match is in setup: players in its slots or bench are the squad (here today); active
// players missing from both are marked absent. Kickoff freezes it as the snapshot.

import type { FieldSize, FormationSlot, ParseResult, StartingLineup } from './types';
import type { MatchSettingsInput } from './validation';

/** Starting values for a team's first match; later matches copy the previous one. */
export const DEFAULT_MATCH_SETTINGS: Record<FieldSize, MatchSettingsInput> = {
  5: { periodCount: 2, periodLengthMinutes: 20, maxSubs: null },
  7: { periodCount: 2, periodLengthMinutes: 25, maxSubs: null },
  9: { periodCount: 2, periodLengthMinutes: 30, maxSubs: null },
  11: { periodCount: 2, periodLengthMinutes: 40, maxSubs: null },
};

export function lineupPlayerIds(lineup: StartingLineup): number[] {
  return [
    ...lineup.slots.flatMap((s) => (s.playerId === undefined ? [] : [s.playerId])),
    ...lineup.bench,
  ];
}

function withPlayer(slot: FormationSlot, playerId: number | undefined): FormationSlot {
  const { playerId: _previous, ...rest } = slot;
  return playerId === undefined ? rest : { ...rest, playerId };
}

/** The squad's players not in a slot, in squad order. */
function benchFor(slots: readonly FormationSlot[], squad: readonly number[]): number[] {
  const onPitch = new Set(slots.flatMap((s) => (s.playerId === undefined ? [] : [s.playerId])));
  return squad.filter((id) => !onPitch.has(id));
}

/**
 * The draft lineup after picking a formation. A saved formation with players brings its own
 * lineup (squad players only); an empty shape (a preset) keeps the current players in slots
 * with the same id. Everyone else in the squad goes to the bench.
 */
export function lineupFromFormation(
  formationSlots: readonly FormationSlot[],
  current: StartingLineup | null,
  squad: readonly number[],
): StartingLineup {
  const inSquad = new Set(squad);
  const hasOwnPlayers = formationSlots.some((s) => s.playerId !== undefined);
  const previous = new Map(current?.slots.map((s) => [s.slotId, s.playerId]));
  const slots = formationSlots.map((slot) => {
    const playerId = hasOwnPlayers ? slot.playerId : previous.get(slot.slotId);
    return withPlayer(slot, playerId !== undefined && inSquad.has(playerId) ? playerId : undefined);
  });
  return { slots, bench: benchFor(slots, squad) };
}

/**
 * Updates who's here: absent players leave their slot or the bench; newly available players
 * join the end of the bench. Returns the same lineup when nothing changed.
 */
export function setSquad(lineup: StartingLineup, squad: readonly number[]): StartingLineup {
  const inSquad = new Set(squad);
  const current = lineupPlayerIds(lineup);
  const added = squad.filter((id) => !current.includes(id));
  if (added.length === 0 && current.every((id) => inSquad.has(id))) return lineup;
  const slots = lineup.slots.map((s) =>
    s.playerId !== undefined && !inSquad.has(s.playerId) ? withPlayer(s, undefined) : s,
  );
  return { slots, bench: [...lineup.bench.filter((id) => inSquad.has(id)), ...added] };
}

/**
 * The lineup to snapshot at kickoff: players deactivated since setup are dropped, and at least
 * one player must be on the pitch.
 */
export function kickoffLineup(
  lineup: StartingLineup,
  activeIds: ReadonlySet<number>,
): ParseResult<StartingLineup> {
  const slots = lineup.slots.map((s) =>
    s.playerId !== undefined && !activeIds.has(s.playerId) ? withPlayer(s, undefined) : s,
  );
  if (slots.every((s) => s.playerId === undefined)) {
    return { ok: false, error: 'Put at least one player on the pitch' };
  }
  return { ok: true, value: { slots, bench: lineup.bench.filter((id) => activeIds.has(id)) } };
}

/** The kit for this match: the away kit for away games, if the team has one. */
export function matchKitColor(
  team: { homeColor: string | null; awayColor: string | null },
  isHome: boolean,
): string | null {
  return isHome ? team.homeColor : (team.awayColor ?? team.homeColor);
}
