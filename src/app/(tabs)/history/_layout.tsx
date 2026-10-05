import { Stack } from 'expo-router';

import { TeamSwitcher } from '@/components/teams/TeamSwitcher';

export default function HistoryLayout() {
  return (
    <Stack screenOptions={{ headerTintColor: '#1b5e20' }}>
      <Stack.Screen
        name="index"
        options={{ title: 'History', headerRight: () => <TeamSwitcher /> }}
      />
    </Stack>
  );
}
