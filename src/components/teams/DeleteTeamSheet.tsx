import { useState } from 'react';
import { Text } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { TextField } from '@/components/ui/TextField';
import { userMessage } from '@/db/repositories/errors';
import { deleteTeam } from '@/db/repositories/teams';
import type { Team } from '@/db/schema';
import { useOpenCount } from '@/hooks/useOpenCount';

type DeleteTeamSheetProps = {
  visible: boolean;
  /** Kept set while the sheet animates closed, so its content doesn't blank out. */
  team: Team | null;
  onClose: () => void;
  onDeleted?: () => void;
};

/** Deleting a team erases its whole history, so the coach must type the team name. */
export function DeleteTeamSheet({ visible, team, onClose, onDeleted }: DeleteTeamSheetProps) {
  const openCount = useOpenCount(visible);
  return (
    <Sheet visible={visible} title="Delete team?" onClose={onClose}>
      {team && (
        <DeleteTeamForm
          key={`${openCount}-${team.id}`}
          team={team}
          onClose={onClose}
          onDeleted={onDeleted}
        />
      )}
    </Sheet>
  );
}

type DeleteTeamFormProps = Omit<DeleteTeamSheetProps, 'visible' | 'team'> & { team: Team };

function DeleteTeamForm({ team, onClose, onDeleted }: DeleteTeamFormProps) {
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);
  const matches = typed.trim().toLowerCase() === team.name.toLowerCase();

  function confirm() {
    try {
      deleteTeam(team.id);
      onDeleted?.();
      onClose();
    } catch (e) {
      setError(userMessage(e));
    }
  }

  return (
    <>
      <Text className="text-base text-gray-700">
        This permanently deletes <Text className="font-bold">{team.name}</Text> with its roster,
        formations, matches and stats. This can&apos;t be undone.
      </Text>
      <TextField
        label={`Type "${team.name}" to confirm`}
        value={typed}
        onChangeText={setTyped}
        autoCapitalize="none"
        autoCorrect={false}
        error={error}
      />
      <Button label="Delete team" variant="danger" disabled={!matches} onPress={confirm} />
      <Button label="Cancel" variant="secondary" onPress={onClose} />
    </>
  );
}
