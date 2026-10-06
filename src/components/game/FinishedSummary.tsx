import { ScrollView, Text, View } from 'react-native';

import { JerseyBadge } from '@/components/teams/JerseyBadge';
import { Button } from '@/components/ui/Button';
import type { Player } from '@/db/schema';
import { matchResult, type MatchResult, type Score } from '@/domain/stats';
import type { TimelineEntry } from '@/domain/timeline';

import { EventTimeline } from './EventTimeline';

type FinishedSummaryProps = {
  teamName: string;
  opponentName: string;
  score: Score;
  entries: TimelineEntry[];
  /** Everyone who played, most minutes first. */
  minutes: { player: Player; minutes: number }[];
  kitColor: string | null;
  insetTop: number;
  insetBottom: number;
  onDone: () => void;
};

const RESULT_LABEL: Record<MatchResult, string> = { win: 'Win', draw: 'Draw', loss: 'Loss' };

/** Full time: the score, minutes played and the match log. */
export function FinishedSummary({
  teamName,
  opponentName,
  score,
  entries,
  minutes,
  kitColor,
  insetTop,
  insetBottom,
  onDone,
}: FinishedSummaryProps) {
  const result = RESULT_LABEL[matchResult(score)];
  return (
    <View className="flex-1 bg-gray-50">
      <View
        className="items-center gap-1 bg-pitch-dark px-4 pb-5"
        style={{ paddingTop: insetTop + 12 }}
      >
        <Text className="text-sm font-semibold text-green-100 uppercase">Full time · {result}</Text>
        <View className="flex-row items-center gap-3">
          <Text numberOfLines={1} className="shrink text-lg font-semibold text-green-100">
            {teamName}
          </Text>
          <Text className="text-5xl font-black text-white">
            {score.us} – {score.them}
          </Text>
          <Text numberOfLines={1} className="shrink text-lg font-semibold text-green-100">
            {opponentName}
          </Text>
        </View>
      </View>
      <ScrollView contentContainerClassName="gap-4 p-4">
        <View className="gap-1 rounded-2xl border border-gray-200 bg-white p-4">
          <Text accessibilityRole="header" className="pb-1 text-lg font-bold text-gray-900">
            Minutes played
          </Text>
          {minutes.map(({ player, minutes: played }) => (
            <View
              key={player.id}
              accessible
              className="min-h-11 flex-row items-center gap-3 border-b border-gray-100"
            >
              <JerseyBadge number={player.jerseyNumber} kitColor={kitColor} size={30} />
              <Text numberOfLines={1} className="flex-1 text-base text-gray-900">
                {player.name}
              </Text>
              <Text
                className="text-base font-bold text-gray-900"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {played}&apos;
              </Text>
            </View>
          ))}
        </View>
        <View className="gap-1 rounded-2xl border border-gray-200 bg-white p-4">
          <Text accessibilityRole="header" className="pb-1 text-lg font-bold text-gray-900">
            Match log
          </Text>
          <EventTimeline entries={entries} />
        </View>
      </ScrollView>
      <View
        className="border-t border-gray-200 bg-white px-4 pt-3"
        style={{ paddingBottom: Math.max(insetBottom, 12) }}
      >
        <Button label="Done" icon="checkmark" onPress={onDone} className="min-h-14" />
      </View>
    </View>
  );
}
