import type { ParseResult } from './types';

/** Kit colors offered in the picker. Stored as lowercase #rrggbb. */
export const KIT_COLORS = [
  { name: 'White', hex: '#ffffff' },
  { name: 'Black', hex: '#111827' },
  { name: 'Red', hex: '#dc2626' },
  { name: 'Maroon', hex: '#7f1d1d' },
  { name: 'Orange', hex: '#ea580c' },
  { name: 'Yellow', hex: '#facc15' },
  { name: 'Green', hex: '#16a34a' },
  { name: 'Dark green', hex: '#14532d' },
  { name: 'Sky blue', hex: '#38bdf8' },
  { name: 'Blue', hex: '#2563eb' },
  { name: 'Navy', hex: '#1e3a8a' },
  { name: 'Purple', hex: '#7c3aed' },
  { name: 'Pink', hex: '#ec4899' },
  { name: 'Grey', hex: '#9ca3af' },
] as const;

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** Optional kit color: null/undefined/'' mean "not set". Normalizes to lowercase #rrggbb. */
export function cleanKitColor(input: string | null | undefined): ParseResult<string | null> {
  if (input === null || input === undefined || input.trim() === '') {
    return { ok: true, value: null };
  }
  const value = input.trim().toLowerCase();
  if (!HEX_COLOR.test(value)) return { ok: false, error: 'Colors must look like #1e3a8a' };
  return { ok: true, value };
}

/** The palette name for a stored color, or the hex itself for anything custom. */
export function kitColorName(hex: string): string {
  return KIT_COLORS.find((c) => c.hex === hex.toLowerCase())?.name ?? hex;
}

/** WCAG relative luminance of a #rrggbb color (0 = black, 1 = white). */
export function relativeLuminance(hex: string): number {
  const channel = (offset: number) => {
    const c = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrastRatio(a: number, b: number): number {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** White or near-black, whichever reads better on `background` (e.g. a jersey number). */
export function readableTextColor(background: string): '#ffffff' | '#111827' {
  const bg = relativeLuminance(background);
  const onWhite = contrastRatio(bg, 1);
  const onDark = contrastRatio(bg, relativeLuminance('#111827'));
  return onWhite >= onDark ? '#ffffff' : '#111827';
}

/** Very light colors (e.g. white kits) need an outline to stand out on a white screen. */
export function needsOutline(background: string): boolean {
  return relativeLuminance(background) > 0.8;
}

/**
 * A kit too faint to draw on white (under 3:1, WCAG's minimum for graphics): white, yellow,
 * sky blue, grey. Small kit marks outline these so the color still shows.
 */
export function isLightKit(kit: string): boolean {
  return contrastRatio(relativeLuminance(kit), 1) < 3;
}
