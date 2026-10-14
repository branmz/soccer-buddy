import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';

import { KitShirt } from '@/components/teams/KitShirt';
import { COLORS } from '@/constants/colors';
import type { FinishedMatch } from '@/db/repositories/history';
import { kitColorName } from '@/domain/colors';

import { formatMatchDate } from './formatMatchDate';
import { ResultBadge, resultLabel } from './ResultBadge';

type MatchResultRowProps = {
  item: FinishedMatch;
  /** The kit worn (home or away color), or null if the team has no colors. */
  kitColor: string | null;
  /** Who scored, e.g. "Maui 2, Diego" (Game Day's last result); omitted on the History list. */
  scorers?: string;
  onPress: () => void;
};

/** A finished match: result, opponent, date, kit and score. */
export function MatchResultRow({ item, kitColor, scorers, onPress }: MatchResultRowProps) {
  const { match, score, result } = item;
  const date = formatMatchDate(match.startedAt ?? match.createdAt);
  const venue = match.isHome ? 'Home' : 'Away';
  const kit = kitColor ? `, ${kitColorName(kitColor)} kit` : '';
  const scored = scorers ? `. Scorers: ${scorers}` : '';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${resultLabel(result)} against ${match.opponentName}, ${score.us} to ${score.them}. ${date}, ${venue}${kit}${scored}`}
      onPress={onPress}
      className="min-h-16 flex-row items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 active:bg-canvas"
    >
      <ResultBadge result={result} />
      <View className="flex-1 gap-0.5">
        <Text numberOfLines={1} className="text-lg font-bold text-ink">
          vs {match.opponentName}
        </Text>
        <View className="flex-row items-center gap-1.5">
          <Text numberOfLines={1} className="shrink text-sm text-ink-muted">
            {date} · {venue}
          </Text>
          {kitColor && <KitShirt color={kitColor} size={14} />}
        </View>
        {scorers && (
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="football" size={14} color={COLORS.inkSoft} />
            <Text numberOfLines={2} className="shrink text-sm text-ink-soft">
              {scorers}
            </Text>
          </View>
        )}
      </View>
      <Text className="text-2xl font-black text-ink" style={{ fontVariant: ['tabular-nums'] }}>
        {score.us}–{score.them}
      </Text>
    </Pressable>
  );
}
