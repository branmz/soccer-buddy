import { useState } from 'react';
import { View } from 'react-native';

import { fitPitch, Pitch, tokenSizeFor, type Size } from '@/components/pitch/Pitch';
import { PlayerToken, TOKEN_LABEL_ABOVE, TOKEN_LABEL_BELOW } from '@/components/pitch/PlayerToken';
import { fitSlotsVertically } from '@/domain/board';
import type { FormationSlot } from '@/domain/types';

type LineupPreviewProps = {
  slots: readonly FormationSlot[];
  playerById: (playerId: number) => { name: string; jerseyNumber: number | null } | undefined;
  kitColor: string | null;
  /** The pitch fills the width, up to this height. */
  maxHeight: number;
};

/** A read-only pitch with the lineup on it, for the setup screen. */
export function LineupPreview({ slots, playerById, kitColor, maxHeight }: LineupPreviewProps) {
  const [width, setWidth] = useState(0);
  const size: Size | null = width > 0 ? fitPitch({ width, height: maxHeight }) : null;
  // A small pitch has no room below the GK for the name label: squeeze the shape a little so
  // every token's labels stay on the grass. Fine here because the preview is read-only.
  const tokenSize = size ? tokenSizeFor(size.width) : 0;
  const shown = size
    ? fitSlotsVertically(
        slots,
        (tokenSize / 2 + TOKEN_LABEL_ABOVE) / size.height,
        (tokenSize / 2 + TOKEN_LABEL_BELOW) / size.height,
      )
    : slots;
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      className="items-center"
      // Until measured, reserve a typical height so the screen doesn't jump much.
      style={{ height: size?.height ?? maxHeight * 0.85 }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {size && (
        <Pitch
          size={size}
          slots={shown}
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
