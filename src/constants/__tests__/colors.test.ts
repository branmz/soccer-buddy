/**
 * @jest-environment node
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { COLORS } from '../colors';

/** `--color-ink-muted: #6b7280;` in the @theme block → { 'ink-muted': '#6b7280' }. */
function cssTokens(): Record<string, string> {
  const css = readFileSync(join(__dirname, '../../global.css'), 'utf8');
  const tokens: Record<string, string> = {};
  for (const [, name, value] of css.matchAll(/--color-([a-z-]+):\s*(#[0-9a-f]{6})\s*;/gi)) {
    tokens[name] = value.toLowerCase();
  }
  // A token in another format (#fff, rgb(), oklch()) would be skipped above: fail instead.
  const declared = css.match(/--color-[a-z-]+:/gi) ?? [];
  if (declared.length !== Object.keys(tokens).length) {
    throw new Error('Every --color-* token in global.css must be a 6-digit hex (#rrggbb).');
  }
  return tokens;
}

const kebab = (name: string) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

describe('COLORS', () => {
  it('mirrors every theme token in global.css, value for value', () => {
    const fromTs = Object.fromEntries(
      Object.entries(COLORS).map(([name, value]) => [kebab(name), value]),
    );
    expect(fromTs).toEqual(cssTokens());
  });
});
