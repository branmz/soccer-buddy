import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { JerseyBadge } from '@/components/teams/JerseyBadge';
import { Sheet } from '@/components/ui/Sheet';
import type { Player } from '@/db/schema';

type PlayerPickSheetProps = {
  visible: boolean;
  title: string;
  /** Shown above the players, e.g. a card color switch or a hint. */
  header?: ReactNode;
  players: Player[];
  kitColor: string | null;
  /** A short note per player (e.g. "Bench", "1 yellow"). */
  noteFor?: (player: Player) => string | null;
  /** An extra choice below the players, e.g. "No assist". */
  noneLabel?: string;
  emptyText?: string;
  onPick: (playerId: number | null) => void;
  onClose: () => void;
};

/** Pick one player: big tiles with jersey badges, for the sideline. */
export function PlayerPickSheet({
  visible,
  title,
  header,
  players,
  kitColor,
  noteFor,
  noneLabel,
  emptyText = 'No players to pick',
  onPick,
  onClose,
}: PlayerPickSheetProps) {
  return (
    <Sheet visible={visible} title={title} onClose={onClose}>
      {header}
      <View className="flex-row flex-wrap gap-2">
        {players.map((player) => {
          const note = noteFor?.(player) ?? null;
          return (
            <Pressable
              key={player.id}
              accessibilityRole="button"
              accessibilityLabel={[player.name, note].filter(Boolean).join(', ')}
              onPress={() => onPick(player.id)}
              className="min-h-14 w-[48%] flex-row items-center gap-2 rounded-xl border border-gray-200 bg-white px-2 active:bg-gray-100"
            >
              <JerseyBadge number={player.jerseyNumber} kitColor={kitColor} size={36} />
              <View className="flex-1">
                <Text numberOfLines={1} className="text-base font-semibold text-gray-900">
                  {player.name}
                </Text>
                {note && (
                  <Text numberOfLines={1} className="text-xs text-gray-500">
                    {note}
                  </Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
      {players.length === 0 && <Text className="text-base text-gray-500">{emptyText}</Text>}
      {noneLabel && (
        <Pressable
          accessibilityRole="button"
          onPress={() => onPick(null)}
          className="min-h-12 items-center justify-center rounded-xl border border-gray-300 bg-white active:bg-gray-100"
        >
          <Text className="text-base font-semibold text-gray-700">{noneLabel}</Text>
        </Pressable>
      )}
    </Sheet>
  );
}
