import { Stack } from 'expo-router';

import { TeamSwitcher } from '@/components/teams/TeamSwitcher';
import { STACK_OPTIONS } from '@/constants/navigation';

export default function TacticsLayout() {
  return (
    <Stack screenOptions={STACK_OPTIONS}>
      <Stack.Screen
        name="index"
        options={{ title: 'Tactics', headerRight: () => <TeamSwitcher /> }}
      />
    </Stack>
  );
}
