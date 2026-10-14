import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, Text } from 'react-native';

import { COLORS, ON_FILL } from '@/constants/colors';
import { capitalizeWords } from '@/domain/text';

/** `danger` is for the final confirm; `dangerOutline` for the entry point to a destructive flow. */
type Variant = 'primary' | 'secondary' | 'danger' | 'dangerOutline' | 'ghost';

// Every variant (and disabled) sets border width, border color and background, so turning a
// button on or off only changes values: a removed class (the old `opacity-40`) left a
// one-frame ghost on Android.
const containerClass: Record<Variant, string> = {
  primary: 'border border-brand bg-brand active:border-brand-strong active:bg-brand-strong',
  secondary: 'border border-line-strong bg-surface active:bg-muted',
  danger: 'border border-danger bg-danger active:border-danger-strong active:bg-danger-strong',
  dangerOutline: 'border border-danger-edge bg-surface active:bg-danger-tint',
  ghost: 'border border-transparent bg-transparent active:bg-muted',
};

/** Disabled is muted but readable, never a fade (hard to read in sunlight). */
const DISABLED = {
  container: 'border border-line bg-muted active:bg-muted',
  text: 'text-ink-muted',
  icon: COLORS.inkMuted,
};

const textClass: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-ink',
  danger: 'text-white',
  dangerOutline: 'text-danger',
  ghost: 'text-brand',
};

const iconColor: Record<Variant, string> = {
  primary: ON_FILL,
  secondary: COLORS.ink,
  danger: ON_FILL,
  dangerOutline: COLORS.danger,
  ghost: COLORS.brand,
};

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: ComponentProps<typeof Ionicons>['name'];
  disabled?: boolean;
  className?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  className = '',
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`min-h-touch flex-row items-center justify-center gap-2 rounded-xl px-4 ${
        disabled ? DISABLED.container : containerClass[variant]
      } ${className}`}
    >
      {icon && (
        <Ionicons name={icon} size={18} color={disabled ? DISABLED.icon : iconColor[variant]} />
      )}
      <Text className={`text-base font-semibold ${disabled ? DISABLED.text : textClass[variant]}`}>
        {capitalizeWords(label)}
      </Text>
    </Pressable>
  );
}
