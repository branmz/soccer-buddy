# UI Rules (sideline: bright sun, one thumb)

Read before any screen, component or `className` change. These came out of the sideline UX
review (see `docs/PLAN.md` → UX review), and the coach approved each one on the phone.

- **No Android ghosting.** A conditional `className` sets the same properties in every state
  (`border-2 ${on ? 'border-brand' : 'border-transparent'}`), never `on ? 'x' : ''`: a removed
  class, or toggled elevation, shadow or font weight, leaves a one-frame ghost. In chips, put
  sibling `Text`s in a row rather than nesting `Text` (nested spans mis-measure on Android)
- **Contrast:** brand `#15803d` (white text 5:1); readable text never lighter than gray-500;
  touch targets ≥ 48dp (`min-h-12`). Disabled = grey fill + gray-500 text, never `opacity-*`
- **One meaning per color:** kit color only on badges, swatches and `KitShirt` (never on
  controls or cards); cyan = selected (`select` / `select-strong` tokens); yellow = a card or
  a spot that suits a player; amber = clock stopped; red = destructive or an error
- **Feedback:** live buttons shrink while held (`usePressScale`); `tapHaptic` for buttons that
  open something, `confirmHaptic` after recording, `rejectHaptic` when refused
- **Confirms:** deletes and red cards use `ConfirmSheet` (red); clock changes and undo use
  `tone="primary"`. No `Alert.alert`
- Player names in plain text (log, toasts, hints) go through `distinctNames` (`domain/roster`)
- New stacks use `STACK_OPTIONS`: Android's default scale-and-fade ghosts the old screen
