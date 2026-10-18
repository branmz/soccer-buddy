import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { JerseyBadge } from '@/components/teams/JerseyBadge';
import { KitShirt } from '@/components/teams/KitShirt';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { COLORS } from '@/constants/colors';
import { ICON } from '@/constants/icons';
import type { Player } from '@/db/schema';
import { formatMinutesPlayed } from '@/domain/history';
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
  /** The cards below the score, in order (`TimelineCard`, `MinutesPlayedCard`). */
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
    <View className="flex-1 bg-canvas">
      <View
        className="items-center gap-1 bg-pitch-dark px-4 pb-5"
        style={{ paddingTop: insetTop + 12 }}
      >
        <Text className="text-caption font-semibold text-green-100 uppercase">
          Full time · {result}
        </Text>
        <View className="flex-row items-center gap-3">
          <Text numberOfLines={1} className="shrink text-heading font-semibold text-green-100">
            {teamName}
          </Text>
          <Text className="text-display text-white">
            {score.us} – {score.them}
          </Text>
          <Text numberOfLines={1} className="shrink text-heading font-semibold text-green-100">
            {opponentName}
          </Text>
        </View>
        {subtitle && (
          <View className="flex-row items-center gap-1.5">
            <Text className="text-caption text-green-100">{subtitle}</Text>
            {subtitleKitColor && <KitShirt color={subtitleKitColor} size={14} />}
          </View>
        )}
      </View>
      <ScrollView contentContainerClassName={`gap-4 p-4 ${done ? '' : 'pb-8'}`}>
        {children}
      </ScrollView>
      {done && (
        <View
          className="border-t border-line bg-surface px-4 pt-3"
          style={{ paddingBottom: Math.max(done.insetBottom, 12) }}
        >
          <Button label="Done" icon="checkmark" onPress={done.onPress} className="min-h-touch-lg" />
        </View>
      )}
    </View>
  );
}

/**
 * A section of the match log (the whole log, or only the key moments). `collapsible` starts it
 * closed behind a "Show all" toggle: the full log repeats the key moments above it.
 */
export function TimelineCard({
  title,
  entries,
  emptyText,
  collapsible = false,
}: {
  title: string;
  entries: TimelineEntry[];
  emptyText?: string;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(!collapsible);
  if (!collapsible || entries.length === 0) {
    return (
      <Card title={title} className="gap-1">
        <EventTimeline entries={entries} emptyText={emptyText} />
      </Card>
    );
  }
  return (
    <Card flush className="gap-1 px-4 pt-2 pb-2">
      {/* The title stays a heading (for screen-reader navigation) beside a separate toggle. */}
      <View className="min-h-touch flex-row items-center gap-2">
        <Text accessibilityRole="header" className="flex-1 text-heading text-ink">
          {capitalizeWords(title)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={`${open ? 'Hide' : 'Show'} all ${entries.length} ${
            entries.length === 1 ? 'event' : 'events'
          }`}
          onPress={() => setOpen((o) => !o)}
          className="min-h-touch flex-row items-center gap-1 rounded-full px-2 active:bg-brand-tint"
        >
          <Text className="text-label text-brand-strong">
            {open ? 'Hide' : `Show All ${entries.length}`}
          </Text>
          <Ionicons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={ICON.md}
            color={COLORS.brandStrong}
          />
        </Pressable>
      </View>
      {open && <EventTimeline entries={entries} emptyText={emptyText} />}
    </Card>
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
    <Card title="Minutes played" className="gap-1">
      {minutes.map(({ player, minutes: played }) => (
        <View
          key={player.id}
          accessible
          className="min-h-11 flex-row items-center gap-3 border-b border-muted"
        >
          <JerseyBadge number={player.jerseyNumber} kitColor={kitColor} size={30} />
          <Text numberOfLines={1} className="flex-1 text-body text-ink">
            {player.name}
          </Text>
          <StatMarks stats={stats.get(player.id)} />
          <Text
            className="w-10 text-right text-label font-bold text-ink"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {formatMinutesPlayed(played)}
          </Text>
        </View>
      ))}
    </Card>
  );
}

/** Goals, assists and cards as small icons, with a count when more than one. */
function StatMarks({ stats }: { stats: PlayerMatchStats | undefined }) {
  if (!stats) return null;
  const marks: { key: string; count: number; icon: ReactNode; label: string }[] = [
    {
      key: 'goals',
      count: stats.goals,
      icon: <Ionicons name="football" size={ICON.md} color={COLORS.ink} />,
      label: 'goal',
    },
    {
      key: 'assists',
      count: stats.assists,
      icon: <MaterialCommunityIcons name="shoe-cleat" size={ICON.md} color={COLORS.ink} />,
      label: 'assist',
    },
    {
      key: 'yellow',
      count: stats.yellowCards,
      icon: <RefereeCardIcon color="yellow" size={ICON.md} />,
      label: 'yellow card',
    },
    {
      key: 'red',
      count: stats.redCards,
      icon: <RefereeCardIcon color="red" size={ICON.md} />,
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
          {m.count > 1 && <Text className="text-caption font-bold text-ink-soft">×{m.count}</Text>}
        </View>
      ))}
    </View>
  );
}
