import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import type { Player } from '@/db/schema';
import {
  benchPlayers,
  findDropTarget,
  positionOptionsFor,
  sameItem,
  slotFit,
  suggestedSlots,
  suggestForRole,
  type SlotFit,
  type BoardItem,
  type BoardMode,
  type DropPoint,
  type TapTarget,
} from '@/domain/board';
import type { FormationSlot } from '@/domain/types';
import { confirmHaptic } from '@/lib/haptics';
import { useBoardStore } from '@/stores/boardStore';

import { BenchSidebar } from './BenchSidebar';
import { SlotPositionSheet } from './SlotPositionSheet';
import { BoardDragProvider, useBoardDrag, useDragGesture } from './BoardDragContext';
import { fitPitch, Pitch, tokenSizeFor, type Size } from './Pitch';
import { PlayerToken } from './PlayerToken';

/** A release this close to another token's centre (in token diameters) lands on it. */
const HIT_RADIUS_RATIO = 0.8;

/** Runs a board change, with a light confirm haptic when it actually changed the board. */
function withHaptic(change: () => void) {
  const before = useBoardStore.getState().slots;
  change();
  if (useBoardStore.getState().slots !== before) confirmHaptic();
}

/** The store's `tap` plus haptics. Module-level so the board's gestures see a stable function. */
function tapWithHaptic(target: TapTarget) {
  withHaptic(() => useBoardStore.getState().tap(target));
}

type FormationBoardProps = {
  /** Active players who can be placed. */
  roster: Player[];
  kitColor: string | null;
};

/** Pitch + bench editor bound to `boardStore`. Drag or tap players between them. */
export function FormationBoard({ roster, kitColor }: FormationBoardProps) {
  const slots = useBoardStore((s) => s.slots);
  const selection = useBoardStore((s) => s.selection);
  const drop = useBoardStore((s) => s.drop);
  const clearSelection = useBoardStore((s) => s.clearSelection);
  const mode = useBoardStore((s) => s.mode);
  const setMode = useBoardStore((s) => s.setMode);
  const movingSpots = mode === 'positions';
  const canUndo = useBoardStore((s) => s.undoStack.length > 0);
  const undo = useBoardStore((s) => s.undo);
  const changePosition = useBoardStore((s) => s.changePosition);
  const [area, setArea] = useState<Size | null>(null);
  // `slot` is kept after closing so the sheet's content doesn't change while it slides away.
  const [positionSheet, setPositionSheet] = useState<{
    open: boolean;
    slot: FormationSlot | null;
  }>({ open: false, slot: null });

  const playersById = new Map(roster.map((p) => [p.id, p]));
  const playerFor = (slot: FormationSlot) =>
    slot.playerId === undefined ? null : (playersById.get(slot.playerId) ?? null);

  const selectedSlot =
    selection?.kind === 'slot' ? slots.find((s) => s.slotId === selection.slotId) : undefined;
  const selectedPlayer =
    selection?.kind === 'bench'
      ? playersById.get(selection.playerId)
      : selectedSlot && playerFor(selectedSlot);
  const bench = benchPlayers(roster, slots);
  const orderedBench = selectedSlot ? suggestForRole(bench, selectedSlot.role) : bench;

  const pitchSize = area && fitPitch(area);
  const tokenSize = tokenSizeFor(pitchSize?.width ?? 0);

  function handleDrop(item: BoardItem, point: DropPoint) {
    // Read fresh: the gesture that calls this may have been built on an earlier render.
    const target = findDropTarget(point, useBoardStore.getState().slots, {
      hitRadius: tokenSizeFor(point.pitchWidth) * HIT_RADIUS_RATIO,
      draggedSlotId: item.kind === 'slot' ? item.slotId : undefined,
      mode: useBoardStore.getState().mode,
    });
    withHaptic(() => drop(item, target));
  }

  function renderGhost(item: BoardItem) {
    if (item.kind === 'bench') {
      const player = playersById.get(item.playerId) ?? null;
      return <PlayerToken label="" player={player} kitColor={kitColor} size={tokenSize} />;
    }
    const slot = slots.find((s) => s.slotId === item.slotId);
    if (!slot) return null;
    return (
      <PlayerToken
        label={slot.label}
        player={playerFor(slot)}
        kitColor={kitColor}
        size={tokenSize}
      />
    );
  }

  return (
    <View className="flex-1">
      <View
        className={`min-h-14 flex-row items-center gap-2 border-b px-4 py-1 ${
          movingSpots ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 bg-white'
        }`}
      >
        <Text
          accessibilityLiveRegion="polite"
          className="flex-1 text-base font-medium text-gray-900"
        >
          {hintText(mode, selection, selectedSlot, selectedPlayer?.name)}
        </Text>
        {movingSpots && selectedSlot && positionOptionsFor(selectedSlot).length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Change position, currently ${selectedSlot.label}`}
            onPress={() => setPositionSheet({ open: true, slot: selectedSlot })}
            className="min-h-12 flex-row items-center gap-1 rounded-full border border-brand bg-white px-3 active:bg-green-50"
          >
            <Text className="text-base text-pitch-dark">Position</Text>
            <Text className="text-lg font-bold text-pitch-dark">{selectedSlot.label}</Text>
            <Ionicons name="chevron-down" size={18} color="#1b5e20" />
          </Pressable>
        )}
        {selection && (
          <Pressable
            accessibilityRole="button"
            onPress={clearSelection}
            className="min-h-12 justify-center rounded-full px-3 active:bg-gray-100"
          >
            <Text className="text-base font-semibold text-brand">Cancel</Text>
          </Pressable>
        )}
      </View>

      <BoardDragProvider
        renderGhost={renderGhost}
        ghostSize={tokenSize}
        onDrop={handleDrop}
        onTap={tapWithHaptic}
      >
        <View className="flex-1 p-3">
          <View
            className="flex-1 items-center justify-center"
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              setArea({ width, height });
            }}
          >
            {pitchSize && (
              <PitchWithTokens
                size={pitchSize}
                slots={slots}
                selection={selection}
                showSuggestions={!movingSpots}
                kitColor={kitColor}
                playerFor={playerFor}
                playerById={(playerId) => playersById.get(playerId)}
                onSlotPress={(slotId) => tapWithHaptic({ kind: 'slot', slotId })}
                onGrassPress={(x, y) => tapWithHaptic({ kind: 'grass', x, y })}
              />
            )}
          </View>
        </View>
        <BenchSidebar
          players={orderedBench}
          kitColor={kitColor}
          selection={selection}
          disabled={movingSpots}
          fitFor={(player) =>
            selectedSlot && !movingSpots ? slotFit(selectedSlot.role, player) : null
          }
          showBenchZone={!movingSpots && selectedSlot?.playerId !== undefined}
          slotHasPlayer={(slotId) =>
            slots.some((s) => s.slotId === slotId && s.playerId !== undefined)
          }
          onPlayerPress={(playerId) => tapWithHaptic({ kind: 'bench', playerId })}
          onBenchZonePress={() => tapWithHaptic({ kind: 'benchZone' })}
        />
      </BoardDragProvider>
      <SlotPositionSheet
        visible={positionSheet.open}
        slot={positionSheet.slot}
        onPick={(position) => {
          if (positionSheet.slot) changePosition(positionSheet.slot.slotId, position);
        }}
        onClose={() => setPositionSheet((p) => ({ ...p, open: false }))}
      />

      {/* Bottom toolbar: within thumb reach on the sideline. */}
      <View className="flex-row items-center justify-between gap-3 border-t border-gray-200 bg-white px-4 py-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Undo last change"
          accessibilityState={{ disabled: !canUndo }}
          disabled={!canUndo}
          onPress={undo}
          // Disabled is muted but still readable (a 40% fade washed out). Both states set every
          // class; only the values change (no Android ghosting).
          className={`min-h-12 flex-row items-center gap-1.5 rounded-full border px-4 ${
            canUndo
              ? 'border-gray-300 bg-white active:bg-gray-100'
              : 'border-gray-200 bg-gray-100 active:bg-gray-100'
          }`}
        >
          <Ionicons name="arrow-undo" size={20} color={canUndo ? '#111827' : '#6b7280'} />
          <Text className={`text-lg font-semibold ${canUndo ? 'text-gray-900' : 'text-gray-500'}`}>
            Undo
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="switch"
          accessibilityLabel="Edit spots"
          accessibilityState={{ checked: movingSpots }}
          accessibilityHint="When on, you can move spots and change their positions, like ST to CAM"
          onPress={() => setMode(movingSpots ? 'players' : 'positions')}
          className={`min-h-12 flex-row items-center gap-1.5 rounded-full border px-4 ${
            movingSpots
              ? 'border-brand bg-brand active:bg-pitch-dark'
              : 'border-green-200 bg-green-50 active:bg-green-100'
          }`}
        >
          <Ionicons
            name={movingSpots ? 'checkmark' : 'create-outline'}
            size={20}
            color={movingSpots ? '#ffffff' : '#1b5e20'}
          />
          <Text
            className={`text-lg font-semibold ${movingSpots ? 'text-white' : 'text-pitch-dark'}`}
          >
            {movingSpots ? 'Done Editing' : 'Edit Spots'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function hintText(
  mode: BoardMode,
  selection: BoardItem | null,
  slot: FormationSlot | undefined,
  playerName: string | undefined,
): string {
  if (mode === 'positions') {
    if (slot?.role === 'GK') {
      return "Tap the grass to move the goalkeeper. The GK spot can't change position.";
    }
    if (slot) return `Tap the grass to move ${slot.label}, or tap its chip to change position.`;
    return 'Drag spots to move them. Tap a spot to change its position (e.g. ST to CAM).';
  }
  if (selection === null) return 'Drag players onto the pitch, or tap a player then a spot.';
  if (selection.kind === 'bench') {
    return `Tap a spot for ${playerName ?? 'them'}. Yellow spots suit their positions.`;
  }
  if (playerName) return `${playerName}: tap another spot to swap, or the bench.`;
  return `${slot?.label ?? 'Spot'}: tap a bench player to put them here.`;
}

type PitchWithTokensProps = {
  size: Size;
  slots: FormationSlot[];
  selection: BoardItem | null;
  /** Highlight spots for the bench player being placed (off while moving spots). */
  showSuggestions: boolean;
  kitColor: string | null;
  playerFor: (slot: FormationSlot) => Player | null;
  playerById: (playerId: number) => Player | undefined;
  onSlotPress: (slotId: string) => void;
  onGrassPress: (x: number, y: number) => void;
};

function PitchWithTokens({
  size,
  slots,
  selection,
  showSuggestions,
  kitColor,
  playerFor,
  playerById,
  onSlotPress,
  onGrassPress,
}: PitchWithTokensProps) {
  const { pitchRef, dragging } = useBoardDrag();
  // Highlight open spots for the bench player being placed (tapped or dragged).
  const pickedUp = !showSuggestions
    ? null
    : dragging?.kind === 'bench'
      ? dragging
      : selection?.kind === 'bench'
        ? selection
        : null;
  const pickedUpPlayer = pickedUp && playerById(pickedUp.playerId);
  const suggestions = pickedUpPlayer ? suggestedSlots(slots, pickedUpPlayer) : null;
  return (
    <Pitch
      size={size}
      slots={slots}
      pitchRef={pitchRef}
      onGrassPress={onGrassPress}
      renderToken={(slot, tokenSize) => (
        <SlotToken
          slot={slot}
          player={playerFor(slot)}
          kitColor={kitColor}
          size={tokenSize}
          selected={sameItem(selection, { kind: 'slot', slotId: slot.slotId })}
          highlight={suggestions?.get(slot.slotId) ?? null}
          onPress={() => onSlotPress(slot.slotId)}
        />
      )}
    />
  );
}

type SlotTokenProps = {
  slot: FormationSlot;
  player: Player | null;
  kitColor: string | null;
  size: number;
  selected: boolean;
  highlight: SlotFit;
  onPress: () => void;
};

function SlotToken({ slot, player, kitColor, size, selected, highlight, onPress }: SlotTokenProps) {
  const { dragging } = useBoardDrag();
  const item: BoardItem = { kind: 'slot', slotId: slot.slotId };
  const { ref, gesture } = useDragGesture(item);
  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        ref={ref}
        accessible
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={`${slot.label}: ${player?.name ?? 'empty'}${highlight ? ', suggested' : ''}`}
        accessibilityHint="Select, then choose a player or another spot"
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
          highlight={highlight}
          dimmed={sameItem(dragging, item)}
        />
      </Animated.View>
    </GestureDetector>
  );
}
