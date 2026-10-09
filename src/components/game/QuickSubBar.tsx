import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, ScrollView, Text } from 'react-native';
import Animated from 'react-native-reanimated';

import type { PresetWithPairs } from '@/db/repositories/presets';
import { usePressScale } from '@/hooks/usePressScale';

type QuickSubBarProps = {
  presets: PresetWithPairs[];
  onPress: (preset: PresetWithPairs) => void;
};

/**
 * A tap shows the preset's pairs, and one confirm makes every sub in it (one event group, so
 * one undo). The screen's preview gives the haptic.
 */
export function QuickSubBar({ presets, onPress }: QuickSubBarProps) {
  if (presets.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="grow-0 border-t border-gray-200 bg-white"
      contentContainerClassName="items-center gap-2 px-2 py-2"
    >
      <Text className="text-xs font-semibold text-gray-500 uppercase">Quick subs</Text>
      {presets.map((preset) => (
        <QuickSubChip key={preset.id} preset={preset} onPress={() => onPress(preset)} />
      ))}
    </ScrollView>
  );
}

function QuickSubChip({ preset, onPress }: { preset: PresetWithPairs; onPress: () => void }) {
  const press = usePressScale();
  return (
    <Animated.View style={press.style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Quick sub ${preset.presetName}: ${preset.substitutions.length} substitutions`}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        onPress={onPress}
        className="min-h-12 flex-row items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 active:bg-green-100"
      >
        <Ionicons name="swap-vertical" size={18} color="#1b5e20" />
        <Text numberOfLines={1} className="max-w-40 text-base font-semibold text-pitch-dark">
          {preset.presetName}
        </Text>
        <Text className="text-sm text-green-700">×{preset.substitutions.length}</Text>
      </Pressable>
    </Animated.View>
  );
}
