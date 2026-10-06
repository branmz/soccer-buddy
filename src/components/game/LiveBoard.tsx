import { memo, useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import { BenchSidebar } from '@/components/pitch/BenchSidebar';
import {
  BoardDragProvider,
  useBoardDrag,
  useDragGesture,
} from '@/components/pitch/BoardDragContext';
import { fitPitch, Pitch, tokenSizeFor, type Size } from '@/components/pitch/Pitch';
import { PlayerToken } from '@/components/pitch/PlayerToken';
import type { Player } from '@/db/schema';
import {
  findDropTarget,
  sameItem,
  slotFit,
  type BoardItem,
  type DropPoint,
  type BoardMode,
  type SlotFit,
  type DropTarget,
  type TapTarget,
} from '@/domain/board';
import type { LiveLineup, LiveSlot } from '@/domain/lineup';
import { suggestedLiveSlots } from '@/domain/liveBoard';
import type { PlayerMatchStats } from '@/domain/stats';

/** A release this close to another token's centre (in token diameters) lands on it. */
const HIT_RADIUS_RATIO = 0.8;

type LiveBoardProps = {
  lineup: LiveLineup;
  /** Every player of the team (inactive ones too: they can be in an old lineup). */
  playersById: ReadonlyMap<number, Player>;
  kitColor: string | null;
  selection: BoardItem | null;
  /** `positions` while the coach edits the formation: drags move spots, the bench is off. */
  mode: BoardMode;
  /** Minutes played so far, e.g. `23'`. */
  minutesFor: (playerId: number) => string;
  booked: ReadonlySet<number>;
  /** Goals and assists so far, per player. */
  stats: ReadonlyMap<number, PlayerMatchStats>;
  onTap: (target: TapTarget) => void;
  onDrop: (item: BoardItem, target: DropTarget) => void;
};

/**
 * The live pitch and bench. Drag a bench player onto a player to sub them on, onto an empty
 * spot to fill it, or a pitch player onto another spot to swap. Every drag also works as two
 * taps.
 */
// Memoised: the screen re-renders on every clock tick, but the board's props only change when
// the lineup, selection or the minutes step (every few seconds) do.
export const LiveBoard = memo(function LiveBoard({
  lineup,
  playersById,
  kitColor,
  selection,
  mode,
  minutesFor,
  booked,
  stats,
  onTap,
  onDrop,
}: LiveBoardProps) {
  const editingSpots = mode === 'positions';
  const [area, setArea] = useState<Size | null>(null);
  const pitchSize = area && fitPitch(area);
  const tokenSize = tokenSizeFor(pitchSize?.width ?? 0);
  const playerIn = (slot: LiveSlot) =>
    slot.playerId === undefined ? null : (playersById.get(slot.playerId) ?? null);
  const bench = lineup.bench.flatMap((id) => {
    const player = playersById.get(id);
    return player ? [player] : [];
  });
  const selectedSlot =
    selection?.kind === 'slot'
      ? lineup.slots.find((s) => s.slotId === selection.slotId)
      : undefined;

  // Stable across clock ticks: every token's drag gesture depends on it.
  const slots = lineup.slots;
  const handleDrop = useCallback(
    (item: BoardItem, point: DropPoint) => {
      const target = findDropTarget(point, slots, {
        hitRadius: tokenSizeFor(point.pitchWidth) * HIT_RADIUS_RATIO,
        draggedSlotId: item.kind === 'slot' ? item.slotId : undefined,
        mode,
      });
      onDrop(item, target);
    },
    [slots, mode, onDrop],
  );

  function renderGhost(item: BoardItem) {
    const slot =
      item.kind === 'slot' ? lineup.slots.find((s) => s.slotId === item.slotId) : undefined;
    if (item.kind === 'bench') {
      const player = playersById.get(item.playerId);
      return player ? (
        <PlayerToken label="" player={player} kitColor={kitColor} size={tokenSize} />
      ) : null;
    }
    // Spots (even empty ones) move while editing the formation.
    if (!slot || (!editingSpots && slot.playerId === undefined)) return null;
    return (
      <PlayerToken
        label={slot.label}
        player={playerIn(slot)}
        kitColor={kitColor}
        size={tokenSize}
        locked={slot.locked}
      />
    );
  }

  return (
    <BoardDragProvider
      renderGhost={renderGhost}
      ghostSize={tokenSize}
      onDrop={handleDrop}
      onTap={onTap}
    >
      <View className="flex-1 p-2">
        <View
          className="flex-1 items-center justify-center"
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setArea({ width, height });
          }}
        >
          {pitchSize && (
            <PitchWithLiveTokens
              size={pitchSize}
              lineup={lineup}
              kitColor={kitColor}
              selection={selection}
              suggestFor={(playerId) => (editingSpots ? undefined : playersById.get(playerId))}
              editingSpots={editingSpots}
              playerIn={playerIn}
              minutesFor={minutesFor}
              booked={booked}
              stats={stats}
              onTap={onTap}
            />
          )}
        </View>
      </View>
      <BenchSidebar
        players={bench}
        kitColor={kitColor}
        selection={selection}
        disabled={editingSpots}
        fitFor={(player) =>
          selectedSlot && !editingSpots ? slotFit(selectedSlot.role, player) : null
        }
        showBenchZone={false}
        slotHasPlayer={() => false}
        noteFor={(player) => `${minutesFor(player.id)} played`}
        statsFor={(player) => stats.get(player.id)}
        onPlayerPress={(playerId) => onTap({ kind: 'bench', playerId })}
        onBenchZonePress={() => undefined}
      />
    </BoardDragProvider>
  );
});

type PitchWithLiveTokensProps = {
  size: Size;
  lineup: LiveLineup;
  kitColor: string | null;
  selection: BoardItem | null;
  /** The bench player whose positions to highlight, or undefined for none. */
  suggestFor: (playerId: number) => Player | undefined;
  editingSpots: boolean;
  playerIn: (slot: LiveSlot) => Player | null;
  minutesFor: (playerId: number) => string;
  booked: ReadonlySet<number>;
  stats: ReadonlyMap<number, PlayerMatchStats>;
  onTap: (target: TapTarget) => void;
};

function PitchWithLiveTokens({
  size,
  lineup,
  kitColor,
  selection,
  suggestFor,
  editingSpots,
  playerIn,
  minutesFor,
  booked,
  stats,
  onTap,
}: PitchWithLiveTokensProps) {
  const { pitchRef, dragging } = useBoardDrag();
  // A bench player picked up by tap or drag: highlight the spots that suit them.
  const pickedUp =
    dragging?.kind === 'bench' ? dragging : selection?.kind === 'bench' ? selection : null;
  const pickedUpPlayer = pickedUp ? suggestFor(pickedUp.playerId) : undefined;
  const suggestions = pickedUpPlayer ? suggestedLiveSlots(lineup, pickedUpPlayer) : null;
  const slotsById = new Map(lineup.slots.map((s) => [s.slotId, s]));
  return (
    <Pitch
      size={size}
      slots={lineup.slots}
      pitchRef={pitchRef}
      onGrassPress={(x, y) => onTap({ kind: 'grass', x, y })}
      renderToken={(slot, tokenSize) => {
        const live = slotsById.get(slot.slotId) ?? { ...slot, locked: false };
        return (
          <LiveSlotToken
            slot={live}
            player={playerIn(live)}
            kitColor={kitColor}
            size={tokenSize}
            selected={sameItem(selection, { kind: 'slot', slotId: slot.slotId })}
            minutes={live.playerId === undefined ? null : minutesFor(live.playerId)}
            highlight={suggestions?.get(slot.slotId) ?? null}
            editingSpots={editingSpots}
            booked={live.playerId !== undefined && booked.has(live.playerId)}
            stats={live.playerId === undefined ? undefined : stats.get(live.playerId)}
            onPress={() => onTap({ kind: 'slot', slotId: slot.slotId })}
          />
        );
      }}
    />
  );
}

type LiveSlotTokenProps = {
  slot: LiveSlot;
  player: Player | null;
  kitColor: string | null;
  size: number;
  selected: boolean;
  minutes: string | null;
  highlight: SlotFit;
  editingSpots: boolean;
  booked: boolean;
  stats: PlayerMatchStats | undefined;
  onPress: () => void;
};

function LiveSlotToken({
  slot,
  player,
  kitColor,
  size,
  selected,
  minutes,
  highlight,
  editingSpots,
  booked,
  stats,
  onPress,
}: LiveSlotTokenProps) {
  const { dragging } = useBoardDrag();
  const item: BoardItem = { kind: 'slot', slotId: slot.slotId };
  const { ref, gesture } = useDragGesture(item);
  const description = slot.locked
    ? `${slot.label}: empty after a red card`
    : `${slot.label}: ${player ? `${player.name}, ${minutes ?? ''} played${contributionText(stats)}${booked ? ', booked' : ''}` : 'empty'}${highlight ? ', suggested' : ''}`;
  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        ref={ref}
        accessible
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={description}
        accessibilityHint={
          editingSpots
            ? 'Select, then tap the grass to move this spot'
            : 'Select, then choose a bench player to sub on or another spot to swap'
        }
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityAction={onPress}
        style={{ width: size, height: size }}
      >
        <PlayerToken
          label={slot.label}
          player={player}
          kitColor={kitColor}
          size={size}
          selected={selected}
          dimmed={sameItem(dragging, item)}
          badge={minutes}
          highlight={highlight}
          booked={booked}
          goals={stats?.goals ?? 0}
          assists={stats?.assists ?? 0}
          locked={slot.locked}
        />
      </Animated.View>
    </GestureDetector>
  );
}

/** ", 2 goals, 1 assist" for screen readers; "" when none. */
function contributionText(stats: PlayerMatchStats | undefined): string {
  if (!stats) return '';
  const parts = [
    stats.goals > 0 ? `${stats.goals} ${stats.goals === 1 ? 'goal' : 'goals'}` : '',
    stats.assists > 0 ? `${stats.assists} ${stats.assists === 1 ? 'assist' : 'assists'}` : '',
  ].filter(Boolean);
  return parts.length > 0 ? `, ${parts.join(', ')}` : '';
}

/** One line above the board: what the current selection will do. */
export function liveHint(
  selection: BoardItem | null,
  nameOf: (playerId: number) => string,
  lineup: LiveLineup,
): string | null {
  if (selection === null) return null;
  if (selection.kind === 'bench') {
    return `${nameOf(selection.playerId)}: tap who they replace, or an empty spot.`;
  }
  const playerId = lineup.slots.find((s) => s.slotId === selection.slotId)?.playerId;
  if (playerId === undefined) return null;
  return `${nameOf(playerId)}: tap a bench player to sub on, or another spot to swap.`;
}

export function LiveHint({ text, onCancel }: { text: string; onCancel: () => void }) {
  return (
    <View className="min-h-11 flex-row items-center gap-2 border-b border-yellow-300 bg-yellow-50 px-3">
      <Text accessibilityLiveRegion="polite" className="flex-1 text-sm text-gray-800">
        {text}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onCancel}
        className="min-h-11 justify-center rounded-full px-3 active:bg-yellow-100"
      >
        <Text className="text-base font-semibold text-brand">Cancel</Text>
      </Pressable>
    </View>
  );
}
