import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { ColorSwatch } from '@/components/teams/ColorSwatch';
import { JerseyBadge } from '@/components/teams/JerseyBadge';
import { Button } from '@/components/ui/Button';
import type { Player } from '@/db/schema';
import { matchResult, type MatchResult, type PlayerMatchStats, type Score } from '@/domain/stats';
import { capitalizeWords } from '@/domain/text';
import type { TimelineEntry } from '@/domain/timeline';

import { EventTimeline } from './EventTimeline';
import { RefereeCardIcon } from './RefereeCardIcon';

type FinishedSummaryProps = {
  teamName: string;
  opponentName: string;
  score: Score;
  /** A line under the score, e.g. the date and venue. */
  subtitle?: string;
  /** A kit-color dot after the subtitle (the kit worn), or null for none. */
  subtitleKitColor?: string | null;
  insetTop: number;
  /** Shows a Done button at the bottom (the live screen at full time). */
  done?: { onPress: () => void; insetBottom: number };
  /** The cards below the score, in order (`SummaryCard`, `MinutesPlayedCard`). */
  children: ReactNode;
};

const RESULT_LABEL: Record<MatchResult, string> = { win: 'Win', draw: 'Draw', loss: 'Loss' };

/** A finished match: the score on top, then the cards it's given. */
export function FinishedSummary({
  teamName,
  opponentName,
  score,
  subtitle,
  subtitleKitColor = null,
  insetTop,
  done,
  children,
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
        {subtitle && (
          <View className="flex-row items-center gap-1.5">
            <Text className="text-sm text-green-100">{subtitle}</Text>
            {subtitleKitColor && (
              // A white ring keeps dark kits visible on the green header.
              <View className="rounded-full bg-white p-0.5">
                <ColorSwatch color={subtitleKitColor} size={14} />
              </View>
            )}
          </View>
        )}
      </View>
      <ScrollView contentContainerClassName={`gap-4 p-4 ${done ? '' : 'pb-8'}`}>
        {children}
      </ScrollView>
      {done && (
        <View
          className="border-t border-gray-200 bg-white px-4 pt-3"
          style={{ paddingBottom: Math.max(done.insetBottom, 12) }}
        >
          <Button label="Done" icon="checkmark" onPress={done.onPress} className="min-h-14" />
        </View>
      )}
    </View>
  );
}

/** A white card with a heading, for the summary's sections. */
export function SummaryCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-1 rounded-2xl border border-gray-200 bg-white p-4">
      <Text accessibilityRole="header" className="pb-1 text-lg font-bold text-gray-900">
        {capitalizeWords(title)}
      </Text>
      {children}
    </View>
  );
}

/** A section of the match log (the whole log, or only the key moments). */
export function TimelineCard({
  title,
  entries,
  emptyText,
}: {
  title: string;
  entries: TimelineEntry[];
  emptyText?: string;
}) {
  return (
    <SummaryCard title={title}>
      <EventTimeline entries={entries} emptyText={emptyText} />
    </SummaryCard>
  );
}

type MinutesPlayedCardProps = {
  /** Everyone who played, most minutes first. */
  minutes: { player: Player; minutes: number }[];
  /** Goals, assists and cards per player. */
  stats: ReadonlyMap<number, PlayerMatchStats>;
  kitColor: string | null;
};

export function MinutesPlayedCard({ minutes, stats, kitColor }: MinutesPlayedCardProps) {
  return (
    <SummaryCard title="Minutes played">
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
          <StatMarks stats={stats.get(player.id)} />
          <Text
            className="w-10 text-right text-base font-bold text-gray-900"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {played}&apos;
          </Text>
        </View>
      ))}
    </SummaryCard>
  );
}

/** Goals, assists and cards as small icons, with a count when more than one. */
function StatMarks({ stats }: { stats: PlayerMatchStats | undefined }) {
  if (!stats) return null;
  const marks: { key: string; count: number; icon: ReactNode; label: string }[] = [
    {
      key: 'goals',
      count: stats.goals,
      icon: <Ionicons name="football" size={18} color="#111827" />,
      label: 'goal',
    },
    {
      key: 'assists',
      count: stats.assists,
      icon: <MaterialCommunityIcons name="shoe-cleat" size={18} color="#111827" />,
      label: 'assist',
    },
    {
      key: 'yellow',
      count: stats.yellowCards,
      icon: <RefereeCardIcon color="yellow" size={18} />,
      label: 'yellow card',
    },
    {
      key: 'red',
      count: stats.redCards,
      icon: <RefereeCardIcon color="red" size={18} />,
      label: 'red card',
    },
  ];
  const shown = marks.filter((m) => m.count > 0);
  if (shown.length === 0) return null;
  return (
    <View
      accessibilityLabel={shown
        .map((m) => `${m.count} ${m.label}${m.count > 1 ? 's' : ''}`)
        .join(', ')}
      className="flex-row items-center gap-2"
    >
      {shown.map((m) => (
        <View key={m.key} className="flex-row items-center">
          {m.icon}
          {m.count > 1 && <Text className="text-sm font-bold text-gray-700">×{m.count}</Text>}
        </View>
      ))}
    </View>
  );
}
