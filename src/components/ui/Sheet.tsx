import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Keyboard,
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

import { Button } from './Button';
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

const DiscardGuardContext = createContext<((edited: boolean) => void) | null>(null);

/**
 * Marks the sheet's form as edited. While it is, Android back, the backdrop and Close ask
 * before throwing the edits away. Saving still closes straight away (call `onClose` directly).
 */
export function useDiscardGuard(edited: boolean): void {
  const setEdited = useContext(DiscardGuardContext);
  useEffect(() => {
    setEdited?.(edited);
    return () => setEdited?.(false);
  }, [setEdited, edited]);
}

/** Bottom sheet for short forms and pickers. Tapping the backdrop or Android back closes it. */
export function Sheet({ visible, title, onClose, children }: SheetProps) {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const { height: windowHeight } = useWindowDimensions();
  const edited = useRef(false);
  const setEdited = useCallback((value: boolean) => {
    edited.current = value;
  }, []);
  const [confirming, setConfirming] = useState(false);
  if (!visible && confirming) setConfirming(false);

  /** Back, the backdrop and Close: asks first if the form has edits. */
  function requestClose() {
    if (confirming) {
      setConfirming(false);
    } else if (edited.current) {
      Keyboard.dismiss();
      setConfirming(true);
    } else {
      onClose();
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={requestClose}
    >
      <View className="flex-1 justify-end" style={{ paddingTop: insets.top }}>
        <Pressable
          // Tap-outside-to-close for sighted users only; screen readers use the Close button.
          accessible={false}
          importantForAccessibility="no"
          onPress={requestClose}
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
            <IconButton icon="close" label="Close" onPress={requestClose} color="#6b7280" />
          </View>
          {confirming && (
            <View className="gap-4 px-5">
              <Text accessibilityLiveRegion="polite" className="text-base text-gray-700">
                Close without saving? Your changes will be lost.
              </Text>
              <Button label="Discard changes" variant="danger" onPress={onClose} />
              <Button
                label="Keep editing"
                variant="secondary"
                onPress={() => setConfirming(false)}
              />
            </View>
          )}
          {/* Hidden, not unmounted, so the form keeps its edits behind the question. */}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            className={confirming ? 'hidden' : 'flex'}
            contentContainerClassName="gap-4 px-5"
          >
            <DiscardGuardContext value={setEdited}>{children}</DiscardGuardContext>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
