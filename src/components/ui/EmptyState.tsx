import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { Text, View } from 'react-native';

type EmptyStateProps = {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  message: string;
  /** Usually a Button. */
  action?: ReactNode;
};

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center gap-3 px-8 py-12">
      <Ionicons name={icon} size={48} color="#9ca3af" />
      <Text className="text-center text-xl font-bold text-gray-900">{title}</Text>
      <Text className="text-center text-base text-gray-500">{message}</Text>
      {action && <View className="mt-2 self-stretch">{action}</View>}
    </View>
  );
}
