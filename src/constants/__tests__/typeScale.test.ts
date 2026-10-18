/**
 * @jest-environment node
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = join(__dirname, '../..');
const css = readFileSync(join(SRC, 'global.css'), 'utf8');

/** `--text-body: 14px;` → { body: 14 }. */
function fontSizes(): Record<string, number> {
  const sizes: Record<string, number> = {};
  for (const [, role, px] of css.matchAll(/--text-([a-z-]+?):\s*(\d+)px;/g)) {
    sizes[role] = Number(px);
  }
  // A role in another unit (rem, calc) would be skipped above: fail instead.
  const declared = css.match(/--text-[a-z-]+?(?<!--line-height|--font-weight):/g) ?? [];
  if (declared.length !== Object.keys(sizes).length) {
    throw new Error('Every --text-<role> size in global.css must be in px.');
  }
  return sizes;
}

/** `--text-body--line-height: calc(20 / 14);` → { body: 'calc(20 / 14)' }. */
function lineHeights(): Record<string, string> {
  const heights: Record<string, string> = {};
  for (const [, role, value] of css.matchAll(/--text-([a-z-]+?)--line-height:\s*([^;]+);/g)) {
    heights[role] = value.trim();
  }
  return heights;
}

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return tsxFiles(path);
    return path.endsWith('.tsx') ? [path] : [];
  });
}

describe('type scale (global.css)', () => {
  it("switches off Tailwind's font sizes, so only the roles exist", () => {
    expect(css).toMatch(/--text-\*:\s*initial;/);
  });

  it('gives every role a line height', () => {
    expect(Object.keys(lineHeights()).sort()).toEqual(Object.keys(fontSizes()).sort());
  });

  // react-native-css multiplies a text utility's line height by its font size, so `20px` on a
  // 14px role renders 280dp tall. Ratios only: `calc(<dp> / <font size>)`, or `1`.
  it('writes line heights as ratios of the font size, never px', () => {
    const sizes = fontSizes();
    for (const [role, value] of Object.entries(lineHeights())) {
      expect(value).not.toMatch(/px/);
      if (value === '1') continue;
      const ratio = value.match(/^calc\((\d+) \/ (\d+)\)$/);
      expect(ratio).not.toBeNull();
      // The divisor is the role's own size, so the ratio lands on the intended dp.
      expect(Number(ratio?.[2])).toBe(sizes[role]);
    }
  });

  // Tailwind's sizes are switched off, so a leftover `text-sm` would silently render at the
  // default size instead of failing.
  it("leaves no Tailwind font size in the app's components", () => {
    const leftovers = tsxFiles(SRC).flatMap((file) =>
      [...readFileSync(file, 'utf8').matchAll(/\btext-(xs|sm|base|lg|[2-9]?xl)\b/g)].map(
        (m) => `${relative(SRC, file)}: ${m[0]}`,
      ),
    );
    expect(leftovers).toEqual([]);
  });
});
