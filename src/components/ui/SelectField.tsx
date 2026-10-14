import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Keyboard, Pressable, Text, View } from 'react-native';

import { COLORS } from '@/constants/colors';
import { capitalizeWords } from '@/domain/text';

type SelectFieldProps = {
  label: string;
  /** Text shown in the field; null shows the placeholder. */
  valueText: string | null;
  /** Spoken value, when it differs from valueText (e.g. "Central midfielder" for "CM"). */
  valueDescription?: string;
  placeholder: string;
  expanded: boolean;
  disabled?: boolean;
  /** Shown before the value, e.g. a color swatch. */
  leading?: ReactNode;
  onPress: () => void;
};

/** Compact dropdown-style field that toggles an inline picker below it. */
export function SelectField({
  label,
  valueText,
  valueDescription,
  placeholder,
  expanded,
  disabled = false,
  leading,
  onPress,
}: SelectFieldProps) {
  // Disabled is a grey field with readable text, not a 40% fade (unreadable in sun). Both
  // states set every class; only the values change (no Android ghosting).
  const boxClass = disabled
    ? 'border-line bg-canvas'
    : expanded
      ? 'border-brand bg-surface'
      : 'border-line-strong bg-surface';
  return (
    <View className="flex-1 gap-1">
      <Text className={`text-sm font-medium ${disabled ? 'text-ink-muted' : 'text-ink-soft'}`}>
        {capitalizeWords(label)}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${valueDescription ?? valueText ?? 'none'}`}
        accessibilityHint="Opens the list of options"
        accessibilityState={{ expanded, disabled }}
        disabled={disabled}
        onPress={() => {
          Keyboard.dismiss();
          onPress();
        }}
        className={`min-h-touch flex-row items-center gap-2 rounded-xl border px-3 ${boxClass}`}
      >
        {leading}
        <Text
          numberOfLines={1}
          // Same weight with or without a value: toggling font weight ghosts on Android.
          className={`flex-1 text-base font-semibold ${valueText ? 'text-ink' : 'text-ink-muted'}`}
        >
          {valueText ?? placeholder}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={disabled ? COLORS.inkFaint : COLORS.inkMuted}
        />
      </Pressable>
    </View>
  );
}
