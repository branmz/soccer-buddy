import { Stack } from 'expo-router';

import { TeamSwitcher } from '@/components/teams/TeamSwitcher';
import { STACK_OPTIONS } from '@/constants/navigation';

export default function HistoryLayout() {
  return (
    <Stack screenOptions={STACK_OPTIONS}>
      <Stack.Screen
        name="index"
        options={{ title: 'History', headerRight: () => <TeamSwitcher /> }}
      />
      <Stack.Screen name="[matchId]" options={{ title: 'Match' }} />
    </Stack>
  );
}
