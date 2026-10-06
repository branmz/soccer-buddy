import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useLayoutEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { FormationBoard } from '@/components/pitch/FormationBoard';
import { EmptyState } from '@/components/ui/EmptyState';
import { HeaderButton } from '@/components/ui/HeaderButton';
import { userMessage } from '@/db/repositories/errors';
import { getMatch, matchLineup, setMatchLineup } from '@/db/repositories/matches';
import { playersQuery } from '@/db/repositories/players';
import { getTeam } from '@/db/repositories/teams';
import { matches, players, teams } from '@/db/schema';
import { benchPlayers } from '@/domain/board';
import { lineupPlayerIds, matchKitColor } from '@/domain/matchSetup';
import { useLiveData } from '@/hooks/useLiveData';
import { useBoardStore } from '@/stores/boardStore';

/**
 * The starting lineup for a match in setup, on the same board as the formation editor. Every
 * change is saved straight to the match's draft lineup, so there is nothing to lose on leaving.
 */
export default function MatchLineupScreen() {
  const params = useLocalSearchParams<{ matchId: string }>();
  const matchId = Number(params.matchId);
  const loadKey = `match:${matchId}`;

  // Read once: the board is the working copy while this screen is open.
  const [match] = useState(() => getMatch(matchId));
  const live = useLiveData(() => getMatch(matchId), [matchId], [matches]);
  const team = useLiveData(() => (match ? getTeam(match.teamId) : undefined), [match], [teams]);
  const roster = useLiveData(
    () => (match ? playersQuery(match.teamId, { activeOnly: true }).all() : []),
    [match],
    [players],
  );
  const [lineup] = useState(() => (match ? matchLineup(match) : null));
  const squad = new Set(lineup ? lineupPlayerIds(lineup) : []);
  const squadPlayers = roster.filter((p) => squad.has(p.id));

  const ready = useBoardStore((s) => s.key === loadKey);
  const { load, reset } = useBoardStore.getState();
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (!ready && lineup) load(loadKey, match?.formationName ?? 'Lineup', lineup.slots);
  }, [ready, lineup, load, loadKey, match]);

  useEffect(() => reset, [reset]);

  // Save each change: the bench is everyone in the squad who isn't on the pitch.
  const squadKey = squadPlayers.map((p) => p.id).join(',');
  useEffect(() => {
    const squadIds = squadKey === '' ? [] : squadKey.split(',').map(Number);
    return useBoardStore.subscribe((state, previous) => {
      if (state.key !== loadKey || state.slots === previous.slots) return;
      const bench = benchPlayers(
        squadIds.map((id) => ({ id })),
        state.slots,
      ).map((p) => p.id);
      try {
        setMatchLineup(matchId, { slots: state.slots, bench });
        state.markSaved(loadKey);
        setError(null);
      } catch (e) {
        setError(userMessage(e));
      }
    });
  }, [loadKey, matchId, squadKey]);

  if (!match || !team || !lineup || live?.status !== 'setup') {
    return (
      <EmptyState
        icon="alert-circle-outline"
        title="Lineup can't be changed"
        message="This match has kicked off or no longer exists."
      />
    );
  }

  return (
    <View className="flex-1 bg-gray-100">
      <Stack.Screen
        options={{
          title: `Lineup vs ${match.opponentName}`,
          headerRight: () => (
            <HeaderButton label="Done" icon="checkmark" variant="primary" onPress={router.back} />
          ),
        }}
      />
      {error && (
        <Text accessibilityLiveRegion="polite" className="bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </Text>
      )}
      {ready && (
        <FormationBoard roster={squadPlayers} kitColor={matchKitColor(team, live.isHome)} />
      )}
    </View>
  );
}
