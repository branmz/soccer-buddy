import type { ReactNode } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { capitalizeWords } from '@/domain/text';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';

import { IconButton } from './IconButton';

const MAX_HEIGHT_RATIO = 0.85;
/** Space kept between the status bar and the top of the sheet, so the backdrop stays tappable. */
const TOP_GAP = 48;
/** Never squeeze the sheet below its header plus a little content (e.g. landscape + keyboard). */
const MIN_HEIGHT = 160;

type SheetProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

/** Bottom sheet for short forms and pickers. Tapping the backdrop or Android back closes it. */
export function Sheet({ visible, title, onClose, children }: SheetProps) {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const { height: windowHeight } = useWindowDimensions();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end" style={{ paddingTop: insets.top }}>
        <Pressable
          // Tap-outside-to-close for sighted users only; screen readers use the Close button.
          accessible={false}
          importantForAccessibility="no"
          onPress={onClose}
          className="absolute inset-0 bg-black/40"
        />
        <View
          className="rounded-t-3xl bg-white"
          // Sit on top of the keyboard. Android reports the keyboard height minus the navigation
          // bar (ReactRootView: ime.bottom - systemBars.bottom), so adding the bottom inset puts
          // the content flush with the keyboard's top edge. The height cap
          // keeps the sheet below the status bar; taller content scrolls.
          style={{
            marginBottom: keyboardHeight,
            // iOS reports the full keyboard height (home-indicator area included).
            paddingBottom:
              keyboardHeight > 0 ? (Platform.OS === 'ios' ? 0 : insets.bottom) : insets.bottom + 16,
            maxHeight: Math.max(
              MIN_HEIGHT,
              Math.min(
                windowHeight * MAX_HEIGHT_RATIO,
                windowHeight - keyboardHeight - insets.top - TOP_GAP,
              ),
            ),
          }}
        >
          <View className="flex-row items-center justify-between py-2 pr-2 pl-5">
            <Text accessibilityRole="header" className="text-lg font-bold text-gray-900">
              {capitalizeWords(title)}
            </Text>
            <IconButton icon="close" label="Close" onPress={onClose} color="#6b7280" />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-4 px-5">
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
