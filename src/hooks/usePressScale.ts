import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const PRESSED_SCALE = 0.94;

/**
 * Shrinks a button while it's held. A pressed color alone (`active:bg-*`) vanishes in
 * sunlight; a size change still reads. Put `style` on an `Animated.View` around the
 * `Pressable`, and pass `onPressIn` / `onPressOut` to the `Pressable`.
 */
export function usePressScale() {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return {
    style,
    onPressIn: () => scale.set(withTiming(PRESSED_SCALE, { duration: 80 })),
    onPressOut: () => scale.set(withTiming(1, { duration: 140 })),
  };
}
