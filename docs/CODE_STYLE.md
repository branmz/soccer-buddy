# Code Style

Read before writing code. For styling and screen rules, see also `docs/UI_RULES.md`.

- TypeScript strict; no `any` (use `unknown` + parse helpers for JSON columns)
- Function components + hooks; named exports (except expo-router route files)
- Styling via NativeWind `className`; inline `style` only for animated/measured values and
  user-chosen colors (kit colors). Use `readableTextColor` / `needsOutline` / `isLightKit` from
  `domain/colors`
- Files: components `PascalCase.tsx`, everything else `camelCase.ts`
- Formatting is owned by Prettier — don't hand-format
- A PostToolUse hook (`.claude/hooks/lint-changed-file.mjs`) runs Prettier + ESLint on every
  edited file; fix any reported errors before moving on
