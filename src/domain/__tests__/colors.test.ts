import {
  cleanKitColor,
  KIT_COLORS,
  kitColorName,
  needsOutline,
  readableTextColor,
  relativeLuminance,
} from '../colors';

describe('cleanKitColor', () => {
  it('treats empty values as no color', () => {
    expect(cleanKitColor(null)).toEqual({ ok: true, value: null });
    expect(cleanKitColor(undefined)).toEqual({ ok: true, value: null });
    expect(cleanKitColor('  ')).toEqual({ ok: true, value: null });
  });

  it('normalizes valid hex colors to lowercase', () => {
    expect(cleanKitColor(' #1E3A8A ')).toEqual({ ok: true, value: '#1e3a8a' });
  });

  it.each(['red', '#fff', '#12345g', '1e3a8a', '#1e3a8a00'])('rejects %p', (input) => {
    expect(cleanKitColor(input).ok).toBe(false);
  });

  it('accepts every palette color', () => {
    for (const { hex } of KIT_COLORS) expect(cleanKitColor(hex)).toEqual({ ok: true, value: hex });
  });
});

describe('kitColorName', () => {
  it('names palette colors and falls back to the hex', () => {
    expect(kitColorName('#1E3A8A')).toBe('Navy');
    expect(kitColorName('#123456')).toBe('#123456');
  });
});

describe('readableTextColor', () => {
  it('uses dark text on light kits and white text on dark kits', () => {
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1);
    expect(relativeLuminance('#000000')).toBe(0);
    expect(readableTextColor('#ffffff')).toBe('#111827');
    expect(readableTextColor('#facc15')).toBe('#111827'); // yellow
    expect(readableTextColor('#38bdf8')).toBe('#111827'); // sky blue
    expect(readableTextColor('#1e3a8a')).toBe('#ffffff'); // navy
    expect(readableTextColor('#dc2626')).toBe('#ffffff'); // red
    expect(readableTextColor('#111827')).toBe('#ffffff'); // black
  });

  it('gives every palette color at least 3:1 contrast for its number', () => {
    // 3:1 is WCAG's minimum for large/bold text, which jersey numbers are.
    for (const { hex } of KIT_COLORS) {
      const bg = relativeLuminance(hex);
      const fg = relativeLuminance(readableTextColor(hex));
      const ratio = (Math.max(bg, fg) + 0.05) / (Math.min(bg, fg) + 0.05);
      expect(ratio).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('needsOutline', () => {
  it('outlines only very light colors', () => {
    expect(needsOutline('#ffffff')).toBe(true);
    expect(needsOutline('#facc15')).toBe(false);
    expect(needsOutline('#111827')).toBe(false);
  });
});
