import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Text, View } from 'react-native';

import { COLORS } from '@/constants/colors';
import { ICON } from '@/constants/icons';
import type { TimelineEntry, TimelineKind } from '@/domain/timeline';

import { RefereeCardIcon } from './RefereeCardIcon';

type IconName = ComponentProps<typeof Ionicons>['name'];

const KIND_ICON: Record<
  Exclude<TimelineKind, 'yellow' | 'red'>,
  { name: IconName; color: string }
> = {
  goal: { name: 'football', color: COLORS.brand },
  opponentGoal: { name: 'football-outline', color: COLORS.inkMuted },
  sub: { name: 'swap-vertical', color: COLORS.brandStrong },
  swap: { name: 'shuffle', color: COLORS.inkMuted },
  arrival: { name: 'person-add', color: COLORS.brandStrong },
};

/** The match log, newest first. */
export function EventTimeline({
  entries,
  emptyText = 'Nothing recorded yet.',
}: {
  entries: TimelineEntry[];
  emptyText?: string;
}) {
  if (entries.length === 0) {
    return <Text className="text-body text-ink-muted">{emptyText}</Text>;
  }
  return (
    <View>
      {entries.map((entry) => (
        <View
          key={entry.key}
          accessible
          className="min-h-12 flex-row items-center gap-3 border-b border-muted py-2"
        >
          <Text
            className="w-14 text-right text-label font-bold text-ink-muted"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {entry.minute}
          </Text>
          {entry.kind === 'yellow' || entry.kind === 'red' ? (
            <RefereeCardIcon color={entry.kind} size={ICON.lg} />
          ) : (
            <Ionicons
              name={KIND_ICON[entry.kind].name}
              size={ICON.lg}
              color={KIND_ICON[entry.kind].color}
            />
          )}
          <Text className="flex-1 text-body text-ink">{entry.text}</Text>
        </View>
      ))}
    </View>
  );
}
