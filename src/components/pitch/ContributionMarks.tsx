import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

type ContributionMarksProps = {
  goals: number;
  assists: number;
  /** The jersey badge's diameter: the marks sit on its bottom corners. */
  size: number;
};

/**
 * Small markers on a player's jersey badge: a ball for goals (bottom left) and a boot for
 * assists (bottom right). The icon always fills its disc; a count of two or more sits in a
 * separate dark bubble on the disc's outer edge, so it never squeezes the icon.
 * Place inside the badge's box (a parent of the same size).
 */
export function ContributionMarks({ goals, assists, size }: ContributionMarksProps) {
  const disc = Math.max(16, Math.round(size * 0.42));
  const icon = Math.round(disc * 0.78);
  return (
    <>
      {goals > 0 && (
        <Mark side="left" disc={disc} count={goals}>
          <Ionicons name="football" size={icon} color="#111827" />
        </Mark>
      )}
      {assists > 0 && (
        <Mark side="right" disc={disc} count={assists}>
          <MaterialCommunityIcons name="shoe-cleat" size={icon} color="#111827" />
        </Mark>
      )}
    </>
  );
}

type MarkProps = {
  side: 'left' | 'right';
  disc: number;
  count: number;
  children: ReactNode;
};

function Mark({ side, disc, count, children }: MarkProps) {
  const left = side === 'left';
  const bubble = Math.max(12, Math.round(disc * 0.7));
  return (
    <View
      accessible={false}
      className={`absolute -bottom-1 items-center justify-center rounded-full border border-gray-300 bg-white ${
        left ? '-left-1.5' : '-right-1.5'
      }`}
      // Scales with the token, so it's measured rather than a class.
      style={{ width: disc, height: disc }}
    >
      {children}
      {count > 1 && (
        <View
          className={`absolute items-center justify-center rounded-full bg-gray-900 ${
            left ? '-left-1' : '-right-1'
          }`}
          style={{ top: -bubble / 2, minWidth: bubble, height: bubble, paddingHorizontal: 2 }}
        >
          <Text className="font-bold text-white" style={{ fontSize: bubble * 0.72 }}>
            {count}
          </Text>
        </View>
      )}
    </View>
  );
}
