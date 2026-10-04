import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { db } from '@/db/client';
import migrations from '@/db/migrations/migrations';

SplashScreen.preventAutoHideAsync();

/** Applies pending migrations before rendering the app; the splash stays up meanwhile. */
export function DatabaseGate({ children }: { children: ReactNode }) {
  const { success, error } = useMigrations(db, migrations);

  useEffect(() => {
    if (success || error) SplashScreen.hideAsync();
  }, [success, error]);

  if (error) {
    return (
      <View className="flex-1 items-center justify-center gap-2 bg-white px-6">
        <Text className="text-xl font-bold text-red-700">Could not open your data</Text>
        <Text className="text-center text-base text-gray-600">{error.message}</Text>
      </View>
    );
  }
  if (!success) return null;
  return children;
}
