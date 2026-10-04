import { Stack } from 'expo-router';

export default function TeamsLayout() {
  return (
    <Stack screenOptions={{ headerTintColor: '#1b5e20' }}>
      <Stack.Screen name="index" options={{ title: 'Teams' }} />
    </Stack>
  );
}
