import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, Text } from 'react-native';

import { capitalizeWords } from '@/domain/text';

type Variant = 'primary' | 'secondary' | 'danger';

type HeaderButtonProps = {
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  /**
   * `primary` is the screen's main action (solid green); `secondary` is a light-green pill;
   * `danger` is a light-red pill for a delete (it opens a confirm).
   */
  variant?: Variant;
  /** Full description for screen readers when `label` is abbreviated (e.g. "Add"). */
  accessibilityLabel?: string;
  /**
   * Icon only, in a 48dp circle; `label` is still read aloud. Only for a well-known icon (⋮)
   * in a header too crowded for its text.
   */
  hideLabel?: boolean;
  disabled?: boolean;
};

const VARIANT: Record<Variant, { box: string; text: string; icon: string }> = {
  primary: {
    box: 'border-brand bg-brand active:bg-pitch-dark',
    text: 'text-white',
    icon: '#ffffff',
  },
  secondary: {
    box: 'border-green-200 bg-green-50 active:bg-green-100',
    text: 'text-pitch-dark',
    icon: '#1b5e20',
  },
  danger: {
    box: 'border-red-200 bg-red-50 active:bg-red-100',
    text: 'text-red-700',
    icon: '#b91c1c',
  },
};

/** Pill button with icon and text for stack headers. */
export function HeaderButton({
  label,
  icon,
  onPress,
  variant = 'secondary',
  accessibilityLabel,
  hideLabel = false,
  disabled = false,
}: HeaderButtonProps) {
  const style = VARIANT[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`min-h-12 flex-row items-center justify-center gap-1.5 rounded-full border ${
        hideLabel ? 'w-12' : 'px-3'
      } ${style.box}`}
    >
      <Ionicons name={icon} size={hideLabel ? 24 : 20} color={style.icon} />
      {!hideLabel && (
        <Text className={`text-lg font-semibold ${style.text}`}>{capitalizeWords(label)}</Text>
      )}
    </Pressable>
  );
}
