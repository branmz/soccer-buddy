import { Stack } from 'expo-router';

import { TeamSwitcher } from '@/components/teams/TeamSwitcher';
import { STACK_OPTIONS } from '@/constants/navigation';

export default function GameDayLayout() {
  return (
    <Stack screenOptions={STACK_OPTIONS}>
      <Stack.Screen
        name="index"
        options={{ title: 'Game Day', headerRight: () => <TeamSwitcher /> }}
      />
      <Stack.Screen name="[matchId]" options={{ title: 'Match Setup' }} />
      <Stack.Screen name="lineup/[matchId]" options={{ title: 'Starting Lineup' }} />
    </Stack>
  );
}
