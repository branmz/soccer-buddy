import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { SelectField } from '@/components/ui/SelectField';
import { PLAYER_POSITIONS, POSITION_NAMES, type PlayerPosition } from '@/domain/positions';

type Field = 'primary' | 'secondary';

type PositionFieldsProps = {
  primary: PlayerPosition | null;
  secondary: PlayerPosition | null;
  onChangePrimary: (value: PlayerPosition | null) => void;
  onChangeSecondary: (value: PlayerPosition | null) => void;
};

/**
 * Two compact select fields (main position, second position). Tapping one opens a single
 * chip grid below them; picking a chip closes it, tapping the chosen chip clears it.
 */
export function PositionFields({
  primary,
  secondary,
  onChangePrimary,
  onChangeSecondary,
}: PositionFieldsProps) {
  const [editing, setEditing] = useState<Field | null>(null);
  const value = editing === 'primary' ? primary : secondary;

  function pick(position: PlayerPosition) {
    const next = position === value ? null : position;
    if (editing === 'primary') onChangePrimary(next);
    else onChangeSecondary(next);
    setEditing(null);
  }

  return (
    <View className="gap-2">
      <View className="flex-row gap-3">
        <SelectField
          label="Position"
          valueText={primary}
          valueDescription={primary ? POSITION_NAMES[primary] : undefined}
          placeholder="Optional"
          expanded={editing === 'primary'}
          onPress={() => setEditing(editing === 'primary' ? null : 'primary')}
        />
        <SelectField
          label="Also plays"
          valueText={secondary}
          valueDescription={secondary ? POSITION_NAMES[secondary] : undefined}
          placeholder={primary ? 'Optional' : 'Set position first'}
          disabled={primary === null}
          expanded={editing === 'secondary'}
          onPress={() => setEditing(editing === 'secondary' ? null : 'secondary')}
        />
      </View>

      {editing && (
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={editing === 'primary' ? 'Position' : 'Also plays'}
          className="flex-row flex-wrap gap-2 rounded-xl bg-canvas p-2"
        >
          {PLAYER_POSITIONS.map((position) => {
            const selected = position === value;
            // The second position can't repeat the main one.
            const unavailable = editing === 'secondary' && position === primary;
            return (
              <Pressable
                key={position}
                accessibilityRole="radio"
                accessibilityLabel={POSITION_NAMES[position]}
                accessibilityState={{ checked: selected, disabled: unavailable }}
                disabled={unavailable}
                onPress={() => pick(position)}
                className={`min-h-touch min-w-touch items-center justify-center rounded-full border px-2 ${
                  selected
                    ? 'border-brand bg-brand'
                    : unavailable
                      ? 'border-line bg-muted'
                      : 'border-line-strong bg-surface active:bg-muted'
                }`}
              >
                <Text
                  className={`text-caption font-semibold ${
                    selected ? 'text-white' : unavailable ? 'text-ink-muted' : 'text-ink'
                  }`}
                >
                  {position}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
