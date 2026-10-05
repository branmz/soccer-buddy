import type { Ref } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

type TextFieldProps = Omit<TextInputProps, 'className'> & {
  /** Forwarded to the TextInput, e.g. to move focus to it from the previous field. */
  ref?: Ref<TextInput>;
  label: string;
  /** Blocking problem, shown in red. */
  error?: string | null;
  /** Non-blocking note (e.g. a duplicate jersey number), shown in amber. */
  warning?: string | null;
};

export function TextField({ label, error, warning, ...inputProps }: TextFieldProps) {
  const borderClass = error ? 'border-red-500' : warning ? 'border-amber-500' : 'border-gray-300';
  return (
    <View className="gap-1">
      <Text className="text-sm font-medium text-gray-700">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#9ca3af"
        className={`min-h-12 rounded-xl border bg-white px-3 text-base text-gray-900 ${borderClass}`}
        {...inputProps}
      />
      {error ? (
        <Text accessibilityLiveRegion="polite" className="text-sm text-red-600">
          {error}
        </Text>
      ) : warning ? (
        <Text accessibilityLiveRegion="polite" className="text-sm text-amber-700">
          {warning}
        </Text>
      ) : null}
    </View>
  );
}
