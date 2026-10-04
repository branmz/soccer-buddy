import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

type IconName = ComponentProps<typeof Ionicons>['name'];

const BRAND = '#16a34a';

function tabIcon(name: IconName) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={color} size={size} />;
  };
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: BRAND }}>
      <Tabs.Screen name="teams" options={{ title: 'Teams', tabBarIcon: tabIcon('people') }} />
      <Tabs.Screen name="tactics" options={{ title: 'Tactics', tabBarIcon: tabIcon('grid') }} />
      <Tabs.Screen name="game" options={{ title: 'Game Day', tabBarIcon: tabIcon('stopwatch') }} />
      <Tabs.Screen
        name="history"
        options={{ title: 'History', tabBarIcon: tabIcon('stats-chart') }}
      />
    </Tabs>
  );
}
