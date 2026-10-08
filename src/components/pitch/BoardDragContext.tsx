import {
  createContext,
  use,
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { View } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import Animated, {
  measure,
  useAnimatedRef,
  useSharedValue,
  type AnimatedRef,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { BoardItem, DropPoint } from '@/domain/board';

import { DragLayer } from './DragLayer';

/** How long a bench player must be held before dragging starts (shorter = scroll conflicts). */
const BENCH_LONG_PRESS_MS = 150;
/** A bench player swiped this far starts dragging (only sideways while the bench scrolls). */
const SWIPE_OFFSET = 12;
const NO_DRAG = 0;
/** Pitch tokens start dragging after this many pixels of movement; less counts as a tap. */
const PITCH_MIN_DISTANCE = 6;
const TOUCH_SLOP = 8;
const TAP_MAX_DURATION_MS = 1500;

type BoardDragValue = {
  rootRef: AnimatedRef<Animated.View>;
  pitchRef: AnimatedRef<Animated.View>;
  benchRef: AnimatedRef<Animated.View>;
  /** Ghost centre, relative to the board root. */
  ghostX: SharedValue<number>;
  ghostY: SharedValue<number>;
  ghostVisible: SharedValue<boolean>;
  /** True from a drag's start until its release: one drag at a time, board-wide. */
  dragInProgress: SharedValue<boolean>;
  /** The item being dragged (JS state, lags the gesture by a frame). */
  dragging: BoardItem | null;
  beginDrag: (item: BoardItem) => void;
  endDrag: (item: BoardItem, point: DropPoint | null) => void;
  tap: (item: BoardItem) => void;
};

const BoardDragContext = createContext<BoardDragValue | null>(null);

export function useBoardDrag(): BoardDragValue {
  const value = use(BoardDragContext);
  if (!value) throw new Error('useBoardDrag must be used inside BoardDragProvider');
  return value;
}

type BoardDragProviderProps = {
  /** Rendered under the finger while dragging. */
  renderGhost: (item: BoardItem) => ReactNode;
  /** The ghost's width and height, so it can be centred on the drag point. */
  ghostSize: number;
  onDrop: (item: BoardItem, point: DropPoint) => void;
  /** A tap on an item (the tap-to-select fallback). Should be stable, e.g. a store action. */
  onTap: (item: BoardItem) => void;
  children: ReactNode;
};

/**
 * The board root. Every drag draws one ghost here, above the pitch and the bench, so it isn't
 * clipped by the bench's ScrollView. Drop points are measured on the UI thread and handed to
 * `onDrop` once, on release.
 */
export function BoardDragProvider({
  renderGhost,
  ghostSize,
  onDrop,
  onTap,
  children,
}: BoardDragProviderProps) {
  const rootRef = useAnimatedRef<Animated.View>();
  const pitchRef = useAnimatedRef<Animated.View>();
  const benchRef = useAnimatedRef<Animated.View>();
  const ghostX = useSharedValue(0);
  const ghostY = useSharedValue(0);
  const ghostVisible = useSharedValue(false);
  const dragInProgress = useSharedValue(false);
  const [dragging, setDragging] = useState<BoardItem | null>(null);
  const [dropCount, setDropCount] = useState(0);

  const endDrag = useCallback(
    (item: BoardItem, point: DropPoint | null) => {
      setDragging(null);
      setDropCount((n) => n + 1);
      if (point) onDrop(item, point);
    },
    [onDrop],
  );

  // The ghost stays at the release point until the drop has rendered. Hiding it on release
  // (UI thread) left a gap, while JS re-rendered, where the faded source token showed alone.
  useLayoutEffect(() => {
    // A newer drag may already have started (quick drags on a slow phone): keep its ghost.
    if (!dragInProgress.get()) ghostVisible.set(false);
  }, [dropCount, ghostVisible, dragInProgress]);

  const value: BoardDragValue = {
    rootRef,
    pitchRef,
    benchRef,
    ghostX,
    ghostY,
    ghostVisible,
    dragInProgress,
    dragging,
    beginDrag: setDragging,
    endDrag,
    tap: onTap,
  };

  return (
    <BoardDragContext value={value}>
      {/* Reanimated views take plain styles; NativeWind classes go on the inner View. */}
      <Animated.View ref={rootRef} style={{ flex: 1 }}>
        <View className="flex-1 flex-row">{children}</View>
        <DragLayer x={ghostX} y={ghostY} visible={ghostVisible} size={ghostSize}>
          {dragging && renderGhost(dragging)}
        </DragLayer>
      </Animated.View>
    </BoardDragContext>
  );
}

/**
 * Pan-to-drag plus tap-to-select for one board item. Attach `ref` and `gesture` to an
 * Animated.View wrapped in a GestureDetector.
 *
 * Pitch tokens keep their grab point (the ghost moves with the token's centre); bench players
 * drag on a swipe or after a short hold, and their ghost centres on the finger. While the bench
 * scrolls (`benchScrolls`), only a sideways swipe drags, so vertical swipes stay scrolls.
 * The gesture is rebuilt only when the item changes, so board updates stay cheap.
 */
export function useDragGesture(
  item: BoardItem,
  options: { enabled?: boolean; benchScrolls?: boolean } = {},
) {
  const enabled = options.enabled ?? true;
  const benchScrolls = options.benchScrolls ?? true;
  const {
    rootRef,
    pitchRef,
    benchRef,
    ghostX,
    ghostY,
    ghostVisible,
    dragInProgress,
    beginDrag,
    endDrag,
    tap,
  } = useBoardDrag();
  const ref = useAnimatedRef<Animated.View>();
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);
  const halfWidth = useSharedValue(0);
  const halfHeight = useSharedValue(0);
  const active = useSharedValue(NO_DRAG);
  /** Whether the finger travelled past the touch slop during this drag. */
  const moved = useSharedValue(false);
  const itemId = item.kind === 'slot' ? item.slotId : item.playerId;
  const fromBench = item.kind === 'bench';

  const gesture = useMemo(() => {
    const target: BoardItem =
      typeof itemId === 'string'
        ? { kind: 'slot', slotId: itemId }
        : { kind: 'bench', playerId: itemId };

    /** Each pan owns the drag it started (`active` holds its id), so a pan cancelled by the
     *  winner of a race never ends that drag. */
    const makePan = (id: number) =>
      Gesture.Pan()
        .enabled(enabled)
        .hitSlop(TOUCH_SLOP)
        .onStart((e) => {
          const root = measure(rootRef);
          const self = measure(ref);
          // A second finger on another token while one drag is running is ignored.
          if (dragInProgress.get() || !root || !self) return;
          dragInProgress.set(true);
          originX.set(self.pageX - root.pageX);
          originY.set(self.pageY - root.pageY);
          halfWidth.set(self.width / 2);
          halfHeight.set(self.height / 2);
          ghostX.set(fromBench ? originX.get() + e.x : originX.get() + halfWidth.get());
          ghostY.set(fromBench ? originY.get() + e.y : originY.get() + halfHeight.get());
          active.set(id);
          ghostVisible.set(true);
          scheduleOnRN(beginDrag, target);
        })
        .onUpdate((e) => {
          if (active.get() !== id) return;
          if (Math.hypot(e.translationX, e.translationY) > TOUCH_SLOP) moved.set(true);
          ghostX.set(originX.get() + (fromBench ? e.x : halfWidth.get() + e.translationX));
          ghostY.set(originY.get() + (fromBench ? e.y : halfHeight.get() + e.translationY));
        })
        // The ghost is hidden by the provider once the drop has rendered (see endDrag).
        .onFinalize((_e, success) => {
          if (active.get() !== id) return;
          active.set(NO_DRAG);
          dragInProgress.set(false);
          const wasMoved = moved.get();
          moved.set(false);

          // A bench hold that never moved was a slow tap: select instead of dropping in place.
          if (success && !wasMoved) {
            scheduleOnRN(endDrag, target, null);
            scheduleOnRN(tap, target);
            return;
          }

          const root = measure(rootRef);
          const pitch = measure(pitchRef);
          const bench = measure(benchRef);
          if (!success || !root || !pitch) {
            scheduleOnRN(endDrag, target, null);
            return;
          }
          const pageX = root.pageX + ghostX.get();
          const pageY = root.pageY + ghostY.get();
          const overBench =
            bench !== null &&
            pageX >= bench.pageX &&
            pageX <= bench.pageX + bench.width &&
            pageY >= bench.pageY &&
            pageY <= bench.pageY + bench.height;
          scheduleOnRN(endDrag, target, {
            x: (pageX - pitch.pageX) / pitch.width,
            y: (pageY - pitch.pageY) / pitch.height,
            overBench,
            pitchWidth: pitch.width,
            pitchHeight: pitch.height,
          });
        });
    // Bench: a swipe drags at once (only a sideways one while vertical moves scroll the
    // bench), and a short hold drags in any direction.
    const swipe = benchScrolls
      ? makePan(1)
          .activeOffsetX([-SWIPE_OFFSET, SWIPE_OFFSET])
          .failOffsetY([-SWIPE_OFFSET, SWIPE_OFFSET])
      : makePan(1).minDistance(SWIPE_OFFSET);
    const drag = fromBench
      ? Gesture.Race(swipe, makePan(2).activateAfterLongPress(BENCH_LONG_PRESS_MS))
      : makePan(3).minDistance(PITCH_MIN_DISTANCE);

    const tapGesture = Gesture.Tap()
      .enabled(enabled)
      .hitSlop(TOUCH_SLOP)
      // Pitch tokens have no long-press drag, so a slow, deliberate press still selects.
      .maxDuration(TAP_MAX_DURATION_MS)
      .runOnJS(true)
      .onEnd((_e, success) => {
        if (success) tap(target);
      });

    // The tap only fires once the pan has failed (lifted early, or never moved).
    return Gesture.Exclusive(drag, tapGesture);
  }, [
    itemId,
    fromBench,
    enabled,
    benchScrolls,
    rootRef,
    pitchRef,
    benchRef,
    ref,
    ghostX,
    ghostY,
    ghostVisible,
    dragInProgress,
    originX,
    originY,
    halfWidth,
    halfHeight,
    active,
    moved,
    beginDrag,
    endDrag,
    tap,
  ]);

  return { ref, gesture };
}
