import type { ReactNode } from 'react';
import { Keyboard, Pressable, Text, View } from 'react-native';

import { capitalizeWords } from '@/domain/text';

type Option<T> = {
  label: string;
  value: T;
  /** Shown before the label. */
  icon?: ReactNode;
  /** Replaces the selected look: border + background classes, and text color classes. */
  selectedClassName?: string;
  selectedTextClassName?: string;
};

type SegmentedControlProps<T> = {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Keeps the label for screen readers only (e.g. tabs whose options say it all). */
  hideLabel?: boolean;
};

export function SegmentedControl<T extends string | number>({
  label,
  options,
  value,
  onChange,
  hideLabel = false,
}: SegmentedControlProps<T>) {
  return (
    <View className="gap-1">
      {!hideLabel && (
        <Text className="text-sm font-medium text-gray-700">{capitalizeWords(label)}</Text>
      )}
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
        className="flex-row rounded-xl bg-gray-100 p-1"
      >
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={String(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => {
                Keyboard.dismiss();
                onChange(option.value);
              }}
              // Only colors change between states, and both states set them explicitly: an
              // elevation shadow, a font-weight change or a removed class each left a one-frame
              // "ghost" of the old selection on Android.
              className={`min-h-10 flex-1 flex-row items-center justify-center gap-2 rounded-lg border ${
                selected
                  ? (option.selectedClassName ?? 'border-gray-200 bg-white')
                  : 'border-transparent bg-transparent'
              }`}
            >
              {option.icon}
              <Text
                className={`text-base font-semibold ${
                  selected ? (option.selectedTextClassName ?? 'text-gray-900') : 'text-gray-500'
                }`}
              >
                {capitalizeWords(option.label)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
