import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Keyboard, Pressable, Text, View } from 'react-native';

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
    ? 'border-gray-200 bg-gray-50'
    : expanded
      ? 'border-brand bg-white'
      : 'border-gray-300 bg-white';
  return (
    <View className="flex-1 gap-1">
      <Text className={`text-sm font-medium ${disabled ? 'text-gray-500' : 'text-gray-700'}`}>
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
        className={`min-h-12 flex-row items-center gap-2 rounded-xl border px-3 ${boxClass}`}
      >
        {leading}
        <Text
          numberOfLines={1}
          className={`flex-1 text-base ${valueText ? 'font-semibold text-gray-900' : 'text-gray-500'}`}
        >
          {valueText ?? placeholder}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={disabled ? '#9ca3af' : '#6b7280'}
        />
      </Pressable>
    </View>
  );
}
