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
};

/** Circular jersey-number badge in the team's kit color, with a readable number. */
export function JerseyBadge({ number, kitColor, inactive = false, size = 40 }: JerseyBadgeProps) {
  const background = inactive ? INACTIVE_KIT : (kitColor ?? DEFAULT_KIT);
  return (
    <View
      accessible={false}
      className={`items-center justify-center rounded-full ${needsOutline(background) && !inactive ? 'border border-gray-300' : ''}`}
      // Kit colors are user data, so they can't be Tailwind classes.
      style={{ width: size, height: size, backgroundColor: background }}
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
