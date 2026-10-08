import { useState } from 'react';
import { Text } from 'react-native';

import { Button } from '@/components/ui/Button';
import { KitColorFields } from '@/components/teams/KitColorFields';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Sheet, useDiscardGuard } from '@/components/ui/Sheet';
import { TextField } from '@/components/ui/TextField';
import { userMessage } from '@/db/repositories/errors';
import { createTeam, updateTeam } from '@/db/repositories/teams';
import type { Team } from '@/db/schema';
import { FIELD_SIZES, type FieldSize } from '@/domain/types';
import { useOpenCount } from '@/hooks/useOpenCount';

const FIELD_SIZE_OPTIONS = FIELD_SIZES.map((size) => ({ label: `${size}v${size}`, value: size }));

type TeamFormSheetProps = {
  visible: boolean;
  /** Edit this team; omit to create a new one. */
  team?: Team;
  onClose: () => void;
  onSaved?: (team: Team) => void;
  onDeletePress?: () => void;
};

export function TeamFormSheet({
  visible,
  team,
  onClose,
  onSaved,
  onDeletePress,
}: TeamFormSheetProps) {
  const openCount = useOpenCount(visible);
  return (
    <Sheet visible={visible} title={team ? 'Edit team' : 'New team'} onClose={onClose}>
      <TeamForm
        key={`${openCount}-${team?.id ?? 'new'}`}
        team={team}
        onClose={onClose}
        onSaved={onSaved}
        onDeletePress={onDeletePress}
      />
    </Sheet>
  );
}

function TeamForm({ team, onClose, onSaved, onDeletePress }: Omit<TeamFormSheetProps, 'visible'>) {
  const [name, setName] = useState(team?.name ?? '');
  const [fieldSize, setFieldSize] = useState<FieldSize>(team?.fieldSize ?? 11);
  const [homeColor, setHomeColor] = useState(team?.homeColor ?? null);
  const [awayColor, setAwayColor] = useState(team?.awayColor ?? null);
  const [error, setError] = useState<string | null>(null);

  const sizeChanged = team !== undefined && fieldSize !== team.fieldSize;
  useDiscardGuard(
    name !== (team?.name ?? '') ||
      fieldSize !== (team?.fieldSize ?? 11) ||
      homeColor !== (team?.homeColor ?? null) ||
      awayColor !== (team?.awayColor ?? null),
  );

  function save() {
    try {
      const saved = team
        ? updateTeam(team.id, { name, fieldSize, homeColor, awayColor })
        : createTeam({ name, fieldSize, homeColor, awayColor });
      onSaved?.(saved);
      onClose();
    } catch (e) {
      setError(userMessage(e));
    }
  }

  return (
    <>
      <TextField
        label="Team name"
        value={name}
        onChangeText={(text) => {
          setName(text);
          setError(null);
        }}
        placeholder="e.g. U12 Lions"
        autoFocus={!team}
        autoCapitalize="words"
        returnKeyType="done"
        error={error}
      />
      <SegmentedControl
        label="Players on the field"
        options={FIELD_SIZE_OPTIONS}
        value={fieldSize}
        onChange={setFieldSize}
      />
      <KitColorFields
        home={homeColor}
        away={awayColor}
        onChangeHome={setHomeColor}
        onChangeAway={setAwayColor}
      />
      {sizeChanged && (
        <Text className="text-sm text-amber-700">
          Saved formations for {team.fieldSize}v{team.fieldSize} stay saved but are hidden until you
          switch back.
        </Text>
      )}
      <Button
        label={team ? 'Save changes' : 'Create team'}
        icon={team ? 'save-outline' : 'add'}
        onPress={save}
      />
      {team && onDeletePress && (
        <Button
          label="Delete team"
          variant="dangerOutline"
          icon="trash-outline"
          onPress={onDeletePress}
        />
      )}
    </>
  );
}
