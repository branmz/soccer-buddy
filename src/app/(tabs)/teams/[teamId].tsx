import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, SectionList, Text, View } from 'react-native';

import { DeleteTeamSheet } from '@/components/teams/DeleteTeamSheet';
import { JerseyBadge } from '@/components/teams/JerseyBadge';
import { PlayerFormSheet } from '@/components/teams/PlayerFormSheet';
import { TeamFormSheet } from '@/components/teams/TeamFormSheet';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { HeaderButton } from '@/components/ui/HeaderButton';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { playersQuery } from '@/db/repositories/players';
import { getTeam } from '@/db/repositories/teams';
import { players, teams, type Player } from '@/db/schema';
import { formatPositions, POSITION_NAMES } from '@/domain/positions';
import { playersWithDuplicateJersey, sortRoster, type RosterSort } from '@/domain/roster';
import { useLiveData } from '@/hooks/useLiveData';
import { useAppStore } from '@/stores/appStore';

const SORT_OPTIONS: { label: string; value: RosterSort }[] = [
  { label: 'Number', value: 'number' },
  { label: 'Name', value: 'name' },
  { label: 'Position', value: 'position' },
];

/** `player` is kept after closing so the sheet's content doesn't change while it slides away. */
type FormState = { open: boolean; player: Player | null };

export default function RosterScreen() {
  const { teamId: teamIdParam } = useLocalSearchParams<{ teamId: string }>();
  const teamId = Number(teamIdParam);

  const team = useLiveData(() => getTeam(teamId), [teamId], [teams]);
  const roster = useLiveData(() => playersQuery(teamId).all(), [teamId], [players]);
  const [form, setForm] = useState<FormState>({ open: false, player: null });
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

  return (
    <View className="flex-1 bg-gray-50">
      <Stack.Screen
        options={{
          title: team.name,
          headerRight: () => (
            <View className="flex-row items-center gap-1">
              <HeaderButton
                label="Edit team"
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
          ListHeaderComponent={
            <View className="px-4 pt-4">
              <SegmentedControl
                label="Sort by"
                options={SORT_OPTIONS}
                value={rosterSort}
                onChange={setRosterSort}
              />
            </View>
          }
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
              <Text className="px-4 pt-4 pb-2 text-sm font-semibold text-gray-500 uppercase">
                {section.title}
              </Text>
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

function PlayerRow({ player, kitColor, duplicateJersey, onPress }: PlayerRowProps) {
  const jersey = player.jerseyNumber === null ? 'no number' : `number ${player.jerseyNumber}`;
  const positions = formatPositions(player);
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
        className={`flex-1 text-base ${player.isActive ? 'text-gray-900' : 'text-gray-500'}`}
      >
        {player.name}
      </Text>
      {positions !== '' && <Text className="text-sm font-semibold text-gray-500">{positions}</Text>}
      {duplicateJersey && <Ionicons name="warning-outline" size={20} color="#b45309" />}
      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
    </Pressable>
  );
}
