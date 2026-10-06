import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';

import { FormationThumbnail } from '@/components/pitch/FormationThumbnail';
import { Sheet } from '@/components/ui/Sheet';
import { PRESET_FORMATIONS } from '@/constants/presetFormations';
import { formationsQuery } from '@/db/repositories/formations';
import { formations } from '@/db/schema';
import { parseFormationLayout } from '@/domain/formations';
import type { FieldSize, FormationSlot } from '@/domain/types';
import { useLiveData } from '@/hooks/useLiveData';

export type FormationChoice = { formationId: number | null; name: string; slots: FormationSlot[] };

type FormationPickerSheetProps = {
  visible: boolean;
  /** `setup`: picks the match's formation and lineup. `live`: switches the shape mid-match. */
  mode?: 'setup' | 'live';
  teamId: number;
  fieldSize: FieldSize;
  /** The match's formation: a saved one by id, a preset (id null) by name. */
  selected: { formationId: number | null; name: string | null };
  onPick: (choice: FormationChoice) => void;
  onClose: () => void;
};

/** The team's saved formations (with their lineups) and the presets for its field size. */
export function FormationPickerSheet({
  visible,
  mode = 'setup',
  teamId,
  fieldSize,
  selected,
  onPick,
  onClose,
}: FormationPickerSheetProps) {
  const saved = useLiveData(
    () => formationsQuery(teamId, fieldSize).all(),
    [teamId, fieldSize],
    [formations],
  );
  const savedChoices = saved.flatMap((f): FormationChoice[] => {
    const layout = parseFormationLayout(f.layoutJson);
    return layout.ok ? [{ formationId: f.id, name: f.name, slots: layout.value.slots }] : [];
  });
  const presetChoices = PRESET_FORMATIONS[fieldSize].map((p): FormationChoice => ({
    formationId: null,
    name: p.name,
    slots: p.slots,
  }));

  return (
    <Sheet
      visible={visible}
      title={mode === 'live' ? 'Switch formation' : 'Formation'}
      onClose={onClose}
    >
      {mode === 'live' && (
        <Text className="text-base text-gray-600">
          Players move to the closest matching spots in the new shape. You can fine-tune it after.
        </Text>
      )}
      {savedChoices.length > 0 && <SectionTitle title="Saved" />}
      {savedChoices.map((choice) => (
        <ChoiceRow
          key={`saved-${choice.formationId}`}
          choice={choice}
          detail={mode === 'live' ? 'Saved formation' : 'Uses its saved lineup'}
          selected={choice.formationId === selected.formationId}
          onPress={() => onPick(choice)}
        />
      ))}
      <SectionTitle title={`${fieldSize}v${fieldSize} presets`} />
      {presetChoices.map((choice) => (
        <ChoiceRow
          key={`preset-${choice.name}`}
          choice={choice}
          detail={mode === 'live' ? 'Preset' : 'Keeps your players where the spots match'}
          selected={selected.formationId === null && choice.name === selected.name}
          onPress={() => onPick(choice)}
        />
      ))}
      <View className="h-2" />
    </Sheet>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text className="-mb-2 text-sm font-semibold text-gray-500 uppercase">{title}</Text>;
}

type ChoiceRowProps = {
  choice: FormationChoice;
  detail: string;
  selected: boolean;
  onPress: () => void;
};

function ChoiceRow({ choice, detail, selected, onPress }: ChoiceRowProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      className="min-h-16 flex-row items-center gap-3 rounded-xl active:bg-gray-50"
    >
      <FormationThumbnail slots={choice.slots} height={48} />
      <View className="flex-1">
        <Text numberOfLines={1} className="text-lg font-bold text-gray-900">
          {choice.name}
        </Text>
        <Text className="text-sm text-gray-500">{detail}</Text>
      </View>
      {selected && <Ionicons name="checkmark-circle" size={24} color="#16a34a" />}
    </Pressable>
  );
}
