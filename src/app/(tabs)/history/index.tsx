import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, ScrollView, Text, View } from 'react-native';

import { MatchResultRow } from '@/components/history/MatchResultRow';
import { SeasonRecordCard, SeasonTable } from '@/components/history/SeasonTable';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { teamHistory, type TeamHistory } from '@/db/repositories/history';
import { playersQuery } from '@/db/repositories/players';
import { matchEvents, matches, matchPeriods, players } from '@/db/schema';
import {
  nextSeasonSort,
  seasonTable,
  sortSeasonTable,
  type SeasonTableSort,
  type SortDirection,
} from '@/domain/history';
import { matchKitColor } from '@/domain/matchSetup';
import { sortRoster } from '@/domain/roster';
import { seasonStats } from '@/domain/stats';
import { useActiveTeam } from '@/hooks/useActiveTeam';
import { useLiveData } from '@/hooks/useLiveData';

type Tab = 'matches' | 'season';

const NO_HISTORY: TeamHistory = { results: [], season: [] };

const TABS = [
  { label: 'Matches', value: 'matches' },
  { label: 'Season', value: 'season' },
] as const;

export default function HistoryScreen() {
  const { team } = useActiveTeam();
  const teamId = team?.id ?? null;
  const [tab, setTab] = useState<Tab>('matches');
  const [sort, setSort] = useState<{ key: SeasonTableSort; direction: SortDirection }>({
    key: 'playingTimeMs',
    direction: 'desc',
  });

  const { results, season } = useLiveData(
    () => (teamId === null ? NO_HISTORY : teamHistory(teamId)),
    [teamId],
    [matches, matchEvents, matchPeriods],
  );
  // Inactive players too: their season still counts.
  const roster = useLiveData(
    () => (teamId === null ? [] : playersQuery(teamId).all()),
    [teamId],
    [players],
  );
  const stats = useMemo(() => seasonStats(season), [season]);
  const rows = useMemo(
    () =>
      sortSeasonTable(
        seasonTable(sortRoster(roster, 'number'), stats.players),
        sort.key,
        sort.direction,
      ),
    [roster, stats, sort],
  );

  if (!team) {
    return (
      <EmptyState
        icon="time-outline"
        title="No team yet"
        message="Create a team and play some matches. Results and season stats show up here."
        action={
          <Button label="Go to Teams" icon="people" onPress={() => router.navigate('/teams')} />
        }
      />
    );
  }

  if (results.length === 0) {
    return (
      <View className="flex-1 bg-gray-50">
        <EmptyState
          icon="time-outline"
          title="No finished matches"
          message={`When ${team.name} finish a match, the result, match log, minutes played and season stats show up here.`}
          action={
            <Button
              label="Go to Game Day"
              icon="stopwatch"
              onPress={() => router.navigate('/game')}
            />
          }
        />
      </View>
    );
  }

  const tabs = (
    <SegmentedControl label="Show" hideLabel options={TABS} value={tab} onChange={setTab} />
  );

  if (tab === 'season') {
    return (
      <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="gap-3 p-4 pb-8">
        {tabs}
        <SeasonRecordCard record={stats.record} />
        <SeasonTable
          rows={rows}
          sort={sort}
          onSort={(key) => setSort((current) => nextSeasonSort(current, key))}
        />
        <Text className="px-1 text-sm text-gray-500">
          Apps: matches played in. St: starts. Min: minutes on the pitch. Tap a column to sort.
        </Text>
      </ScrollView>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <FlatList
        data={results}
        keyExtractor={(item) => String(item.match.id)}
        contentContainerClassName="gap-3 p-4 pb-8"
        ListHeaderComponent={tabs}
        renderItem={({ item }) => (
          <MatchResultRow
            item={item}
            kitColor={matchKitColor(team, item.match.isHome)}
            onPress={() =>
              router.push({
                pathname: '/history/[matchId]',
                params: { matchId: String(item.match.id) },
              })
            }
          />
        )}
      />
    </View>
  );
}
