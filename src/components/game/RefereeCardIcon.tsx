import { View } from 'react-native';

const YELLOW = '#facc15';
const RED = '#dc2626';

type RefereeCardIconProps = {
  /** `both`: a yellow card overlapping a red one (the "Card" button). */
  color: 'yellow' | 'red' | 'both';
  /** Height in points; cards are 3:4. */
  size?: number;
};

/** A referee's card: a tilted upright rectangle (Ionicons' "card" is a credit card). */
export function RefereeCardIcon({ color, size = 24 }: RefereeCardIconProps) {
  const height = size * 0.85;
  const width = height * 0.72;
  const card = (fill: string, rotate: string, left: number) => (
    <View
      className="absolute rounded-[3px] border border-black/20"
      // Sizes scale with the icon and the fill is a fixed card color, so they're inline.
      style={{
        width,
        height,
        left,
        top: (size - height) / 2,
        backgroundColor: fill,
        transform: [{ rotate }],
      }}
    />
  );
  return (
    <View accessible={false} style={{ width: size, height: size }}>
      {color === 'both' ? (
        <>
          {card(RED, '12deg', size * 0.38)}
          {card(YELLOW, '-8deg', size * 0.08)}
        </>
      ) : (
        card(color === 'yellow' ? YELLOW : RED, '-8deg', (size - width) / 2)
      )}
    </View>
  );
}
