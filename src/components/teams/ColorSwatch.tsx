import { View } from 'react-native';

import { needsOutline } from '@/domain/colors';

type ColorSwatchProps = {
  /** #rrggbb, or null for "no color" (shown as an empty dashed circle). */
  color: string | null;
  size?: number;
};

/** A small decorative color circle; describe the color in the parent's accessibility label. */
export function ColorSwatch({ color, size = 20 }: ColorSwatchProps) {
  const outlined = color === null || needsOutline(color);
  return (
    <View
      accessible={false}
      // Every state sets width, color and style (no class removed when the color changes,
      // which left a one-frame ghost outline on Android).
      className={`rounded-full border ${outlined ? 'border-gray-300' : 'border-transparent'} ${
        color === null ? 'border-dashed' : 'border-solid'
      }`}
      // Kit colors are user data, so they can't be Tailwind classes.
      style={{ width: size, height: size, backgroundColor: color ?? 'transparent' }}
    />
  );
}
