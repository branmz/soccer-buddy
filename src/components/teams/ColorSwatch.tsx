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
      className={`rounded-full ${outlined ? 'border border-gray-300' : ''} ${color === null ? 'border-dashed' : ''}`}
      // Kit colors are user data, so they can't be Tailwind classes.
      style={{ width: size, height: size, backgroundColor: color ?? 'transparent' }}
    />
  );
}
