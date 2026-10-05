import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';
import { GestureDetector, ScrollView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import { JerseyBadge } from '@/components/teams/JerseyBadge';
import type { Player } from '@/db/schema';
import { sameItem, type BoardItem, type SlotFit } from '@/domain/board';
import { formatPositions } from '@/domain/positions';

import { useBoardDrag, useDragGesture } from './BoardDragContext';

type BenchSidebarProps = {
  /** Bench players in display order (suggested fits first while a slot is selected). */
  players: Player[];
  kitColor: string | null;
  selection: BoardItem | null;
  /** How each player fits the selected slot's line, to highlight good choices. */
  fitFor: (player: Player) => SlotFit;
  /** Shows a "Move to bench" target, for when a slot with a player is selected. */
  showBenchZone: boolean;
  /** Greyed out and untouchable (while the coach is moving spots). */
  disabled: boolean;
  /** Dragging an empty slot to the bench does nothing, so the bench isn't highlighted. */
  slotHasPlayer: (slotId: string) => boolean;
  onPlayerPress: (playerId: number) => void;
  onBenchZonePress: () => void;
};

/** Right-hand column of players not on the pitch. Hold a player to drag, or tap to select. */
export function BenchSidebar({
  players,
  kitColor,
  selection,
  fitFor,
  showBenchZone,
  disabled,
  slotHasPlayer,
  onPlayerPress,
  onBenchZonePress,
}: BenchSidebarProps) {
  const { benchRef, dragging } = useBoardDrag();
  // While a pitch token is dragged, the whole bench is a drop target.
  const isDropTarget =
    showBenchZone || (dragging?.kind === 'slot' && slotHasPlayer(dragging.slotId));

  return (
    <View className="w-1/4 border-l border-gray-200 bg-white">
      {/* Measured on drop to tell whether a token was released over the bench. */}
      <Animated.View ref={benchRef} style={{ flex: 1 }}>
        <View
          className={`flex-1 border-2 ${isDropTarget ? 'border-dashed border-brand bg-green-50' : 'border-transparent bg-white'} ${disabled ? 'opacity-40' : 'opacity-100'}`}
        >
          <Text
            accessibilityRole="header"
            className="px-2 pt-2 pb-1 text-center text-xs font-semibold text-gray-500 uppercase"
          >
            Bench · {players.length}
          </Text>
          {showBenchZone && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Move the selected player to the bench"
              onPress={onBenchZonePress}
              className="mx-1 mb-1 min-h-12 items-center justify-center rounded-xl bg-brand px-1 active:bg-pitch-dark"
            >
              <Ionicons name="arrow-down" size={16} color="#ffffff" />
              <Text className="text-center text-xs font-semibold text-white">Move to bench</Text>
            </Pressable>
          )}
          <ScrollView>
            <View className="gap-1 px-1 pb-4">
              {players.map((player) => (
                <BenchPlayer
                  key={player.id}
                  player={player}
                  kitColor={kitColor}
                  disabled={disabled}
                  fit={fitFor(player)}
                  selected={sameItem(selection, { kind: 'bench', playerId: player.id })}
                  onPress={() => onPlayerPress(player.id)}
                />
              ))}
              {players.length === 0 && (
                <Text className="px-1 pt-2 text-center text-xs text-gray-400">
                  Everyone is on the pitch
                </Text>
              )}
            </View>
          </ScrollView>
        </View>
      </Animated.View>
    </View>
  );
}

type BenchPlayerProps = {
  player: Player;
  kitColor: string | null;
  fit: SlotFit;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
};

function BenchPlayer({ player, kitColor, fit, selected, disabled, onPress }: BenchPlayerProps) {
  const { dragging } = useBoardDrag();
  const item: BoardItem = { kind: 'bench', playerId: player.id };
  const { ref, gesture } = useDragGesture(item, { enabled: !disabled });
  const positions = formatPositions(player);
  const isDragged = sameItem(dragging, item);

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        ref={ref}
        accessible
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={[
          player.name,
          player.jerseyNumber === null ? '' : `number ${player.jerseyNumber}`,
          fit ? 'suggested for this spot' : '',
        ]
          .filter(Boolean)
          .join(', ')}
        accessibilityHint="Select, then choose a spot on the pitch"
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityAction={onPress}
      >
        <View
          className={`items-center gap-0.5 rounded-xl border-2 px-1 py-1.5 ${
            selected ? 'border-brand bg-green-50' : 'border-transparent bg-transparent'
          } ${isDragged ? 'opacity-30' : 'opacity-100'}`}
        >
          <JerseyBadge number={player.jerseyNumber} kitColor={kitColor} size={36} />
          <Text numberOfLines={1} className="text-xs font-semibold text-gray-900">
            {player.name}
          </Text>
          {positions !== '' && (
            <Text
              numberOfLines={1}
              className={`text-[11px] font-semibold ${fit ? 'text-brand' : 'text-gray-400'}`}
            >
              {fit ? '★ ' : ''}
              {positions}
            </Text>
          )}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}
