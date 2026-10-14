# Architecture Rules

Read before touching data access, the match clock, the live lineup, the pitch, the schema or
`src/domain`. `CLAUDE.md` has the stack, commands and project layout.

- **SQLite is the source of truth.** Read with
  `useLiveData(() => xxxQuery(arg).all(), [arg], [tableA, tableB])`, listing every table the
  query touches (joins too); write via repositories. Don't use Drizzle's `useLiveQuery`: it only
  watches the main table and ignores changed inputs. Multi-row writes use `db.transaction`.
  Don't mirror DB data in Zustand.
- **Match clock is timestamp-derived.** Never count ticks. Elapsed =
  (paused_at ?? ended_at ?? now) − started_at − paused_total_ms, per `match_periods` row.
  Every start/pause/resume/end is persisted immediately. UI intervals only trigger re-renders.
- **Live lineup is event-sourced.** `deriveLineup(starting_lineup_json, events)` replays
  `substitution`, `position_swap`, `red_card`. Never store the current lineup separately.
  Undo = delete the latest event `group_id`.
- **Coordinates are normalized 0–1** (`y = 1` = own goal line). Convert to pixels only in
  `Pitch` using measured layout.
- `starting_lineup_json` is a snapshot — editing a formation never rewrites match history.
- Players referenced by events can't be hard-deleted; deactivate them (`is_active = false`).
  Event→player FKs are `NO ACTION`, not `RESTRICT`: RESTRICT fires mid-cascade and would block
  deleting a whole team.
- Schema change → edit `schema.ts`, run `npx drizzle-kit generate --name <change>`, commit the
  generated files. Never edit a migration that has shipped; add a new one. Read the generated
  SQL: if it rebuilds a table (`__new_<table>` + `DROP TABLE`), redesign — adding a CHECK or
  FK to an existing table does this, and dropping `players`/`matches` cascades into history.
  Validate in `src/domain` instead. Add an upgrade case to `migrations.test.ts`.
- Keep `src/domain` pure and covered by tests; put new business rules there, not in screens.
- Gestures: use `Gesture.Pan()` + shared values; hop to JS with `runOnJS` only on drop.
  Every drag action must also have a tap-to-select fallback.
