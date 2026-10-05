import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

// Drawn in metres on a 68 × 105 m pitch, own goal at the bottom, then stretched to fit.
const W = 68;
const H = 105;
const INSET = 1;
const STRIPES = 10;
const BOX = { width: 40.3, depth: 16.5 };
const SIX_YARD = { width: 18.3, depth: 5.5 };
const SPOT_DISTANCE = 11;
const CIRCLE_RADIUS = 9.15;

const GRASS = '#2e7d32';
const GRASS_LIGHT = '#338a37';
const LINE = '#e8f5e9';

/** Width ÷ height of a real pitch; the board keeps this so circles stay round. */
export const PITCH_ASPECT = W / H;

/** Where the penalty arc leaves the box, as an x offset from the centre line. */
const ARC_HALF_WIDTH = Math.sqrt(CIRCLE_RADIUS ** 2 - (BOX.depth - SPOT_DISTANCE) ** 2);

type PitchMarkingsProps = { width: number; height: number };

export function PitchMarkings({ width, height }: PitchMarkingsProps) {
  const mid = W / 2;
  const topBox = INSET + BOX.depth;
  const bottomBox = H - INSET - BOX.depth;
  const stroke = { stroke: LINE, strokeWidth: 0.4, strokeOpacity: 0.85, fill: 'none' };
  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      accessible={false}
    >
      <Rect x={0} y={0} width={W} height={H} fill={GRASS} />
      {Array.from({ length: STRIPES }, (_, i) =>
        i % 2 === 1 ? (
          <Rect
            key={i}
            x={0}
            y={(H / STRIPES) * i}
            width={W}
            height={H / STRIPES}
            fill={GRASS_LIGHT}
          />
        ) : null,
      )}

      <Rect x={INSET} y={INSET} width={W - 2 * INSET} height={H - 2 * INSET} {...stroke} />
      <Line x1={INSET} y1={H / 2} x2={W - INSET} y2={H / 2} {...stroke} />
      <Circle cx={mid} cy={H / 2} r={CIRCLE_RADIUS} {...stroke} />
      <Circle cx={mid} cy={H / 2} r={0.6} fill={LINE} />

      {/* Opponent's end (top) */}
      <Rect x={mid - BOX.width / 2} y={INSET} width={BOX.width} height={BOX.depth} {...stroke} />
      <Rect
        x={mid - SIX_YARD.width / 2}
        y={INSET}
        width={SIX_YARD.width}
        height={SIX_YARD.depth}
        {...stroke}
      />
      <Circle cx={mid} cy={INSET + SPOT_DISTANCE} r={0.5} fill={LINE} />
      <Path
        d={`M ${mid - ARC_HALF_WIDTH} ${topBox} A ${CIRCLE_RADIUS} ${CIRCLE_RADIUS} 0 0 0 ${mid + ARC_HALF_WIDTH} ${topBox}`}
        {...stroke}
      />

      {/* Own end (bottom) */}
      <Rect
        x={mid - BOX.width / 2}
        y={bottomBox}
        width={BOX.width}
        height={BOX.depth}
        {...stroke}
      />
      <Rect
        x={mid - SIX_YARD.width / 2}
        y={H - INSET - SIX_YARD.depth}
        width={SIX_YARD.width}
        height={SIX_YARD.depth}
        {...stroke}
      />
      <Circle cx={mid} cy={H - INSET - SPOT_DISTANCE} r={0.5} fill={LINE} />
      <Path
        d={`M ${mid - ARC_HALF_WIDTH} ${bottomBox} A ${CIRCLE_RADIUS} ${CIRCLE_RADIUS} 0 0 1 ${mid + ARC_HALF_WIDTH} ${bottomBox}`}
        {...stroke}
      />
    </Svg>
  );
}
