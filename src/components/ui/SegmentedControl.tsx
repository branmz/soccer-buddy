import { Keyboard, Pressable, Text, View } from 'react-native';

type Option<T> = { label: string; value: T };

type SegmentedControlProps<T> = {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <View className="gap-1">
      <Text className="text-sm font-medium text-gray-700">{label}</Text>
      <View accessibilityRole="radiogroup" className="flex-row rounded-xl bg-gray-100 p-1">
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
              className={`min-h-10 flex-1 items-center justify-center rounded-lg border ${
                selected ? 'border-gray-200 bg-white' : 'border-transparent bg-transparent'
              }`}
            >
              <Text
                className={`text-base font-semibold ${selected ? 'text-gray-900' : 'text-gray-500'}`}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
