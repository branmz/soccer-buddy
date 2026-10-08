import { Text } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';

type UnsavedChangesSheetProps = {
  visible: boolean;
  name: string;
  /** Shown when saving failed, so the coach can fix it or discard instead. */
  error: string | null;
  onSave: () => void;
  onDiscard: () => void;
  onClose: () => void;
};

/** Asked when leaving the formation editor with unsaved changes. */
export function UnsavedChangesSheet({
  visible,
  name,
  error,
  onSave,
  onDiscard,
  onClose,
}: UnsavedChangesSheetProps) {
  return (
    <Sheet visible={visible} title="Save changes?" onClose={onClose}>
      <Text className="text-base text-gray-700">
        Your changes to <Text className="font-bold">{name}</Text> haven&apos;t been saved.
      </Text>
      {error && (
        <Text accessibilityLiveRegion="polite" className="text-sm text-red-600">
          {error}
        </Text>
      )}
      <Button label="Save" icon="save-outline" onPress={onSave} />
      <Button label="Discard changes" icon="trash-outline" variant="danger" onPress={onDiscard} />
      <Button label="Keep editing" icon="create-outline" variant="secondary" onPress={onClose} />
    </Sheet>
  );
}
