import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ColorSwatch } from '@/components/teams/ColorSwatch';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { kitTextColor, needsOutline, withAlpha } from '@/domain/colors';
import { useActiveTeam } from '@/hooks/useActiveTeam';

/** pitch-dark, for the default light-green pill. */
const DEFAULT_TEXT = '#1b5e20';
const TINT_ALPHA = 0.12;
const BORDER_ALPHA = 0.45;
/** gray-300, for kits too light to tint a visible border (e.g. white). */
const OUTLINE = '#d1d5db';

/** Header control showing the active team; tap to switch teams. */
export function TeamSwitcher() {
  const { team, teams, setActiveTeamId } = useActiveTeam();
  const [open, setOpen] = useState(false);

  function manageTeams() {
    setOpen(false);
    router.navigate('/teams');
  }

  // A light pill tinted with the team's home kit color; without one, the app's light green.
  const kit = team?.homeColor ?? null;
  const textColor = kit ? kitTextColor(kit) : DEFAULT_TEXT;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={team ? `Active team: ${team.name}. Switch team` : 'Choose a team'}
        onPress={() => (teams.length === 0 ? manageTeams() : setOpen(true))}
        className={`min-h-11 max-w-52 flex-row items-center gap-1.5 rounded-full border px-4 active:opacity-80 ${
          kit ? '' : 'border-green-200 bg-green-50'
        }`}
        // Kit colors are user data, so they can't be Tailwind classes. A light tint of the kit
        // fills the pill, like the default light-green one.
        style={
          kit
            ? {
                backgroundColor: withAlpha(kit, TINT_ALPHA),
                borderColor: needsOutline(kit) ? OUTLINE : withAlpha(kit, BORDER_ALPHA),
              }
            : undefined
        }
      >
        <Text
          numberOfLines={1}
          className="shrink text-lg font-semibold"
          style={{ color: textColor }}
        >
          {team?.name ?? 'Add a team'}
        </Text>
        <Ionicons name="chevron-down" size={20} color={textColor} />
      </Pressable>

      <Sheet visible={open} title="Switch team" onClose={() => setOpen(false)}>
        <View accessibilityRole="radiogroup">
          {teams.map((t) => {
            const selected = t.id === team?.id;
            return (
              <Pressable
                key={t.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => {
                  setActiveTeamId(t.id);
                  setOpen(false);
                }}
                className="min-h-14 flex-row items-center justify-between border-b border-gray-100 active:bg-gray-50"
              >
                <View className="flex-1 flex-row items-center gap-3">
                  {t.homeColor && <ColorSwatch color={t.homeColor} size={24} />}
                  <View className="flex-1">
                    <Text numberOfLines={1} className="text-base font-semibold text-gray-900">
                      {t.name}
                    </Text>
                    <Text className="text-sm text-gray-500">
                      {t.fieldSize}v{t.fieldSize}
                    </Text>
                  </View>
                </View>
                {selected && <Ionicons name="checkmark-circle" size={24} color="#16a34a" />}
              </Pressable>
            );
          })}
        </View>
        <Button
          label="Manage teams"
          variant="secondary"
          icon="people-outline"
          onPress={manageTeams}
        />
      </Sheet>
    </>
  );
}
