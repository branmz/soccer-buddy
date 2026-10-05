import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { TextField } from '@/components/ui/TextField';
import { cleanName } from '@/domain/validation';
import { useOpenCount } from '@/hooks/useOpenCount';

type RenameFormationSheetProps = {
  visible: boolean;
  name: string;
  onClose: () => void;
  onRename: (name: string) => void;
};

/** Opened from the pencil next to the formation name. */
export function RenameFormationSheet({ visible, ...props }: RenameFormationSheetProps) {
  const openCount = useOpenCount(visible);
  return (
    <Sheet visible={visible} title="Rename formation" onClose={props.onClose}>
      <RenameForm key={openCount} {...props} />
    </Sheet>
  );
}

function RenameForm({
  name: initialName,
  onClose,
  onRename,
}: Omit<RenameFormationSheetProps, 'visible'>) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);

  function done() {
    const cleaned = cleanName(name, 'Formation name');
    if (!cleaned.ok) {
      setError(cleaned.error);
      return;
    }
    onRename(cleaned.value);
    onClose();
  }

  return (
    <>
      <TextField
        label="Formation name"
        value={name}
        onChangeText={(text) => {
          setName(text);
          setError(null);
        }}
        placeholder="e.g. 4-3-3 attacking"
        autoFocus
        autoCapitalize="sentences"
        returnKeyType="done"
        error={error}
      />
      <Button label="Done" icon="checkmark" onPress={done} />
    </>
  );
}
