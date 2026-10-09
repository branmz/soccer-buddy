import { Stack } from 'expo-router';

import { STACK_OPTIONS } from '@/constants/navigation';

export default function TeamsLayout() {
  return (
    <Stack screenOptions={STACK_OPTIONS}>
      <Stack.Screen name="index" options={{ title: 'Teams' }} />
      <Stack.Screen name="[teamId]" options={{ title: 'Roster' }} />
    </Stack>
  );
}
