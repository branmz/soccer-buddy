import { Text, View } from 'react-native';

import { JerseyBadge } from '@/components/teams/JerseyBadge';
import type { SlotFit } from '@/domain/board';

import { ContributionMarks } from './ContributionMarks';

type PlayerTokenProps = {
  /** The slot's position label, shown when the slot is empty (e.g. "CB"). */
  label: string;
  player: { name: string; jerseyNumber: number | null } | null;
  /** The team's kit color for this match, or null for the default. */
  kitColor: string | null;
  size: number;
  selected?: boolean;
  /** Faded while this token is being dragged. */
  dimmed?: boolean;
  /**
   * A spot that suits the picked-up player's main or second position. Empty spots fill yellow;
   * filled ones (a live-match sub target) get a yellow ring: solid for main, dashed for second.
   */
  highlight?: SlotFit;
  /** Live match: minutes played, shown in the position chip (e.g. "CM 23'"). */
  minutes?: string | null;
  /** Live match: the player has a yellow card. */
  booked?: boolean;
  /** Live match: goals and assists, shown as small marks on the badge. */
  goals?: number;
  assists?: number;
  /** Live match: emptied by a red card. The team plays a player down. */
  locked?: boolean;
};

/** Room a filled token's labels need beyond the badge: position chip above, name below. */
export const TOKEN_LABEL_ABOVE = 17;
export const TOKEN_LABEL_BELOW = 22;

// Every variant sets border style, border color and background, so switching between them
// only swaps values (removing a class leaves a one-frame ghost on Android).
const EMPTY_SLOT_CLASS = {
  none: 'border-dashed border-white/80 bg-black/20',
  primary: 'border-solid border-white bg-yellow-300',
  secondary: 'border-dashed border-yellow-300 bg-yellow-300/30',
  locked: 'border-solid border-red-300 bg-red-900/60',
} as const;

/** Selected is cyan: on the pitch, yellow means a card or a spot that suits a player. */
function ringClass(selected: boolean, highlight: SlotFit): string {
  if (selected) return 'border-solid border-select';
  if (highlight === 'primary') return 'border-solid border-yellow-300';
  if (highlight === 'secondary') return 'border-dashed border-yellow-300';
  return 'border-solid border-transparent';
}

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
  minutes = null,
  booked = false,
  goals = 0,
  assists = 0,
  locked = false,
}: PlayerTokenProps) {
  return (
    <View
      accessible={false}
      className={dimmed ? 'opacity-30' : 'opacity-100'}
      style={{ width: size, height: size }}
    >
      {player ? (
        <JerseyBadge number={player.jerseyNumber} kitColor={kitColor} size={size} onPitch />
      ) : (
        <View
          className={`flex-1 items-center justify-center rounded-full border-2 ${EMPTY_SLOT_CLASS[locked ? 'locked' : (highlight ?? 'none')]}`}
        >
          {locked ? (
            <View className="h-[45%] w-[32%] rounded-sm bg-red-600" />
          ) : (
            <Text
              className={`font-bold ${highlight === 'primary' ? 'text-gray-900' : 'text-white'}`}
              style={{ fontSize: size * 0.3 }}
            >
              {label}
            </Text>
          )}
        </View>
      )}
      {/* Every state sets border style and color so Android doesn't leave a ghost ring. */}
      <View
        className={`absolute -inset-1 rounded-full border-[3px] ${ringClass(selected, player !== null ? highlight : null)}`}
      />
      {/* A filled spot still shows its position, as a chip above the badge. Minutes played ride
          along: the position is short, so they fit without truncating the name below. Sibling
          Texts in a row, not nested ones: on the phone, nested minutes showed up off the chip. */}
      {player && (label !== '' || minutes !== null) && (
        <View
          className="absolute items-center"
          style={{ bottom: size - 1, left: -size, width: size * 3 }}
        >
          <View className="flex-row items-center rounded bg-white px-1">
            {label !== '' && <Text className="text-xs font-bold text-gray-900">{label}</Text>}
            {minutes !== null && (
              <Text
                className={`text-xs font-bold text-pitch-dark ${label === '' ? 'ml-0' : 'ml-1'}`}
              >
                {minutes}
              </Text>
            )}
          </View>
        </View>
      )}
      {player && <ContributionMarks goals={goals} assists={assists} size={size} />}
      {player && booked && (
        <View
          className="absolute rounded-sm border border-yellow-600 bg-yellow-300"
          style={{ top: -2, left: -4, width: size * 0.22, height: size * 0.3 }}
        />
      )}
      {player && (
        <View
          className="absolute items-center"
          style={{ top: size + 2, left: -size / 2, width: size * 2 }}
        >
          <Text
            numberOfLines={1}
            className="rounded bg-gray-950 px-1 text-[13px] font-semibold text-white"
          >
            {player.name}
          </Text>
        </View>
      )}
    </View>
  );
}
