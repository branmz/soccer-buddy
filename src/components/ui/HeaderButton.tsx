import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, Text } from 'react-native';

import { COLORS, ON_FILL } from '@/constants/colors';
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
    box: 'border-brand bg-brand active:bg-brand-strong',
    text: 'text-white',
    icon: ON_FILL,
  },
  secondary: {
    box: 'border-brand-edge bg-brand-tint active:bg-brand-tint-strong',
    text: 'text-brand-strong',
    icon: COLORS.brandStrong,
  },
  danger: {
    box: 'border-danger-edge bg-danger-tint active:bg-danger-tint-strong',
    text: 'text-danger-strong',
    icon: COLORS.dangerStrong,
  },
};

/** Disabled reads as off at a glance, like `Button`: muted fill, ink-muted text, never a fade. */
const DISABLED = {
  box: 'border-line bg-muted active:bg-muted',
  text: 'text-ink-muted',
  icon: COLORS.inkMuted,
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
  const style = disabled ? DISABLED : VARIANT[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`min-h-touch flex-row items-center justify-center gap-1.5 rounded-full border ${
        hideLabel ? 'w-touch' : 'px-3'
      } ${style.box}`}
    >
      <Ionicons name={icon} size={hideLabel ? 24 : 20} color={style.icon} />
      {!hideLabel && (
        <Text className={`text-lg font-semibold ${style.text}`}>{capitalizeWords(label)}</Text>
      )}
    </Pressable>
  );
}
