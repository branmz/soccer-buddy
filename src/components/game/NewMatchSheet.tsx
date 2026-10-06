import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { TextField } from '@/components/ui/TextField';
import { userMessage } from '@/db/repositories/errors';
import { createMatchDraft } from '@/db/repositories/matches';
import type { Match } from '@/db/schema';
import { useOpenCount } from '@/hooks/useOpenCount';

type NewMatchSheetProps = {
  visible: boolean;
  teamId: number;
  onClose: () => void;
  onCreated: (match: Match) => void;
};

/** Asks for the opponent, then creates a match in setup with the team's usual settings. */
export function NewMatchSheet({ visible, teamId, onClose, onCreated }: NewMatchSheetProps) {
  const openCount = useOpenCount(visible);
  return (
    <Sheet visible={visible} title="New match" onClose={onClose}>
      <NewMatchForm key={openCount} teamId={teamId} onCreated={onCreated} />
    </Sheet>
  );
}

function NewMatchForm({ teamId, onCreated }: Pick<NewMatchSheetProps, 'teamId' | 'onCreated'>) {
  const [opponent, setOpponent] = useState('');
  const [error, setError] = useState<string | null>(null);

  function create() {
    try {
      onCreated(createMatchDraft(teamId, opponent));
    } catch (e) {
      setError(userMessage(e));
    }
  }

  return (
    <>
      <TextField
        label="Opponent"
        value={opponent}
        onChangeText={(text) => {
          setOpponent(text);
          setError(null);
        }}
        placeholder="e.g. Riverside FC"
        autoFocus
        autoCapitalize="words"
        returnKeyType="done"
        error={error}
      />
      <Button label="Set up match" icon="arrow-forward" onPress={create} />
    </>
  );
}
