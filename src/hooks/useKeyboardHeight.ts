import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Current on-screen keyboard height (0 when hidden). Needed inside Modals on Android: with
 * edge-to-edge the modal window isn't resized for the keyboard, so KeyboardAvoidingView
 * has nothing to avoid and inputs end up underneath it.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}
