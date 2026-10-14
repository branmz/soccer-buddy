import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { LiveMatchCard } from '@/components/game/LiveMatchCard';
import { NewMatchSheet } from '@/components/game/NewMatchSheet';
import { SeasonSnapshot } from '@/components/game/SeasonSnapshot';
import { MatchResultRow } from '@/components/history/MatchResultRow';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { eventsQuery } from '@/db/repositories/events';
import { NO_HISTORY, teamHistory } from '@/db/repositories/history';
import { liveMatchQuery, matchesQuery } from '@/db/repositories/matches';
import { playersQuery } from '@/db/repositories/players';
import { getTeam } from '@/db/repositories/teams';
import { matchEvents, matches, matchPeriods, players, teams, type Match } from '@/db/schema';
import { matchKitColor } from '@/domain/matchSetup';
import { distinctNames } from '@/domain/roster';
import { playerMatchStats, seasonStats, topScorers } from '@/domain/stats';
import { useActiveTeam } from '@/hooks/useActiveTeam';
import { useLiveData } from '@/hooks/useLiveData';

/** How many recent results the form strip shows. */
const FORM_LENGTH = 5;

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
  // The season snapshot fills the page between matches (and the space under the live card).
  const { results, season } = useLiveData(
    () => (teamId === null ? NO_HISTORY : teamHistory(teamId)),
    [teamId],
    [matches, matchEvents, matchPeriods],
  );
  const last = results.at(0);
  const lastId = last?.match.id ?? null;
  const lastEvents = useLiveData(
    () => (lastId === null ? [] : eventsQuery(lastId).all()),
    [lastId],
    [matchEvents],
  );
  // Inactive players too: their goals still count.
  const roster = useLiveData(
    () => (teamId === null ? [] : playersQuery(teamId).all()),
    [teamId],
    [players],
  );
  const snapshot = useMemo(() => {
    const names = distinctNames(roster);
    const nameOf = (id: number) => names.get(id) ?? 'Unknown';
    const stats = seasonStats(season);
    const lastScorers = topScorers(playerMatchStats(lastEvents));
    const seasonScorers = topScorers(stats.players, 3);
    return {
      record: stats.record,
      form: results.slice(0, FORM_LENGTH).map((r) => r.result),
      // "Maui 2, Diego": one goal needs no count in a single match.
      lastScorers:
        lastScorers.length === 0
          ? undefined
          : lastScorers
              .map((s) => (s.goals > 1 ? `${nameOf(s.playerId)} ${s.goals}` : nameOf(s.playerId)))
              .join(', '),
      topScorers:
        seasonScorers.length === 0
          ? null
          : seasonScorers.map((s) => `${nameOf(s.playerId)} ${s.goals}`).join(' · '),
    };
  }, [roster, lastEvents, season, results]);
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
  if (!live && drafts.length === 0 && !last) {
    return (
      <View className="flex-1 bg-canvas">
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
    <View className="flex-1 bg-canvas">
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
              <Text className="pt-3 text-sm font-semibold text-ink-muted uppercase">
                Not kicked off yet · {drafts.length}
              </Text>
            )}
          </View>
        }
        ListFooterComponent={
          last && (
            <View className="gap-3">
              <Text className="pt-3 text-sm font-semibold text-ink-muted uppercase">
                Last result
              </Text>
              <MatchResultRow
                item={last}
                kitColor={matchKitColor(team, last.match.isHome)}
                scorers={snapshot.lastScorers}
                onPress={() =>
                  router.navigate(
                    { pathname: '/history/[matchId]', params: { matchId: String(last.match.id) } },
                    { withAnchor: true },
                  )
                }
              />
              <Text className="pt-3 text-sm font-semibold text-ink-muted uppercase">Season</Text>
              <SeasonSnapshot
                record={snapshot.record}
                form={snapshot.form}
                topScorers={snapshot.topScorers}
              />
              <Button
                label="See all in History"
                icon="time-outline"
                variant="secondary"
                onPress={() => router.navigate('/history')}
              />
            </View>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => openSetup(item)}
            className="min-h-16 flex-row items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 active:bg-canvas"
          >
            <View className="flex-1 gap-0.5">
              <Text numberOfLines={1} className="text-lg font-bold text-ink">
                vs {item.opponentName}
              </Text>
              <Text className="text-sm text-ink-muted">
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
