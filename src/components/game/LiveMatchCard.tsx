import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';

import { eventsQuery } from '@/db/repositories/events';
import { matchPeriodsQuery } from '@/db/repositories/matches';
import { matchEvents, matchPeriods, type Match } from '@/db/schema';
import { breakName, periodName } from '@/domain/clock';
import { needsOutline, readableTextColor, withAlpha } from '@/domain/colors';
import { matchScore } from '@/domain/stats';
import { useLiveData } from '@/hooks/useLiveData';
import { useMatchClock } from '@/hooks/useMatchClock';

const MS_PER_MINUTE = 60_000;
/** Used when the team has no kit colors (the app's dark pitch green). */
const DEFAULT_CARD = '#1b5e20';

type LiveMatchCardProps = {
  match: Match;
  teamName: string;
  /** The kit worn in this match (home, or away for away games), or null for none. */
  kitColor: string | null;
  onPress: () => void;
};

/**
 * The live match on the Game Day list, in the team's kit color: score, clock and period (or
 * the break), so the coach can see the game from here. Only this card ticks, not the whole list.
 */
export function LiveMatchCard({ match, teamName, kitColor, onPress }: LiveMatchCardProps) {
  const periods = useLiveData(() => matchPeriodsQuery(match.id).all(), [match.id], [matchPeriods]);
  const events = useLiveData(() => eventsQuery(match.id).all(), [match.id], [matchEvents]);
  const { clock } = useMatchClock(periods, match.periodLengthMinutes * MS_PER_MINUTE);
  const score = matchScore(events);

  const onBreak = clock.phase === 'periodEnded';
  const status = onBreak
    ? breakName(clock.currentPeriod, match.periodCount)
    : periodName(clock.currentPeriod, match.periodCount);

  // Kit colors are user data, so the card's colors are inline styles.
  const background = kitColor ?? DEFAULT_CARD;
  const text = readableTextColor(background);
  const softText = withAlpha(text, 0.8);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Live match against ${match.opponentName}: ${teamName} ${score.us}, ${
        match.opponentName
      } ${score.them}. ${onBreak ? status : `${status}, ${clock.display}`}${
        clock.isPaused ? ', clock paused' : ''
      }. Open match`}
      onPress={onPress}
      className={`gap-3 rounded-2xl p-4 opacity-100 active:opacity-85 ${
        needsOutline(background) ? 'border border-gray-300' : 'border border-transparent'
      }`}
      style={{ backgroundColor: background }}
    >
      <View className="flex-row items-center gap-2">
        {/* A white ring keeps the red dot visible on a red kit. */}
        <View className="h-3.5 w-3.5 rounded-full border-2 border-white bg-red-500" />
        <Text className="flex-1 text-sm font-semibold uppercase" style={{ color: softText }}>
          Live now
        </Text>
        <Text className="text-base font-semibold" style={{ color: softText }}>
          {status}
        </Text>
        {!onBreak && (
          <Text
            className="text-xl font-black"
            style={{ color: text, fontVariant: ['tabular-nums'] }}
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
          <Text
            numberOfLines={1}
            className="shrink text-lg font-semibold"
            style={{ color: softText }}
          >
            {teamName}
          </Text>
          <Text className="text-3xl font-black" style={{ color: text }}>
            {score.us} – {score.them}
          </Text>
          <Text
            numberOfLines={1}
            className="shrink text-lg font-semibold"
            style={{ color: softText }}
          >
            {match.opponentName}
          </Text>
        </View>
        {/* The opposite of the card's color, so it stands out on any kit. */}
        <View
          className="min-h-11 flex-row items-center gap-1.5 rounded-full px-4"
          style={{ backgroundColor: text }}
        >
          <Text className="text-lg font-semibold" style={{ color: background }}>
            Open Match
          </Text>
          <Ionicons name="arrow-forward" size={18} color={background} />
        </View>
      </View>
    </Pressable>
  );
}
