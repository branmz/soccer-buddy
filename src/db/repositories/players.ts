import { and, asc, count, eq, ne, or, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { matchEvents, matches, players, type Player } from '@/db/schema';
import { parseStartingLineup } from '@/domain/formations';
import { lineupPlayerIds } from '@/domain/matchSetup';
import { cleanPositions } from '@/domain/positions';
import { cleanJerseyNumber, cleanName } from '@/domain/validation';

import { NotFoundError, unwrap, ValidationError } from './errors';

/**
 * A team's roster: active players first, then by jersey number (unnumbered last), then name.
 * Call `.all()`, or read through useLiveData.
 */
export function playersQuery(teamId: number, options: { activeOnly?: boolean } = {}) {
  const filter = options.activeOnly
    ? and(eq(players.teamId, teamId), eq(players.isActive, true))
    : eq(players.teamId, teamId);
  return db
    .select()
    .from(players)
    .where(filter)
    .orderBy(
      sql`${players.isActive} desc`,
      sql`${players.jerseyNumber} is null`,
      asc(players.jerseyNumber),
      asc(players.name),
    );
}

export function getPlayer(id: number): Player | undefined {
  return db.select().from(players).where(eq(players.id, id)).get();
}

/** Both positions are optional; a secondary requires a primary. */
export type PositionsInput = { primaryPosition?: string | null; secondaryPosition?: string | null };

export function addPlayer(
  teamId: number,
  input: { name: string; jerseyNumber?: number | null; positions?: PositionsInput },
): Player {
  return db
    .insert(players)
    .values({
      teamId,
      name: unwrap(cleanName(input.name, 'Player name')),
      jerseyNumber: unwrap(cleanJerseyNumber(input.jerseyNumber)),
      ...unwrap(cleanPositions(input.positions ?? {})),
    })
    .returning()
    .get();
}

export function updatePlayer(
  id: number,
  patch: {
    name?: string;
    jerseyNumber?: number | null;
    isActive?: boolean;
    /** Replaces both positions; omitted = unchanged. */
    positions?: PositionsInput;
  },
): Player {
  const values: Partial<
    Pick<Player, 'name' | 'jerseyNumber' | 'isActive' | 'primaryPosition' | 'secondaryPosition'>
  > = {};
  if (patch.name !== undefined) values.name = unwrap(cleanName(patch.name, 'Player name'));
  if (patch.jerseyNumber !== undefined) {
    values.jerseyNumber = unwrap(cleanJerseyNumber(patch.jerseyNumber));
  }
  if (patch.isActive !== undefined) values.isActive = patch.isActive;
  if (patch.positions !== undefined) Object.assign(values, unwrap(cleanPositions(patch.positions)));

  const updated =
    Object.keys(values).length === 0
      ? getPlayer(id)
      : db.update(players).set(values).where(eq(players.id, id)).returning().get();
  if (!updated) throw new NotFoundError('Player', id);
  return updated;
}

export function setPlayerActive(id: number, isActive: boolean): Player {
  return updatePlayer(id, { isActive });
}

/**
 * True if any match event references the player, or they were in a kicked-off match's
 * starting lineup (a starter with no events still has minutes). Either blocks a hard delete.
 */
export function playerHasMatchHistory(id: number): boolean {
  const row = db
    .select({ n: count() })
    .from(matchEvents)
    .where(or(eq(matchEvents.playerId, id), eq(matchEvents.relatedPlayerId, id)))
    .get();
  if ((row?.n ?? 0) > 0) return true;

  const player = getPlayer(id);
  if (!player) return false;
  return db
    .select({ startingLineupJson: matches.startingLineupJson })
    .from(matches)
    .where(and(eq(matches.teamId, player.teamId), ne(matches.status, 'setup')))
    .all()
    .some(({ startingLineupJson }) => {
      if (startingLineupJson === null) return false;
      const lineup = parseStartingLineup(startingLineupJson);
      return lineup.ok && lineupPlayerIds(lineup.value).includes(id);
    });
}

/**
 * Hard-deletes a player with no match history. Players who appear in match events must be
 * deactivated instead so stats stay intact.
 */
export function deletePlayer(id: number): void {
  if (playerHasMatchHistory(id)) {
    throw new ValidationError(
      'This player has match history. Mark them inactive instead of deleting.',
    );
  }
  db.delete(players).where(eq(players.id, id)).run();
}
