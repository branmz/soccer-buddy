import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { capitalizeWords } from '@/domain/text';

type CardProps = {
  /** A heading at the top (Title Case, read as a header). */
  title?: string;
  /** No padding, for content that lays out its own edges (tables, a custom header row). */
  flush?: boolean;
  /**
   * Layout only. On a padded card it replaces the default `gap-3`, so include a gap
   * (`"gap-4"`, `"gap-1 mt-2"`). On a `flush` card it carries the padding (none by default).
   */
  className?: string;
  children: ReactNode;
};

/** The app's white card: rounded, a light border, padded. */
export function Card({ title, flush = false, className, children }: CardProps) {
  // `flush` is fixed per card (never toggled), so leaving out `p-4` can't ghost.
  const layout = flush ? (className ?? '') : `p-4 ${className ?? 'gap-3'}`;
  return (
    <View className={`rounded-2xl border border-line bg-surface ${layout}`}>
      {title !== undefined && (
        <Text accessibilityRole="header" className="text-heading text-ink">
          {capitalizeWords(title)}
        </Text>
      )}
      {children}
    </View>
  );
}
