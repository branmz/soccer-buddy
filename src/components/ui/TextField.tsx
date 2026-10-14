import type { Ref } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

import { COLORS } from '@/constants/colors';
import { capitalizeWords } from '@/domain/text';

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
  const borderClass = error
    ? 'border-danger'
    : warning
      ? 'border-warning-edge'
      : 'border-line-strong';
  return (
    <View className="gap-1">
      <Text className="text-sm font-medium text-ink-soft">{capitalizeWords(label)}</Text>
      <TextInput
        accessibilityLabel={label}
        // gray-500: gray-400 placeholders wash out in sunlight.
        placeholderTextColor={COLORS.inkMuted}
        className={`min-h-touch rounded-xl border bg-surface px-3 text-base text-ink ${borderClass}`}
        {...inputProps}
      />
      {error ? (
        <Text accessibilityLiveRegion="polite" className="text-sm text-danger">
          {error}
        </Text>
      ) : warning ? (
        <Text accessibilityLiveRegion="polite" className="text-sm text-warning">
          {warning}
        </Text>
      ) : null}
    </View>
  );
}
