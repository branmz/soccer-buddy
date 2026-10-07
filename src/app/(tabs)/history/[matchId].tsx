import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import {
  FinishedSummary,
  MinutesPlayedCard,
  TimelineCard,
} from '@/components/game/FinishedSummary';
import { formatMatchDate } from '@/components/history/formatMatchDate';
import { Button } from '@/components/ui/Button';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { eventsQuery } from '@/db/repositories/events';
import {
  deleteMatch,
  getMatch,
  matchLineup,
  matchLiveLayout,
  matchPeriodsQuery,
} from '@/db/repositories/matches';
import { playersQuery } from '@/db/repositories/players';
import { getTeam } from '@/db/repositories/teams';
import { matchEvents, matches, matchPeriods, players, teams } from '@/db/schema';
import { finalGameMs, minutesPlayed } from '@/domain/history';
import { deriveLineup } from '@/domain/lineup';
import { applyLiveLayout } from '@/domain/liveLayout';
import { matchKitColor } from '@/domain/matchSetup';
import { matchScore, playerMatchStats } from '@/domain/stats';
import { keyMoments, timelineEntries } from '@/domain/timeline';
import { useLiveData } from '@/hooks/useLiveData';

const MS_PER_MINUTE = 60_000;

export default function MatchDetailScreen() {
  const params = useLocalSearchParams<{ matchId: string }>();
  const matchId = Number(params.matchId);
  const match = useLiveData(() => getMatch(matchId), [matchId], [matches]);
  const teamId = match?.teamId ?? null;
  const team = useLiveData(
    () => (teamId === null ? undefined : getTeam(teamId)),
    [teamId],
    [teams],
  );
  // Inactive players too: someone deactivated since can still be in this match.
  const roster = useLiveData(
    () => (teamId === null ? [] : playersQuery(teamId).all()),
    [teamId],
    [players],
  );
  const events = useLiveData(() => eventsQuery(matchId).all(), [matchId], [matchEvents]);
  const periods = useLiveData(() => matchPeriodsQuery(matchId).all(), [matchId], [matchPeriods]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const starting = useMemo(() => (match ? matchLineup(match) : null), [match]);
  const playersById = useMemo(() => new Map(roster.map((p) => [p.id, p])), [roster]);
  const stats = useMemo(() => playerMatchStats(events), [events]);
  const entries = useMemo(() => {
    if (!match || !starting) return [];
    // Position names as they were at full time (after any mid-match switch or relabel).
    const lineup = applyLiveLayout(
      deriveLineup(starting, events),
      matchLiveLayout(match)?.slots ?? null,
    );
    return timelineEntries(events, match.periodLengthMinutes * MS_PER_MINUTE, {
      player: (id) => playersById.get(id)?.name ?? 'Unknown',
      slot: (slotId) => lineup.slots.find((s) => s.slotId === slotId)?.label ?? slotId,
    });
  }, [match, starting, events, playersById]);
  const minutes = useMemo(
    () =>
      starting
        ? minutesPlayed(starting, events, finalGameMs(periods)).flatMap(
            ({ playerId, minutes: played }) => {
              const player = playersById.get(playerId);
              return player ? [{ player, minutes: played }] : [];
            },
          )
        : [],
    [starting, events, periods, playersById],
  );

  // Deleted from here: keep the screen blank while it slides away.
  if (deleted) return <View className="flex-1 bg-gray-50" />;

  if (!match || !team || match.status !== 'finished' || !starting) {
    return (
      <EmptyState
        icon="alert-circle-outline"
        title="Match not found"
        message="It may have been deleted."
        action={<Button label="Back to History" onPress={() => router.navigate('/history')} />}
      />
    );
  }

  const kitColor = matchKitColor(team, match.isHome);

  function confirmDelete() {
    setDeleteOpen(false);
    deleteMatch(matchId);
    setDeleted(true);
    router.back();
  }

  return (
    <View className="flex-1">
      <Stack.Screen
        options={{
          title: `vs ${match.opponentName}`,
          headerRight: () => (
            <IconButton
              icon="trash-outline"
              label="Delete match"
              color="#dc2626"
              onPress={() => setDeleteOpen(true)}
            />
          ),
        }}
      />
      <FinishedSummary
        teamName={team.name}
        opponentName={match.opponentName}
        score={matchScore(events)}
        subtitle={[
          formatMatchDate(match.startedAt ?? match.createdAt),
          match.isHome ? 'Home' : 'Away',
        ].join(' · ')}
        subtitleKitColor={kitColor}
        insetTop={0}
      >
        <TimelineCard
          title="Key moments"
          entries={keyMoments(entries)}
          emptyText="No goals or red cards."
        />
        <TimelineCard title="Match log" entries={entries} />
        <MinutesPlayedCard minutes={minutes} stats={stats} kitColor={kitColor} />
      </FinishedSummary>
      <ConfirmSheet
        visible={deleteOpen}
        title="Delete this match?"
        message={`The match against ${match.opponentName}, its log and its minutes are removed for good, and it no longer counts in season stats.`}
        confirmLabel="Delete match"
        onConfirm={confirmDelete}
        onClose={() => setDeleteOpen(false)}
      />
    </View>
  );
}
