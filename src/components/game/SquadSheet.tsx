import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';

import { JerseyBadge } from '@/components/teams/JerseyBadge';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Sheet } from '@/components/ui/Sheet';
import { COLORS } from '@/constants/colors';
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
    // The count goes under the title: Title Case made it "Who's Here? 13 Of 13".
    <Sheet visible={visible} title="Who's here?" onClose={onClose}>
      <Text className="text-base text-ink-soft">
        Tap a player to mark them absent. Absent players leave the lineup and quick subs skip them.
        If they turn up late, add them from the live match&apos;s ⋮ menu.
      </Text>
      <SectionHeading>
        Here · {here} of {roster.length}
      </SectionHeading>
      <View>
        {roster.map((player) => {
          const isHere = squad.has(player.id);
          return (
            <Pressable
              key={player.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isHere }}
              onPress={() => onToggle(player.id)}
              className="min-h-14 flex-row items-center gap-3 border-b border-muted active:bg-canvas"
            >
              <JerseyBadge
                number={player.jerseyNumber}
                kitColor={kitColor}
                inactive={!isHere}
                size={36}
              />
              <Text
                numberOfLines={1}
                className={`flex-1 text-base font-semibold ${isHere ? 'text-ink' : 'text-ink-muted'}`}
              >
                {player.name}
              </Text>
              <Text className={`text-sm ${isHere ? 'text-brand' : 'text-ink-muted'}`}>
                {isHere ? 'Here' : 'Absent'}
              </Text>
              <Ionicons
                name={isHere ? 'checkbox' : 'square-outline'}
                size={26}
                color={isHere ? COLORS.brand : COLORS.inkMuted}
              />
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}
