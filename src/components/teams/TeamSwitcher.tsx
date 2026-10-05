import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { useActiveTeam } from '@/hooks/useActiveTeam';

/** Header control showing the active team; tap to switch teams. */
export function TeamSwitcher() {
  const { team, teams, setActiveTeamId } = useActiveTeam();
  const [open, setOpen] = useState(false);

  function manageTeams() {
    setOpen(false);
    router.navigate('/teams');
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={team ? `Active team: ${team.name}. Switch team` : 'Choose a team'}
        onPress={() => (teams.length === 0 ? manageTeams() : setOpen(true))}
        className="max-w-48 flex-row items-center gap-1 rounded-full bg-green-50 px-3 py-2 active:bg-green-100"
      >
        <Text numberOfLines={1} className="shrink text-sm font-semibold text-pitch-dark">
          {team?.name ?? 'Add a team'}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#1b5e20" />
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
                <View>
                  <Text className="text-base font-semibold text-gray-900">{t.name}</Text>
                  <Text className="text-sm text-gray-500">
                    {t.fieldSize}v{t.fieldSize}
                  </Text>
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
