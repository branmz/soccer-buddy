import { POSITION_LINE, type PlayerPosition } from '@/domain/positions';
import type { FieldSize, FormationSlot } from '@/domain/types';

export type PresetFormation = {
  /** Unique within a field size; used in the editor route (`?preset=4-3-3`). */
  id: string;
  name: string;
  fieldSize: FieldSize;
  slots: FormationSlot[];
};

/** A slot labelled with a position; its role is that position's line. x/y: y = 1 is own goal. */
function slot(slotId: string, label: PlayerPosition, x: number, y: number): FormationSlot {
  return { slotId, role: POSITION_LINE[label], label, x, y };
}

function preset(fieldSize: FieldSize, name: string, outfield: FormationSlot[]): PresetFormation {
  return { id: name, name, fieldSize, slots: [slot('gk', 'GK', 0.5, 0.92), ...outfield] };
}

const BACK_FOUR = [
  slot('lb', 'LB', 0.15, 0.73),
  slot('cb-l', 'CB', 0.38, 0.77),
  slot('cb-r', 'CB', 0.62, 0.77),
  slot('rb', 'RB', 0.85, 0.73),
];

const BACK_THREE = [
  slot('lb', 'LB', 0.2, 0.74),
  slot('cb', 'CB', 0.5, 0.77),
  slot('rb', 'RB', 0.8, 0.74),
];

export const PRESET_FORMATIONS: Record<FieldSize, PresetFormation[]> = {
  11: [
    preset(11, '4-4-2', [
      ...BACK_FOUR,
      slot('lm', 'LM', 0.15, 0.49),
      slot('cm-l', 'CM', 0.38, 0.53),
      slot('cm-r', 'CM', 0.62, 0.53),
      slot('rm', 'RM', 0.85, 0.49),
      slot('st-l', 'ST', 0.36, 0.24),
      slot('st-r', 'ST', 0.64, 0.24),
    ]),
    preset(11, '4-3-3', [
      ...BACK_FOUR,
      slot('cm-l', 'CM', 0.28, 0.52),
      slot('cdm', 'CDM', 0.5, 0.58),
      slot('cm-r', 'CM', 0.72, 0.52),
      slot('lw', 'LW', 0.17, 0.27),
      slot('st', 'ST', 0.5, 0.21),
      slot('rw', 'RW', 0.83, 0.27),
    ]),
    preset(11, '3-5-2', [
      slot('cb-l', 'CB', 0.25, 0.76),
      slot('cb', 'CB', 0.5, 0.78),
      slot('cb-r', 'CB', 0.75, 0.76),
      slot('lm', 'LM', 0.12, 0.48),
      slot('cm-l', 'CM', 0.33, 0.55),
      slot('cam', 'CAM', 0.5, 0.42),
      slot('cm-r', 'CM', 0.67, 0.55),
      slot('rm', 'RM', 0.88, 0.48),
      slot('st-l', 'ST', 0.36, 0.22),
      slot('st-r', 'ST', 0.64, 0.22),
    ]),
    preset(11, '4-2-3-1', [
      ...BACK_FOUR,
      slot('cdm-l', 'CDM', 0.37, 0.6),
      slot('cdm-r', 'CDM', 0.63, 0.6),
      slot('lm', 'LM', 0.17, 0.4),
      slot('cam', 'CAM', 0.5, 0.4),
      slot('rm', 'RM', 0.83, 0.4),
      slot('st', 'ST', 0.5, 0.2),
    ]),
  ],
  9: [
    preset(9, '3-3-2', [
      ...BACK_THREE,
      slot('lm', 'LM', 0.2, 0.5),
      slot('cm', 'CM', 0.5, 0.53),
      slot('rm', 'RM', 0.8, 0.5),
      slot('st-l', 'ST', 0.35, 0.25),
      slot('st-r', 'ST', 0.65, 0.25),
    ]),
    preset(9, '3-2-3', [
      ...BACK_THREE,
      slot('cm-l', 'CM', 0.35, 0.53),
      slot('cm-r', 'CM', 0.65, 0.53),
      slot('lw', 'LW', 0.18, 0.28),
      slot('st', 'ST', 0.5, 0.22),
      slot('rw', 'RW', 0.82, 0.28),
    ]),
  ],
  7: [
    preset(7, '2-3-1', [
      slot('cb-l', 'CB', 0.32, 0.74),
      slot('cb-r', 'CB', 0.68, 0.74),
      slot('lm', 'LM', 0.18, 0.5),
      slot('cm', 'CM', 0.5, 0.52),
      slot('rm', 'RM', 0.82, 0.5),
      slot('st', 'ST', 0.5, 0.24),
    ]),
    preset(7, '3-2-1', [
      ...BACK_THREE,
      slot('cm-l', 'CM', 0.32, 0.5),
      slot('cm-r', 'CM', 0.68, 0.5),
      slot('st', 'ST', 0.5, 0.24),
    ]),
  ],
  5: [
    preset(5, '2-2', [
      slot('cb-l', 'CB', 0.3, 0.72),
      slot('cb-r', 'CB', 0.7, 0.72),
      slot('st-l', 'ST', 0.3, 0.35),
      slot('st-r', 'ST', 0.7, 0.35),
    ]),
    preset(5, '1-2-1', [
      slot('cb', 'CB', 0.5, 0.74),
      slot('lm', 'LM', 0.2, 0.52),
      slot('rm', 'RM', 0.8, 0.52),
      slot('st', 'ST', 0.5, 0.28),
    ]),
  ],
};

export function getPresetFormation(fieldSize: FieldSize, id: string): PresetFormation | undefined {
  return PRESET_FORMATIONS[fieldSize].find((p) => p.id === id);
}
