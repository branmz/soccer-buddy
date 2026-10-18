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
        {/* Two lines: a long club name keeps its squad suffix (U10 / U12) visible. */}
        <Text numberOfLines={2} className="shrink text-title text-ink">
          {team.name}
        </Text>
        {isActive && (
          <View className="rounded-full bg-brand-tint-strong px-2.5 py-0.5">
            <Text className="text-caption font-semibold text-brand-strong">Active</Text>
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
        <Text className="text-body text-ink-soft">
          {team.fieldSize}v{team.fieldSize} · {team.activePlayerCount} {playerLabel}
        </Text>
      </View>
    </>
  );
}
