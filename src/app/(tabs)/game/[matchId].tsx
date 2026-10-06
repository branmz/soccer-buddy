import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormationPickerSheet } from '@/components/game/FormationPickerSheet';
import { LineupPreview } from '@/components/game/LineupPreview';
import { QuickSubPresetSheet, type EditablePreset } from '@/components/game/QuickSubPresetSheet';
import { SquadSheet } from '@/components/game/SquadSheet';
import { ColorSwatch } from '@/components/teams/ColorSwatch';
import { Button } from '@/components/ui/Button';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SelectField } from '@/components/ui/SelectField';
import { TextField } from '@/components/ui/TextField';
import { userMessage } from '@/db/repositories/errors';
import { kickoff } from '@/db/repositories/liveMatch';
import {
  deleteMatch,
  getMatch,
  matchLineup,
  setMatchFormation,
  setMatchSquad,
  updateMatchSetup,
  type MatchSetupInput,
} from '@/db/repositories/matches';
import { playersQuery } from '@/db/repositories/players';
import { presetsForMatch } from '@/db/repositories/presets';
import { getTeam } from '@/db/repositories/teams';
import { matches, players, quickSubPresets, teams } from '@/db/schema';
import { lineupPlayerIds, matchKitColor } from '@/domain/matchSetup';
import { MAX_PERIODS } from '@/domain/validation';
import { useLiveData } from '@/hooks/useLiveData';

const PERIOD_OPTIONS = Array.from({ length: MAX_PERIODS }, (_, i) => ({
  label: String(i + 1),
  value: i + 1,
}));

/** Whole minutes or subs from a text field; null when blank, NaN when not a number. */
function parseCount(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  return /^\d+$/.test(trimmed) ? Number(trimmed) : NaN;
}

export default function MatchSetupScreen() {
  const params = useLocalSearchParams<{ matchId: string }>();
  const matchId = Number(params.matchId);
  const insets = useSafeAreaInsets();

  const match = useLiveData(() => getMatch(matchId), [matchId], [matches]);
  const teamId = match?.teamId ?? null;
  const team = useLiveData(
    () => (teamId === null ? undefined : getTeam(teamId)),
    [teamId],
    [teams],
  );
  const roster = useLiveData(
    () => (teamId === null ? [] : playersQuery(teamId, { activeOnly: true }).all()),
    [teamId],
    [players],
  );
  const presets = useLiveData(
    () => (teamId === null ? [] : presetsForMatch(teamId, matchId)),
    [teamId, matchId],
    [quickSubPresets],
  );

  const [opponent, setOpponent] = useState(match?.opponentName ?? '');
  const [lengthText, setLengthText] = useState(String(match?.periodLengthMinutes ?? ''));
  const [maxSubsText, setMaxSubsText] = useState(
    match?.maxSubs === null || match?.maxSubs === undefined ? '' : String(match.maxSubs),
  );
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [formationOpen, setFormationOpen] = useState(false);
  const [squadOpen, setSquadOpen] = useState(false);
  const [presetSheet, setPresetSheet] = useState<{
    open: boolean;
    preset: EditablePreset | null;
  }>({ open: false, preset: null });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleted, setDeleted] = useState(false);

  if (deleted) return null;
  if (!match || !team) {
    return (
      <EmptyState
        icon="alert-circle-outline"
        title="Match not found"
        message="Go back to Game Day."
      />
    );
  }
  if (match.status !== 'setup') {
    return (
      <EmptyState
        icon="stopwatch-outline"
        title="Already kicked off"
        message={`The match against ${match.opponentName} has started.`}
        action={
          match.status === 'live' ? (
            <Button
              label="Open live match"
              icon="play"
              onPress={() =>
                router.push({
                  pathname: '/live/[matchId]',
                  params: { matchId: String(match.id) },
                })
              }
            />
          ) : undefined
        }
      />
    );
  }

  const lineup = matchLineup(match);
  const squad = new Set(lineup ? lineupPlayerIds(lineup) : []);
  const kitColor = matchKitColor(team, match.isHome);
  const byId = new Map(roster.map((p) => [p.id, p]));
  const onPitch = new Set(lineup?.slots.flatMap((s) => (s.playerId ? [s.playerId] : [])) ?? []);
  const squadPlayers = roster
    .filter((p) => squad.has(p.id))
    .sort((a, b) => Number(onPitch.has(b.id)) - Number(onPitch.has(a.id)));
  const placed = onPitch.size;

  /** Saves one setup field; a validation message shows under that field. */
  function save(field: string, patch: Partial<MatchSetupInput>) {
    try {
      updateMatchSetup(matchId, patch);
      setFieldErrors((e) => ({ ...e, [field]: undefined }));
    } catch (e) {
      setFieldErrors((errors) => ({ ...errors, [field]: userMessage(e) }));
    }
  }

  function run(write: () => void) {
    try {
      write();
      setError(null);
    } catch (e) {
      setError(userMessage(e));
    }
  }

  function startMatch() {
    try {
      kickoff(matchId);
    } catch (e) {
      setError(userMessage(e));
      return;
    }
    router.dismissAll();
    router.push({ pathname: '/live/[matchId]', params: { matchId: String(matchId) } });
  }

  return (
    <View className="flex-1 bg-gray-50">
      <Stack.Screen
        options={{
          title: `vs ${match.opponentName}`,
          headerRight: () => (
            <IconButton
              icon="trash-outline"
              label="Delete match"
              color="#dc2626"
              onPress={() => setDeleteOpen(true)}
            />
          ),
        }}
      />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-4 p-4 pb-8">
        <Card title="Match">
          <TextField
            label="Opponent"
            value={opponent}
            onChangeText={(text) => {
              setOpponent(text);
              save('opponent', { opponentName: text });
            }}
            autoCapitalize="words"
            error={fieldErrors.opponent}
          />
          <SegmentedControl
            label="Venue"
            options={[
              { label: 'Home', value: 'home' },
              { label: 'Away', value: 'away' },
            ]}
            value={match.isHome ? 'home' : 'away'}
            onChange={(venue) => save('venue', { isHome: venue === 'home' })}
          />
          {kitColor && (
            <View className="-mt-2 flex-row items-center gap-2">
              <ColorSwatch color={kitColor} size={20} />
              <Text className="text-sm text-gray-600">
                Wearing the {match.isHome || !team.awayColor ? 'home' : 'away'} kit
              </Text>
            </View>
          )}
          <SegmentedControl
            label="Periods"
            options={PERIOD_OPTIONS}
            value={match.periodCount}
            onChange={(periodCount) => save('periods', { periodCount })}
          />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <TextField
                label="Minutes per period"
                value={lengthText}
                keyboardType="number-pad"
                onChangeText={(text) => {
                  setLengthText(text);
                  save('length', { periodLengthMinutes: parseCount(text) ?? NaN });
                }}
                error={fieldErrors.length}
              />
            </View>
            <View className="flex-1">
              <TextField
                label="Max subs"
                value={maxSubsText}
                placeholder="No limit"
                keyboardType="number-pad"
                onChangeText={(text) => {
                  setMaxSubsText(text);
                  save('maxSubs', { maxSubs: parseCount(text) });
                }}
                error={fieldErrors.maxSubs}
              />
            </View>
          </View>
          {fieldErrors.periods && (
            <Text className="text-sm text-red-600">{fieldErrors.periods}</Text>
          )}
          {fieldErrors.venue && <Text className="text-sm text-red-600">{fieldErrors.venue}</Text>}
        </Card>

        <Card title="Lineup">
          <View className="flex-row gap-3">
            <SelectField
              label="Formation"
              valueText={match.formationName}
              placeholder="Pick a formation"
              expanded={formationOpen}
              onPress={() => setFormationOpen(true)}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Who's here: ${squad.size} of ${roster.length} players. Change`}
            onPress={() => setSquadOpen(true)}
            className="min-h-12 flex-row items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 active:bg-gray-50"
          >
            <Ionicons name="people-outline" size={20} color="#1b5e20" />
            <Text className="flex-1 text-base text-gray-900">
              <Text className="font-semibold">{squad.size}</Text> of {roster.length} players here
            </Text>
            <Text className="text-base font-semibold text-brand">Change</Text>
          </Pressable>
          {lineup && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Starting lineup: ${placed} players placed. Edit lineup`}
              onPress={() =>
                router.push({
                  pathname: '/game/lineup/[matchId]',
                  params: { matchId: String(matchId) },
                })
              }
              className="gap-2 rounded-xl active:opacity-80"
            >
              <LineupPreview
                slots={lineup.slots}
                playerById={(id) => byId.get(id)}
                kitColor={kitColor}
                height={300}
              />
              <Text className="text-center text-sm text-gray-600">
                {placed} of {lineup.slots.length} spots filled · {lineup.bench.length} on the bench
              </Text>
            </Pressable>
          )}
          {lineup && (
            <Button
              label="Edit lineup"
              icon="create-outline"
              variant="secondary"
              onPress={() =>
                router.push({
                  pathname: '/game/lineup/[matchId]',
                  params: { matchId: String(matchId) },
                })
              }
            />
          )}
        </Card>

        <Card title="Quick subs">
          <Text className="text-sm text-gray-600">
            Plan subs ahead and make them with one tap during the match.
          </Text>
          {presets.map((preset) => (
            <Pressable
              key={preset.id}
              accessibilityRole="button"
              onPress={() =>
                setPresetSheet({
                  open: true,
                  preset: {
                    id: preset.id,
                    name: preset.presetName,
                    pairs: preset.substitutions,
                  },
                })
              }
              className="min-h-14 flex-row items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2 active:bg-gray-50"
            >
              <Ionicons name="swap-vertical" size={22} color="#1b5e20" />
              <View className="flex-1">
                <Text numberOfLines={1} className="text-base font-bold text-gray-900">
                  {preset.presetName}
                </Text>
                <Text numberOfLines={2} className="text-sm text-gray-500">
                  {preset.substitutions
                    .map(
                      (p) =>
                        `${byId.get(p.inPlayerId)?.name ?? '?'} for ${byId.get(p.outPlayerId)?.name ?? '?'}`,
                    )
                    .join(', ')}
                </Text>
              </View>
              <Text className="text-xs font-semibold text-gray-500 uppercase">
                {preset.teamId === null ? 'This match' : 'Every match'}
              </Text>
            </Pressable>
          ))}
          <Button
            label="Add quick sub"
            icon="add"
            variant="secondary"
            onPress={() => setPresetSheet({ open: true, preset: null })}
          />
        </Card>
      </ScrollView>

      <View
        className="gap-2 border-t border-gray-200 bg-white px-4 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        {error && (
          <Text accessibilityLiveRegion="polite" className="text-sm text-red-600">
            {error}
          </Text>
        )}
        <Button label="Kick off" icon="play" onPress={startMatch} className="min-h-14" />
      </View>

      <FormationPickerSheet
        visible={formationOpen}
        teamId={team.id}
        fieldSize={team.fieldSize}
        selected={{ formationId: match.formationId, name: match.formationName }}
        onPick={(choice) => {
          run(() => setMatchFormation(matchId, choice));
          setFormationOpen(false);
        }}
        onClose={() => setFormationOpen(false)}
      />
      <SquadSheet
        visible={squadOpen}
        roster={roster}
        squad={squad}
        kitColor={kitColor}
        onToggle={(playerId) => {
          const next = roster
            .map((p) => p.id)
            .filter((id) => (id === playerId ? !squad.has(id) : squad.has(id)));
          run(() => setMatchSquad(matchId, next));
        }}
        onClose={() => setSquadOpen(false)}
      />
      <QuickSubPresetSheet
        visible={presetSheet.open}
        preset={presetSheet.preset}
        teamId={team.id}
        matchId={matchId}
        players={squadPlayers}
        kitColor={kitColor}
        onClose={() => setPresetSheet((s) => ({ ...s, open: false }))}
      />
      <ConfirmSheet
        visible={deleteOpen}
        title="Delete match?"
        message={`The match against ${match.opponentName} and its quick subs will be deleted.`}
        confirmLabel="Delete match"
        onConfirm={() => {
          deleteMatch(matchId);
          setDeleted(true);
          setDeleteOpen(false);
          router.back();
        }}
        onClose={() => setDeleteOpen(false)}
      />
    </View>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-4 rounded-2xl border border-gray-200 bg-white p-4">
      <Text accessibilityRole="header" className="text-lg font-bold text-gray-900">
        {title}
      </Text>
      {children}
    </View>
  );
}
