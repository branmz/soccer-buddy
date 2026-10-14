import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';

import { COLORS, ON_FILL } from '@/constants/colors';
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
    <View className="min-h-12 flex-row items-center gap-2 border-b border-line bg-surface px-3 py-1">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Formation ${formationName ?? ''}. Switch formation`}
        onPress={onSwitch}
        className="min-h-12 shrink flex-row items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 active:bg-muted"
      >
        <Ionicons name="grid-outline" size={18} color={COLORS.inkSoft} />
        <Text numberOfLines={1} className="shrink text-base font-bold text-ink">
          {formationName ?? 'Formation'}
        </Text>
        <Ionicons name="chevron-down" size={18} color={COLORS.inkSoft} />
      </Pressable>
      <View className="flex-1" />
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Move spots or change their positions during the match"
        onPress={onEdit}
        className="min-h-12 flex-row items-center gap-1.5 rounded-full border border-brand-edge bg-brand-tint px-4 active:bg-brand-tint-strong"
      >
        <Ionicons name="move" size={18} color={COLORS.brandStrong} />
        <Text className="text-base font-semibold text-brand-strong">Edit Formation</Text>
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
          className="flex-1 text-base font-medium text-ink"
        >
          {hint}
        </Text>
        {selectedSlot && positionOptionsFor(selectedSlot).length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Change position, currently ${selectedSlot.label}`}
            onPress={() => onChangePosition(selectedSlot)}
            className="min-h-12 flex-row items-center gap-1 rounded-full border border-brand bg-surface px-3 active:bg-brand-tint"
          >
            <Text className="text-lg font-bold text-brand-strong">{selectedSlot.label}</Text>
            <Ionicons name="chevron-down" size={18} color={COLORS.brandStrong} />
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
              ? 'border-line-strong bg-surface active:bg-muted'
              : 'border-line bg-muted active:bg-muted'
          }`}
        >
          <Ionicons name="arrow-undo" size={18} color={canUndo ? COLORS.ink : COLORS.inkMuted} />
          <Text className={`text-base font-semibold ${canUndo ? 'text-ink' : 'text-ink-muted'}`}>
            Undo
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onDone}
          className="min-h-12 flex-1 flex-row items-center justify-center gap-1.5 rounded-full border border-brand bg-brand px-4 active:bg-brand-strong"
        >
          <Ionicons name="checkmark" size={18} color={ON_FILL} />
          <Text className="text-base font-semibold text-white">Done</Text>
        </Pressable>
      </View>
    </View>
  );
}
