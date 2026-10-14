import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { SelectField } from '@/components/ui/SelectField';
import { KIT_COLORS, kitColorName, readableTextColor } from '@/domain/colors';

import { ColorSwatch } from './ColorSwatch';

type Kit = 'home' | 'away';

type KitColorFieldsProps = {
  home: string | null;
  away: string | null;
  onChangeHome: (color: string | null) => void;
  onChangeAway: (color: string | null) => void;
};

/**
 * Home and away kit color fields side by side. Tapping one opens a swatch palette below;
 * picking a swatch closes it, tapping the chosen swatch clears it.
 */
export function KitColorFields({ home, away, onChangeHome, onChangeAway }: KitColorFieldsProps) {
  const [editing, setEditing] = useState<Kit | null>(null);
  const value = editing === 'home' ? home : away;

  function pick(hex: string) {
    const next = hex === value ? null : hex;
    if (editing === 'home') onChangeHome(next);
    else onChangeAway(next);
    setEditing(null);
  }

  return (
    <View className="gap-2">
      <View className="flex-row gap-3">
        <SelectField
          label="Home kit"
          valueText={home ? kitColorName(home) : null}
          placeholder="Optional"
          leading={<ColorSwatch color={home} />}
          expanded={editing === 'home'}
          onPress={() => setEditing(editing === 'home' ? null : 'home')}
        />
        <SelectField
          label="Away kit"
          valueText={away ? kitColorName(away) : null}
          placeholder="Optional"
          leading={<ColorSwatch color={away} />}
          expanded={editing === 'away'}
          onPress={() => setEditing(editing === 'away' ? null : 'away')}
        />
      </View>

      {editing && (
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={editing === 'home' ? 'Home kit color' : 'Away kit color'}
          className="flex-row flex-wrap gap-3 rounded-xl bg-gray-50 p-3"
        >
          {KIT_COLORS.map(({ name, hex }) => {
            const selected = hex === value;
            return (
              <Pressable
                key={hex}
                accessibilityRole="radio"
                accessibilityLabel={name}
                accessibilityState={{ checked: selected }}
                onPress={() => pick(hex)}
                // Both states set the border (only its color changes): removing the ring's
                // classes left a one-frame ghost ring on the old pick (Android).
                className={`h-11 w-11 items-center justify-center rounded-full border-2 ${
                  selected ? 'border-brand' : 'border-transparent'
                }`}
              >
                <View className="items-center justify-center">
                  <ColorSwatch color={hex} size={34} />
                  {selected && (
                    <View className="absolute">
                      <Ionicons name="checkmark" size={20} color={readableTextColor(hex)} />
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
