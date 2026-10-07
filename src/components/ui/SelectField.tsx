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
  return (
    <View className={`flex-1 gap-1 ${disabled ? 'opacity-40' : ''}`}>
      <Text className="text-sm font-medium text-gray-700">{capitalizeWords(label)}</Text>
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
        className={`min-h-12 flex-row items-center gap-2 rounded-xl border bg-white px-3 ${
          expanded ? 'border-brand' : 'border-gray-300'
        }`}
      >
        {leading}
        <Text
          numberOfLines={1}
          className={`flex-1 text-base ${valueText ? 'font-semibold text-gray-900' : 'text-gray-400'}`}
        >
          {valueText ?? placeholder}
        </Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="#6b7280" />
      </Pressable>
    </View>
  );
}
