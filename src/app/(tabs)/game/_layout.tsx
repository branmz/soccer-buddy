import { Stack } from 'expo-router';

import { TeamSwitcher } from '@/components/teams/TeamSwitcher';

export default function GameDayLayout() {
  return (
    <Stack screenOptions={{ headerTintColor: '#1b5e20' }}>
      <Stack.Screen
        name="index"
        options={{ title: 'Game Day', headerRight: () => <TeamSwitcher /> }}
      />
      <Stack.Screen name="[matchId]" options={{ title: 'Match Setup' }} />
      <Stack.Screen name="lineup/[matchId]" options={{ title: 'Starting Lineup' }} />
    </Stack>
  );
}
