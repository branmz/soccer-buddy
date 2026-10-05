import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { type AnimatedRef } from 'react-native-reanimated';

import type { FormationSlot } from '@/domain/types';

import { PITCH_ASPECT, PitchMarkings } from './PitchMarkings';

export type Size = { width: number; height: number };

/** The largest pitch with real proportions that fits in `area`. */
export function fitPitch(area: Size): Size {
  const width = Math.min(area.width, area.height * PITCH_ASPECT);
  return { width: Math.floor(width), height: Math.floor(width / PITCH_ASPECT) };
}

/** Token diameter for a pitch width: big enough to grab, small enough for 11 players. */
export function tokenSizeFor(pitchWidth: number): number {
  return Math.round(Math.min(44, Math.max(30, pitchWidth * 0.12)));
}

type PitchProps = {
  size: Size;
  slots: readonly FormationSlot[];
  renderToken: (slot: FormationSlot, tokenSize: number) => ReactNode;
  /** Tap on open grass, normalized 0–1. */
  onGrassPress?: (x: number, y: number) => void;
  /** Measured during drags to turn release points into pitch coordinates. */
  pitchRef?: AnimatedRef<Animated.View>;
};

/**
 * Vertical pitch, own goal at the bottom. Slots are normalized (0–1) and only converted to
 * pixels here; each token is centred on its slot.
 */
export function Pitch({ size, slots, renderToken, onGrassPress, pitchRef }: PitchProps) {
  const tokenSize = tokenSizeFor(size.width);
  return (
    // Sizes and token positions are measured values, so they're inline styles.
    <Animated.View ref={pitchRef} style={size}>
      <View className="absolute inset-0 overflow-hidden rounded-lg">
        <PitchMarkings width={size.width} height={size.height} />
      </View>
      <Pressable
        accessible={false}
        importantForAccessibility="no"
        disabled={!onGrassPress}
        onPress={(e) =>
          onGrassPress?.(
            e.nativeEvent.locationX / size.width,
            e.nativeEvent.locationY / size.height,
          )
        }
        className="absolute inset-0"
      />
      {slots.map((slot) => (
        <View
          key={slot.slotId}
          className="absolute"
          style={{
            left: slot.x * size.width - tokenSize / 2,
            top: slot.y * size.height - tokenSize / 2,
            width: tokenSize,
            height: tokenSize,
          }}
        >
          {renderToken(slot, tokenSize)}
        </View>
      ))}
    </Animated.View>
  );
}
