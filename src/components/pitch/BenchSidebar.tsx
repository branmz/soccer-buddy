import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { GestureDetector, ScrollView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import { JerseyBadge } from '@/components/teams/JerseyBadge';
import type { Player } from '@/db/schema';
import { sameItem, type BoardItem, type SlotFit } from '@/domain/board';
import { formatPositions } from '@/domain/positions';

import { useBoardDrag, useDragGesture } from './BoardDragContext';
import { ContributionMarks } from './ContributionMarks';

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
  /** An extra line under a player's name (live match: minutes played). */
  noteFor?: (player: Player) => string | null;
  /** Live match: goals and assists, shown as small marks on the badge. */
  statsFor?: (player: Player) => { goals: number; assists: number } | undefined;
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
  noteFor,
  statsFor,
}: BenchSidebarProps) {
  const { benchRef, dragging } = useBoardDrag();
  // When every player fits, nothing needs scrolling, so swipes in any direction drag.
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const scrolls = contentHeight > viewportHeight + 1;
  // While a pitch token is dragged, the whole bench is a drop target.
  const isDropTarget =
    showBenchZone || (dragging?.kind === 'slot' && slotHasPlayer(dragging.slotId));

  // A fixed narrow column: every dp it gives up goes to the pitch and its tokens.
  return (
    <View className="w-[88px] border-l border-gray-200 bg-white">
      {/* Measured on drop to tell whether a token was released over the bench. */}
      <Animated.View ref={benchRef} style={{ flex: 1 }}>
        <View
          className={`flex-1 border-2 ${isDropTarget ? 'border-dashed border-brand bg-green-50' : 'border-transparent bg-white'}`}
        >
          {/* Locked (while spots move): a lock and grey badges say so, but the text stays
              readable. Fading the whole column to 40% made it illegible. */}
          <View className="flex-row items-center justify-center gap-1 px-2 pt-2 pb-1">
            {disabled && <Ionicons name="lock-closed" size={11} color="#6b7280" />}
            <Text
              accessibilityRole="header"
              accessibilityLabel={`Bench, ${players.length}${disabled ? ', locked while editing spots' : ''}`}
              className="text-center text-xs font-semibold text-gray-500 uppercase"
            >
              Bench · {players.length}
            </Text>
          </View>
          {showBenchZone && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Move the selected player to the bench"
              onPress={onBenchZonePress}
              className="mx-1 mb-1 min-h-12 items-center justify-center rounded-xl bg-brand px-1 active:bg-pitch-dark"
            >
              <Ionicons name="arrow-down" size={16} color="#ffffff" />
              <Text className="text-center text-xs font-semibold text-white">Move To Bench</Text>
            </Pressable>
          )}
          <ScrollView
            scrollEnabled={scrolls}
            onLayout={(e) => setViewportHeight(e.nativeEvent.layout.height)}
            onContentSizeChange={(_width, height) => setContentHeight(height)}
          >
            <View className="gap-1 px-1 pb-4">
              {players.map((player) => (
                <BenchPlayer
                  key={player.id}
                  player={player}
                  kitColor={kitColor}
                  disabled={disabled}
                  scrolls={scrolls}
                  fit={fitFor(player)}
                  note={noteFor?.(player) ?? null}
                  stats={statsFor?.(player)}
                  selected={sameItem(selection, { kind: 'bench', playerId: player.id })}
                  onPress={() => onPlayerPress(player.id)}
                />
              ))}
              {players.length === 0 && (
                <Text className="px-1 pt-2 text-center text-xs text-gray-500">
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
  note: string | null;
  stats: { goals: number; assists: number } | undefined;
  kitColor: string | null;
  fit: SlotFit;
  selected: boolean;
  disabled: boolean;
  /** Whether the bench scrolls: then only sideways swipes drag. */
  scrolls: boolean;
  onPress: () => void;
};

function BenchPlayer({
  player,
  note,
  stats,
  kitColor,
  fit,
  selected,
  disabled,
  scrolls,
  onPress,
}: BenchPlayerProps) {
  const { dragging } = useBoardDrag();
  const item: BoardItem = { kind: 'bench', playerId: player.id };
  const { ref, gesture } = useDragGesture(item, { enabled: !disabled, benchScrolls: scrolls });
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
          note ?? '',
        ]
          .filter(Boolean)
          .join(', ')}
        accessibilityHint="Select, then choose a spot on the pitch"
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityAction={onPress}
      >
        <View
          className={`items-center gap-0.5 rounded-xl border-2 px-1 py-1.5 ${
            selected ? 'border-select-strong bg-cyan-50' : 'border-transparent bg-transparent'
          } ${isDragged ? 'opacity-30' : 'opacity-100'}`}
        >
          <View>
            <JerseyBadge
              number={player.jerseyNumber}
              kitColor={kitColor}
              inactive={disabled}
              size={36}
            />
            {stats && <ContributionMarks goals={stats.goals} assists={stats.assists} size={36} />}
          </View>
          <Text
            numberOfLines={1}
            className={`text-xs font-semibold ${disabled ? 'text-gray-500' : 'text-gray-900'}`}
          >
            {player.name}
          </Text>
          {positions !== '' && (
            <Text
              numberOfLines={1}
              className={`text-[11px] font-semibold ${
                disabled ? 'text-gray-500' : fit ? 'text-brand' : 'text-gray-600'
              }`}
            >
              {fit ? '★ ' : ''}
              {positions}
            </Text>
          )}
          {note !== null && (
            <Text
              numberOfLines={1}
              className={`text-[11px] font-semibold ${disabled ? 'text-gray-500' : 'text-gray-600'}`}
            >
              {note}
            </Text>
          )}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}
