# UI Rules (sideline: bright sun, one thumb)

Read before any screen, component or `className` change. These came out of the sideline UX
review (see `docs/PLAN.md` → UX review), and the coach approved each one on the phone.

- **No Android ghosting.** A conditional `className` sets the same properties in every state
  (`border-2 ${on ? 'border-brand' : 'border-transparent'}`), never `on ? 'x' : ''`: a removed
  class, or toggled elevation, shadow or font weight, leaves a one-frame ghost. In chips, put
  sibling `Text`s in a row rather than nesting `Text` (nested spans mis-measure on Android)
- **Size:** nothing read during play is under 13dp (`text-caption`). The one exception is the
  11dp `text-tag`, used only where the width is fixed: pitch token labels and the bench column
  (its heading, chips, Move To Bench and empty text)
- **Contrast:** brand `#15803d` (white text 5:1); readable text never lighter than `ink-muted`;
  touch targets ≥ 48dp: `min-h-touch` / `h-touch w-touch` (56dp `min-h-touch-lg` for a screen's
  main action). Never `min-h-12`: NativeWind's rem is 14px, so it is only 42dp. One known
  exception: the season table's column headers are 48dp tall but as narrow as their columns.
  Disabled = `muted` fill + `ink-muted` text, never `opacity-*`. Line and border colors are
  never text: a zero in a table is "–" in `ink-muted`, not a pale number
- **The pitch never moves between taps.** Every bar that can sit above it (formation bar,
  selection hint, the live Edit Formation bar, the Tactics hint bar) is one row of
  `min-h-touch-lg` with `py-1`, which fits a 48dp pill or two lines of text. Hint text is
  capped at two lines and `maxFontSizeMultiplier={1.15}`. A selection shows a white **✕ Cancel**
  pill, never plain-text Cancel
- **Nothing shifts when a hint or selection appears.** A hint replaces a bar of the same height,
  or floats solid over the bottom of a list (`pointerEvents="none"`); it is never inserted
  above a list's items
- **One meaning per color:** kit color only on badges, swatches and `KitShirt` (never on
  controls or cards); cyan = selected (`select` / `select-strong` tokens); yellow = a card or
  a spot that suits a player; amber = clock stopped (`paused`): paused **or** between periods
  (`isClockStopped`), on the clock bar, the Game Day live card and the status bar; red =
  destructive or an error (`danger`). The theme tokens carry these meanings: see
  `docs/CODE_STYLE.md`
- **Feedback:** live buttons shrink while held (`usePressScale`); `tapHaptic` for buttons that
  open something, `confirmHaptic` after recording, `rejectHaptic` when refused
- **Confirms:** every delete and red card uses `ConfirmSheet` (red): a sheet's red
  `dangerOutline` Delete closes it and opens the confirm, which stays open with the error if
  the delete fails. Clock changes and undo use `tone="primary"`. No `Alert.alert`
- **Names:** player names in plain text (log, toasts, hints, picker fields, summaries) go
  through `distinctNames` (`domain/roster`), and pickers show positions. Single-line team names
  truncate in the middle (`ellipsizeMode="middle"`), so "…U10" and "…U12" stay distinct
- New stacks use `STACK_OPTIONS`: Android's default scale-and-fade ghosts the old screen
