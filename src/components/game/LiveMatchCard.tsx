import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';

import { KitShirt } from '@/components/teams/KitShirt';
import { eventsQuery } from '@/db/repositories/events';
import { matchPeriodsQuery } from '@/db/repositories/matches';
import { matchEvents, matchPeriods, type Match } from '@/db/schema';
import { breakName, periodName } from '@/domain/clock';
import { kitColorName } from '@/domain/colors';
import { matchScore } from '@/domain/stats';
import { useLiveData } from '@/hooks/useLiveData';
import { useMatchClock } from '@/hooks/useMatchClock';

const MS_PER_MINUTE = 60_000;

/**
 * The card's colors, like the live clock bar: dark green, amber while paused. Not the kit
 * color (a red kit made the card read as an error banner): the kit is a shirt by the team
 * name. Both states set every value (removing a class leaves a ghost on Android).
 */
const CARD = {
  running: {
    box: 'bg-pitch-dark',
    soft: 'text-green-100',
    strong: 'text-white',
    pill: 'bg-white',
    pillText: 'text-pitch-dark',
    pillIcon: '#1b5e20',
  },
  paused: {
    box: 'bg-amber-400',
    soft: 'text-gray-800',
    strong: 'text-gray-950',
    pill: 'bg-gray-950',
    pillText: 'text-amber-300',
    pillIcon: '#fcd34d',
  },
} as const;

type LiveMatchCardProps = {
  match: Match;
  teamName: string;
  /** The kit worn in this match (home, or away for away games), or null for none. */
  kitColor: string | null;
  onPress: () => void;
};

/**
 * The live match on the Game Day list: score, clock and period (or the break), so the coach can
 * see the game from here. Only this card ticks, not the whole list.
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
  const card = clock.isPaused ? CARD.paused : CARD.running;
  const kit = kitColor ? `, wearing the ${kitColorName(kitColor)} kit` : '';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Live match against ${match.opponentName}: ${teamName} ${score.us}, ${
        match.opponentName
      } ${score.them}${kit}. ${onBreak ? status : `${status}, ${clock.display}`}${
        clock.isPaused ? ', clock paused' : ''
      }. Open match`}
      onPress={onPress}
      className={`gap-3 rounded-2xl p-4 opacity-100 active:opacity-85 ${card.box}`}
    >
      <View className="flex-row items-center gap-2">
        {/* A white ring keeps the red "live" dot crisp on the dark green and the amber card. */}
        <View className="h-3.5 w-3.5 rounded-full border-2 border-white bg-red-500" />
        <Text className={`flex-1 text-sm font-semibold uppercase ${card.soft}`}>Live now</Text>
        <Text className={`text-base font-semibold ${card.soft}`}>{status}</Text>
        {!onBreak && (
          <Text
            className={`text-xl font-black ${card.strong}`}
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {clock.display}
          </Text>
        )}
        {clock.isPaused && (
          <Text className="rounded bg-gray-900 px-1.5 text-sm font-bold text-amber-300">
            PAUSED
          </Text>
        )}
      </View>
      <View className="flex-row items-center gap-3">
        <View className="flex-1 flex-row items-center gap-3">
          {kitColor && <KitShirt color={kitColor} size={16} />}
          <Text numberOfLines={1} className={`shrink text-lg font-semibold ${card.soft}`}>
            {teamName}
          </Text>
          <Text className={`text-3xl font-black ${card.strong}`}>
            {score.us} – {score.them}
          </Text>
          <Text numberOfLines={1} className={`shrink text-lg font-semibold ${card.soft}`}>
            {match.opponentName}
          </Text>
        </View>
        {/* Inverted against the card, so it stands out in both states. */}
        <View className={`min-h-11 flex-row items-center gap-1.5 rounded-full px-4 ${card.pill}`}>
          <Text className={`text-lg font-semibold ${card.pillText}`}>Open Match</Text>
          <Ionicons name="arrow-forward" size={18} color={card.pillIcon} />
        </View>
      </View>
    </Pressable>
  );
}
