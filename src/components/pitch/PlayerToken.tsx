import { Text, View } from 'react-native';

import { JerseyBadge } from '@/components/teams/JerseyBadge';
import type { SlotFit } from '@/domain/board';

type PlayerTokenProps = {
  /** The slot's position label, shown when the slot is empty (e.g. "CB"). */
  label: string;
  player: { name: string; jerseyNumber: number | null } | null;
  /** The team's home kit color, or null for the default. */
  kitColor: string | null;
  size: number;
  selected?: boolean;
  /** Faded while this token is being dragged. */
  dimmed?: boolean;
  /** An empty spot that suits the picked-up player's main or second position. */
  highlight?: SlotFit;
};

// Every variant sets border style, border color and background, so switching between them
// only swaps values (removing a class leaves a one-frame ghost on Android).
const EMPTY_SLOT_CLASS = {
  none: 'border-dashed border-white/80 bg-black/20',
  primary: 'border-solid border-white bg-yellow-300',
  secondary: 'border-dashed border-yellow-300 bg-yellow-300/30',
} as const;

/**
 * A slot on the pitch: the player's jersey badge with the position above and their name
 * underneath, or a dashed circle with the position label when nobody is assigned. The badge
 * fills the `size` box so its centre is the slot's point; the labels hang outside it.
 */
export function PlayerToken({
  label,
  player,
  kitColor,
  size,
  selected = false,
  dimmed = false,
  highlight = null,
}: PlayerTokenProps) {
  return (
    <View
      accessible={false}
      className={dimmed ? 'opacity-30' : 'opacity-100'}
      style={{ width: size, height: size }}
    >
      {player ? (
        <JerseyBadge number={player.jerseyNumber} kitColor={kitColor} size={size} />
      ) : (
        <View
          className={`flex-1 items-center justify-center rounded-full border-2 ${EMPTY_SLOT_CLASS[highlight ?? 'none']}`}
        >
          <Text
            className={`font-bold ${highlight === 'primary' ? 'text-gray-900' : 'text-white'}`}
            style={{ fontSize: size * 0.3 }}
          >
            {label}
          </Text>
        </View>
      )}
      {/* Both states set a border color so Android doesn't leave a ghost ring behind. */}
      <View
        className={`absolute -inset-1 rounded-full border-[3px] ${selected ? 'border-yellow-300' : 'border-transparent'}`}
      />
      {/* A filled spot still shows its position, as a chip above the badge. */}
      {player && label !== '' && (
        <View
          className="absolute items-center"
          style={{ bottom: size - 1, left: -size / 2, width: size * 2 }}
        >
          <Text className="rounded bg-white/90 px-1 text-[10px] font-bold text-gray-900">
            {label}
          </Text>
        </View>
      )}
      {player && (
        <View
          className="absolute items-center"
          style={{ top: size + 2, left: -size / 2, width: size * 2 }}
        >
          <Text
            numberOfLines={1}
            className="rounded bg-black/55 px-1 text-[11px] font-semibold text-white"
          >
            {player.name}
          </Text>
        </View>
      )}
    </View>
  );
}
