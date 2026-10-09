import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { RefereeCardIcon } from '@/components/game/RefereeCardIcon';
import type { Player } from '@/db/schema';
import type { SeasonRow, SeasonTableSort, SortDirection } from '@/domain/history';
import type { SeasonRecord } from '@/domain/stats';

const MS_PER_MINUTE = 60_000;

type Column = {
  key: Exclude<SeasonTableSort, 'name'>;
  /** Header content: a short label or an icon. */
  header: ReactNode;
  /** Spoken name, for the header button and each cell. */
  label: string;
  width: number;
  value: (row: SeasonRow<Player>) => number;
};

const COLUMNS: Column[] = [
  {
    key: 'appearances',
    header: 'Apps',
    label: 'Appearances',
    width: 42,
    value: (r) => r.appearances,
  },
  { key: 'starts', header: 'St', label: 'Starts', width: 32, value: (r) => r.starts },
  {
    key: 'playingTimeMs',
    header: 'Min',
    label: 'Minutes',
    width: 44,
    value: (r) => Math.floor(r.playingTimeMs / MS_PER_MINUTE),
  },
  { key: 'goals', header: 'G', label: 'Goals', width: 30, value: (r) => r.goals },
  { key: 'assists', header: 'A', label: 'Assists', width: 30, value: (r) => r.assists },
  {
    key: 'yellowCards',
    header: <RefereeCardIcon color="yellow" size={16} />,
    label: 'Yellow cards',
    width: 30,
    value: (r) => r.yellowCards,
  },
  {
    key: 'redCards',
    header: <RefereeCardIcon color="red" size={16} />,
    label: 'Red cards',
    width: 30,
    value: (r) => r.redCards,
  },
];

type SeasonTableProps = {
  rows: SeasonRow<Player>[];
  sort: { key: SeasonTableSort; direction: SortDirection };
  onSort: (key: SeasonTableSort) => void;
};

/** Per-player season totals. Tap a column header to sort by it, again to flip. */
export function SeasonTable({ rows, sort, onSort }: SeasonTableProps) {
  const arrow = (
    <Ionicons
      name={sort.direction === 'desc' ? 'caret-down' : 'caret-up'}
      size={10}
      color="#1b5e20"
    />
  );
  const sortLabel = sort.direction === 'desc' ? 'descending' : 'ascending';
  return (
    <View className="rounded-2xl border border-gray-200 bg-white">
      <View className="flex-row items-center border-b border-gray-200 px-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Sort by name${sort.key === 'name' ? `, sorted ${sortLabel}` : ''}`}
          onPress={() => onSort('name')}
          className="min-h-11 flex-1 flex-row items-center gap-1"
        >
          <Text
            className={`text-sm font-bold ${sort.key === 'name' ? 'text-pitch-dark' : 'text-gray-500'}`}
          >
            Player
          </Text>
          {sort.key === 'name' && arrow}
        </Pressable>
        {COLUMNS.map((column) => {
          const active = sort.key === column.key;
          return (
            <Pressable
              key={column.key}
              accessibilityRole="button"
              accessibilityLabel={`Sort by ${column.label.toLowerCase()}${active ? `, sorted ${sortLabel}` : ''}`}
              onPress={() => onSort(column.key)}
              className={`min-h-11 items-center justify-center rounded-md ${active ? 'bg-green-50' : 'bg-transparent'}`}
              style={{ width: column.width }}
            >
              {typeof column.header === 'string' ? (
                <Text
                  className={`text-sm font-bold ${active ? 'text-pitch-dark' : 'text-gray-500'}`}
                >
                  {column.header}
                </Text>
              ) : (
                column.header
              )}
              {active && arrow}
            </Pressable>
          );
        })}
      </View>
      {rows.map((row, i) => (
        <View
          key={row.playerId}
          accessible
          accessibilityLabel={`${row.player.name}: ${COLUMNS.map(
            (c) => `${c.value(row)} ${c.label.toLowerCase()}`,
          ).join(', ')}`}
          className={`min-h-11 flex-row items-center px-3 ${
            // Both states set a border color: re-sorting moves rows in and out of last place.
            i < rows.length - 1 ? 'border-b border-gray-100' : 'border-b border-transparent'
          }`}
        >
          <View className="flex-1 flex-row items-center gap-1.5 pr-1">
            {row.player.jerseyNumber !== null && (
              <Text
                className="w-6 text-right text-sm font-semibold text-gray-500"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {row.player.jerseyNumber}
              </Text>
            )}
            <Text
              numberOfLines={1}
              className={`shrink text-base ${row.player.isActive ? 'text-gray-900' : 'text-gray-500'}`}
            >
              {row.player.name}
            </Text>
          </View>
          {COLUMNS.map((column) => {
            const value = column.value(row);
            const active = sort.key === column.key;
            return (
              <Text
                key={column.key}
                // Only the color marks the sorted column: a weight change flickers on Android.
                className={`text-center text-base font-semibold ${
                  value === 0 ? 'text-gray-300' : active ? 'text-pitch-dark' : 'text-gray-700'
                }`}
                style={{ width: column.width, fontVariant: ['tabular-nums'] }}
              >
                {value}
              </Text>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/** Played, won, drawn, lost and goals, in one row of tiles. */
export function SeasonRecordCard({ record }: { record: SeasonRecord }) {
  const tiles = [
    { label: 'Played', value: String(record.played) },
    { label: 'Won', value: String(record.wins) },
    { label: 'Drawn', value: String(record.draws) },
    { label: 'Lost', value: String(record.losses) },
    { label: 'Goals', value: `${record.goalsFor}–${record.goalsAgainst}` },
  ];
  return (
    <View
      accessible
      accessibilityLabel={tiles.map((t) => `${t.label} ${t.value}`).join(', ')}
      className="flex-row rounded-2xl bg-pitch-dark px-2 py-3"
    >
      {tiles.map((tile) => (
        <View key={tile.label} className="flex-1 items-center gap-0.5">
          <Text
            className="text-2xl font-black text-white"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {tile.value}
          </Text>
          <Text className="text-xs font-semibold text-green-100 uppercase">{tile.label}</Text>
        </View>
      ))}
    </View>
  );
}
