import { Text, View } from 'react-native';

import type { TeamSummary } from '@/db/repositories/teams';
import { kitColorName } from '@/domain/colors';

import { ColorSwatch } from './ColorSwatch';

/** What a screen reader says for a team card. */
export function teamCardLabel(team: TeamSummary, isActive: boolean): string {
  const playerLabel = team.activePlayerCount === 1 ? 'player' : 'players';
  const kits = [
    team.homeColor && `home kit ${kitColorName(team.homeColor)}`,
    team.awayColor && `away kit ${kitColorName(team.awayColor)}`,
  ].filter(Boolean);
  return `${team.name}${isActive ? ', active team' : ''}, ${team.fieldSize} v ${team.fieldSize}, ${
    team.activePlayerCount
  } ${playerLabel}${kits.length ? `, ${kits.join(', ')}` : ''}`;
}

/** The card's text: name (+ Active tag), kit colors, field size and player count. */
export function TeamCardBody({ team, isActive }: { team: TeamSummary; isActive: boolean }) {
  const playerLabel = team.activePlayerCount === 1 ? 'player' : 'players';
  return (
    <>
      <View className="flex-row items-center gap-2">
        <Text numberOfLines={1} className="shrink text-2xl font-bold text-gray-900">
          {team.name}
        </Text>
        {isActive && (
          <View className="rounded-full bg-green-100 px-2.5 py-0.5">
            <Text className="text-sm font-semibold text-pitch-dark">Active</Text>
          </View>
        )}
      </View>
      <View className="flex-row items-center gap-2">
        {(team.homeColor || team.awayColor) && (
          <View className="flex-row gap-1.5">
            {team.homeColor && <ColorSwatch color={team.homeColor} size={20} />}
            {team.awayColor && <ColorSwatch color={team.awayColor} size={20} />}
          </View>
        )}
        <Text className="text-base text-gray-600">
          {team.fieldSize}v{team.fieldSize} · {team.activePlayerCount} {playerLabel}
        </Text>
      </View>
    </>
  );
}
