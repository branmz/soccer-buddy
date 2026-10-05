import { parseFormationLayout } from '@/domain/formations';
import { FIELD_SIZES } from '@/domain/types';

import { getPresetFormation, PRESET_FORMATIONS } from '../presetFormations';

describe('PRESET_FORMATIONS', () => {
  const all = FIELD_SIZES.flatMap((size) => PRESET_FORMATIONS[size]);

  it.each(all.map((p) => [`${p.fieldSize}v${p.fieldSize} ${p.name}`, p] as const))(
    '%s is a valid layout for its field size',
    (_label, preset) => {
      expect(
        parseFormationLayout({ slots: preset.slots }, { fieldSize: preset.fieldSize }),
      ).toEqual({ ok: true, value: { slots: preset.slots } });
    },
  );

  it('matches its name: outfield players per line, back to front', () => {
    for (const preset of all) {
      // Lines with nobody in them (e.g. no midfield in 2-2) don't appear in the name.
      const lines = ['DEF', 'MID', 'FWD']
        .map((role) => preset.slots.filter((s) => s.role === role).length)
        .filter((n) => n > 0);
      const expected = preset.name.split('-').map(Number);
      // 4-2-3-1 has two midfield lines.
      const merged =
        expected.length === 4 ? [expected[0], expected[1] + expected[2], expected[3]] : expected;
      expect([preset.name, lines]).toEqual([preset.name, merged]);
    }
  });

  it('has unique ids per field size and no players assigned', () => {
    for (const size of FIELD_SIZES) {
      const ids = PRESET_FORMATIONS[size].map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(PRESET_FORMATIONS[size].length).toBeGreaterThan(0);
    }
    expect(all.flatMap((p) => p.slots).every((s) => s.playerId === undefined)).toBe(true);
  });

  it('looks up a preset by field size and id', () => {
    expect(getPresetFormation(11, '4-3-3')?.slots).toHaveLength(11);
    expect(getPresetFormation(5, '4-3-3')).toBeUndefined();
  });
});
