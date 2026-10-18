import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';

import { COLORS, ON_FILL } from '@/constants/colors';
import { ICON } from '@/constants/icons';
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
    <View className="min-h-touch-lg flex-row items-center gap-2 border-b border-line bg-surface px-3 py-1">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Formation ${formationName ?? ''}. Switch formation`}
        onPress={onSwitch}
        className="min-h-touch shrink flex-row items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 active:bg-muted"
      >
        <Ionicons name="grid-outline" size={ICON.md} color={COLORS.inkSoft} />
        <Text numberOfLines={1} className="shrink text-label font-bold text-ink">
          {formationName ?? 'Formation'}
        </Text>
        <Ionicons name="chevron-down" size={ICON.md} color={COLORS.inkSoft} />
      </Pressable>
      <View className="flex-1" />
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Move spots or change their positions during the match"
        onPress={onEdit}
        className="min-h-touch flex-row items-center gap-1.5 rounded-full border border-brand-edge bg-brand-tint px-4 active:bg-brand-tint-strong"
      >
        <Ionicons name="move" size={ICON.md} color={COLORS.brandStrong} />
        <Text className="text-label text-brand-strong">Edit Formation</Text>
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
  /** Drops the picked spot (a tap on the grass would move it instead). */
  onCancel: () => void;
  onDone: () => void;
};

/**
 * Shown while the coach edits the formation mid-match. Players stay in their spots.
 *
 * One row of the same height as the formation bar it replaces, so entering or leaving the
 * editor never moves the pitch (two rows dropped it about 31dp under the coach's thumb). The
 * hint is short and capped at two lines next to two pills on a 360dp phone. Like the Tactics
 * bar: Undo and Done with nothing picked; the spot's position and Cancel once one is.
 */
export function FormationEditBar({
  selectedSlot,
  canUndo,
  onChangePosition,
  onUndo,
  onCancel,
  onDone,
}: FormationEditBarProps) {
  const hint = !selectedSlot
    ? 'Drag or tap a spot to change it.'
    : selectedSlot.role === 'GK'
      ? 'Tap the grass to move the GK.'
      : `Tap the grass to move ${selectedSlot.label}.`;
  return (
    <View className="min-h-touch-lg flex-row items-center gap-2 border-b border-yellow-300 bg-yellow-50 px-3 py-1">
      <Text
        accessibilityLiveRegion="polite"
        numberOfLines={2}
        maxFontSizeMultiplier={1.15}
        className="flex-1 text-label text-ink"
      >
        {hint}
      </Text>
      {selectedSlot ? (
        <>
          {positionOptionsFor(selectedSlot).length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Change position, currently ${selectedSlot.label}`}
              onPress={() => onChangePosition(selectedSlot)}
              className="min-h-touch flex-row items-center gap-1 rounded-full border border-brand bg-surface px-3 active:bg-brand-tint"
            >
              <Text className="text-heading text-brand-strong">{selectedSlot.label}</Text>
              <Ionicons name="chevron-down" size={ICON.md} color={COLORS.brandStrong} />
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            onPress={onCancel}
            className="min-h-touch flex-row items-center gap-1 rounded-full border border-line-strong bg-surface px-3 active:bg-muted"
          >
            <Ionicons name="close" size={ICON.md} color={COLORS.ink} />
            <Text className="text-label text-ink">Cancel</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Undo last formation change"
            accessibilityState={{ disabled: !canUndo }}
            disabled={!canUndo}
            onPress={onUndo}
            // Disabled is muted but still readable (a 40% fade washed out on the cream bar). Both
            // states set every class; only the values change (no Android ghosting).
            className={`min-h-touch flex-row items-center gap-1.5 rounded-full border px-3 ${
              canUndo
                ? 'border-line-strong bg-surface active:bg-muted'
                : 'border-line bg-muted active:bg-muted'
            }`}
          >
            <Ionicons
              name="arrow-undo"
              size={ICON.md}
              color={canUndo ? COLORS.ink : COLORS.inkMuted}
            />
            <Text className={`text-label ${canUndo ? 'text-ink' : 'text-ink-muted'}`}>Undo</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onDone}
            className="min-h-touch flex-row items-center gap-1.5 rounded-full border border-brand bg-brand px-4 active:bg-brand-strong"
          >
            <Ionicons name="checkmark" size={ICON.md} color={ON_FILL} />
            <Text className="text-label text-white">Done</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
