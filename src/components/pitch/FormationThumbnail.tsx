import Svg, { Circle, Line, Rect } from 'react-native-svg';

import type { FormationSlot } from '@/domain/types';

import { PITCH_ASPECT } from './PitchMarkings';

const GRASS = '#2e7d32';
const LINE = '#e8f5e9';
const DOT_RADIUS = 0.055;

type FormationThumbnailProps = {
  slots: readonly FormationSlot[];
  height?: number;
};

/** A small pitch with a dot per slot (filled when a player is assigned), for lists. */
export function FormationThumbnail({ slots, height = 56 }: FormationThumbnailProps) {
  const width = Math.round(height * PITCH_ASPECT);
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${PITCH_ASPECT} 1`} accessible={false}>
      <Rect x={0} y={0} width={PITCH_ASPECT} height={1} rx={0.06} fill={GRASS} />
      <Line x1={0} y1={0.5} x2={PITCH_ASPECT} y2={0.5} stroke={LINE} strokeWidth={0.015} />
      {slots.map((slot) => (
        <Circle
          key={slot.slotId}
          cx={slot.x * PITCH_ASPECT}
          cy={slot.y}
          r={DOT_RADIUS}
          fill={slot.playerId === undefined ? 'none' : '#ffffff'}
          stroke="#ffffff"
          strokeWidth={0.02}
        />
      ))}
    </Svg>
  );
}
