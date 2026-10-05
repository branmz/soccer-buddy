import { Text } from 'react-native';

import { Button } from './Button';
import { Sheet } from './Sheet';

type ConfirmSheetProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
};

/** A destructive yes/no question: a red confirm button above a plain cancel. */
export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onClose,
}: ConfirmSheetProps) {
  return (
    <Sheet visible={visible} title={title} onClose={onClose}>
      <Text className="text-base text-gray-700">{message}</Text>
      <Button label={confirmLabel} variant="danger" onPress={onConfirm} />
      <Button label={cancelLabel} variant="secondary" onPress={onClose} />
    </Sheet>
  );
}
