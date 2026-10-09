import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, SectionList, Text, View } from 'react-native';

import { DeleteTeamSheet } from '@/components/teams/DeleteTeamSheet';
import { JerseyBadge } from '@/components/teams/JerseyBadge';
import { PlayerFormSheet } from '@/components/teams/PlayerFormSheet';
import { TeamFormSheet } from '@/components/teams/TeamFormSheet';
import { Button } from '@/components/ui/Button';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { HeaderButton } from '@/components/ui/HeaderButton';
import { userMessage } from '@/db/repositories/errors';
import { deletePlayer, playersQuery } from '@/db/repositories/players';
import { getTeam } from '@/db/repositories/teams';
import { players, teams, type Player } from '@/db/schema';
import { POSITION_NAMES } from '@/domain/positions';
import {
  playersWithDuplicateJersey,
  ROSTER_SORTS,
  sortRoster,
  type RosterSort,
} from '@/domain/roster';
import { useLiveData } from '@/hooks/useLiveData';
import { useAppStore } from '@/stores/appStore';

const SORT_LABEL: Record<RosterSort, string> = {
  number: 'Number',
  name: 'Name',
  position: 'Position',
};

/** The sort after `sort`: the sort pill steps through them in order. */
function nextSort(sort: RosterSort): RosterSort {
  return ROSTER_SORTS[(ROSTER_SORTS.indexOf(sort) + 1) % ROSTER_SORTS.length];
}

/** `player` is kept after closing so the sheet's content doesn't change while it slides away. */
type FormState = { open: boolean; player: Player | null };
type DeleteState = { open: boolean; player: Player | null; error: string | null };

export default function RosterScreen() {
  const { teamId: teamIdParam } = useLocalSearchParams<{ teamId: string }>();
  const teamId = Number(teamIdParam);

  const team = useLiveData(() => getTeam(teamId), [teamId], [teams]);
  const roster = useLiveData(() => playersQuery(teamId).all(), [teamId], [players]);
  const [form, setForm] = useState<FormState>({ open: false, player: null });
  const [deleting, setDeleting] = useState<DeleteState>({
    open: false,
    player: null,
    error: null,
  });
  const [showInactive, setShowInactive] = useState(false);
  const rosterSort = useAppStore((s) => s.rosterSort);
  const setRosterSort = useAppStore((s) => s.setRosterSort);
  const [editingTeam, setEditingTeam] = useState(false);
  const [deletingTeam, setDeletingTeam] = useState(false);

  const duplicates = playersWithDuplicateJersey(roster);
  const sorted = sortRoster(roster, rosterSort);
  const active = sorted.filter((p) => p.isActive);
  const inactive = sorted.filter((p) => !p.isActive);
  const sections = [
    { key: 'active', title: `Active · ${active.length}`, data: active },
    ...(inactive.length > 0
      ? [
          {
            key: 'inactive',
            title: `Inactive · ${inactive.length}`,
            data: showInactive ? inactive : [],
          },
        ]
      : []),
  ];

  if (!team) {
    // The team was deleted while this screen was open (or a bad link).
    return (
      <EmptyState icon="alert-circle-outline" title="Team not found" message="Go back to Teams." />
    );
  }

  function confirmDeletePlayer() {
    const player = deleting.player;
    if (!player) return;
    try {
      deletePlayer(player.id);
      setDeleting((d) => ({ ...d, open: false }));
    } catch (e) {
      setDeleting((d) => ({ ...d, error: userMessage(e) }));
    }
  }

  return (
    <View className="flex-1 bg-gray-50">
      <Stack.Screen
        options={{
          title: team.name,
          headerRight: () => (
            <View className="flex-row items-center gap-1">
              {/* "Edit", not "Edit team": every dp here goes to the team's name. */}
              <HeaderButton
                label="Edit"
                accessibilityLabel="Edit team"
                icon="create-outline"
                onPress={() => setEditingTeam(true)}
              />
              <HeaderButton
                label="Add"
                accessibilityLabel="Add player"
                icon="person-add"
                variant="primary"
                onPress={() => setForm({ open: true, player: null })}
              />
            </View>
          ),
        }}
      />

      {roster.length === 0 ? (
        <EmptyState
          icon="shirt-outline"
          title="No players yet"
          message={`Add the players on ${team.name}. Jersey numbers are optional.`}
          action={
            <Button
              label="Add player"
              icon="add"
              onPress={() => setForm({ open: true, player: null })}
            />
          }
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(p) => String(p.id)}
          stickySectionHeadersEnabled={false}
          contentContainerClassName="pb-8"
          renderSectionHeader={({ section }) =>
            section.key === 'inactive' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: showInactive }}
                onPress={() => setShowInactive((v) => !v)}
                className="min-h-12 flex-row items-center gap-1 px-4 pt-4"
              >
                <Text className="text-sm font-semibold text-gray-500 uppercase">
                  {section.title}
                </Text>
                <Ionicons
                  name={showInactive ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="#6b7280"
                />
              </Pressable>
            ) : (
              // The sort rides on the first header: rarely changed, so it shouldn't cost a row.
              <View className="flex-row items-center justify-between px-4 pt-3 pb-1">
                <Text className="text-sm font-semibold text-gray-500 uppercase">
                  {section.title}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Sorted by ${SORT_LABEL[rosterSort].toLowerCase()}`}
                  accessibilityHint={`Sorts by ${SORT_LABEL[nextSort(rosterSort)].toLowerCase()}`}
                  onPress={() => setRosterSort(nextSort(rosterSort))}
                  className="min-h-12 flex-row items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 active:bg-gray-100"
                >
                  <Ionicons name="swap-vertical" size={16} color="#374151" />
                  <Text className="text-base font-semibold text-gray-800">
                    {SORT_LABEL[rosterSort]}
                  </Text>
                </Pressable>
              </View>
            )
          }
          renderItem={({ item }) => (
            <PlayerRow
              player={item}
              kitColor={team.homeColor}
              duplicateJersey={duplicates.has(item.id)}
              onPress={() => setForm({ open: true, player: item })}
            />
          )}
        />
      )}

      <PlayerFormSheet
        visible={form.open}
        teamId={teamId}
        player={form.player ?? undefined}
        roster={roster}
        onClose={() => setForm((f) => ({ ...f, open: false }))}
        onDeletePress={(player) => {
          setForm((f) => ({ ...f, open: false }));
          setDeleting({ open: true, player, error: null });
        }}
      />
      <ConfirmSheet
        visible={deleting.open}
        title={`Delete ${deleting.player?.name ?? 'player'}?`}
        message={`${deleting.player?.name ?? 'They'} will be removed from the roster. This can't be undone.`}
        confirmLabel="Delete player"
        error={deleting.error}
        onConfirm={confirmDeletePlayer}
        onClose={() => setDeleting((d) => ({ ...d, open: false }))}
      />
      <TeamFormSheet
        visible={editingTeam}
        team={team}
        onClose={() => setEditingTeam(false)}
        onDeletePress={() => {
          setEditingTeam(false);
          setDeletingTeam(true);
        }}
      />
      <DeleteTeamSheet
        visible={deletingTeam}
        team={team}
        onClose={() => setDeletingTeam(false)}
        // The roster belongs to the deleted team; return to the Teams list.
        onDeleted={() => (router.canGoBack() ? router.back() : router.replace('/teams'))}
      />
    </View>
  );
}

type PlayerRowProps = {
  player: Player;
  /** The team's home kit color, or null for the default. */
  kitColor: string | null;
  duplicateJersey: boolean;
  onPress: () => void;
};

/** The whole row opens the player (no chevron): name first, then their positions. */
function PlayerRow({ player, kitColor, duplicateJersey, onPress }: PlayerRowProps) {
  const jersey = player.jerseyNumber === null ? 'no number' : `number ${player.jerseyNumber}`;
  const spokenPositions = [player.primaryPosition, player.secondaryPosition]
    .flatMap((p) => (p ? [POSITION_NAMES[p]] : []))
    .join(' or ');
  const label = [
    player.name,
    jersey,
    spokenPositions,
    duplicateJersey ? 'shares a jersey number' : '',
  ]
    .filter(Boolean)
    .join(', ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="min-h-14 flex-row items-center gap-3 border-b border-gray-100 bg-white px-4 active:bg-gray-50"
    >
      <JerseyBadge number={player.jerseyNumber} kitColor={kitColor} inactive={!player.isActive} />
      <Text
        numberOfLines={1}
        className={`flex-1 text-base font-semibold ${player.isActive ? 'text-gray-900' : 'text-gray-500'}`}
      >
        {player.name}
      </Text>
      {/* Main position stands out; the second one is secondary. Sibling Texts, not nested. */}
      {player.primaryPosition && (
        <View className="flex-row items-center">
          <Text className="text-sm font-bold text-gray-800">{player.primaryPosition}</Text>
          {player.secondaryPosition && (
            <Text className="text-sm text-gray-500"> / {player.secondaryPosition}</Text>
          )}
        </View>
      )}
      {duplicateJersey && <Ionicons name="warning-outline" size={20} color="#b45309" />}
    </Pressable>
  );
}
