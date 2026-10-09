import { useRef, useState } from 'react';
import { Keyboard, Switch, Text, TextInput, View } from 'react-native';

import { PositionFields } from '@/components/teams/PositionFields';
import { Button } from '@/components/ui/Button';
import { Sheet, useDiscardGuard } from '@/components/ui/Sheet';
import { TextField } from '@/components/ui/TextField';
import { BRAND } from '@/constants/colors';
import { userMessage } from '@/db/repositories/errors';
import { addPlayer, playerHasMatchHistory, updatePlayer } from '@/db/repositories/players';
import type { Player } from '@/db/schema';
import type { PlayerPosition } from '@/domain/positions';
import {
  findJerseyConflict,
  findNameConflict,
  parseJerseyInput,
  type RosterEntry,
} from '@/domain/roster';
import { useOpenCount } from '@/hooks/useOpenCount';

type PlayerFormSheetProps = {
  visible: boolean;
  teamId: number;
  /** Edit this player; omit to add a new one. */
  player?: Player;
  /** The current roster, for duplicate name and jersey warnings. */
  roster: readonly RosterEntry[];
  onClose: () => void;
  /** Asks to delete the player: the screen closes this sheet and confirms in its own. */
  onDeletePress?: (player: Player) => void;
};

export function PlayerFormSheet({
  visible,
  teamId,
  player,
  roster,
  onClose,
  onDeletePress,
}: PlayerFormSheetProps) {
  const openCount = useOpenCount(visible);
  // Bumped after "Add & next" so the form remounts empty.
  const [formKey, setFormKey] = useState(0);
  return (
    <Sheet visible={visible} title={player ? 'Edit player' : 'Add player'} onClose={onClose}>
      <PlayerForm
        key={`${openCount}-${player?.id ?? 'new'}-${formKey}`}
        teamId={teamId}
        player={player}
        roster={roster}
        onClose={onClose}
        onDeletePress={onDeletePress}
        onAddAnother={() => setFormKey((k) => k + 1)}
      />
    </Sheet>
  );
}

type PlayerFormProps = Omit<PlayerFormSheetProps, 'visible'> & { onAddAnother: () => void };

function PlayerForm({
  teamId,
  player,
  roster,
  onClose,
  onDeletePress,
  onAddAnother,
}: PlayerFormProps) {
  const [name, setName] = useState(player?.name ?? '');
  const [jerseyText, setJerseyText] = useState(player?.jerseyNumber?.toString() ?? '');
  const [isActive, setIsActive] = useState(player?.isActive ?? true);
  const [primaryPosition, setPrimaryPosition] = useState(player?.primaryPosition ?? null);
  const [secondaryPosition, setSecondaryPosition] = useState(player?.secondaryPosition ?? null);
  const [error, setError] = useState<string | null>(null);
  const jerseyRef = useRef<TextInput>(null);
  useDiscardGuard(
    name !== (player?.name ?? '') ||
      jerseyText !== (player?.jerseyNumber?.toString() ?? '') ||
      isActive !== (player?.isActive ?? true) ||
      primaryPosition !== (player?.primaryPosition ?? null) ||
      secondaryPosition !== (player?.secondaryPosition ?? null),
  );

  const jersey = parseJerseyInput(jerseyText);
  const jerseyError = jersey === undefined ? 'Use digits only, or leave blank' : null;
  const conflict =
    jersey === undefined || !isActive ? undefined : findJerseyConflict(roster, jersey, player?.id);
  const jerseyWarning = conflict ? `${conflict.name} also wears #${jersey}` : null;
  // Two "Michael"s look the same on the pitch and in pickers: nudge, but never block.
  const namesake = isActive ? findNameConflict(roster, name, player?.id) : undefined;
  const nameWarning = namesake
    ? `Another ${namesake.name}${
        namesake.jerseyNumber === null ? '' : ` (#${namesake.jerseyNumber})`
      } is on the roster. Add a last initial to tell them apart.`
    : null;
  // History can't change while the sheet is open, so query once rather than per keystroke.
  const [hasHistory] = useState(() => (player ? playerHasMatchHistory(player.id) : false));

  function choosePrimary(position: PlayerPosition | null) {
    setPrimaryPosition(position);
    // A secondary needs a primary, and can't repeat it.
    if (position === null || position === secondaryPosition) setSecondaryPosition(null);
  }

  function save(addAnother = false) {
    if (jersey === undefined) return;
    const positions = { primaryPosition, secondaryPosition };
    try {
      if (player) updatePlayer(player.id, { name, jerseyNumber: jersey, isActive, positions });
      else addPlayer(teamId, { name, jerseyNumber: jersey, positions });
      if (addAnother) onAddAnother();
      else onClose();
    } catch (e) {
      setError(userMessage(e));
    }
  }

  return (
    <>
      <TextField
        label="Name"
        value={name}
        onChangeText={(text) => {
          setName(text);
          setError(null);
        }}
        placeholder="Player name"
        autoFocus={!player}
        autoCapitalize="words"
        // Enter moves to the jersey field (keyboard stays up); it never saves.
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => jerseyRef.current?.focus()}
        error={error}
        warning={nameWarning}
      />
      <TextField
        ref={jerseyRef}
        returnKeyType="done"
        label="Jersey number"
        value={jerseyText}
        onChangeText={setJerseyText}
        // "Optional" like the position and kit fields.
        placeholder="Optional"
        keyboardType="number-pad"
        maxLength={2}
        error={jerseyError}
        warning={jerseyWarning}
      />
      <PositionFields
        primary={primaryPosition}
        secondary={secondaryPosition}
        onChangePrimary={choosePrimary}
        onChangeSecondary={setSecondaryPosition}
      />
      {player && (
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-base font-medium text-gray-900">Active</Text>
            <Text className="text-sm text-gray-500">
              Inactive players are hidden from formations and match day.
            </Text>
          </View>
          <Switch
            accessibilityLabel="Active"
            value={isActive}
            onValueChange={(value) => {
              Keyboard.dismiss();
              setIsActive(value);
            }}
            // Android's default thumb is blue: white on our green, light on grey when off.
            thumbColor={isActive ? '#ffffff' : '#f3f4f6'}
            trackColor={{ false: '#9ca3af', true: BRAND }}
          />
        </View>
      )}
      <Button
        label={player ? 'Save changes' : 'Add player'}
        icon={player ? 'save-outline' : 'person-add-outline'}
        disabled={jerseyError !== null}
        onPress={() => save()}
      />
      {!player && (
        <Button
          label="Add & next"
          icon="people-outline"
          variant="secondary"
          disabled={jerseyError !== null}
          onPress={() => save(true)}
        />
      )}
      {player &&
        (hasHistory ? (
          <Text className="text-center text-sm text-gray-500">
            {player.name} has match history, so they can&apos;t be deleted. Mark them inactive
            instead.
          </Text>
        ) : (
          onDeletePress && (
            <Button
              label="Delete player"
              variant="dangerOutline"
              icon="trash-outline"
              onPress={() => onDeletePress(player)}
            />
          )
        ))}
    </>
  );
}
