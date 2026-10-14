/**
 * Theme colors for props that take a color value (icons, switches, SVG), not a class.
 * Mirrors the tokens in `src/global.css` (`inkMuted` ↔ `--color-ink-muted`); a test keeps
 * the two in sync, so change a color in both places.
 */
export const COLORS = {
  canvas: '#f9fafb',
  surface: '#ffffff',
  muted: '#f3f4f6',
  line: '#e5e7eb',
  lineStrong: '#d1d5dc',
  ink: '#101828',
  inkSoft: '#364153',
  inkMuted: '#6a7282',
  inkFaint: '#99a1af',
  brand: '#15803d',
  brandStrong: '#1b5e20',
  brandTint: '#f0fdf4',
  brandTintStrong: '#dcfce7',
  brandEdge: '#b9f8cf',
  danger: '#e7000b',
  dangerStrong: '#c10007',
  dangerTint: '#fef2f2',
  dangerTintStrong: '#ffe2e2',
  dangerEdge: '#ffa2a2',
  warning: '#bb4d00',
  warningStrong: '#973c00',
  warningTint: '#fffbeb',
  warningEdge: '#fd9a00',
  paused: '#ffba00',
  pausedStrong: '#fd9a00',
  select: '#67e8f9',
  selectStrong: '#0e7490',
  selectTint: '#ecfeff',
  selectTintStrong: '#cefafe',
  pitch: '#2e7d32',
  pitchDark: '#1b5e20',
  pitchLine: '#e8f5e9',
  pitchStripe: '#338a37',
} as const;

/** Icons and text on a solid colored fill (brand button, red toast, dark green bar). */
export const ON_FILL = '#ffffff';
