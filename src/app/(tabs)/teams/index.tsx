import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { TeamCardBody, teamCardLabel } from '@/components/teams/TeamCard';
import { TeamFormSheet } from '@/components/teams/TeamFormSheet';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { HeaderButton } from '@/components/ui/HeaderButton';
import { ReorderList } from '@/components/ui/ReorderList';
import { ValidationError } from '@/db/repositories/errors';
import { setTeamOrder, teamSummariesQuery, type TeamSummary } from '@/db/repositories/teams';
import { players, teams } from '@/db/schema';
import { useActiveTeam } from '@/hooks/useActiveTeam';
import { useLiveData } from '@/hooks/useLiveData';
import { rejectHaptic } from '@/lib/haptics';

export default function TeamsScreen() {
  const summaries = useLiveData(() => teamSummariesQuery().all(), [], [teams, players]);
  const { team: activeTeam, setActiveTeamId } = useActiveTeam();
  const [creating, setCreating] = useState(false);

  function openRoster(team: TeamSummary) {
    setActiveTeamId(team.id);
    router.push({ pathname: '/teams/[teamId]', params: { teamId: String(team.id) } });
  }

  function saveOrder(ids: number[]): boolean {
    try {
      setTeamOrder(ids);
      return true;
    } catch (e) {
      // A team was added or deleted meanwhile: the list shows the saved order again.
      if (!(e instanceof ValidationError)) throw e;
      rejectHaptic();
      return false;
    }
  }

  const isActive = (team: TeamSummary) => team.id === activeTeam?.id;

  return (
    <View className="flex-1 bg-gray-50">
      <Stack.Screen
        options={{
          headerRight: () => (
            <HeaderButton
              label="New team"
              icon="add"
              variant="primary"
              onPress={() => setCreating(true)}
            />
          ),
        }}
      />

      {summaries.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="No teams yet"
          message="Create your first team, then add its players."
          action={<Button label="Create a team" icon="add" onPress={() => setCreating(true)} />}
        />
      ) : (
        // Teams can be dragged by their handles at any time; tapping one opens its roster.
        <ReorderList
          items={summaries}
          name={(team) => team.name}
          accessibilityLabel={(team) => teamCardLabel(team, isActive(team))}
          renderBody={(team) => <TeamCardBody team={team} isActive={isActive(team)} />}
          borderClass={(team) => (isActive(team) ? 'border-brand' : 'border-gray-200')}
          onOpen={openRoster}
          onReorder={saveOrder}
        />
      )}

      {/* Editing and deleting a team live on its roster screen. */}
      <TeamFormSheet
        visible={creating}
        onClose={() => setCreating(false)}
        onSaved={(saved) => setActiveTeamId(saved.id)}
      />
    </View>
  );
}
