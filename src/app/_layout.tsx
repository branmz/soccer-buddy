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
        {/* The app is light-only: "auto" draws white icons on white when the phone is dark. */}
        <StatusBar style="dark" />
        <DatabaseGate>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            {/* Full screen, above the tabs: every pixel goes to the pitch during a match. It
                slides up like a mode you enter and leave (Android's default scale-and-fade
                ghosted a see-through copy of the old screen behind it). */}
            <Stack.Screen name="live/[matchId]" options={{ animation: 'slide_from_bottom' }} />
          </Stack>
        </DatabaseGate>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
