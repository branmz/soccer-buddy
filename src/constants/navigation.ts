import type { NativeStackNavigationOptions } from 'expo-router';

/**
 * Screen options shared by every tab's stack.
 *
 * `slide_from_right`, not Android's default: that one scales and cross-fades both screens
 * (the old one grows to 115% and fades to 40% while the new one fades in), so for a moment
 * a see-through, blown-up copy of the old screen ghosts behind the new one. A slide never
 * overlaps two half-transparent screens. `satisfies` keeps a misspelled option from
 * compiling and silently doing nothing.
 */
export const STACK_OPTIONS = {
  headerTintColor: '#1b5e20',
  animation: 'slide_from_right',
} as const satisfies NativeStackNavigationOptions;
