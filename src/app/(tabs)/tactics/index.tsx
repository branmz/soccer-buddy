import { router } from 'expo-router';
import { Pressable, SectionList, Text, View } from 'react-native';

import { FormationThumbnail } from '@/components/pitch/FormationThumbnail';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PRESET_FORMATIONS } from '@/constants/presetFormations';
import { formationsQuery } from '@/db/repositories/formations';
import { formations } from '@/db/schema';
import { parseFormationLayout } from '@/domain/formations';
import type { FormationSlot } from '@/domain/types';
import { useActiveTeam } from '@/hooks/useActiveTeam';
import { useLiveData } from '@/hooks/useLiveData';

type Row =
  | { kind: 'saved'; id: number; name: string; slots: FormationSlot[] }
  | { kind: 'preset'; id: string; name: string; slots: FormationSlot[] }
  | { kind: 'noSaved' };

export default function TacticsScreen() {
  const { team } = useActiveTeam();
  const teamId = team?.id ?? null;
  const fieldSize = team?.fieldSize ?? 11;
  const saved = useLiveData(
    () => (teamId === null ? [] : formationsQuery(teamId, fieldSize).all()),
    [teamId, fieldSize],
    [formations],
  );

  if (!team) {
    return (
      <EmptyState
        icon="grid-outline"
        title="No team yet"
        message="Create a team and add players, then build formations for it here."
        action={
          <Button label="Go to Teams" icon="people" onPress={() => router.navigate('/teams')} />
        }
      />
    );
  }

  const savedRows: Row[] = saved.map((f) => {
    const layout = parseFormationLayout(f.layoutJson);
    return { kind: 'saved', id: f.id, name: f.name, slots: layout.ok ? layout.value.slots : [] };
  });
  const sections = [
    {
      key: 'saved',
      title: `Saved · ${saved.length}`,
      data: savedRows.length > 0 ? savedRows : [{ kind: 'noSaved' } as const],
    },
    {
      key: 'presets',
      title: `Start from a ${fieldSize}v${fieldSize} preset`,
      data: PRESET_FORMATIONS[fieldSize].map((p): Row => ({
        kind: 'preset',
        id: p.id,
        name: p.name,
        slots: p.slots,
      })),
    },
  ];

  function open(row: Row) {
    if (row.kind === 'saved') {
      router.push({ pathname: '/tactics/[formationId]', params: { formationId: String(row.id) } });
    } else if (row.kind === 'preset') {
      router.push({
        pathname: '/tactics/[formationId]',
        params: { formationId: 'new', preset: row.id },
      });
    }
  }

  return (
    <View className="flex-1 bg-gray-50">
      <SectionList
        sections={sections}
        keyExtractor={(row) => (row.kind === 'noSaved' ? 'none' : `${row.kind}-${row.id}`)}
        stickySectionHeadersEnabled={false}
        contentContainerClassName="pb-8"
        renderSectionHeader={({ section }) => (
          <Text className="px-4 pt-5 pb-2 text-sm font-semibold text-gray-500 uppercase">
            {section.title}
          </Text>
        )}
        renderItem={({ item }) =>
          item.kind === 'noSaved' ? (
            <Text className="px-4 pb-2 text-base text-gray-500">
              No saved formations for {team.name} yet. Pick a preset below to start one.
            </Text>
          ) : (
            <FormationRow row={item} fieldSize={fieldSize} onPress={() => open(item)} />
          )
        }
      />
    </View>
  );
}

type FormationRowProps = {
  row: Extract<Row, { kind: 'saved' | 'preset' }>;
  fieldSize: number;
  onPress: () => void;
};

function FormationRow({ row, fieldSize, onPress }: FormationRowProps) {
  const placed = row.slots.filter((s) => s.playerId !== undefined).length;
  const detail =
    row.kind === 'preset'
      ? 'Preset · tap to customize'
      : `${placed} of ${fieldSize} players placed`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${row.name}, ${detail}`}
      onPress={onPress}
      className="min-h-20 flex-row items-center gap-4 border-b border-gray-100 bg-white px-4 py-3 active:bg-gray-50"
    >
      <FormationThumbnail slots={row.slots} />
      <View className="flex-1 gap-0.5">
        <Text numberOfLines={1} className="text-lg font-bold text-gray-900">
          {row.name}
        </Text>
        <Text className="text-sm text-gray-500">{detail}</Text>
      </View>
    </Pressable>
  );
}
