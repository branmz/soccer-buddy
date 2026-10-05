import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';

type FormationOptionsSheetProps = {
  visible: boolean;
  hasPlayers: boolean;
  /** Only saved formations can be deleted. */
  canDelete: boolean;
  onClose: () => void;
  onClearPlayers: () => void;
  onDeletePress: () => void;
};

/** Opened from the header's More button. Renaming lives on the pencil by the name. */
export function FormationOptionsSheet({
  visible,
  hasPlayers,
  canDelete,
  onClose,
  onClearPlayers,
  onDeletePress,
}: FormationOptionsSheetProps) {
  return (
    <Sheet visible={visible} title="Formation options" onClose={onClose}>
      <Button
        label="Clear all players"
        icon="people-outline"
        variant="secondary"
        disabled={!hasPlayers}
        onPress={() => {
          onClearPlayers();
          onClose();
        }}
      />
      {canDelete && (
        <Button
          label="Delete formation"
          icon="trash-outline"
          variant="dangerOutline"
          onPress={onDeletePress}
        />
      )}
    </Sheet>
  );
}
