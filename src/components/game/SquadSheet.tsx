import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';

import { JerseyBadge } from '@/components/teams/JerseyBadge';
import { Sheet } from '@/components/ui/Sheet';
import { BRAND } from '@/constants/colors';
import type { Player } from '@/db/schema';

type SquadSheetProps = {
  visible: boolean;
  /** Active players, in roster order. */
  roster: Player[];
  squad: ReadonlySet<number>;
  kitColor: string | null;
  onToggle: (playerId: number) => void;
  onClose: () => void;
};

/** Who's here today: absent players stay off the pitch and the bench. */
export function SquadSheet({
  visible,
  roster,
  squad,
  kitColor,
  onToggle,
  onClose,
}: SquadSheetProps) {
  const here = roster.filter((p) => squad.has(p.id)).length;
  return (
    <Sheet visible={visible} title={`Who's here? ${here} of ${roster.length}`} onClose={onClose}>
      <Text className="text-base text-gray-600">
        Tap a player to mark them absent. Absent players leave the lineup and quick subs skip them.
        If they turn up late, add them from the live match&apos;s ⋮ menu.
      </Text>
      <View>
        {roster.map((player) => {
          const isHere = squad.has(player.id);
          return (
            <Pressable
              key={player.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isHere }}
              onPress={() => onToggle(player.id)}
              className="min-h-14 flex-row items-center gap-3 border-b border-gray-100 active:bg-gray-50"
            >
              <JerseyBadge
                number={player.jerseyNumber}
                kitColor={kitColor}
                inactive={!isHere}
                size={36}
              />
              <Text
                numberOfLines={1}
                className={`flex-1 text-base font-semibold ${isHere ? 'text-gray-900' : 'text-gray-500'}`}
              >
                {player.name}
              </Text>
              <Text className={`text-sm ${isHere ? 'text-brand' : 'text-gray-500'}`}>
                {isHere ? 'Here' : 'Absent'}
              </Text>
              <Ionicons
                name={isHere ? 'checkbox' : 'square-outline'}
                size={26}
                color={isHere ? BRAND : '#6b7280'}
              />
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}
