import { Text, View } from 'react-native';

import { needsOutline, readableTextColor } from '@/domain/colors';

/** Used when the team has no home color. */
const DEFAULT_KIT = '#2e7d32';
const INACTIVE_KIT = '#d1d5db';

type JerseyBadgeProps = {
  number: number | null;
  /** The team's kit color (#rrggbb), or null for the default green. */
  kitColor: string | null;
  inactive?: boolean;
  size?: number;
  /**
   * Drawn on the pitch: always gets a white ring. Most kit colors (red, blue, the default green)
   * have about the same brightness as grass, so without it tokens melt into the pitch.
   */
  onPitch?: boolean;
};

/**
 * Always a border with a color, never none: toggling `inactive` (who's here, a locked bench)
 * removed the class on light kits and left a one-frame ghost outline on Android.
 */
function outlineClass(background: string, inactive: boolean, onPitch: boolean): string {
  if (onPitch) return 'border-2 border-white';
  return needsOutline(background) && !inactive
    ? 'border border-gray-300'
    : 'border border-transparent';
}

/** Circular jersey-number badge in the team's kit color, with a readable number. */
export function JerseyBadge({
  number,
  kitColor,
  inactive = false,
  size = 40,
  onPitch = false,
}: JerseyBadgeProps) {
  const background = inactive ? INACTIVE_KIT : (kitColor ?? DEFAULT_KIT);
  return (
    <View
      accessible={false}
      className={`items-center justify-center rounded-full ${outlineClass(background, inactive, onPitch)}`}
      // Kit colors are user data, so they can't be Tailwind classes.
      style={{
        width: size,
        height: size,
        backgroundColor: background,
        elevation: onPitch ? 3 : 0,
      }}
    >
      <Text
        className="font-bold"
        style={{ color: readableTextColor(background), fontSize: size * 0.4 }}
      >
        {number ?? '–'}
      </Text>
    </View>
  );
}
