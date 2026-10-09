import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams, useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useEffect, useLayoutEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { FormationBoard } from '@/components/pitch/FormationBoard';
import { FormationOptionsSheet } from '@/components/tactics/FormationOptionsSheet';
import { RenameFormationSheet } from '@/components/tactics/RenameFormationSheet';
import { UnsavedChangesSheet } from '@/components/tactics/UnsavedChangesSheet';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { HeaderButton } from '@/components/ui/HeaderButton';
import { BRAND } from '@/constants/colors';
import { getPresetFormation } from '@/constants/presetFormations';
import { userMessage } from '@/db/repositories/errors';
import {
  createFormation,
  deleteFormation,
  getFormation,
  updateFormation,
} from '@/db/repositories/formations';
import { playersQuery } from '@/db/repositories/players';
import { getTeam } from '@/db/repositories/teams';
import { formations, players, teams } from '@/db/schema';
import { keepAvailablePlayers } from '@/domain/board';
import { useActiveTeam } from '@/hooks/useActiveTeam';
import { useLiveData } from '@/hooks/useLiveData';
import { useBoardStore } from '@/stores/boardStore';

/**
 * Formation editor. `/tactics/<id>` edits a saved formation; `/tactics/new?preset=4-3-3`
 * starts a new one for the active team from a preset.
 */
export default function FormationEditorScreen() {
  const params = useLocalSearchParams<{ formationId: string; preset?: string }>();
  const isNew = params.formationId === 'new';
  const formationId = isNew ? null : Number(params.formationId);
  const navigation = useNavigation();

  // A new formation belongs to the team that was active when the editor opened.
  const { team: activeTeam } = useActiveTeam();
  const [newTeamId] = useState(activeTeam?.id ?? null);
  const saved = useLiveData(
    () => (formationId === null ? undefined : getFormation(formationId)),
    [formationId],
    [formations],
  );
  // Remember the team once known: after a delete, `saved` goes away while the screen pops.
  const liveTeamId = isNew ? newTeamId : (saved?.teamId ?? null);
  const [lastTeamId, setLastTeamId] = useState(liveTeamId);
  if (liveTeamId !== null && liveTeamId !== lastTeamId) setLastTeamId(liveTeamId);
  const teamId = liveTeamId ?? lastTeamId;
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
  const preset =
    isNew && team ? getPresetFormation(team.fieldSize, params.preset ?? '') : undefined;

  const loadKey = isNew ? `new:${teamId}:${params.preset}` : String(formationId);
  const storeKey = useBoardStore((s) => s.key);
  const name = useBoardStore((s) => s.name);
  const dirty = useBoardStore((s) => s.dirty);
  const hasPlayers = useBoardStore((s) => s.slots.some((slot) => slot.playerId !== undefined));
  const { load, setName, clearPlayers, markSaved, reset } = useBoardStore.getState();
  const ready = storeKey === loadKey;

  const [optionsOpen, setOptionsOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingLeave, setPendingLeave] = useState<
    Parameters<typeof navigation.dispatch>[0] | null
  >(null);

  // Load before paint so the previous formation never flashes. Only when the key changes:
  // roster updates while editing must not throw away unsaved work.
  useLayoutEffect(() => {
    if (ready) return;
    if (isNew && preset) {
      load(loadKey, preset.name, preset.slots);
    } else if (saved) {
      const available = new Set(roster.map((p) => p.id));
      load(loadKey, saved.name, keepAvailablePlayers(saved.layout.slots, available));
    }
  }, [ready, isNew, preset, saved, roster, load, loadKey]);

  useEffect(() => reset, [reset]);

  // E.g. the team was deleted on the Teams tab while this editor stayed mounted.
  const notFound = !deleted && (!team || (!isNew && !saved) || (isNew && !preset));

  // Disarmed when not found: there's nothing left to save, and no sheet to ask with.
  usePreventRemove(dirty && !notFound, ({ data }) => {
    // Saving or deleting clears `dirty` just before navigating, ahead of this re-render.
    if (useBoardStore.getState().dirty) setPendingLeave(data.action);
    else navigation.dispatch(data.action);
  });

  if (notFound || !team) {
    return (
      <EmptyState
        icon="alert-circle-outline"
        title="Formation not found"
        message="Go back to Tactics."
      />
    );
  }

  /** Returns false (with `saveError` set) if saving failed. */
  function save(options: { leaving?: boolean } = {}): boolean {
    if (teamId === null) return false;
    const current = useBoardStore.getState();
    const layout = {
      slots: keepAvailablePlayers(current.slots, new Set(roster.map((p) => p.id))),
    };
    try {
      if (formationId === null) {
        const created = createFormation(teamId, { name: current.name, layout });
        // The store key must match the route's key, or the editor reloads the preset. Staying:
        // both become the new id. Leaving: the route keeps `new`, so the key does too.
        if (options.leaving) {
          markSaved(loadKey);
        } else {
          markSaved(String(created.id));
          router.setParams({ formationId: String(created.id) });
        }
      } else {
        updateFormation(formationId, { name: current.name, layout });
        markSaved(String(formationId));
      }
      setSaveError(null);
      return true;
    } catch (e) {
      setSaveError(userMessage(e));
      return false;
    }
  }

  function leave(action: NonNullable<typeof pendingLeave>) {
    setPendingLeave(null);
    navigation.dispatch(action);
  }

  function confirmDelete() {
    if (formationId === null) return;
    try {
      deleteFormation(formationId);
    } catch (e) {
      setSaveError(userMessage(e));
      setDeleteOpen(false);
      return;
    }
    setDeleted(true);
    markSaved(loadKey);
    setDeleteOpen(false);
    router.back();
  }

  const canSave = isNew || dirty;

  return (
    <View className="flex-1 bg-gray-100">
      <Stack.Screen
        options={{
          title: name || 'Formation',
          // Tapping the name (or its pencil) renames the formation.
          headerTitle: ({ children }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Formation name: ${children}. Rename`}
              onPress={() => setRenameOpen(true)}
              className="min-h-12 max-w-52 flex-row items-center gap-2 rounded-full px-2 active:bg-green-50"
            >
              <Text numberOfLines={1} className="shrink text-xl font-bold text-pitch-dark">
                {children}
              </Text>
              <Ionicons name="create-outline" size={24} color={BRAND} />
            </Pressable>
          ),
          headerRight: () => (
            <View className="flex-row items-center gap-1">
              <HeaderButton
                label="More"
                accessibilityLabel="Formation options"
                icon="ellipsis-horizontal"
                onPress={() => setOptionsOpen(true)}
              />
              <HeaderButton
                label={canSave ? 'Save' : 'Saved'}
                accessibilityLabel={canSave ? 'Save formation' : 'All changes saved'}
                icon={canSave ? 'save-outline' : 'checkmark-done'}
                variant={canSave ? 'primary' : 'secondary'}
                disabled={!canSave}
                onPress={() => save()}
              />
            </View>
          ),
        }}
      />

      {saveError && (
        <Text accessibilityLiveRegion="polite" className="bg-red-50 px-4 py-2 text-sm text-red-700">
          {saveError}
        </Text>
      )}
      {roster.length === 0 && (
        <Text className="bg-amber-50 px-4 py-2 text-sm text-amber-800">
          {team.name} has no active players yet. Add them on the Teams tab, or save the shape now
          and fill it in later.
        </Text>
      )}
      {ready && <FormationBoard roster={roster} kitColor={team.homeColor} />}

      <RenameFormationSheet
        visible={renameOpen}
        name={name}
        onClose={() => setRenameOpen(false)}
        onRename={setName}
      />
      <FormationOptionsSheet
        visible={optionsOpen}
        hasPlayers={hasPlayers}
        canDelete={!isNew}
        onClose={() => setOptionsOpen(false)}
        onClearPlayers={clearPlayers}
        onDeletePress={() => {
          setOptionsOpen(false);
          setDeleteOpen(true);
        }}
      />
      <ConfirmSheet
        visible={deleteOpen}
        title="Delete formation?"
        message={`${name} will be deleted. Matches that used it keep their lineups.`}
        confirmLabel="Delete formation"
        onConfirm={confirmDelete}
        onClose={() => setDeleteOpen(false)}
      />
      <UnsavedChangesSheet
        visible={pendingLeave !== null}
        name={name}
        error={saveError}
        onSave={() => {
          if (pendingLeave && save({ leaving: true })) leave(pendingLeave);
        }}
        onDiscard={() => {
          if (!pendingLeave) return;
          markSaved(loadKey);
          leave(pendingLeave);
        }}
        onClose={() => setPendingLeave(null)}
      />
    </View>
  );
}
