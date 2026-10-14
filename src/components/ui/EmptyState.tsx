import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { Text, View } from 'react-native';

import { COLORS } from '@/constants/colors';
import { capitalizeWords } from '@/domain/text';

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
      <Ionicons name={icon} size={48} color={COLORS.inkFaint} />
      <Text className="text-center text-xl font-bold text-ink">{capitalizeWords(title)}</Text>
      <Text className="text-center text-base text-ink-muted">{message}</Text>
      {action && <View className="mt-2 self-stretch">{action}</View>}
    </View>
  );
}
