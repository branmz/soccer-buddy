/**
 * @jest-environment node
 */
// Applies every generated migration to an in-memory SQLite (Node's built-in driver) and
// checks the constraints the app relies on. expo-sqlite can't run under Jest.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

type Journal = { entries: { tag: string }[] };

const journalTags = (
  JSON.parse(readFileSync(path.join(MIGRATIONS_DIR, 'meta', '_journal.json'), 'utf8')) as Journal
).entries.map((e) => e.tag);

function applyMigrations(db: DatabaseSync, tags: readonly string[]): void {
  for (const tag of tags) {
    const sqlText = readFileSync(path.join(MIGRATIONS_DIR, `${tag}.sql`), 'utf8');
    for (const statement of sqlText.split('--> statement-breakpoint')) db.exec(statement);
  }
}

function openMigratedDb(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  applyMigrations(db, journalTags);
  return db;
}

// Devices upgrade from whatever version they last ran; existing data must survive.
describe('upgrading from 0000_init', () => {
  it.each(journalTags.slice(1))('%s does not rebuild a table', (tag) => {
    // A rebuild drops the old table inside the migrator's transaction with foreign keys on,
    // which cascades into match history. See CLAUDE.md "Schema change".
    const sqlText = readFileSync(path.join(MIGRATIONS_DIR, `${tag}.sql`), 'utf8');
    expect(sqlText).not.toMatch(/DROP TABLE|__new_/i);
  });

  it('keeps players and match history when applying later migrations', () => {
    const db = new DatabaseSync(':memory:');
    db.exec('PRAGMA foreign_keys = ON');
    applyMigrations(db, journalTags.slice(0, 1));
    const now = Date.now();
    db.exec(`
      insert into teams (id, name, created_at) values (1, 'U12', ${now});
      insert into players (id, team_id, name, jersey_number, created_at)
        values (1, 1, 'Ana', 9, ${now});
      insert into formations (id, team_id, name, field_size, layout_json, created_at, updated_at)
        values (1, 1, '4-4-2', 11, '{"slots":[]}', ${now}, ${now});
      insert into matches (id, team_id, opponent_name, period_count, period_length_minutes,
        game_length_minutes, created_at) values (1, 1, 'Rivals', 2, 25, 50, ${now});
      insert into match_events (match_id, player_id, event_type, period_number, game_time_ms,
        match_minute, created_at) values (1, 1, 'goal', 1, 60000, 2, ${now});
    `);

    // Like drizzle's migrator on device: all pending migrations in one transaction, where
    // SQLite ignores `PRAGMA foreign_keys=OFF` — so table rebuilds would cascade here too.
    db.exec('BEGIN');
    applyMigrations(db, journalTags.slice(1));
    db.exec('COMMIT');

    expect(db.prepare('select name, jersey_number, primary_position from players').get()).toEqual({
      name: 'Ana',
      jersey_number: 9,
      primary_position: null,
    });
    expect(count(db, 'match_events')).toBe(1);
    expect(db.prepare('select name, field_size, home_color, sort_order from teams').get()).toEqual(
      // 0004: existing teams share order 0, so they list alphabetically until reordered.
      { name: 'U12', field_size: 11, home_color: null, sort_order: 0 },
    );
    // 0005: likewise for saved formations.
    expect(db.prepare('select name, sort_order from formations').get()).toEqual({
      name: '4-4-2',
      sort_order: 0,
    });
    // 0003: existing matches count as home games, with no formation name.
    expect(db.prepare('select opponent_name, is_home, formation_name from matches').get()).toEqual({
      opponent_name: 'Rivals',
      is_home: 1,
      formation_name: null,
    });
    db.close();
  });
});

function count(db: DatabaseSync, table: string): number {
  const row = db.prepare(`select count(*) as n from ${table}`).get() as { n: number };
  return row.n;
}

describe('migrations', () => {
  let db: DatabaseSync;
  const now = Date.now();

  beforeEach(() => {
    db = openMigratedDb();
    db.exec(`
      insert into teams (id, name, field_size, created_at) values (1, 'U12', 7, ${now});
      insert into players (id, team_id, name, created_at) values (1, 1, 'Ana', ${now});
      insert into players (id, team_id, name, created_at) values (2, 1, 'Bea', ${now});
      insert into matches (id, team_id, opponent_name, period_count, period_length_minutes,
        game_length_minutes, created_at) values (1, 1, 'Rivals', 2, 25, 50, ${now});
      insert into match_events (match_id, player_id, related_player_id, event_type,
        period_number, game_time_ms, match_minute, created_at)
        values (1, 2, 1, 'substitution', 1, 60000, 2, ${now});
    `);
  });

  afterEach(() => db.close());

  it('rejects unsupported field sizes', () => {
    expect(() =>
      db.exec(`insert into teams (name, field_size, created_at) values ('X', 8, ${now})`),
    ).toThrow(/teams_field_size_check/);
  });

  it('blocks deleting a player referenced by an event', () => {
    expect(() => db.exec('delete from players where id = 1')).toThrow(/FOREIGN KEY/);
    expect(() => db.exec('delete from players where id = 2')).toThrow(/FOREIGN KEY/);
  });

  it('cascades a team delete through players, matches and events', () => {
    db.exec(`insert into quick_sub_presets (team_id, preset_name, substitutions_json, created_at)
      values (1, 'Half-time', '[]', ${now})`);
    db.exec('delete from teams where id = 1');
    for (const table of ['players', 'matches', 'match_events', 'quick_sub_presets']) {
      expect(count(db, table)).toBe(0);
    }
  });

  it('cascades a match delete to its periods, events and presets', () => {
    db.exec(`insert into match_periods (match_id, period_number, started_at) values (1, 1, ${now});
      insert into quick_sub_presets (match_id, preset_name, substitutions_json, created_at)
      values (1, 'Plan A', '[]', ${now});`);
    db.exec('delete from matches where id = 1');
    for (const table of ['match_periods', 'match_events', 'quick_sub_presets']) {
      expect(count(db, table)).toBe(0);
    }
    expect(count(db, 'players')).toBe(2);
  });

  it('requires a quick-sub preset to belong to exactly one of team or match', () => {
    const insert = (teamId: string, matchId: string) =>
      db.exec(`insert into quick_sub_presets (team_id, match_id, preset_name, substitutions_json,
        created_at) values (${teamId}, ${matchId}, 'p', '[]', ${now})`);
    expect(() => insert('1', '1')).toThrow(/quick_sub_presets_scope_check/);
    expect(() => insert('null', 'null')).toThrow(/quick_sub_presets_scope_check/);
    expect(() => insert('1', 'null')).not.toThrow();
    expect(() => insert('null', '1')).not.toThrow();
  });

  it('keeps one row per match period', () => {
    db.exec(
      `insert into match_periods (match_id, period_number, started_at) values (1, 1, ${now})`,
    );
    expect(() =>
      db.exec(
        `insert into match_periods (match_id, period_number, started_at) values (1, 1, ${now})`,
      ),
    ).toThrow(/UNIQUE/);
  });

  it('rejects invalid match settings', () => {
    expect(() => db.exec('update matches set max_subs = -1')).toThrow(/matches_max_subs_check/);
    expect(() => db.exec('update matches set period_count = 0')).toThrow(
      /matches_period_count_check/,
    );
    expect(() => db.exec('update matches set max_subs = null')).not.toThrow();
  });

  it('nulls a match formation when the formation is deleted', () => {
    db.exec(`insert into formations (id, team_id, name, field_size, layout_json, created_at,
      updated_at) values (1, 1, '2-3-1', 7, '{"slots":[]}', ${now}, ${now});
      update matches set formation_id = 1;`);
    db.exec('delete from formations where id = 1');
    const row = db.prepare('select formation_id from matches where id = 1').get() as {
      formation_id: number | null;
    };
    expect(row.formation_id).toBeNull();
  });
});
