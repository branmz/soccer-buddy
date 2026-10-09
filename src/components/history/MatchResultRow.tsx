import { Pressable, Text, View } from 'react-native';

import { ColorSwatch } from '@/components/teams/ColorSwatch';
import type { FinishedMatch } from '@/db/repositories/history';
import type { MatchResult } from '@/domain/stats';

import { formatMatchDate } from './formatMatchDate';

const RESULT_STYLE: Record<MatchResult, { letter: string; label: string; className: string }> = {
  win: { letter: 'W', label: 'Win', className: 'bg-brand' },
  draw: { letter: 'D', label: 'Draw', className: 'bg-gray-400' },
  loss: { letter: 'L', label: 'Loss', className: 'bg-red-600' },
};

type MatchResultRowProps = {
  item: FinishedMatch;
  /** The kit worn (home or away color), or null if the team has no colors. */
  kitColor: string | null;
  onPress: () => void;
};

/** A finished match on the History list: result, opponent, date, kit and score. */
export function MatchResultRow({ item, kitColor, onPress }: MatchResultRowProps) {
  const { match, score, result } = item;
  const style = RESULT_STYLE[result];
  const date = formatMatchDate(match.startedAt ?? match.createdAt);
  const venue = match.isHome ? 'Home' : 'Away';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${style.label} against ${match.opponentName}, ${score.us} to ${score.them}. ${date}, ${venue}`}
      onPress={onPress}
      className="min-h-16 flex-row items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 active:bg-gray-50"
    >
      <View className={`h-9 w-9 items-center justify-center rounded-lg ${style.className}`}>
        <Text className="text-lg font-black text-white">{style.letter}</Text>
      </View>
      <View className="flex-1 gap-0.5">
        <Text numberOfLines={1} className="text-lg font-bold text-gray-900">
          vs {match.opponentName}
        </Text>
        <View className="flex-row items-center gap-1.5">
          <Text numberOfLines={1} className="shrink text-sm text-gray-500">
            {date} · {venue}
          </Text>
          {kitColor && <ColorSwatch color={kitColor} size={14} />}
        </View>
      </View>
      <Text className="text-2xl font-black text-gray-900" style={{ fontVariant: ['tabular-nums'] }}>
        {score.us}–{score.them}
      </Text>
    </Pressable>
  );
}
