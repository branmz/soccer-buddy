import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { NewMatchSheet } from '@/components/game/NewMatchSheet';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { liveMatchQuery, matchesQuery } from '@/db/repositories/matches';
import { matches, type Match } from '@/db/schema';
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
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Live match against ${live.opponentName}. Resume`}
                onPress={() => openLive(live)}
                className="flex-row items-center gap-3 rounded-2xl bg-pitch-dark p-4 active:bg-pitch"
              >
                <View className="h-3 w-3 rounded-full bg-red-500" />
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-green-100 uppercase">Live now</Text>
                  <Text numberOfLines={1} className="text-xl font-bold text-white">
                    vs {live.opponentName}
                  </Text>
                </View>
                <View className="min-h-11 flex-row items-center gap-1.5 rounded-full bg-white px-4">
                  <Ionicons name="play" size={18} color="#1b5e20" />
                  <Text className="text-lg font-semibold text-pitch-dark">Resume</Text>
                </View>
              </Pressable>
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
