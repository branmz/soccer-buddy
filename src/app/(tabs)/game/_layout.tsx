import { Stack } from 'expo-router';

export default function GameDayLayout() {
  return (
    <Stack screenOptions={{ headerTintColor: '#1b5e20' }}>
      <Stack.Screen name="index" options={{ title: 'Game Day' }} />
    </Stack>
  );
}
