import { Stack } from 'expo-router';

export default function TacticsLayout() {
  return (
    <Stack screenOptions={{ headerTintColor: '#1b5e20' }}>
      <Stack.Screen name="index" options={{ title: 'Tactics' }} />
    </Stack>
  );
}
