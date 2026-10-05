import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, Text } from 'react-native';

type HeaderButtonProps = {
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  /** `primary` is the screen's main action (solid green); `secondary` is a light-green pill. */
  variant?: 'primary' | 'secondary';
  /** Full description for screen readers when `label` is abbreviated (e.g. "Add"). */
  accessibilityLabel?: string;
};

/** Pill button with icon and text for stack headers. */
export function HeaderButton({
  label,
  icon,
  onPress,
  variant = 'secondary',
  accessibilityLabel,
}: HeaderButtonProps) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      className={`min-h-11 flex-row items-center gap-1.5 rounded-full px-3 ${
        primary
          ? 'bg-brand active:bg-pitch-dark'
          : 'border border-green-200 bg-green-50 active:bg-green-100'
      }`}
    >
      <Ionicons name={icon} size={20} color={primary ? '#ffffff' : '#1b5e20'} />
      <Text className={`text-lg font-semibold ${primary ? 'text-white' : 'text-pitch-dark'}`}>
        {label}
      </Text>
    </Pressable>
  );
}
