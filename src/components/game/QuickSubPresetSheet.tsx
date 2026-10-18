import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { JerseyBadge } from '@/components/teams/JerseyBadge';
import { Button } from '@/components/ui/Button';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Sheet, useDiscardGuard } from '@/components/ui/Sheet';
import { TextField } from '@/components/ui/TextField';
import { COLORS } from '@/constants/colors';
import { ICON } from '@/constants/icons';
import { userMessage } from '@/db/repositories/errors';
import { createPreset, updatePreset } from '@/db/repositories/presets';
import type { Player } from '@/db/schema';
import type { QuickSubPair } from '@/domain/types';
import { useOpenCount } from '@/hooks/useOpenCount';

export type EditablePreset = {
  id: number;
  name: string;
  pairs: QuickSubPair[];
  /** A team preset, offered in every match (not only this one). */
  everyMatch: boolean;
};

type QuickSubPresetSheetProps = {
  visible: boolean;
  /** null creates a new preset. */
  preset: EditablePreset | null;
  teamId: number;
  matchId: number;
  /** The players to choose from (the match squad), starters first. */
  players: Player[];
  kitColor: string | null;
  /** Names that tell players apart ("Michael #3"), from `distinctNames`. */
  nameOf: (playerId: number) => string;
  /** The player's spot in the lineup, else their preferred positions ("" for none). */
  positionOf: (player: Player) => string;
  onClose: () => void;
  /** Delete asks first: the screen closes this sheet and opens a confirm. */
  onDeletePress?: (preset: EditablePreset) => void;
};

/** Create or edit a quick-sub preset: a named set of subs made with one tap during a match. */
export function QuickSubPresetSheet(props: QuickSubPresetSheetProps) {
  const openCount = useOpenCount(props.visible);
  return (
    <Sheet
      visible={props.visible}
      title={props.preset ? 'Edit quick sub' : 'New quick sub'}
      onClose={props.onClose}
    >
      <PresetForm key={openCount} {...props} />
    </Sheet>
  );
}

type Draft = { out: number | null; in: number | null };
type Side = 'out' | 'in';

function PresetForm({
  preset,
  teamId,
  matchId,
  players,
  kitColor,
  nameOf,
  positionOf,
  onClose,
  onDeletePress,
}: QuickSubPresetSheetProps) {
  const [name, setName] = useState(preset?.name ?? '');
  const [scope, setScope] = useState<'match' | 'team'>('match');
  const [initialPairs] = useState<Draft[]>(() =>
    preset
      ? preset.pairs.map((p) => ({ out: p.outPlayerId, in: p.inPlayerId }))
      : [{ out: null, in: null }],
  );
  const [pairs, setPairs] = useState(initialPairs);
  useDiscardGuard(
    name !== (preset?.name ?? '') ||
      scope !== 'match' ||
      JSON.stringify(pairs) !== JSON.stringify(initialPairs),
  );
  const [picking, setPicking] = useState<{ index: number; side: Side } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const byId = new Map(players.map((p) => [p.id, p]));

  function setPlayer(index: number, side: Side, playerId: number) {
    setPairs((list) => list.map((pair, i) => (i === index ? { ...pair, [side]: playerId } : pair)));
    setPicking(null);
    setError(null);
  }

  function save() {
    if (pairs.some((p) => p.out === null || p.in === null)) {
      setError('Pick who comes off and who comes on for every sub');
      return;
    }
    const substitutions = pairs.map((p) => ({ outPlayerId: p.out ?? 0, inPlayerId: p.in ?? 0 }));
    try {
      if (preset) updatePreset(preset.id, { name, substitutions });
      else createPreset(scope === 'team' ? { teamId } : { matchId }, { name, substitutions });
      onClose();
    } catch (e) {
      setError(userMessage(e));
    }
  }

  const used = new Set(pairs.flatMap((p) => [p.out, p.in]).filter((id) => id !== null));

  return (
    <>
      <TextField
        label="Name"
        value={name}
        onChangeText={(text) => {
          setName(text);
          setError(null);
        }}
        placeholder="e.g. Half-time changes"
        autoCapitalize="sentences"
      />
      {!preset && (
        <SegmentedControl
          label="Use it in"
          options={[
            { label: 'This match', value: 'match' },
            { label: 'Every match', value: 'team' },
          ]}
          value={scope}
          onChange={setScope}
        />
      )}
      {pairs.map((pair, index) => (
        <View key={index} className="gap-2 rounded-xl border border-line p-3">
          <View className="flex-row items-center gap-2">
            <SectionHeading className="flex-1">Sub {index + 1}</SectionHeading>
            {pairs.length > 1 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove sub ${index + 1}`}
                hitSlop={8}
                onPress={() => {
                  setPairs((list) => list.filter((_, i) => i !== index));
                  setPicking(null);
                }}
                className="h-touch w-touch items-center justify-center rounded-full active:bg-danger-tint"
              >
                <Ionicons name="trash-outline" size={ICON.md} color={COLORS.danger} />
              </Pressable>
            )}
          </View>
          <View className="flex-row gap-2">
            {(['out', 'in'] as const).map((side) => {
              const player = pair[side] === null ? undefined : byId.get(pair[side]);
              const active = picking?.index === index && picking.side === side;
              return (
                <Pressable
                  key={side}
                  accessibilityRole="button"
                  accessibilityLabel={`${side === 'out' ? 'Off' : 'On'}: ${player ? nameOf(player.id) : 'not picked'}`}
                  accessibilityState={{ expanded: active }}
                  onPress={() => setPicking(active ? null : { index, side })}
                  className={`min-h-touch flex-1 flex-row items-center gap-2 rounded-xl border px-2 ${
                    active ? 'border-brand bg-brand-tint' : 'border-line-strong bg-surface'
                  }`}
                >
                  <Ionicons
                    name={side === 'out' ? 'arrow-down-circle' : 'arrow-up-circle'}
                    size={ICON.lg}
                    color={side === 'out' ? COLORS.danger : COLORS.brand}
                  />
                  <Text
                    numberOfLines={1}
                    // Same weight either way: toggling font weight leaves a ghost on Android.
                    className={`flex-1 text-label ${player ? 'text-ink' : 'text-ink-muted'}`}
                  >
                    {player ? nameOf(player.id) : side === 'out' ? 'Off' : 'On'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {picking?.index === index && (
            <View className="flex-row flex-wrap gap-2">
              {players
                .filter((p) => !used.has(p.id) || p.id === pair[picking.side])
                .map((p) => {
                  const position = positionOf(p);
                  return (
                    <Pressable
                      key={p.id}
                      accessibilityRole="button"
                      accessibilityLabel={position ? `${nameOf(p.id)}, ${position}` : nameOf(p.id)}
                      onPress={() => setPlayer(index, picking.side, p.id)}
                      className="min-h-touch flex-row items-center gap-1.5 rounded-full border border-line bg-surface py-1 pr-3 pl-1 active:bg-muted"
                    >
                      <JerseyBadge number={p.jerseyNumber} kitColor={kitColor} size={30} />
                      {/* Sibling Texts, not nested: nested spans mis-measure on Android. */}
                      <Text className="text-caption font-semibold text-ink">{nameOf(p.id)}</Text>
                      {position !== '' && (
                        <Text className="text-caption font-semibold text-ink-muted">
                          {position}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
            </View>
          )}
        </View>
      ))}
      <Button
        label="Add another sub"
        icon="add"
        variant="secondary"
        onPress={() => {
          setPairs((list) => [...list, { out: null, in: null }]);
          setPicking({ index: pairs.length, side: 'out' });
        }}
      />
      {error && (
        <Text accessibilityLiveRegion="polite" className="text-caption text-danger">
          {error}
        </Text>
      )}
      <Button label="Save quick sub" icon="save-outline" onPress={save} />
      {preset && onDeletePress && (
        <Button
          label="Delete quick sub"
          variant="dangerOutline"
          icon="trash-outline"
          onPress={() => onDeletePress(preset)}
        />
      )}
    </>
  );
}
