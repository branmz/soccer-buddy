import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable } from 'react-native';

import { COLORS } from '@/constants/colors';

type IconButtonProps = {
  icon: ComponentProps<typeof Ionicons>['name'];
  /** Screen-reader label; required because the button has no visible text. */
  label: string;
  onPress: () => void;
  color?: string;
  size?: number;
};

/** A 44pt-minimum touch target around a single icon (header actions, row actions). */
export function IconButton({
  icon,
  label,
  onPress,
  color = COLORS.brandStrong,
  size = 24,
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      className="h-11 w-11 items-center justify-center rounded-full active:bg-muted"
    >
      <Ionicons name={icon} size={size} color={color} />
    </Pressable>
  );
}
