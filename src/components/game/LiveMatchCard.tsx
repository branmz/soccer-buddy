import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';

import { eventsQuery } from '@/db/repositories/events';
import { matchPeriodsQuery } from '@/db/repositories/matches';
import { matchEvents, matchPeriods, type Match } from '@/db/schema';
import { breakName, periodName } from '@/domain/clock';
import { matchScore } from '@/domain/stats';
import { useLiveData } from '@/hooks/useLiveData';
import { useMatchClock } from '@/hooks/useMatchClock';

const MS_PER_MINUTE = 60_000;

type LiveMatchCardProps = {
  match: Match;
  teamName: string;
  onPress: () => void;
};

/**
 * The live match on the Game Day list: score, clock and period (or the break), so the coach
 * can see the game from here. Only this card ticks, not the whole list.
 */
export function LiveMatchCard({ match, teamName, onPress }: LiveMatchCardProps) {
  const periods = useLiveData(() => matchPeriodsQuery(match.id).all(), [match.id], [matchPeriods]);
  const events = useLiveData(() => eventsQuery(match.id).all(), [match.id], [matchEvents]);
  const { clock } = useMatchClock(periods, match.periodLengthMinutes * MS_PER_MINUTE);
  const score = matchScore(events);

  const onBreak = clock.phase === 'periodEnded';
  const status = onBreak
    ? breakName(clock.currentPeriod, match.periodCount)
    : periodName(clock.currentPeriod, match.periodCount);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Live match against ${match.opponentName}: ${teamName} ${score.us}, ${
        match.opponentName
      } ${score.them}. ${onBreak ? status : `${status}, ${clock.display}`}${
        clock.isPaused ? ', paused' : ''
      }. Resume`}
      onPress={onPress}
      className="gap-3 rounded-2xl bg-pitch-dark p-4 active:bg-pitch"
    >
      <View className="flex-row items-center gap-2">
        <View className="h-3 w-3 rounded-full bg-red-500" />
        <Text className="flex-1 text-sm font-semibold text-green-100 uppercase">Live now</Text>
        <Text className="text-base font-semibold text-green-100">{status}</Text>
        {!onBreak && (
          <Text
            className={`text-xl font-black ${clock.isStoppage ? 'text-yellow-300' : 'text-white'}`}
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {clock.display}
          </Text>
        )}
        {clock.isPaused && (
          <Text className="rounded bg-amber-400 px-1.5 text-sm font-bold text-gray-900">
            PAUSED
          </Text>
        )}
      </View>
      <View className="flex-row items-center gap-3">
        <View className="flex-1 flex-row items-center gap-3">
          <Text numberOfLines={1} className="shrink text-lg font-semibold text-green-100">
            {teamName}
          </Text>
          <Text className="text-3xl font-black text-white">
            {score.us} – {score.them}
          </Text>
          <Text numberOfLines={1} className="shrink text-lg font-semibold text-green-100">
            {match.opponentName}
          </Text>
        </View>
        <View className="min-h-11 flex-row items-center gap-1.5 rounded-full bg-white px-4">
          <Ionicons name="play" size={18} color="#1b5e20" />
          <Text className="text-lg font-semibold text-pitch-dark">Resume</Text>
        </View>
      </View>
    </Pressable>
  );
}
