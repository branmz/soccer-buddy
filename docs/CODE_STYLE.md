# Code Style

Read before writing code. For styling and screen rules, see also `docs/UI_RULES.md`.

- TypeScript strict; no `any` (use `unknown` + parse helpers for JSON columns)
- Function components + hooks; named exports (except expo-router route files)
- Styling via NativeWind `className`; inline `style` only for animated/measured values and
  user-chosen colors (kit colors). Use `readableTextColor` / `needsOutline` / `isLightKit` from
  `domain/colors`
- **Colors come from the theme** (`src/global.css`): `bg-surface`, `bg-canvas`, `text-ink`,
  `text-ink-muted`, `border-line`, `bg-brand`, `text-brand-strong`, `bg-danger`, `bg-paused`…,
  not Tailwind's palette (`bg-white`, `text-gray-900`). Props that take a value (icon `color`,
  switch tracks, SVG) use `COLORS.xxx` / `ON_FILL` from `src/constants/colors.ts`, never a hex
  string. A new token goes in both files (`colors.test.ts` fails otherwise). Literal palette
  classes and hex values are only for colors fixed by what they sit on: text, icons and chips
  on a solid fill (white on green, gray-950 on amber), the pitch's tokens and rings, referee
  cards, W/D/L badges
- **Text uses a type role** (`src/global.css`): `text-display` (clock, final score),
  `text-score`, `text-title`, `text-heading`, `text-body` (sentences), `text-label` (buttons,
  names, chips; semibold), `text-caption` (meta, errors, field labels), `text-tag` (pitch tokens
  and the bench column only). Each sets size, line height and weight. Tailwind's `text-sm` /
  `text-base`… are switched off (they'd silently render at the default size;
  `typeScale.test.ts` fails on them). To change only the weight, add `font-semibold` /
  `font-bold` / `font-black` with the role (no `font-medium`). Icon sizes come from `ICON`
  (`src/constants/icons.ts`): `sm` in small chips and captions, `md` in buttons and bars,
  `lg` for icons that stand alone or lead a row
- **Build screens from `src/components/ui`**, not hand-copied class strings: a white card is
  `Card` (optional `title`, `flush` for tables), a tappable list row is `ListRow`, the small grey
  uppercase label over a group is `SectionHeading`. Their `className` is for layout only (gap,
  spacing)
- Files: components `PascalCase.tsx`, everything else `camelCase.ts`
- Formatting is owned by Prettier — don't hand-format
- A PostToolUse hook (`.claude/hooks/lint-changed-file.mjs`) runs Prettier + ESLint on every
  edited file; fix any reported errors before moving on
