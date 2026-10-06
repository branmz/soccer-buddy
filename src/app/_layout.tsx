import '@/global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DatabaseGate } from '@/components/DatabaseGate';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <DatabaseGate>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            {/* Full screen, above the tabs: every pixel goes to the pitch during a match. */}
            <Stack.Screen name="live/[matchId]" />
          </Stack>
        </DatabaseGate>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
