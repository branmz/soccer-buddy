import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Android's haptics engine (no VIBRATE permission) per the expo-haptics docs; iOS uses the
// standard feedback generators. Failures are ignored: haptics are a nicety.

/** Something was recorded (goal, sub, card, clock change). */
export function confirmHaptic(): void {
  const result =
    Platform.OS === 'android'
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm)
      : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  result.catch(() => undefined);
}

/** An action was refused. */
export function rejectHaptic(): void {
  const result =
    Platform.OS === 'android'
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Reject)
      : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  result.catch(() => undefined);
}
