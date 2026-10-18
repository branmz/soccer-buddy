import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ColorSwatch } from '@/components/teams/ColorSwatch';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { COLORS } from '@/constants/colors';
import { ICON } from '@/constants/icons';
import { useActiveTeam } from '@/hooks/useActiveTeam';

/** Header control showing the active team; tap to switch teams. */
export function TeamSwitcher() {
  const { team, teams, setActiveTeamId } = useActiveTeam();
  const [open, setOpen] = useState(false);

  function manageTeams() {
    setOpen(false);
    router.navigate('/teams');
  }

  // A neutral pill with the home kit as a dot. A kit-tinted pill made a red-kit team's switcher
  // look like a delete button: kit color stays on badges and swatches, never on controls.
  const kit = team?.homeColor ?? null;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={team ? `Active team: ${team.name}. Switch team` : 'Choose a team'}
        onPress={() => (teams.length === 0 ? manageTeams() : setOpen(true))}
        className="min-h-touch max-w-52 flex-row items-center gap-2 rounded-full border border-line-strong bg-surface px-4 active:bg-muted"
      >
        {kit && <ColorSwatch color={kit} size={16} />}
        {/* Middle ellipsis: "Greenwich Pal…U12" keeps two squads from one club apart. */}
        <Text
          numberOfLines={1}
          ellipsizeMode="middle"
          className="shrink text-heading font-semibold text-ink"
        >
          {team?.name ?? 'Add A Team'}
        </Text>
        <Ionicons name="chevron-down" size={ICON.md} color={COLORS.inkSoft} />
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
                className="min-h-14 flex-row items-center justify-between border-b border-muted active:bg-canvas"
              >
                <View className="flex-1 flex-row items-center gap-3">
                  {t.homeColor && <ColorSwatch color={t.homeColor} size={24} />}
                  <View className="flex-1">
                    <Text numberOfLines={1} className="text-label text-ink">
                      {t.name}
                    </Text>
                    <Text className="text-caption text-ink-muted">
                      {t.fieldSize}v{t.fieldSize}
                    </Text>
                  </View>
                </View>
                {selected && (
                  <Ionicons name="checkmark-circle" size={ICON.lg} color={COLORS.brand} />
                )}
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
