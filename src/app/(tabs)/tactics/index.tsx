import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { FormationThumbnail } from '@/components/pitch/FormationThumbnail';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ReorderList } from '@/components/ui/ReorderList';
import { PRESET_FORMATIONS } from '@/constants/presetFormations';
import { ValidationError } from '@/db/repositories/errors';
import { formationsQuery, setFormationOrder } from '@/db/repositories/formations';
import { formations } from '@/db/schema';
import { parseFormationLayout } from '@/domain/formations';
import type { FormationSlot } from '@/domain/types';
import { useActiveTeam } from '@/hooks/useActiveTeam';
import { useLiveData } from '@/hooks/useLiveData';
import { rejectHaptic } from '@/lib/haptics';

type SavedRow = { kind: 'saved'; id: number; name: string; slots: FormationSlot[] };
type PresetRow = { kind: 'preset'; id: string; name: string; slots: FormationSlot[] };

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

  const savedRows: SavedRow[] = saved.map((f) => {
    const layout = parseFormationLayout(f.layoutJson);
    return { kind: 'saved', id: f.id, name: f.name, slots: layout.ok ? layout.value.slots : [] };
  });

  function saveOrder(ids: number[]): boolean {
    if (!team) return false;
    try {
      setFormationOrder(team.id, team.fieldSize, ids);
      return true;
    } catch (e) {
      // A formation was added or deleted meanwhile: the list shows the saved order again.
      if (!(e instanceof ValidationError)) throw e;
      rejectHaptic();
      return false;
    }
  }

  const presets: PresetRow[] = PRESET_FORMATIONS[fieldSize].map((p) => ({
    kind: 'preset',
    id: p.id,
    name: p.name,
    slots: p.slots,
  }));

  function openSaved(row: SavedRow) {
    router.push({ pathname: '/tactics/[formationId]', params: { formationId: String(row.id) } });
  }

  function openPreset(row: PresetRow) {
    router.push({
      pathname: '/tactics/[formationId]',
      params: { formationId: 'new', preset: row.id },
    });
  }

  // Saved formations can be dragged by their handles at any time; tapping one opens it.
  return (
    <ReorderList
      items={savedRows}
      name={(row) => row.name}
      accessibilityLabel={(row) => `${row.name}, ${formationDetail(row, fieldSize)}`}
      renderBody={(row) => <FormationRowBody row={row} fieldSize={fieldSize} />}
      onOpen={openSaved}
      onReorder={saveOrder}
      header={
        <>
          <SectionTitle>Saved · {saved.length}</SectionTitle>
          {saved.length === 0 && (
            <Text className="text-base text-gray-500">
              No saved formations for {team.name} yet. Pick a preset below to start one.
            </Text>
          )}
        </>
      }
      footer={
        <>
          <SectionTitle>
            Start from a {fieldSize}v{fieldSize} preset
          </SectionTitle>
          {presets.map((row) => (
            <Pressable
              key={row.id}
              accessibilityRole="button"
              accessibilityLabel={`${row.name}, ${formationDetail(row, fieldSize)}`}
              onPress={() => openPreset(row)}
              className="min-h-24 justify-center rounded-2xl border-2 border-gray-200 bg-white px-5 py-5 active:bg-gray-50"
            >
              <FormationRowBody row={row} fieldSize={fieldSize} />
            </Pressable>
          ))}
        </>
      }
    />
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <Text className="pt-2 text-sm font-semibold text-gray-500 uppercase">{children}</Text>;
}

function formationDetail(row: SavedRow | PresetRow, fieldSize: number): string {
  if (row.kind === 'preset') return 'Preset · tap to customize';
  const placed = row.slots.filter((s) => s.playerId !== undefined).length;
  return `${placed} of ${fieldSize} players placed`;
}

/** Thumbnail, name and detail: the content of a formation card. */
function FormationRowBody({ row, fieldSize }: { row: SavedRow | PresetRow; fieldSize: number }) {
  return (
    <View className="flex-row items-center gap-4">
      <FormationThumbnail slots={row.slots} height={72} />
      <View className="flex-1 gap-1">
        <Text numberOfLines={1} className="text-2xl font-bold text-gray-900">
          {row.name}
        </Text>
        <Text className="text-base text-gray-600">{formationDetail(row, fieldSize)}</Text>
      </View>
    </View>
  );
}
