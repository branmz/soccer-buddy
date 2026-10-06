import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Text, View } from 'react-native';

import type { TimelineEntry, TimelineKind } from '@/domain/timeline';

import { RefereeCardIcon } from './RefereeCardIcon';

type IconName = ComponentProps<typeof Ionicons>['name'];

const KIND_ICON: Record<
  Exclude<TimelineKind, 'yellow' | 'red'>,
  { name: IconName; color: string }
> = {
  goal: { name: 'football', color: '#16a34a' },
  opponentGoal: { name: 'football-outline', color: '#6b7280' },
  sub: { name: 'swap-vertical', color: '#1b5e20' },
  swap: { name: 'shuffle', color: '#6b7280' },
  arrival: { name: 'person-add', color: '#1b5e20' },
};

/** The match log, newest first. */
export function EventTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return <Text className="text-base text-gray-500">Nothing recorded yet.</Text>;
  }
  return (
    <View>
      {entries.map((entry) => (
        <View
          key={entry.key}
          accessible
          className="min-h-12 flex-row items-center gap-3 border-b border-gray-100 py-2"
        >
          <Text
            className="w-14 text-right text-base font-bold text-gray-500"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {entry.minute}
          </Text>
          {entry.kind === 'yellow' || entry.kind === 'red' ? (
            <RefereeCardIcon color={entry.kind} size={22} />
          ) : (
            <Ionicons
              name={KIND_ICON[entry.kind].name}
              size={22}
              color={KIND_ICON[entry.kind].color}
            />
          )}
          <Text className="flex-1 text-base text-gray-900">{entry.text}</Text>
        </View>
      ))}
    </View>
  );
}
