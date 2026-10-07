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
        className="min-h-11 shrink flex-row items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 active:bg-gray-100"
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
        className="min-h-11 flex-row items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-4 active:bg-green-100"
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
    <View className="gap-1 border-b border-yellow-300 bg-yellow-50 px-3 py-1.5">
      <Text accessibilityLiveRegion="polite" className="text-sm text-gray-800">
        {hint}
      </Text>
      <View className="flex-row items-center gap-2">
        {selectedSlot && positionOptionsFor(selectedSlot).length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Change position, currently ${selectedSlot.label}`}
            onPress={() => onChangePosition(selectedSlot)}
            className="min-h-11 flex-row items-center gap-1 rounded-full border border-brand bg-white px-3 active:bg-green-50"
          >
            <Text className="text-lg font-bold text-pitch-dark">{selectedSlot.label}</Text>
            <Ionicons name="chevron-down" size={18} color="#1b5e20" />
          </Pressable>
        )}
        <View className="flex-1" />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Undo last formation change"
          accessibilityState={{ disabled: !canUndo }}
          disabled={!canUndo}
          onPress={onUndo}
          // Both states set every class; only the values change (no Android ghosting).
          className={`min-h-11 flex-row items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 active:bg-gray-100 ${
            canUndo ? 'opacity-100' : 'opacity-40'
          }`}
        >
          <Ionicons name="arrow-undo" size={18} color="#111827" />
          <Text className="text-base font-semibold text-gray-900">Undo</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onDone}
          className="min-h-11 flex-row items-center gap-1.5 rounded-full border border-brand bg-brand px-4 active:bg-pitch-dark"
        >
          <Ionicons name="checkmark" size={18} color="#ffffff" />
          <Text className="text-base font-semibold text-white">Done</Text>
        </Pressable>
      </View>
    </View>
  );
}
