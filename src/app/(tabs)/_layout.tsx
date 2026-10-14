import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Tabs } from 'expo-router';
import { useEffect, type ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { COLORS } from '@/constants/colors';
import { liveMatchQuery } from '@/db/repositories/matches';

type IconName = ComponentProps<typeof Ionicons>['name'];

/**
 * Filled when active, outline when not: with readable (ink-muted) inactive labels, the active
 * tab's green is close in lightness, so shape carries the difference too.
 */
function tabIcon(active: IconName, inactive: IconName) {
  return function TabIcon({
    color,
    size,
    focused,
  }: {
    color: ColorValue;
    size: number;
    focused: boolean;
  }) {
    return <Ionicons name={focused ? active : inactive} color={color} size={size} />;
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
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.brand,
        // React Navigation's default is 50% alpha text (about 3.3:1), too light in sun.
        tabBarInactiveTintColor: COLORS.inkMuted,
      }}
    >
      <Tabs.Screen
        name="teams"
        options={{ title: 'Teams', tabBarIcon: tabIcon('people', 'people-outline') }}
      />
      <Tabs.Screen
        name="tactics"
        options={{ title: 'Tactics', tabBarIcon: tabIcon('grid', 'grid-outline') }}
      />
      <Tabs.Screen
        name="game"
        options={{ title: 'Game Day', tabBarIcon: tabIcon('stopwatch', 'stopwatch-outline') }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: 'History', tabBarIcon: tabIcon('stats-chart', 'stats-chart-outline') }}
      />
    </Tabs>
  );
}
