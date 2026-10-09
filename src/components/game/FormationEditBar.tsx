import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';

import { positionOptionsFor } from '@/domain/board';
import type { FormationSlot } from '@/domain/types';

type FormationBarProps = {
  formationName: string | null;
  onSwitch: () => void;
  onEdit: () => void;
};

/** Above the live pitch: the formation (tap to switch it) and the way into editing its shape. */
export function FormationBar({ formationName, onSwitch, onEdit }: FormationBarProps) {
  return (
    <View className="min-h-12 flex-row items-center gap-2 border-b border-gray-200 bg-white px-3 py-1">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Formation ${formationName ?? ''}. Switch formation`}
        onPress={onSwitch}
        className="min-h-12 shrink flex-row items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 active:bg-gray-100"
      >
        <Ionicons name="grid-outline" size={18} color="#374151" />
        <Text numberOfLines={1} className="shrink text-base font-bold text-gray-900">
          {formationName ?? 'Formation'}
        </Text>
        <Ionicons name="chevron-down" size={18} color="#374151" />
      </Pressable>
      <View className="flex-1" />
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Move spots or change their positions during the match"
        onPress={onEdit}
        className="min-h-12 flex-row items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-4 active:bg-green-100"
      >
        <Ionicons name="move" size={18} color="#1b5e20" />
        <Text className="text-base font-semibold text-pitch-dark">Edit Formation</Text>
      </Pressable>
    </View>
  );
}

type FormationEditBarProps = {
  /** The spot picked by a first tap, if any. */
  selectedSlot: FormationSlot | undefined;
  canUndo: boolean;
  onChangePosition: (slot: FormationSlot) => void;
  onUndo: () => void;
  onDone: () => void;
};

/** Shown while the coach edits the formation mid-match. Players stay in their spots. */
export function FormationEditBar({
  selectedSlot,
  canUndo,
  onChangePosition,
  onUndo,
  onDone,
}: FormationEditBarProps) {
  const hint = !selectedSlot
    ? 'Drag a spot to move it, or tap a spot to change its position.'
    : selectedSlot.role === 'GK'
      ? "Tap the grass to move the goalkeeper. The GK spot can't change position."
      : `Tap the grass to move ${selectedSlot.label}, or change its position.`;
  return (
    <View className="gap-2 border-b border-yellow-300 bg-yellow-50 px-3 py-2">
      {/* At most two lines next to a 48dp pill: the row keeps one height as the hint changes,
          so the pitch below never jumps while the coach is tapping it. */}
      <View className="min-h-12 flex-row items-center gap-2">
        <Text
          accessibilityLiveRegion="polite"
          numberOfLines={2}
          className="flex-1 text-base font-medium text-gray-900"
        >
          {hint}
        </Text>
        {selectedSlot && positionOptionsFor(selectedSlot).length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Change position, currently ${selectedSlot.label}`}
            onPress={() => onChangePosition(selectedSlot)}
            className="min-h-12 flex-row items-center gap-1 rounded-full border border-brand bg-white px-3 active:bg-green-50"
          >
            <Text className="text-lg font-bold text-pitch-dark">{selectedSlot.label}</Text>
            <Ionicons name="chevron-down" size={18} color="#1b5e20" />
          </Pressable>
        )}
      </View>
      {/* Equal halves: big targets, nothing hanging off to one side. */}
      <View className="flex-row gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Undo last formation change"
          accessibilityState={{ disabled: !canUndo }}
          disabled={!canUndo}
          onPress={onUndo}
          // Disabled is muted but still readable (a 40% fade washed out on the cream bar). Both
          // states set every class; only the values change (no Android ghosting).
          className={`min-h-12 flex-1 flex-row items-center justify-center gap-1.5 rounded-full border px-3 ${
            canUndo
              ? 'border-gray-300 bg-white active:bg-gray-100'
              : 'border-gray-200 bg-gray-100 active:bg-gray-100'
          }`}
        >
          <Ionicons name="arrow-undo" size={18} color={canUndo ? '#111827' : '#6b7280'} />
          <Text
            className={`text-base font-semibold ${canUndo ? 'text-gray-900' : 'text-gray-500'}`}
          >
            Undo
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onDone}
          className="min-h-12 flex-1 flex-row items-center justify-center gap-1.5 rounded-full border border-brand bg-brand px-4 active:bg-pitch-dark"
        >
          <Ionicons name="checkmark" size={18} color="#ffffff" />
          <Text className="text-base font-semibold text-white">Done</Text>
        </Pressable>
      </View>
    </View>
  );
}
