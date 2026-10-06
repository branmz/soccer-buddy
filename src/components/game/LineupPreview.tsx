import { useState } from 'react';
import { View } from 'react-native';

import { fitPitch, Pitch, type Size } from '@/components/pitch/Pitch';
import { PlayerToken } from '@/components/pitch/PlayerToken';
import type { FormationSlot } from '@/domain/types';

type LineupPreviewProps = {
  slots: readonly FormationSlot[];
  playerById: (playerId: number) => { name: string; jerseyNumber: number | null } | undefined;
  kitColor: string | null;
  height: number;
};

/** A read-only pitch with the lineup on it, for the setup screen. */
export function LineupPreview({ slots, playerById, kitColor, height }: LineupPreviewProps) {
  const [width, setWidth] = useState(0);
  const size: Size | null = width > 0 ? fitPitch({ width, height }) : null;
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      className="items-center"
      style={{ height }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {size && (
        <Pitch
          size={size}
          slots={slots}
          renderToken={(slot, tokenSize) => (
            <PlayerToken
              label={slot.label}
              player={(slot.playerId !== undefined && playerById(slot.playerId)) || null}
              kitColor={kitColor}
              size={tokenSize}
            />
          )}
        />
      )}
    </View>
  );
}
