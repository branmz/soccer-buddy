# Soccer Buddy: Build Plan & Status

The living plan for this app. Read it with `CLAUDE.md`, which has the stack, commands and git
conventions, and links the rules pages: `ARCHITECTURE.md`, `CODE_STYLE.md` and `UI_RULES.md`
(all in `docs/`). Update the **Status** section when a milestone merges.

## Status (as of 2026-10-18)

| #   | Milestone                                                                 | State        | PR        |
| --- | ------------------------------------------------------------------------- | ------------ | --------- |
| 1   | Scaffold, tooling, lint hook                                              | ✅ merged    | #1        |
| 2   | DB layer: schema, migrations, repositories                                | ✅ merged    | #2        |
| —   | Claude code-review workflow + `code-reviewer` agent                       | ✅ merged    | #3, #4    |
| 3   | Teams & roster (+ positions, kit colors, sort)                            | ✅ merged    | #5        |
| 4   | Pitch & Tactics board                                                     | ✅ merged    | #7        |
| 5   | Domain logic: clock, lineup, sub rules, playing time, stats               | ✅ merged    | #9        |
| 6   | Game Day: setup, quick-sub presets, live match                            | ✅ merged    | #10       |
| 7   | History & stats                                                           | ✅ merged    | #11       |
| 8   | Polish & EAS preview APK                                                  | ✅ merged    | #12, #13  |
| —   | Device fixes: status bar, outdoor token contrast, bench drags, root route | ✅ merged    | #14 – #16 |
| —   | UX review 1: contrast, paused state, red-card confirm, Teams polish       | ✅ merged    | #17       |
| —   | UX review 2: kit color off controls, History, live press feedback         | ✅ merged    | #18       |
| —   | UX review 3: thumb-zone clock, quick-sub preview, buzz, ghosting, rings   | ✅ merged    | #19       |
| —   | UX review 4: Game Day season snapshot, Delete buttons, ⋮, Start Q2        | ✅ merged    | #20       |
| —   | Theme tokens: colors from `global.css` + `COLORS`, not literal classes    | ✅ merged    | #21       |
| —   | Expo 57.0.29 patch upgrade (router, linking, splash screen, jest-expo)    | ✅ merged    | #22       |
| —   | UI primitives: shared `Card`, `ListRow`, `SectionHeading`                 | ✅ merged    | #23       |
| —   | Touch targets: true 48dp (`touch` tokens; `min-h-12` was 42dp)            | ✅ merged    | #24       |
| —   | UX review 5: amber breaks, one-row live editor, quick-sub delete confirm  | ✅ merged    | #25       |
| —   | Dev build: `expo-dev-client`, `development` profile, `.dev` package       | ✅ merged    | #26       |
| —   | Expo 57.0.30 patch upgrade (router, @expo/ui; no native code change)      | ✅ merged    | #27       |
| —   | Type scale: text roles in `global.css`, `ICON` sizes, 13dp floor          | 🚧 in review | —         |

## Product decisions (confirmed with the coach/user)

- Android-first, offline, local SQLite only. No backend, no auth. Runs in Expo Go (SDK 57)
  or the development build (`Coach Buddy (Dev)`, package `com.branmz.coachbuddy.dev`).
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
- **Roster sort:** number / name / position (ST → GK by primary position), persisted. A
  compact `⇅ Number` pill on the "Active" header steps through them (rarely changed, so it
  doesn't get its own row). Roster rows have no chevron: the whole row opens the player.
- **Duplicate names** warn like duplicate jerseys (never block): "Another Michael (#3) is on
  the roster. Add a last initial…". **Deleting a player** (only possible without match history)
  confirms in a bottom sheet, like every other destructive action, not a system dialog.
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
    (dashed) position, falling back to the same line when no exact spot is free. When no open
    spot suits them (e.g. a full lineup), the taken spots that do get a yellow ring: dropping
    them there swaps them in.
  - Bench players drag on a **sideways swipe** or after a short hold; vertical moves scroll.
  - Filled spots show the position chip above the badge and the name below.
  - The name in the editor header has a pencil and opens a **rename-only** sheet; **⋮**
    holds Clear all players and Delete. Leaving with unsaved changes asks
    **Save / Discard / Keep editing**.
  - The TeamSwitcher pill is large and **neutral (white) with the home kit as a dot**. It used
    to be tinted with the kit, but a red kit made it look like a delete button (UX review,
    phase 2): kit color goes on badges, swatches and `KitShirt`, never on controls or cards.

- **Game Day** (decided while testing milestone 6 on the phone):
  - **New match** asks only for the opponent; settings and formation copy the team's last
    match (or field-size defaults). Every setup field saves as it's edited.
  - **"Who's here?"** marks players absent before kickoff. Absent players can join mid-match
    via **⋮ → Add late arrival** (a `late_arrival` event: onto the bench, undoable).
  - **Subs are made on the board**: drag (or tap, tap) a bench player onto a player, or onto
    an empty spot (filling one is free, not counted against max subs). There is no Sub
    button; the bottom bar is **Card · Goal · ⏸ Pause · Their goal · Undo** (UX review, phase
    3). The clock's main control (`clockControls` in `src/domain/clock.ts`: pause / resume /
    next period, or End match at full time) sits in the middle, in thumb reach, and keeps the
    two goal buttons apart: white with a dark outline to pause, solid amber to get play going
    again. Starting the next period asks first (at half-time that spot held Pause all half, and
    clock writes can't be undone). Ending a period stays top right (rare, confirmed). Log left
    the bar: the score
    (with a list icon) and **⋮ → Match log** open it. Their goal is dark, so it can't pass
    for the green Goal.
  - **Quick subs in setup** (phase 5): the Off / On chips show positions and distinct names
    ("Michael #3"), as do the setup summaries; **Delete quick sub** asks first in a red confirm
    (an "every match" one says it leaves every match).
  - **Quick subs preview first** (phase 3): a tap shows the preset's pairs ("Call these
    players over…") and one **Make 2 Subs** confirms. A sub's incoming player must be on the
    bench (quick subs naming absent players fail per pair; the OK ones can still be made).
  - **Regulation time up buzzes** (phase 3): when a period runs into stoppage, three strong
    haptic pulses, once per period (`periodEndHaptic`; no VIBRATE permission, so no long
    buzz). Only while the live screen is open (it keeps the screen awake).
  - The formation bar **stays** above the pitch (not moved to ⋮): the live pitch is limited by
    its width beside the bench, so the row gives the pitch nothing, and the selection hint
    takes its place without moving the pitch.
  - Recording is immediate with a toast + Undo; undoing shows a distinct "Undone" toast with
    no button. Toasts are solid (white/red), never translucent, and stop at the bench. They sit
    at the **bottom** of the pitch (thumb reach) and last 7s.
  - **Player pickers show position**: current spot on the pitch, else preferred positions.
  - **Cards** use a drawn referee card (`RefereeCardIcon`), never a credit-card icon. A second
    yellow asks "Yellow + red" or "Yellow only", and a straight red asks to confirm. In the
    card picker, the Yellow / Red options show their card and fill with that color when
    selected.
  - **A stopped clock turns the whole clock bar amber** (dark text, dark Resume), so running vs
    stopped reads at a glance; the Game Day live card and the status bar follow. Stopped means
    paused **or between periods** (phase 5, `isClockStopped`): a green bar at the break read as
    a running clock. "PAUSED" only shows while actually paused.
  - **Sideline legibility** (from a UX review, phase 1): brand green is `#15803d` (white text
    5:1), readable text is never lighter than gray-500, and sideline touch targets are ≥48dp
    (`min-h-touch`; until the touch-targets fix, `min-h-12` was assumed to be 48dp but
    NativeWind's 14px rem made it 42dp).
    The **selected** player is cyan (`select` / `select-strong` tokens: no kit color is cyan);
    on the pitch, yellow means a card or a spot that suits a player. In plain text (log, toasts) players who share a name show their number
    ("Michael #3"), via `distinctNames` in `src/domain/roster.ts`.
  - **Feedback you can feel in sunlight** (phase 2): live buttons shrink while held
    (`usePressScale`; a pressed color alone vanishes outdoors), buttons that open something
    give a light tick (`tapHaptic`), the score bumps when it changes, and the subs count
    becomes a white chip with one sub left and a red one at the limit.
  - **The Game Day live card is dark green** like the clock bar (amber when paused), with the
    kit as a shirt next to the team name, not filled with the kit color.
  - **History** (phase 2): the full match log starts collapsed under Key Moments ("Show all
    12"), so the two don't repeat each other; under a minute played shows `<1'`, not `0'`; the
    season card says **GF–GA**; the column legend sits above the table; the kit worn is a
    shirt icon, not a bare dot that read like a result light.
  - **Tactics** idle hint is a status line ("All 11 spots filled · 2 on the bench"), with
    how-to only while there's a spot to fill.
  - Tokens show minutes played, a yellow card mark, and **goal (ball) / assist (boot)
    markers** with a count bubble.
  - Picking up a bench player highlights spots for their main and second position, filled or
    empty. **Rings on filled spots** (both boards, `PlayerToken`): a yellow band with a
    near-black outer edge, clear of the badge's white border (a light band alone merged with
    it): thick and slowly pulsing for the main position (off with Reduce Motion), thin and
    still for the second (dashed circles this small showed as faint dots on Android). The
    cyan "selected" ring has the same dark edge, without the pulse.
  - **Formation mid-match:** tap the formation pill to **switch** formations (players fit to
    the new shape: GK stays, then same position, line, distance), or **Edit formation** to
    move/relabel spots. Neither records events; the kickoff snapshot never changes. The edit
    bar is one row, the formation bar's height (phase 5; two rows dropped the pitch ~31dp):
    hint + Undo + Done, or with a spot picked, its position pill + Cancel.
  - A **red-card spot** stays empty, but a pitch player can move into it (e.g. into goal):
    the lock moves to the spot they left, so the team stays a player down.
  - Half-time subs are stamped with the minute the half ended.
  - **No leave confirmation** on the live screen: back just leaves. The match and clock keep
    going, and the coach returns from Game Day (decided while testing milestone 7).

## What exists now (milestones 1–8, then the UX review)

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
- **Domain** (`src/domain`, tested): types, formations, validation, roster (+ `distinctNames`,
  `findNameConflict`), positions, colors (+ `isLightKit`), board (Tactics transforms +
  `suggestAmong`, `suggestedSlots` with the full-lineup fallback), clock (+
  `availableClockActions`, `clockControls`, `clockTransition`, `periodName`, `breakName`),
  history (+ `formatMinutesPlayed`), lineup (+ `late_arrival`, red-card lock
  moves), subRules (+ `checkPresetPairs`), playingTime, stats, **matchEvents** (`LiveAction` →
  validated event drafts, `eventStamp`), **liveBoard** (drag/tap → action,
  `suggestedLiveSlots`), **matchSetup** (defaults, `lineupFromFormation`, `setSquad`,
  `kickoffLineup`, `matchKitColor`), **liveLayout** (`applyLiveLayout`, `fitToFormation`),
  **timeline** (event groups → log lines).
- **Presets:** `src/constants/presetFormations.ts` (11v11 4-4-2, 4-3-3, 3-5-2, 4-2-3-1; 9v9
  3-3-2, 3-2-3; 7v7 2-3-1, 3-2-1; 5v5 2-2, 1-2-1), each validated by a test.
- **Hooks/stores/lib:** `useLiveData`, `useActiveTeam`, `useKeyboardHeight`, `useOpenCount`,
  `useMatchClock` (re-renders; call `refresh()` after a clock write), `usePressScale`;
  `appStore`, `boardStore` (formation editor and match lineup editor); `src/lib/haptics.ts`
  (`confirmHaptic`, `rejectHaptic`, `tapHaptic`, `periodEndHaptic`).
- **Theme:** every app color is a semantic token in `src/global.css`: surfaces (`canvas`,
  `surface`, `muted`), `line`s, `ink` text, `brand`, `danger`, `warning`, `paused`, `select`,
  pitch greens. `src/constants/colors.ts` mirrors them as `COLORS` (plus `ON_FILL`) for icon
  and switch props, and `colors.test.ts` fails if the two drift. Literal palette classes are
  left only where the color is fixed by what it sits on (text on solid fills, the pitch,
  referee cards). Set up so colors change in one place, and as the base for a dark mode
  (not planned: dark screens glare in sunlight; if added, as an opt-in setting).
  `src/constants/navigation.ts` (`STACK_OPTIONS`: slide transitions).
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
- **Tests:** 438 (domain, presets, boardStore, repositories over real SQLite via
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
- **No Sub button**: subs happen on the board and via quick subs. (Its spot went to Log, which
  in phase 3 gave way to the clock's pause / resume; the log opens from the score or ⋮.)
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

## Milestone 8 — Polish & EAS preview APK (merged, #12)

Was branch `feature/polish-eas-preview`. EAS project `@buranapple/coach-buddy` (keystore on EAS).

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

## UX review (October 2026: #17 – #20, #24, phase 5)

A hard sideline-usability review (bright sun, one thumb) of the device screenshots and the
code. Its rules now live in `docs/UI_RULES.md`; the product decisions above record what
changed on each screen.

- **Phase 1 (#17):** contrast (brand green, gray-500 floor, Resume), amber paused bar, cyan
  selection, red-card confirm, ≥48dp targets, bottom toast (7s), solid token labels,
  `distinctNames`, "Their goal". Teams: sort pill, no chevrons, delete-player sheet,
  duplicate-name warning, readable disabled fields.
- **Phase 2 (#18):** kit color off controls and cards (`KitShirt`); History (collapsed full
  log, `<1'`, GF–GA, legend first); press scale + tap haptic, score bump, subs chip; Tactics
  status line.
- **Phase 3 (#19):** clock control in the bottom bar (`clockControls`; starting a period confirms),
  quick-sub preview, period-end buzz; slide transitions and class-removal fixes (no ghosting);
  full-lineup highlights; rings with a dark edge (pulsing for the main position); Tactics hint
  legend ("Tap a spot. Bold yellow: CDM; light or thin ring: CB.") in a cyan bar while a player
  is selected. Board hints are capped at two lines, so the bar never grows and moves the pitch.
- **Phase 4 (#20):** between matches Game Day felt empty, so under the live card and drafts it shows a
  **season snapshot**: the last result with its scorers (tap: the match in History, with the
  list under it for Back), then a white Season card (record, GF–GA, last-5 form newest first,
  top 3 scorers via `topScorers`) and See All In History. White, not dark green: on Game Day
  only the live match is dark green. Deletes in the match setup and match detail headers are a
  labelled red **Delete** pill (`HeaderButton` `danger`), not a bare trash icon; the formation
  editor's More is an icon-only ⋮ (the room goes to the name); the button between quarters
  says **Start Q2** (`startPeriodLabel`), since a bare "Q2" isn't an action.
- **Touch targets (#24):** NativeWind's rem is 14px, so the "48dp" `min-h-12` was 42dp
  and some controls were 31–38dp. Every control is now on the px tokens `touch` (48dp) /
  `touch-lg` (56dp, Kick Off and Done); the bars that swap above the pitch (formation bar ↔
  live hint, the Tactics hint bar) share `min-h-touch-lg`, so the pitch no longer shifts 6–7dp
  when a player is picked up or dropped. The season table's narrow sort headers are the one
  exception (48dp tall, column width).
- **Phase 5:** a `ui-reviewer` agent pass over 28 device screenshots and the code. Amber at
  breaks (`isClockStopped`); the live Edit Formation bar is one row; quick-sub delete
  confirms; readable inactive tabs (outline icons); middle-ellipsis team names; season zeros
  as "–"; disabled `HeaderButton`; cyan tap-to-move selection with a floating hint in
  `ReorderList`; quick-sub pickers with positions and distinct names; 13dp bench names;
  Cancel pills; dark labels on second-fit spots; constant select weight; hint font scale
  capped at 1.15; copy ("Their goal", "Who's here?", "Nothing was recorded in this match.").

**Decided against, or deferred:**

- Formation bar into ⋮: rejected. The live pitch is limited by its width beside the bench, so
  the row gives it nothing, and without it the selection hint would move the pitch.
- Rings are partly hidden under the position chip and the name label: accepted (moving the
  labels out would crowd the pitch).
- A long period-end vibration needs the VIBRATE permission; for now it's three haptic pulses.
- From phase 5, deferred: one Undo while editing the live formation (the edit bar's Undo
  and the match Undo stay separate); Title Case with lowercase minor words ("See All in
  History", app-wide); white instead of yellow stoppage digits (yellow has three meanings).

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
  tests in the dev build on Android (`npm run start:go` serves Expo Go instead), then reports
  issues. Expect several rounds of UI feedback.
- Before committing, run `npm run check` and the `code-reviewer` agent on the branch. Fix
  real findings and list the skipped ones with reasons.
- Keep `CLAUDE.md` under 200 lines and update this file's Status section when a PR merges.
