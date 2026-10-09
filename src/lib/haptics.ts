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

/** A button that opens something (a picker, a confirm) was pressed: a light tick. */
export function tapHaptic(): void {
  const result =
    Platform.OS === 'android'
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Virtual_Key)
      : Haptics.selectionAsync();
  result.catch(() => undefined);
}

/**
 * Regulation time is up in this period: three strong pulses, unlike any tap or confirm, so a
 * coach watching play (not the clock) notices. The haptics engine has no long buzz (that needs
 * the VIBRATE permission), so the strongest effect repeats.
 */
export function periodEndHaptic(): void {
  for (const delay of [0, 450, 900]) {
    setTimeout(() => {
      const result =
        Platform.OS === 'android'
          ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Reject)
          : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      result.catch(() => undefined);
    }, delay);
  }
}

/** An action was refused. */
export function rejectHaptic(): void {
  const result =
    Platform.OS === 'android'
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Reject)
      : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  result.catch(() => undefined);
}
