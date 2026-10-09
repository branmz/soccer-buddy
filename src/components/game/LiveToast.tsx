import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';

import { BRAND } from '@/constants/colors';

/** `success`: something was recorded (offers Undo). `undone`: an undo happened (no button,
 *  so it can't be mistaken for a redo). `error`: something was refused. */
export type Toast = { id: number; text: string; tone: 'success' | 'undone' | 'error' };

const TONE = {
  success: {
    box: 'border-brand bg-white',
    text: 'text-gray-900',
    icon: 'checkmark-circle',
    iconColor: BRAND,
  },
  undone: {
    box: 'border-gray-400 bg-white',
    text: 'text-gray-900',
    icon: 'arrow-undo-circle',
    iconColor: '#4b5563',
  },
  error: {
    box: 'border-red-800 bg-red-700',
    text: 'text-white',
    icon: 'alert-circle',
    iconColor: '#ffffff',
  },
} as const;

type LiveToastProps = {
  toast: Toast;
  /** Offered on success toasts only. */
  onUndo?: () => void;
};

/**
 * A short message over the bottom of the pitch after recording something (or failing to): near
 * the thumb, so its Undo is in reach, and clear of the forwards. Solid colors only: a
 * see-through background washed out against the grass. It stops at the bench (the right quarter
 * of the board, see BenchSidebar) so bench players stay visible.
 */
export function LiveToast({ toast, onUndo }: LiveToastProps) {
  const style = TONE[toast.tone];
  return (
    <View
      accessibilityLiveRegion="polite"
      className={`absolute right-1/4 bottom-2 left-2 mr-2 min-h-14 flex-row items-center gap-2 rounded-xl border-2 py-2 pr-1 pl-3 ${style.box}`}
      // Mounted fresh for each toast (keyed), so the shadow never toggles (no Android ghosting).
      style={{ elevation: 6 }}
    >
      <Ionicons name={style.icon} size={26} color={style.iconColor} />
      <Text className={`flex-1 text-lg font-bold ${style.text}`}>{toast.text}</Text>
      {toast.tone === 'success' && onUndo && (
        <Pressable
          accessibilityRole="button"
          onPress={onUndo}
          className="min-h-12 flex-row items-center gap-1 rounded-lg border border-gray-300 bg-white px-4 active:bg-gray-100"
        >
          <Ionicons name="arrow-undo" size={18} color="#111827" />
          <Text className="text-base font-bold text-gray-900">Undo</Text>
        </Pressable>
      )}
    </View>
  );
}
