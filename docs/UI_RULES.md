# UI Rules (sideline: bright sun, one thumb)

Read before any screen, component or `className` change. These came out of the sideline UX
review (see `docs/PLAN.md` → UX review), and the coach approved each one on the phone.

- **No Android ghosting.** A conditional `className` sets the same properties in every state
  (`border-2 ${on ? 'border-brand' : 'border-transparent'}`), never `on ? 'x' : ''`: a removed
  class, or toggled elevation, shadow or font weight, leaves a one-frame ghost. In chips, put
  sibling `Text`s in a row rather than nesting `Text` (nested spans mis-measure on Android)
- **Contrast:** brand `#15803d` (white text 5:1); readable text never lighter than `ink-muted`;
  touch targets ≥ 48dp: `min-h-touch` / `h-touch w-touch` (56dp `min-h-touch-lg` for a screen's
  main action). Never `min-h-12`: NativeWind's rem is 14px, so it is only 42dp. One known
  exception: the season table's column headers are 48dp tall but as narrow as their columns.
  Disabled = `muted` fill + `ink-muted` text, never `opacity-*`
- **The pitch never moves between taps.** Bars that swap above it (formation bar ↔ selection
  hint, the Tactics hint bar) share `min-h-touch-lg` with `py-1`, which fits a 48dp pill or
  two lines of text, and hint text is capped at two lines
- **One meaning per color:** kit color only on badges, swatches and `KitShirt` (never on
  controls or cards); cyan = selected (`select` / `select-strong` tokens); yellow = a card or
  a spot that suits a player; amber = clock stopped (`paused`); red = destructive or an error
  (`danger`). The theme tokens carry these meanings: see `docs/CODE_STYLE.md`
- **Feedback:** live buttons shrink while held (`usePressScale`); `tapHaptic` for buttons that
  open something, `confirmHaptic` after recording, `rejectHaptic` when refused
- **Confirms:** deletes and red cards use `ConfirmSheet` (red); clock changes and undo use
  `tone="primary"`. No `Alert.alert`
- Player names in plain text (log, toasts, hints) go through `distinctNames` (`domain/roster`)
- New stacks use `STACK_OPTIONS`: Android's default scale-and-fade ghosts the old screen
