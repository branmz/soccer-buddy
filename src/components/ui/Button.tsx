import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, Text } from 'react-native';

import { BRAND } from '@/constants/colors';
import { capitalizeWords } from '@/domain/text';

/** `danger` is for the final confirm; `dangerOutline` for the entry point to a destructive flow. */
type Variant = 'primary' | 'secondary' | 'danger' | 'dangerOutline' | 'ghost';

// Every variant (and disabled) sets border width, border color and background, so turning a
// button on or off only changes values: a removed class (the old `opacity-40`) left a
// one-frame ghost on Android.
const containerClass: Record<Variant, string> = {
  primary: 'border border-brand bg-brand active:border-pitch-dark active:bg-pitch-dark',
  secondary: 'border border-gray-300 bg-white active:bg-gray-100',
  danger: 'border border-red-600 bg-red-600 active:border-red-700 active:bg-red-700',
  dangerOutline: 'border border-red-300 bg-white active:bg-red-50',
  ghost: 'border border-transparent bg-transparent active:bg-gray-100',
};

/** Disabled is muted but readable, never a fade (hard to read in sunlight). */
const DISABLED = {
  container: 'border border-gray-200 bg-gray-100 active:bg-gray-100',
  text: 'text-gray-500',
  icon: '#6b7280',
};

const textClass: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-gray-900',
  danger: 'text-white',
  dangerOutline: 'text-red-600',
  ghost: 'text-brand',
};

const iconColor: Record<Variant, string> = {
  primary: '#ffffff',
  secondary: '#111827',
  danger: '#ffffff',
  dangerOutline: '#dc2626',
  ghost: BRAND,
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
      className={`min-h-12 flex-row items-center justify-center gap-2 rounded-xl px-4 ${
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
