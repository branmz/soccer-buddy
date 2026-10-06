import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { JerseyBadge } from '@/components/teams/JerseyBadge';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Sheet } from '@/components/ui/Sheet';
import { TextField } from '@/components/ui/TextField';
import { userMessage } from '@/db/repositories/errors';
import { createPreset, deletePreset, updatePreset } from '@/db/repositories/presets';
import type { Player } from '@/db/schema';
import type { QuickSubPair } from '@/domain/types';
import { useOpenCount } from '@/hooks/useOpenCount';

export type EditablePreset = { id: number; name: string; pairs: QuickSubPair[] };

type QuickSubPresetSheetProps = {
  visible: boolean;
  /** null creates a new preset. */
  preset: EditablePreset | null;
  teamId: number;
  matchId: number;
  /** The players to choose from (the match squad), starters first. */
  players: Player[];
  kitColor: string | null;
  onClose: () => void;
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
  onClose,
}: QuickSubPresetSheetProps) {
  const [name, setName] = useState(preset?.name ?? '');
  const [scope, setScope] = useState<'match' | 'team'>('match');
  const [pairs, setPairs] = useState<Draft[]>(
    preset
      ? preset.pairs.map((p) => ({ out: p.outPlayerId, in: p.inPlayerId }))
      : [{ out: null, in: null }],
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

  function remove() {
    if (!preset) return;
    deletePreset(preset.id);
    onClose();
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
        <View key={index} className="gap-2 rounded-xl border border-gray-200 p-3">
          <View className="flex-row items-center gap-2">
            <Text className="flex-1 text-sm font-semibold text-gray-500 uppercase">
              Sub {index + 1}
            </Text>
            {pairs.length > 1 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove sub ${index + 1}`}
                hitSlop={8}
                onPress={() => {
                  setPairs((list) => list.filter((_, i) => i !== index));
                  setPicking(null);
                }}
                className="h-9 w-9 items-center justify-center rounded-full active:bg-red-50"
              >
                <Ionicons name="trash-outline" size={20} color="#dc2626" />
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
                  accessibilityLabel={`${side === 'out' ? 'Off' : 'On'}: ${player?.name ?? 'not picked'}`}
                  accessibilityState={{ expanded: active }}
                  onPress={() => setPicking(active ? null : { index, side })}
                  className={`min-h-12 flex-1 flex-row items-center gap-2 rounded-xl border px-2 ${
                    active ? 'border-brand bg-green-50' : 'border-gray-300 bg-white'
                  }`}
                >
                  <Ionicons
                    name={side === 'out' ? 'arrow-down-circle' : 'arrow-up-circle'}
                    size={22}
                    color={side === 'out' ? '#dc2626' : '#16a34a'}
                  />
                  <Text
                    numberOfLines={1}
                    className={`flex-1 text-base ${player ? 'font-semibold text-gray-900' : 'text-gray-400'}`}
                  >
                    {player?.name ?? (side === 'out' ? 'Off' : 'On')}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {picking?.index === index && (
            <View className="flex-row flex-wrap gap-2">
              {players
                .filter((p) => !used.has(p.id) || p.id === pair[picking.side])
                .map((p) => (
                  <Pressable
                    key={p.id}
                    accessibilityRole="button"
                    onPress={() => setPlayer(index, picking.side, p.id)}
                    className="min-h-11 flex-row items-center gap-1.5 rounded-full border border-gray-200 bg-white py-1 pr-3 pl-1 active:bg-gray-100"
                  >
                    <JerseyBadge number={p.jerseyNumber} kitColor={kitColor} size={30} />
                    <Text className="text-sm font-semibold text-gray-900">{p.name}</Text>
                  </Pressable>
                ))}
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
        <Text accessibilityLiveRegion="polite" className="text-sm text-red-600">
          {error}
        </Text>
      )}
      <Button label="Save quick sub" icon="checkmark" onPress={save} />
      {preset && <Button label="Delete quick sub" variant="dangerOutline" onPress={remove} />}
    </>
  );
}
