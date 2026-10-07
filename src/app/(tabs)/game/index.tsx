import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { LiveMatchCard } from '@/components/game/LiveMatchCard';
import { NewMatchSheet } from '@/components/game/NewMatchSheet';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { liveMatchQuery, matchesQuery } from '@/db/repositories/matches';
import { getTeam } from '@/db/repositories/teams';
import { matches, teams, type Match } from '@/db/schema';
import { matchKitColor } from '@/domain/matchSetup';
import { useActiveTeam } from '@/hooks/useActiveTeam';
import { useLiveData } from '@/hooks/useLiveData';

function openLive(match: Match) {
  router.push({ pathname: '/live/[matchId]', params: { matchId: String(match.id) } });
}

function openSetup(match: Match) {
  router.push({ pathname: '/game/[matchId]', params: { matchId: String(match.id) } });
}

export default function GameDayScreen() {
  const { team } = useActiveTeam();
  const teamId = team?.id ?? null;
  const live = useLiveData(() => liveMatchQuery().get(), [], [matches]);
  // The live match may belong to another team than the active one.
  const liveTeamId = live?.teamId ?? null;
  const liveTeam = useLiveData(
    () => (liveTeamId === null ? undefined : getTeam(liveTeamId)),
    [liveTeamId],
    [teams],
  );
  const drafts = useLiveData(
    () => (teamId === null ? [] : matchesQuery(teamId, 'setup').all()),
    [teamId],
    [matches],
  );
  const [newOpen, setNewOpen] = useState(false);

  if (!team) {
    return (
      <EmptyState
        icon="stopwatch-outline"
        title="No team yet"
        message="Create a team and add players, then set up matches here."
        action={
          <Button label="Go to Teams" icon="people" onPress={() => router.navigate('/teams')} />
        }
      />
    );
  }

  const newMatchSheet = (
    <NewMatchSheet
      visible={newOpen}
      teamId={team.id}
      onClose={() => setNewOpen(false)}
      onCreated={(match) => {
        setNewOpen(false);
        openSetup(match);
      }}
    />
  );

  // Nothing to list yet: a centred prompt, like the other tabs' empty states.
  if (!live && drafts.length === 0) {
    return (
      <View className="flex-1 bg-gray-50">
        <EmptyState
          icon="stopwatch-outline"
          title="No matches set up"
          message={`Set up the next match for ${team.name}: opponent, formation, starting lineup and quick subs. Kick off when you're ready.`}
          action={<Button label="New match" icon="add" onPress={() => setNewOpen(true)} />}
        />
        {newMatchSheet}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <FlatList
        data={drafts}
        keyExtractor={(m) => String(m.id)}
        contentContainerClassName="gap-3 p-4 pb-8"
        ListHeaderComponent={
          <View className="gap-3">
            {live && (
              <LiveMatchCard
                match={live}
                teamName={liveTeam?.name ?? 'Us'}
                kitColor={liveTeam ? matchKitColor(liveTeam, live.isHome) : null}
                onPress={() => openLive(live)}
              />
            )}
            <Button label="New match" icon="add" onPress={() => setNewOpen(true)} />
            {drafts.length > 0 && (
              <Text className="pt-3 text-sm font-semibold text-gray-500 uppercase">
                Not kicked off yet · {drafts.length}
              </Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => openSetup(item)}
            className="min-h-16 flex-row items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 active:bg-gray-50"
          >
            <View className="flex-1 gap-0.5">
              <Text numberOfLines={1} className="text-lg font-bold text-gray-900">
                vs {item.opponentName}
              </Text>
              <Text className="text-sm text-gray-500">
                {item.isHome ? 'Home' : 'Away'}
                {item.formationName ? ` · ${item.formationName}` : ''} · {item.periodCount} ×{' '}
                {item.periodLengthMinutes} min
              </Text>
            </View>
          </Pressable>
        )}
      />
      {newMatchSheet}
    </View>
  );
}
