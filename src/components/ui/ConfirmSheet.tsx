import { Text } from 'react-native';

import { Button } from './Button';
import { Sheet } from './Sheet';

type ConfirmSheetProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  /**
   * `danger` (red) for destructive or high-stakes actions; `primary` (green) for a step that
   * only needs a second look, like ending a half. Red there would teach coaches to ignore red.
   */
  tone?: 'danger' | 'primary';
  /** Why the last confirm failed, shown in red above the buttons. */
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
};

/** A yes/no question: the confirm button above a plain cancel. */
export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'danger',
  error = null,
  onConfirm,
  onClose,
}: ConfirmSheetProps) {
  return (
    <Sheet visible={visible} title={title} onClose={onClose}>
      <Text className="text-base text-gray-700">{message}</Text>
      {error && (
        <Text accessibilityLiveRegion="polite" className="text-sm text-red-600">
          {error}
        </Text>
      )}
      <Button label={confirmLabel} variant={tone} onPress={onConfirm} />
      <Button label={cancelLabel} variant="secondary" onPress={onClose} />
    </Sheet>
  );
}
