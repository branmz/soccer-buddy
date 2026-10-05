# Soccer Buddy: Build Plan & Status

The living plan for this app. Read it with `CLAUDE.md`, which has the stack, commands,
architecture rules and git conventions. Update the **Status** section when a milestone merges.

## Status (as of 2026-10-05)

| #   | Milestone                                                       | State        | PR     |
| --- | --------------------------------------------------------------- | ------------ | ------ |
| 1   | Scaffold, tooling, lint hook                                    | ✅ merged    | #1     |
| 2   | DB layer: schema, migrations, repositories                      | ✅ merged    | #2     |
| —   | Claude code-review workflow + `code-reviewer` agent             | ✅ merged    | #3, #4 |
| 3   | Teams & roster (+ positions, kit colors, sort)                  | ✅ merged    | #5     |
| 4   | Pitch & Tactics board                                           | 🔍 in review | #7     |
| 5   | **Domain logic: clock, lineup, sub rules, playing time, stats** | ⏭ next       |        |
| 6   | Game Day: setup, quick-sub presets, live match                  | todo         |        |
| 7   | History & stats                                                 | todo         |        |
| 8   | Polish & EAS preview APK                                        | todo         |        |

## Product decisions (confirmed with the coach/user)

- Android-first, offline, local SQLite only. No backend, no auth. Runs in Expo Go (SDK 57).
- **Field sizes 5v5 / 7v7 / 9v9 / 11v11.** Teams and formations carry `field_size`.
- **Clock:** configurable periods (count × length), with start/pause/resume/end-period. Stoppage
  time shows as `45+2'`. Everything is derived from stored timestamps.
- **v1 extras:** per-player playing time, match history + season stats, undo last event, and
  Jest tests for domain logic.
- **Navigation:** expo-router tabs (Teams · Tactics · Game Day · History).
- **Players:** name, optional jersey (0–99; duplicates warn but are allowed), an optional
  **primary + secondary position** (GK CB LB RB CDM CM CAM LM RM LW RW ST, each mapped to a
  line GK/DEF/MID/FWD), and active/inactive status. A player with match history can't be
  deleted, only made inactive.
- **Teams:** optional **home/away kit colors** (14-color palette). Roster jersey badges use the
  home color. The **away color is stored but unused so far**: use it when the team plays away
  (Game Day setup) and on pitch tokens.
- **Roster sort:** number / name / position (ST → GK by primary position), persisted.

- **Tactics board** (decided while testing milestone 4 on the phone):
  - Spots are **locked by default**. Dragging moves players: bench → spot assigns, spot →
    spot swaps, spot → bench benches. A **Move spots** mode (bottom toolbar) is the only way
    to move spots or change a spot's position (e.g. CDM → CM).
  - **Exactly one GK:** the GK spot can't change position and no other spot can become GK.
  - **Undo** (bottom toolbar) steps back any spot or player change; renames aren't undone.
  - Picking up a bench player highlights open spots for their main (solid yellow) and second
    (dashed) position, falling back to the same line when no exact spot is free.
  - Bench players drag on a **sideways swipe** or after a short hold; vertical moves scroll.
  - Filled spots show the position chip above the badge and the name below.
  - The name in the editor header has a pencil and opens a **rename-only** sheet; **More**
    holds Clear all players and Delete. Leaving with unsaved changes asks
    **Save / Discard / Keep editing**.
  - The TeamSwitcher pill is large and **lightly tinted with the home kit color**.

## What exists now (milestones 1–4)

- **Schema** (`src/db/schema.ts`, migrations `0000_init`, `0001_player_positions`,
  `0002_team_kit_colors`):
  - `teams`: id, name, field_size, home_color, away_color, created_at
  - `players`: id, team_id, name, jersey_number, primary_position, secondary_position,
    is_active, created_at
  - `formations`: id, team_id, name, field_size, layout_json, created_at, updated_at
  - `matches`: id, team_id, formation_id, opponent_name, period_count,
    period_length_minutes, game_length_minutes, max_subs (null = unlimited),
    status (setup/live/finished), starting_lineup_json, live_layout_json, started_at,
    ended_at, created_at
  - `match_periods`: id, match_id, period_number, started_at, ended_at, paused_at,
    paused_total_ms (unique per match + period)
  - `match_events`: id, match_id, player_id, related_player_id, slot_id, event_type,
    period_number, game_time_ms, match_minute, group_id, created_at.
    Types: goal, assist, yellow_card, red_card, substitution, opponent_goal, position_swap.
    For a substitution, `player_id` is the player coming on and `related_player_id` the
    player going off.
  - `quick_sub_presets`: id, team_id XOR match_id, preset_name, substitutions_json
- **JSON shapes** (`src/domain/types.ts`, parsed by `src/domain/formations.ts`):
  - `FormationLayout { slots: { slotId, role, label, x, y, playerId? }[] }`: x/y normalized
    0–1, y=1 is the own goal line, exactly one GK.
  - `StartingLineup { slots, bench: playerId[] }`
  - `QuickSubPair[] { outPlayerId, inPlayerId }`
- **Repositories** (sync; `xxxQuery()` reads, validated writes): teams (+`teamSummariesQuery`),
  players (positions, history check), formations (validates against the team's field size),
  presets, matches (setup CRUD, `liveMatchQuery`), events (`recordEventGroup`,
  `undoLastEventGroup`). **Not built yet:** kickoff, period/clock writes, lineup snapshot.
  Those belong to milestone 6.
- **Domain** (`src/domain`, tested): types, formations (JSON parsers, `clampCoordinate`),
  validation, roster (duplicate jerseys, `sortRoster`, `resolveActiveTeamId`), positions,
  colors (`readableTextColor`, `needsOutline`, `kitTextColor`, `withAlpha`), and **board**:
  pure slot transforms (assign/swap/move/unassign/clear, `changeSlotPosition`),
  `applyDrop` / `applyTap` / `findDropTarget` per `BoardMode` (`players` | `positions`),
  bench helpers (`benchPlayers`, `suggestForRole`, `suggestedSlots`, `keepAvailablePlayers`).
- **Presets:** `src/constants/presetFormations.ts` (11v11 4-4-2, 4-3-3, 3-5-2, 4-2-3-1; 9v9
  3-3-2, 3-2-3; 7v7 2-3-1, 3-2-1; 5v5 2-2, 1-2-1), each validated by a test.
- **Hooks/stores:** `useLiveData`, `useActiveTeam`, `useKeyboardHeight`, `useOpenCount`;
  `appStore` (activeTeamId, rosterSort, persisted); `boardStore` (editor working copy: slots,
  selection, mode, undo stack; `dirty` compares against what was loaded or last saved).
- **Pitch** (`src/components/pitch`), reusable for Game Day:
  - `FormationBoard` (pitch + bench bound to `boardStore`).
  - `Pitch` + `PitchMarkings` (SVG), `PlayerToken`, `BenchSidebar`.
  - `BoardDragContext` (`BoardDragProvider`, `useDragGesture`) + `DragLayer` (one ghost at
    the board root), `SlotPositionSheet`, `FormationThumbnail`.
- **UI kit** (`src/components/ui`): Button (primary/secondary/danger/dangerOutline/ghost),
  IconButton, HeaderButton (+disabled), TextField, Sheet (keyboard-aware bottom sheet),
  SegmentedControl, SelectField, EmptyState, ConfirmSheet. **Teams** (`src/components/teams`):
  TeamFormSheet, DeleteTeamSheet, PlayerFormSheet, PositionFields, KitColorFields, ColorSwatch,
  JerseyBadge, TeamSwitcher. **Tactics** (`src/components/tactics`): RenameFormationSheet,
  FormationOptionsSheet, UnsavedChangesSheet.
- **Screens:** Teams list, Roster (`teams/[teamId]`), Tactics list (saved formations +
  presets for the active team's field size), formation editor (`tactics/[formationId]`,
  `new?preset=4-3-3`). Game Day and History are still placeholders.
- **Tests:** 213 (domain incl. board, presets, boardStore, repositories over real SQLite via
  `createTestDb`, migrations incl. an upgrade test run inside a transaction like the device
  migrator).

## Deviations from the original plan (all intentional)

- Routes live in `src/app/` (SDK 57 template), not `app/`.
- **NativeWind v5 RC + Tailwind v4.** v5 is the version tested against Expo 57.
- **Repositories are synchronous.** Drizzle's expo driver is sync, and transactions require it.
- **`useLiveData` replaces `useLiveQuery`.** `useLiveQuery` only watches a query's main table
  and ignores input changes.
- Event→player FKs are `NO ACTION` (not RESTRICT), so team deletes can cascade.
- No CHECK constraints added to existing tables: they make drizzle-kit rebuild the table.
  Positions and colors are validated in `src/domain`.
- Editing and deleting a team live in the roster header, not on the Teams list.
- **Drops hop to JS with `scheduleOnRN`** (react-native-worklets): Reanimated 4 deprecates
  `runOnJS`. Drop points are measured on the UI thread with `measure()`, relative to the
  board root, and hit-tested in JS by `findDropTarget`. There is no `useDropTargets` hook.
- Spots are locked unless **Move spots** is on (the plan had token → grass always moving a
  spot); accidental moves were a problem on the phone.
- Bench drags start on a sideways swipe as well as after the 150 ms hold.
- The editor ghost is hidden only after the drop has rendered, so there is no gap where the
  faded source token shows on its own.

## Next: Milestone 5 — Domain logic

Branch `feature/domain-logic`, after #7 merges. Test-first, pure TS in `src/domain`; the spec
is item 5 under **Later milestones** below. No UI in this milestone, so it needs no device test.

## Later milestones (from the original plan)

**5. Domain logic** (test-first, `src/domain`):

- `clock.ts`: `getClockState(periods, periodLengthMs, now)` returns `{ currentPeriod,
periodElapsedMs, totalGameMs, isPaused, isStoppage, display }`.
- `lineup.ts`: `deriveLineup(startingLineup, events)` replays substitution, position_swap and
  red_card events. A red card leaves a locked empty slot.
- `subRules.ts`: `canSubstitute(state, maxSubs, pairs)` returns per-pair errors. Re-entry is
  allowed.
- `playingTime.ts`: ms per player from in/out intervals on `game_time_ms`.
- `stats.ts`: score (goal vs opponent_goal) and per-player match/season totals.

**6. Game Day:**

- **Setup:** opponent, home/away (→ kit color), formation (saved or preset), periods,
  max subs, the starting lineup on a mini board, and match- or team-scoped quick-sub presets.
- **Kickoff:** one transaction that snapshots `starting_lineup_json`, sets status=live and
  inserts period 1. Only one match can be live; Game Day resumes it on relaunch.
- **Live screen:**
  - ClockBar: score, clock, period, controls, subs used/max.
  - Pitch + bench with minute badges.
  - QuickSubBar: one tap = one event group.
  - EventActionBar: goal (+ optional assist in the same group), assist, yellow (second yellow
    prompts a red), red, opponent goal, sub, undo (`undoLastEventGroup`).
  - EventTimeline.
  - `useKeepAwake`, haptics, and an Android back-button guard.
- Clock writes are one DB write per start/pause/resume/end. `useMatchClock` only re-renders.

**7. History & stats:**

- Finished matches for the active team (score, opponent, date).
- Match detail: timeline and minutes played.
- A Season segment with a sortable per-player totals table.

**8. Polish:** empty states, haptics, the back guard, and an EAS `preview` profile APK.

## How we work (session handoff notes)

- One `feature/...` branch per milestone, off `main`. Conventional Commits.
- Commit and open the PR (via `gh`) **only after the coach has tested on the phone and said
  it's good**. Ask before starting the next milestone.
- After each UI change, give a short on-device checklist. The coach runs `npx expo start` and
  tests in Expo Go on Android, then reports issues. Expect several rounds of UI feedback.
- Before committing, run `npm run check` and the `code-reviewer` agent on the branch. Fix
  real findings and list the skipped ones with reasons.
- Keep `CLAUDE.md` under 200 lines and update this file's Status section when a PR merges.
