import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Tabs } from 'expo-router';
import { useEffect, type ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { BRAND } from '@/constants/colors';
import { liveMatchQuery } from '@/db/repositories/matches';

type IconName = ComponentProps<typeof Ionicons>['name'];

function tabIcon(name: IconName) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={color} size={size} />;
  };
}

/** Once per app launch: a match left live (app killed mid-game) reopens straight away. */
let resumeChecked = false;

export default function TabsLayout() {
  useEffect(() => {
    if (resumeChecked) return;
    resumeChecked = true;
    const live = liveMatchQuery().get();
    if (live) {
      router.push({ pathname: '/live/[matchId]', params: { matchId: String(live.id) } });
    }
  }, []);

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
