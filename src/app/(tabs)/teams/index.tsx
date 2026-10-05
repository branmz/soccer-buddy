import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { ColorSwatch } from '@/components/teams/ColorSwatch';
import { TeamFormSheet } from '@/components/teams/TeamFormSheet';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { teamSummariesQuery, type TeamSummary } from '@/db/repositories/teams';
import { players, teams } from '@/db/schema';
import { kitColorName } from '@/domain/colors';
import { useActiveTeam } from '@/hooks/useActiveTeam';
import { useLiveData } from '@/hooks/useLiveData';

export default function TeamsScreen() {
  const summaries = useLiveData(() => teamSummariesQuery().all(), [], [teams, players]);
  const { team: activeTeam, setActiveTeamId } = useActiveTeam();
  const [creating, setCreating] = useState(false);

  function openRoster(team: TeamSummary) {
    setActiveTeamId(team.id);
    router.push({ pathname: '/teams/[teamId]', params: { teamId: String(team.id) } });
  }

  return (
    <View className="flex-1 bg-gray-50">
      <Stack.Screen
        options={{
          headerRight: () => (
            <IconButton icon="add" label="New team" onPress={() => setCreating(true)} />
          ),
        }}
      />

      <FlatList
        data={summaries}
        keyExtractor={(t) => String(t.id)}
        contentContainerClassName="gap-3 p-4 grow"
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="No teams yet"
            message="Create your first team, then add its players."
            action={<Button label="Create a team" icon="add" onPress={() => setCreating(true)} />}
          />
        }
        renderItem={({ item }) => (
          <TeamCard
            team={item}
            isActive={item.id === activeTeam?.id}
            onPress={() => openRoster(item)}
          />
        )}
      />

      {/* Editing and deleting a team live on its roster screen. */}
      <TeamFormSheet
        visible={creating}
        onClose={() => setCreating(false)}
        onSaved={(saved) => setActiveTeamId(saved.id)}
      />
    </View>
  );
}

type TeamCardProps = {
  team: TeamSummary;
  isActive: boolean;
  onPress: () => void;
};

function TeamCard({ team, isActive, onPress }: TeamCardProps) {
  const playerLabel = team.activePlayerCount === 1 ? 'player' : 'players';
  const kits = [
    team.homeColor && `home kit ${kitColorName(team.homeColor)}`,
    team.awayColor && `away kit ${kitColorName(team.awayColor)}`,
  ].filter(Boolean);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${team.name}${isActive ? ', active team' : ''}, ${team.fieldSize} v ${team.fieldSize}, ${team.activePlayerCount} ${playerLabel}${kits.length ? `, ${kits.join(', ')}` : ''}`}
      accessibilityHint="Opens the roster and makes this the active team"
      onPress={onPress}
      className={`gap-1 rounded-2xl border bg-white px-4 py-4 active:bg-gray-50 ${isActive ? 'border-brand' : 'border-gray-200'}`}
    >
      <View className="flex-row items-center gap-2">
        <Text numberOfLines={1} className="shrink text-lg font-bold text-gray-900">
          {team.name}
        </Text>
        {isActive && (
          <View className="rounded-full bg-green-100 px-2 py-0.5">
            <Text className="text-xs font-semibold text-pitch-dark">Active</Text>
          </View>
        )}
      </View>
      <View className="flex-row items-center gap-2">
        {(team.homeColor || team.awayColor) && (
          <View className="flex-row gap-1">
            {team.homeColor && <ColorSwatch color={team.homeColor} size={14} />}
            {team.awayColor && <ColorSwatch color={team.awayColor} size={14} />}
          </View>
        )}
        <Text className="text-sm text-gray-500">
          {team.fieldSize}v{team.fieldSize} · {team.activePlayerCount} {playerLabel}
        </Text>
      </View>
    </Pressable>
  );
}
