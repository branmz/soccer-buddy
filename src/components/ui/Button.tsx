import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, Text } from 'react-native';

import { BRAND } from '@/constants/colors';
import { capitalizeWords } from '@/domain/text';

/** `danger` is for the final confirm; `dangerOutline` for the entry point to a destructive flow. */
type Variant = 'primary' | 'secondary' | 'danger' | 'dangerOutline' | 'ghost';

const containerClass: Record<Variant, string> = {
  primary: 'bg-brand active:bg-pitch-dark',
  secondary: 'border border-gray-300 bg-white active:bg-gray-100',
  danger: 'bg-red-600 active:bg-red-700',
  dangerOutline: 'border border-red-300 bg-white active:bg-red-50',
  ghost: 'active:bg-gray-100',
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
      className={`min-h-12 flex-row items-center justify-center gap-2 rounded-xl px-4 ${containerClass[variant]} ${disabled ? 'opacity-40' : ''} ${className}`}
    >
      {icon && <Ionicons name={icon} size={18} color={iconColor[variant]} />}
      <Text className={`text-base font-semibold ${textClass[variant]}`}>
        {capitalizeWords(label)}
      </Text>
    </Pressable>
  );
}
