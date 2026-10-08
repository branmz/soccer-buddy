# Soccer Buddy: Build Plan & Status

The living plan for this app. Read it with `CLAUDE.md`, which has the stack, commands,
architecture rules and git conventions. Update the **Status** section when a milestone merges.

## Status (as of 2026-10-07)

| #   | Milestone                                                   | State     | PR     |
| --- | ----------------------------------------------------------- | --------- | ------ |
| 1   | Scaffold, tooling, lint hook                                | ✅ merged | #1     |
| 2   | DB layer: schema, migrations, repositories                  | ✅ merged | #2     |
| —   | Claude code-review workflow + `code-reviewer` agent         | ✅ merged | #3, #4 |
| 3   | Teams & roster (+ positions, kit colors, sort)              | ✅ merged | #5     |
| 4   | Pitch & Tactics board                                       | ✅ merged | #7     |
| 5   | Domain logic: clock, lineup, sub rules, playing time, stats | ✅ merged | #9     |
| 6   | Game Day: setup, quick-sub presets, live match              | ✅ merged | #10    |
| 7   | History & stats                                             | ✅ merged | #11    |
| 8   | **Polish & EAS preview APK**                                | next      |        |

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
- **Teams:** optional **home/away kit colors** (14-color palette). Roster badges use the home
  color; a match uses the away kit when it's an away game (falling back to home).
- **Roster sort:** number / name / position (ST → GK by primary position), persisted.
- **Team and formation order:** the coach's order (`teams.sort_order`,
  `formations.sort_order`). The Teams list and the Tactics saved formations are always
  draggable (no Reorder button): tapping a card opens it; its handle drags, or tap the handle
  then tap a card to move it there. New items go last; never-reordered lists are alphabetical.
  Tactics presets stay fixed below. The top saved formation is the default for a team's first
  match. Both lists use `ReorderList` (`src/components/ui`).

- **Tactics board** (decided while testing milestone 4 on the phone):
  - Spots are **locked by default**. Dragging moves players: bench → spot assigns, spot →
    spot swaps, spot → bench benches. An **Edit spots** mode (bottom toolbar; was "Move spots") is the only way
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

- **Game Day** (decided while testing milestone 6 on the phone):
  - **New match** asks only for the opponent; settings and formation copy the team's last
    match (or field-size defaults). Every setup field saves as it's edited.
  - **"Who's here?"** marks players absent before kickoff. Absent players can join mid-match
    via **⋮ → Add late arrival** (a `late_arrival` event: onto the bench, undoable).
  - **Subs are made on the board**: drag (or tap, tap) a bench player onto a player, or onto
    an empty spot (filling one is free, not counted against max subs). There is no Sub
    button; the bottom bar is **Goal · Opp. goal · Card · Log · Undo**. Quick subs are one tap.
    A sub's incoming player must be on the bench (quick subs naming absent players fail
    per pair).
  - Recording is immediate with a toast + Undo; undoing shows a distinct "Undone" toast with
    no button. Toasts are solid (white/red), never translucent, and stop at the bench.
  - **Player pickers show position**: current spot on the pitch, else preferred positions.
  - **Cards** use a drawn referee card (`RefereeCardIcon`), never a credit-card icon. A second
    yellow asks "Yellow + red" or "Yellow only". In the card picker, the Yellow / Red options
    show their card and fill with that color when selected.
  - Tokens show minutes played, a yellow card mark, and **goal (ball) / assist (boot)
    markers** with a count bubble.
  - Picking up a bench player highlights spots for their main (solid ring) and second
    (dashed ring) position, filled or empty.
  - **Formation mid-match:** tap the formation pill to **switch** formations (players fit to
    the new shape: GK stays, then same position, line, distance), or **Edit formation** to
    move/relabel spots. Neither records events; the kickoff snapshot never changes.
  - A **red-card spot** stays empty, but a pitch player can move into it (e.g. into goal):
    the lock moves to the spot they left, so the team stays a player down.
  - Half-time subs are stamped with the minute the half ended.
  - **No leave confirmation** on the live screen: back just leaves. The match and clock keep
    going, and the coach returns from Game Day (decided while testing milestone 7).

## What exists now (milestones 1–7)

- **Schema** (`src/db/schema.ts`, migrations `0000_init`, `0001_player_positions`,
  `0002_team_kit_colors`, `0003_match_venue_and_formation`, `0004_team_sort_order`,
  `0005_formation_sort_order`):
  - `teams`: id, name, field_size, home_color, away_color, sort_order, created_at
  - `players`: id, team_id, name, jersey_number, primary_position, secondary_position,
    is_active, created_at
  - `formations`: id, team_id, name, field_size, layout_json, sort_order, created_at, updated_at
  - `matches`: id, team_id, formation_id, formation_name, opponent_name, is_home,
    period_count, period_length_minutes, game_length_minutes, max_subs (null = unlimited),
    status (setup/live/finished), starting_lineup_json (draft during setup, frozen at
    kickoff), live_layout_json, started_at, ended_at, created_at
  - `match_periods`: id, match_id, period_number, started_at, ended_at, paused_at,
    paused_total_ms (unique per match + period)
  - `match_events`: id, match_id, player_id, related_player_id, slot_id, event_type,
    period_number, game_time_ms, match_minute, group_id, created_at.
    Types: goal, assist, yellow_card, red_card, substitution, opponent_goal, position_swap,
    late_arrival. For a substitution, `player_id` is the player coming on and
    `related_player_id` the player going off.
  - `quick_sub_presets`: id, team_id XOR match_id, preset_name, substitutions_json
- **JSON shapes** (`src/domain/types.ts`, parsed by `src/domain/formations.ts`):
  - `FormationLayout { slots: { slotId, role, label, x, y, playerId? }[] }`: x/y normalized
    0–1, y=1 is the own goal line, exactly one GK.
  - `StartingLineup { slots, bench: playerId[] }` (slots + bench = the squad)
  - `LiveLayout { slots (no players), name, formationId }` in `live_layout_json`
    (`src/domain/liveLayout.ts`): the shape after mid-match edits and the formation switched to
  - `QuickSubPair[] { outPlayerId, inPlayerId }`
- **Repositories** (sync; `xxxQuery()` reads, validated writes): teams, players, formations,
  presets (+ `presetsForMatch`), events, **matches** (`createMatchDraft`, `updateMatchSetup`
  (partial), `setMatchFormation`, `setMatchSquad`, `setMatchLineup`, `matchLineup`,
  `matchLiveLayout`, `matchPeriodsQuery`) and **liveMatch** (`kickoff`, `applyClockAction`,
  `recordLiveAction`, `undoLastAction`, `setLiveLayout`, `switchLiveFormation`).
- **Domain** (`src/domain`, tested): types, formations, validation, roster, positions, colors,
  board (Tactics transforms + `suggestAmong`), clock (+ `availableClockActions`,
  `clockTransition`, `periodName`, `breakName`), lineup (+ `late_arrival`, red-card lock
  moves), subRules (+ `checkPresetPairs`), playingTime, stats, **matchEvents** (`LiveAction` →
  validated event drafts, `eventStamp`), **liveBoard** (drag/tap → action,
  `suggestedLiveSlots`), **matchSetup** (defaults, `lineupFromFormation`, `setSquad`,
  `kickoffLineup`, `matchKitColor`), **liveLayout** (`applyLiveLayout`, `fitToFormation`),
  **timeline** (event groups → log lines).
- **Presets:** `src/constants/presetFormations.ts` (11v11 4-4-2, 4-3-3, 3-5-2, 4-2-3-1; 9v9
  3-3-2, 3-2-3; 7v7 2-3-1, 3-2-1; 5v5 2-2, 1-2-1), each validated by a test.
- **Hooks/stores/lib:** `useLiveData`, `useActiveTeam`, `useKeyboardHeight`, `useOpenCount`,
  `useMatchClock` (re-renders; call `refresh()` after a clock write); `appStore`, `boardStore`
  (formation editor and match lineup editor); `src/lib/haptics.ts`.
- **Pitch** (`src/components/pitch`): `FormationBoard`, `Pitch`, `PitchMarkings`,
  `PlayerToken` (+ minutes badge, booked, locked, highlight rings, `ContributionMarks`),
  `BenchSidebar` (+ notes, stats), `BoardDragContext` + `DragLayer`, `SlotPositionSheet`,
  `FormationThumbnail`.
- **Game** (`src/components/game`): NewMatchSheet, FormationPickerSheet (setup/live),
  SquadSheet, LineupPreview, QuickSubPresetSheet, ClockBar, LiveBoard (memoised),
  FormationBar/FormationEditBar, QuickSubBar, EventActionBar, PlayerPickSheet, EventTimeline,
  LiveToast, FinishedSummary, RefereeCardIcon, LiveMatchCard.
- **UI kit** (`src/components/ui`), **Teams** and **Tactics** components as before.
- **Screens:** Teams, Roster, Tactics list, formation editor; **Game Day** list
  (`game/index`: live card with score + clock, New match, drafts), **match setup** (`game/[matchId]`),
  **lineup editor** (`game/lineup/[matchId]`), **live match** (`live/[matchId]`, full screen
  above the tabs; reopens on launch if a match is live; no leave confirmation; keep-awake; full-time
  summary). **History** (milestone 7, below).
- **Tests:** 388 (domain, presets, boardStore, repositories over real SQLite via
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
- Spots are locked unless **Edit spots** is on (the plan had token → grass always moving a
  spot); accidental moves were a problem on the phone.
- Bench drags start on a sideways swipe as well as after the 150 ms hold.
- The editor ghost is hidden only after the drop has rendered, so there is no gap where the
  faded source token shows on its own.
- **No `liveMatchStore`:** live-screen UI state is local state; everything else is derived
  from SQLite. The board's drag handlers stay stable across clock ticks via a latest-ref.
- **Lineup replay is in recorded (id) order**, not game time; events are validated by
  `src/domain` before they're recorded because replay skips events that don't apply.
- The live screen is a root route (`live/[matchId]`), not inside the Game Day tab stack.
- **No Sub button** (replaced by Log); subs happen on the board and via quick subs.
- `matches.live_layout_json` holds a `LiveLayout` (shape + switched-to formation), not a
  `FormationLayout`.

## Milestone 6 — Game Day (done)

- **Event conventions:** `game_time_ms` = the clock's `totalGameMs`; `match_minute` = the
  clock's `matchMinute` (uncapped in stoppage, shown via `formatMatchMinute` → `45+2'`).
  Events after a period ends carry that period's number and final time.
- **Kickoff** (one transaction): drops players deactivated since setup, needs one player on
  the pitch, freezes `starting_lineup_json`, sets live, inserts period 1. One live match max.
- **Clock writes:** `clockTransition` computes one write per action; ending a paused period
  folds the pause into `paused_total_ms`. Ending the last period is "End match".
- **Validation:** every live action goes through `buildLiveEvents` (lineup replayed from
  SQLite, sub limit, bench membership, slot availability) before `recordEventGroup`.

## Milestone 7 — History & stats (merged, #11)

Was branch `feature/history-stats`. The spec is item 7 under **Later milestones**.

- **Domain** `src/domain/history.ts`: `finalGameMs` (active time of every period),
  `minutesPlayed` + `minutesWithPlayers`, `seasonTable` (roster merged with `seasonStats`
  totals; inactive players only if they have a season), `nextSeasonSort` / `sortSeasonTable`
  (tap a column to sort, again to flip; numbers start high-to-low, names A–Z). Also
  `ordering.ts` and `text.ts`.
- **Repository** `src/db/repositories/history.ts`: `teamHistory` reads finished matches once
  for `results` (newest first, with score and result) and `season` (stats input; a match
  whose lineup can't be parsed is left out). Watch matches, match_events, match_periods.
- **Match history** (blocks a hard delete) = any event referencing the player, or being in a
  kicked-off match's starting lineup.
- **ReorderList:** a handle's pan blocks the list's scroll (`blocksExternalGesture`), and a
  tap selection stays until the drop so its banner doesn't shift the cards.
- **Screens:** `history/index` (Matches | Season segments; `MatchResultRow`, `SeasonRecordCard`,
  `SeasonTable`) and `history/[matchId]` (reuses `FinishedSummary`: key moments, match log,
  minutes played; delete match from the header). `late_arrival` isn't a stat.
- Also on this branch: draggable team and formation order (`ReorderList`, migrations
  `0004`/`0005`), `TeamCard`, and UI tweaks from phone testing. `PlaceholderScreen` is gone.

## Milestone 8 — Polish & EAS preview APK (in progress)

Branch `feature/polish-eas-preview`.

- **Back guard = unsaved edits only** (the live screen stays unguarded). The formation editor
  already asks Save / Discard / Keep editing via `usePreventRemove` (covers Android back); the
  lineup editor saves every change. Form sheets now guard too: a form calls
  `useDiscardGuard(edited)` and `Sheet` then turns back / backdrop / Close into
  "Discard changes / Keep editing" (team, player, new match, rename formation, quick sub).
- **Haptics:** the Tactics/lineup board confirms each drop or tap that changed it.
- **Empty states:** audited, every list already has one.
- **EAS:** `eas.json` (`preview` = internal APK, `production` auto-increments, remote app
  version). `app.json` name "Coach Buddy", slug `coach-buddy`, scheme `coachbuddy`, `android.package`
  `com.branmz.coachbuddy`.
  Build: `npx eas-cli@latest login`, then `npx eas-cli@latest build -p android --profile preview`
  (first run links the EAS project and writes `extra.eas.projectId` to `app.json`).
- **Icon:** coach + ball art on `#0754BE`. Adaptive foreground and splash use the art at ~59%
  on a transparent canvas, so circle masks never clip it. The themed-icon `monochromeImage` is
  a cutout of the art (coach + ball panels + trail), padded the same way.

## Later milestones (from the original plan)

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
