import type { ReactNode } from 'react';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

const LIFT_SCALE = 1.15;

type DragLayerProps = {
  /** Ghost centre, relative to the board root. */
  x: SharedValue<number>;
  y: SharedValue<number>;
  visible: SharedValue<boolean>;
  size: number;
  children: ReactNode;
};

/** The token under the finger during a drag, drawn above everything on the board. */
export function DragLayer({ x, y, visible, size, children }: DragLayerProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: visible.get() ? 1 : 0,
    transform: [
      { translateX: x.get() - size / 2 },
      { translateY: y.get() - size / 2 },
      { scale: LIFT_SCALE },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ position: 'absolute', left: 0, top: 0, width: size, height: size }, animatedStyle]}
    >
      {children}
    </Animated.View>
  );
}
