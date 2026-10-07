import { Pressable, Text, View } from 'react-native';

import { Sheet } from '@/components/ui/Sheet';
import { positionOptionsFor } from '@/domain/board';
import { POSITION_LINE, POSITION_NAMES, type PlayerPosition } from '@/domain/positions';
import type { FormationSlot, SlotRole } from '@/domain/types';

const LINES: { role: SlotRole; title: string }[] = [
  { role: 'DEF', title: 'Defense' },
  { role: 'MID', title: 'Midfield' },
  { role: 'FWD', title: 'Attack' },
];

type SlotPositionSheetProps = {
  visible: boolean;
  /** Kept set while the sheet animates closed, so its content doesn't blank out. */
  slot: FormationSlot | null;
  onPick: (position: PlayerPosition) => void;
  onClose: () => void;
};

/** Changes a spot's position (Edit spots mode). GK isn't offered: one goalkeeper only. */
export function SlotPositionSheet({ visible, slot, onPick, onClose }: SlotPositionSheetProps) {
  const options = slot ? positionOptionsFor(slot) : [];
  return (
    <Sheet visible={visible} title="Change position" onClose={onClose}>
      {LINES.map(({ role, title }) => (
        <View key={role} className="gap-2">
          <Text className="text-sm font-semibold text-gray-500 uppercase">{title}</Text>
          <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
            {options
              .filter((p) => POSITION_LINE[p] === role)
              .map((position) => {
                const selected = position === slot?.label;
                return (
                  <Pressable
                    key={position}
                    accessibilityRole="radio"
                    accessibilityLabel={POSITION_NAMES[position]}
                    accessibilityState={{ checked: selected }}
                    onPress={() => {
                      onPick(position);
                      onClose();
                    }}
                    className={`min-h-12 min-w-16 items-center justify-center rounded-xl border px-3 ${
                      selected
                        ? 'border-brand bg-brand'
                        : 'border-gray-300 bg-white active:bg-gray-100'
                    }`}
                  >
                    <Text
                      className={`text-base font-bold ${selected ? 'text-white' : 'text-gray-900'}`}
                    >
                      {position}
                    </Text>
                  </Pressable>
                );
              })}
          </View>
        </View>
      ))}
      <Text className="text-sm text-gray-500">
        A formation has one goalkeeper, so GK can&apos;t be picked here.
      </Text>
    </Sheet>
  );
}
