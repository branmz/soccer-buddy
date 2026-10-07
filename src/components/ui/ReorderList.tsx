import Ionicons from '@expo/vector-icons/Ionicons';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Pressable, Text, View } from 'react-native';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import {
  idsInOrder,
  movePosition,
  moveToIndex,
  positionsOf,
  type Positions,
} from '@/domain/ordering';
import { confirmHaptic } from '@/lib/haptics';

/** Space between cards. */
const GAP = 12;
/** Card height + gap until the cards have been measured. */
const DEFAULT_SLOT = 104 + GAP;
const SETTLE_MS = 180;

type ReorderListProps<T extends { id: number }> = {
  /** In the current saved order. */
  items: T[];
  name: (item: T) => string;
  accessibilityLabel: (item: T) => string;
  /** The card's content, left of the drag handle. */
  renderBody: (item: T) => ReactNode;
  /** Border color class for a card that isn't selected (e.g. the active team). */
  borderClass?: (item: T) => string;
  /** Saves a new order (every id, once). Returns false if it couldn't be saved. */
  onReorder: (ids: number[]) => boolean;
  /** Tapping a card opens it (unless one is selected to move: then it's the drop target). */
  onOpen: (item: T) => void;
  /** Shown above the list. */
  header?: ReactNode;
  /** Shown below the list, in the same scroll view. */
  footer?: ReactNode;
};

/**
 * A list the coach can rearrange at any time: drag a card by its handle, or tap the handle
 * then tap the card whose place it should take. Tapping a card otherwise opens it.
 * Cards sit at absolute positions driven by shared values, so a drop never re-renders them in
 * a new order mid-animation.
 */
export function ReorderList<T extends { id: number }>({
  items,
  name,
  accessibilityLabel,
  renderBody,
  borderClass = () => 'border-gray-200',
  onReorder,
  onOpen,
  header,
  footer,
}: ReorderListProps<T>) {
  const ids = items.map((item) => item.id);
  const orderKey = ids.join(',');
  const positions = useSharedValue<Positions>(positionsOf(ids));
  const slot = useSharedValue(DEFAULT_SLOT);
  const [slotHeight, setSlotHeight] = useState(DEFAULT_SLOT);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  /** Bumped when a drop couldn't be saved, to put the cards back. */
  const [resets, setResets] = useState(0);

  // A saved order (from a drop, a tap move or elsewhere) is the truth: cards settle there.
  useEffect(() => {
    positions.set(positionsOf(orderKey === '' ? [] : orderKey.split(',').map(Number)));
  }, [orderKey, resets, positions]);

  // Stable child order, so a new saved order only moves cards, never remounts them.
  const byId = useMemo(() => [...items].sort((a, b) => a.id - b.id), [items]);
  // A selection whose item has gone (deleted, or the list switched team) counts as none.
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const activeSelectedId = selected?.id ?? null;

  function measured(height: number) {
    const next = height + GAP;
    if (next > slotHeight) {
      setSlotHeight(next);
      slot.set(next);
    }
  }

  // Starting a drag re-renders the list: rows' gestures must not be rebuilt under the finger,
  // so they get stable callbacks that read the latest render's values.
  const latest = useRef({ ids, orderKey, onReorder });
  useLayoutEffect(() => {
    latest.current = { ids, orderKey, onReorder };
  });
  const handleTapped = useCallback((id: number) => {
    setSelectedId((current) => (current === id ? null : id));
  }, []);
  /** Screen readers: move a card one place up or down (the handle's adjust actions). */
  const stepped = useCallback((id: number, delta: number) => {
    const { ids: current, onReorder: save } = latest.current;
    const order = moveToIndex(current, id, current.indexOf(id) + delta);
    if (order.join(',') !== current.join(',') && save(order)) confirmHaptic();
  }, []);
  const dragStarted = useCallback(() => {
    setSelectedId(null);
    setDragging(true);
  }, []);
  const dropped = useCallback((order: number[]) => {
    setDragging(false);
    if (order.join(',') !== latest.current.orderKey) {
      if (latest.current.onReorder(order)) confirmHaptic();
      // Not saved: slide the cards back to the saved order.
      else setResets((n) => n + 1);
    }
  }, []);

  function tapped(item: T) {
    setSelectedId(null);
    if (activeSelectedId === null) onOpen(item);
    else if (activeSelectedId !== item.id) {
      const order = moveToIndex(ids, activeSelectedId, ids.indexOf(item.id));
      if (order.join(',') !== orderKey && onReorder(order)) confirmHaptic();
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerClassName="gap-3 p-4 pb-8"
      scrollEnabled={!dragging}
    >
      {header}
      {selected && (
        <Text accessibilityLiveRegion="polite" className="text-base font-medium text-gray-900">
          Tap where {name(selected)} should go, or tap it again to cancel.
        </Text>
      )}
      <View style={{ height: Math.max(0, items.length * slotHeight - GAP) }}>
        {byId.map((item) => (
          <ReorderRow
            key={item.id}
            id={item.id}
            label={accessibilityLabel(item)}
            name={name(item)}
            borderClass={item.id === activeSelectedId ? 'border-yellow-400' : borderClass(item)}
            isSelected={item.id === activeSelectedId}
            count={items.length}
            initialTop={ids.indexOf(item.id) * slotHeight}
            positions={positions}
            slot={slot}
            onMeasure={measured}
            opensOnPress={activeSelectedId === null}
            onPress={() => tapped(item)}
            onHandleTap={handleTapped}
            onStep={stepped}
            onDragStart={dragStarted}
            onDrop={dropped}
          >
            {renderBody(item)}
          </ReorderRow>
        ))}
      </View>
      {footer}
    </ScrollView>
  );
}

type ReorderRowProps = {
  id: number;
  label: string;
  name: string;
  borderClass: string;
  isSelected: boolean;
  count: number;
  /** Where the card starts (index × measured slot height), from React state. */
  initialTop: number;
  positions: SharedValue<Positions>;
  slot: SharedValue<number>;
  onMeasure: (height: number) => void;
  /** Tapping the card opens it (nothing is selected to move). */
  opensOnPress: boolean;
  onPress: () => void;
  /** Tap fallback for dragging: selects this card to move. */
  onHandleTap: (id: number) => void;
  /** Screen readers: move this card one place (−1 up, +1 down). */
  onStep: (id: number, delta: number) => void;
  onDragStart: () => void;
  onDrop: (order: number[]) => void;
  children: ReactNode;
};

function ReorderRow({
  id,
  label,
  name,
  borderClass,
  isSelected,
  count,
  initialTop,
  positions,
  slot,
  onMeasure,
  opensOnPress,
  onPress,
  onHandleTap,
  onStep,
  onDragStart,
  onDrop,
  children,
}: ReorderRowProps) {
  // Shared values can't be read during render: start from the parent's React state.
  const top = useSharedValue(initialTop);
  const startTop = useSharedValue(0);
  const dragging = useSharedValue(false);

  // Follow this card's place on the list, unless it's the one being dragged.
  useAnimatedReaction(
    () => ({ position: positions.get()[id], slot: slot.get() }),
    (now, before) => {
      // Not placed yet (a card that just appeared): keep its initial top until it is.
      if (dragging.get() || now.position === undefined) return;
      const target = now.position * now.slot;
      // First layout or a re-measure: jump. A new place: slide.
      if (before?.position === undefined || before.slot !== now.slot) top.set(target);
      else if (before.position !== now.position) {
        top.set(withTiming(target, { duration: SETTLE_MS }));
      }
    },
  );

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .onStart(() => {
        dragging.set(true);
        startTop.set(top.get());
        scheduleOnRN(onDragStart);
      })
      .onUpdate((e) => {
        if (!dragging.get()) return;
        const size = slot.get();
        const nextTop = Math.min(Math.max(startTop.get() + e.translationY, 0), (count - 1) * size);
        top.set(nextTop);
        const current = positions.get();
        const from = current[id];
        const to = Math.round(nextTop / size);
        if (from !== undefined && to !== from) positions.set(movePosition(current, id, from, to));
      })
      .onFinalize(() => {
        if (!dragging.get()) return;
        dragging.set(false);
        const finalPositions = positions.get();
        top.set(withTiming((finalPositions[id] ?? 0) * slot.get(), { duration: SETTLE_MS }));
        scheduleOnRN(onDrop, idsInOrder(finalPositions));
      });
    const tap = Gesture.Tap()
      .runOnJS(true)
      .onEnd((_e, success) => {
        if (success) onHandleTap(id);
      });
    return Gesture.Race(pan, tap);
  }, [id, count, positions, slot, top, startTop, dragging, onHandleTap, onDragStart, onDrop]);

  const style = useAnimatedStyle(() => ({
    top: top.get(),
    zIndex: dragging.get() ? 10 : 0,
    transform: [{ scale: withTiming(dragging.get() ? 1.03 : 1, { duration: 120 }) }],
  }));

  return (
    <Animated.View
      className="absolute right-0 left-0"
      style={style}
      onLayout={(e) => onMeasure(e.nativeEvent.layout.height)}
    >
      <View
        // Every state sets its border color: removing a class flickers on Android.
        className={`min-h-24 flex-row items-center rounded-2xl border-2 bg-white ${borderClass}`}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ selected: isSelected }}
          accessibilityHint={
            opensOnPress
              ? 'Opens it'
              : isSelected
                ? 'Tap again to cancel'
                : 'Moves the selected item here'
          }
          onPress={onPress}
          className="flex-1 justify-center gap-2 self-stretch rounded-2xl px-5 py-5 active:bg-gray-50"
        >
          {children}
        </Pressable>
        {/* Nothing to move with one card. */}
        {count > 1 && (
          <GestureDetector gesture={gesture}>
            <View
              accessible
              accessibilityRole="button"
              accessibilityLabel={`Move ${name}`}
              accessibilityHint="Drag, or tap then tap where it should go"
              // TalkBack can't drag: double-tap selects, swipe up/down moves one place.
              accessibilityActions={[
                { name: 'activate' },
                { name: 'decrement', label: 'Move up' },
                { name: 'increment', label: 'Move down' },
              ]}
              onAccessibilityAction={(e) => {
                if (e.nativeEvent.actionName === 'activate') onHandleTap(id);
                else if (e.nativeEvent.actionName === 'decrement') onStep(id, -1);
                else if (e.nativeEvent.actionName === 'increment') onStep(id, 1);
              }}
              className="h-16 w-16 items-center justify-center"
            >
              <Ionicons name="reorder-three" size={36} color="#6b7280" />
            </View>
          </GestureDetector>
        )}
      </View>
    </Animated.View>
  );
}
