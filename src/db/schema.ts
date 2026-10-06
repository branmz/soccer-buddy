import { relations, sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
  type AnySQLiteColumn,
} from 'drizzle-orm/sqlite-core';

import { PLAYER_POSITIONS } from '@/domain/positions';
import { MATCH_EVENT_TYPES, MATCH_STATUSES, type FieldSize } from '@/domain/types';

// All timestamps are epoch milliseconds (Date.now()).
const id = () => integer('id').primaryKey({ autoIncrement: true });
const createdAt = () =>
  integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now());
const fieldSizeCheck = (column: AnySQLiteColumn) => sql`${column} in (5, 7, 9, 11)`;

export const teams = sqliteTable(
  'teams',
  {
    id: id(),
    name: text('name').notNull(),
    fieldSize: integer('field_size').$type<FieldSize>().notNull().default(11),
    /** Optional kit colors as #rrggbb (validated by cleanKitColor). */
    homeColor: text('home_color'),
    awayColor: text('away_color'),
    createdAt: createdAt(),
  },
  (t) => [check('teams_field_size_check', fieldSizeCheck(t.fieldSize))],
);

export const players = sqliteTable(
  'players',
  {
    id: id(),
    teamId: integer('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    jerseyNumber: integer('jersey_number'),
    // Validated by cleanPositions, not a CHECK: adding one would make drizzle-kit rebuild this
    // table, and dropping `players` mid-migration would cascade into match history.
    primaryPosition: text('primary_position', { enum: PLAYER_POSITIONS }),
    secondaryPosition: text('secondary_position', { enum: PLAYER_POSITIONS }),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index('players_team_idx').on(t.teamId)],
);

export const formations = sqliteTable(
  'formations',
  {
    id: id(),
    teamId: integer('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    fieldSize: integer('field_size').$type<FieldSize>().notNull(),
    /** FormationLayout JSON; parse with parseFormationLayout. */
    layoutJson: text('layout_json').notNull(),
    createdAt: createdAt(),
    updatedAt: integer('updated_at')
      .notNull()
      .$defaultFn(() => Date.now())
      .$onUpdateFn(() => Date.now()),
  },
  (t) => [
    index('formations_team_idx').on(t.teamId),
    check('formations_field_size_check', fieldSizeCheck(t.fieldSize)),
  ],
);

export const matches = sqliteTable(
  'matches',
  {
    id: id(),
    teamId: integer('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    formationId: integer('formation_id').references(() => formations.id, {
      onDelete: 'set null',
    }),
    opponentName: text('opponent_name').notNull(),
    /** The formation's name when the match was set up (saved or preset), e.g. "4-3-3". */
    formationName: text('formation_name'),
    periodCount: integer('period_count').notNull(),
    periodLengthMinutes: integer('period_length_minutes').notNull(),
    gameLengthMinutes: integer('game_length_minutes').notNull(),
    /** null = unlimited substitutions. */
    maxSubs: integer('max_subs'),
    status: text('status', { enum: MATCH_STATUSES }).notNull().default('setup'),
    /** Home or away: picks the team's home or away kit color. */
    isHome: integer('is_home', { mode: 'boolean' }).notNull().default(true),
    /** StartingLineup JSON: the draft lineup during setup, frozen as the snapshot at kickoff. */
    startingLineupJson: text('starting_lineup_json'),
    /**
     * LiveLayout JSON (`{ slots, name }`, no players): the formation's shape after mid-match
     * edits or a switch, laid over the lineup by slot id. Null: the starting shape.
     */
    liveLayoutJson: text('live_layout_json'),
    startedAt: integer('started_at'),
    endedAt: integer('ended_at'),
    createdAt: createdAt(),
  },
  (t) => [
    index('matches_team_idx').on(t.teamId),
    index('matches_status_idx').on(t.status),
    check('matches_period_count_check', sql`${t.periodCount} > 0`),
    check('matches_period_length_check', sql`${t.periodLengthMinutes} > 0`),
    check('matches_max_subs_check', sql`${t.maxSubs} is null or ${t.maxSubs} >= 0`),
  ],
);

export const matchPeriods = sqliteTable(
  'match_periods',
  {
    id: id(),
    matchId: integer('match_id')
      .notNull()
      .references(() => matches.id, { onDelete: 'cascade' }),
    periodNumber: integer('period_number').notNull(),
    startedAt: integer('started_at').notNull(),
    endedAt: integer('ended_at'),
    pausedAt: integer('paused_at'),
    pausedTotalMs: integer('paused_total_ms').notNull().default(0),
  },
  (t) => [uniqueIndex('match_periods_match_period_idx').on(t.matchId, t.periodNumber)],
);

export const matchEvents = sqliteTable(
  'match_events',
  {
    id: id(),
    matchId: integer('match_id')
      .notNull()
      .references(() => matches.id, { onDelete: 'cascade' }),
    // Player FKs use NO ACTION, not RESTRICT: SQLite checks NO ACTION at the end of the
    // statement, so deleting a team (which cascades to players AND, via matches, to these
    // events) succeeds, while deleting a single player who has events still fails.
    /** Null for opponent goals. For substitutions: the player coming on. */
    playerId: integer('player_id').references(() => players.id, { onDelete: 'no action' }),
    /** For substitutions: the player going off. For position swaps: the other player. */
    relatedPlayerId: integer('related_player_id').references(() => players.id, {
      onDelete: 'no action',
    }),
    slotId: text('slot_id'),
    eventType: text('event_type', { enum: MATCH_EVENT_TYPES }).notNull(),
    periodNumber: integer('period_number').notNull(),
    /** Active game-clock time (pauses excluded) when the event happened. */
    gameTimeMs: integer('game_time_ms').notNull(),
    matchMinute: integer('match_minute').notNull(),
    /** Links events undone together (goal + assist, every sub in a quick-sub preset). */
    groupId: text('group_id'),
    createdAt: createdAt(),
  },
  (t) => [
    index('match_events_match_idx').on(t.matchId),
    index('match_events_player_idx').on(t.playerId),
    index('match_events_related_player_idx').on(t.relatedPlayerId),
    index('match_events_group_idx').on(t.groupId),
  ],
);

export const quickSubPresets = sqliteTable(
  'quick_sub_presets',
  {
    id: id(),
    teamId: integer('team_id').references(() => teams.id, { onDelete: 'cascade' }),
    matchId: integer('match_id').references(() => matches.id, { onDelete: 'cascade' }),
    presetName: text('preset_name').notNull(),
    /** QuickSubPair[] JSON; parse with parseQuickSubPairs. */
    substitutionsJson: text('substitutions_json').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index('quick_sub_presets_team_idx').on(t.teamId),
    index('quick_sub_presets_match_idx').on(t.matchId),
    check('quick_sub_presets_scope_check', sql`(${t.teamId} is null) <> (${t.matchId} is null)`),
  ],
);

export const teamsRelations = relations(teams, ({ many }) => ({
  players: many(players),
  formations: many(formations),
  matches: many(matches),
  quickSubPresets: many(quickSubPresets),
}));

export const playersRelations = relations(players, ({ one }) => ({
  team: one(teams, { fields: [players.teamId], references: [teams.id] }),
}));

export const formationsRelations = relations(formations, ({ one }) => ({
  team: one(teams, { fields: [formations.teamId], references: [teams.id] }),
}));

export const matchesRelations = relations(matches, ({ one, many }) => ({
  team: one(teams, { fields: [matches.teamId], references: [teams.id] }),
  formation: one(formations, { fields: [matches.formationId], references: [formations.id] }),
  periods: many(matchPeriods),
  events: many(matchEvents),
  quickSubPresets: many(quickSubPresets),
}));

export const matchPeriodsRelations = relations(matchPeriods, ({ one }) => ({
  match: one(matches, { fields: [matchPeriods.matchId], references: [matches.id] }),
}));

export const matchEventsRelations = relations(matchEvents, ({ one }) => ({
  match: one(matches, { fields: [matchEvents.matchId], references: [matches.id] }),
}));

export const quickSubPresetsRelations = relations(quickSubPresets, ({ one }) => ({
  team: one(teams, { fields: [quickSubPresets.teamId], references: [teams.id] }),
  match: one(matches, { fields: [quickSubPresets.matchId], references: [matches.id] }),
}));

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;
export type Formation = typeof formations.$inferSelect;
export type NewFormation = typeof formations.$inferInsert;
export type Match = typeof matches.$inferSelect;
export type NewMatch = typeof matches.$inferInsert;
export type MatchPeriod = typeof matchPeriods.$inferSelect;
export type MatchEvent = typeof matchEvents.$inferSelect;
export type NewMatchEvent = typeof matchEvents.$inferInsert;
export type QuickSubPreset = typeof quickSubPresets.$inferSelect;
export type NewQuickSubPreset = typeof quickSubPresets.$inferInsert;
