import type { ReactNode } from 'react';
import { Pressable } from 'react-native';

type ListRowProps = {
  onPress: () => void;
  /** What a screen reader says; defaults to the row's text. */
  accessibilityLabel?: string;
  children: ReactNode;
};

/** A tappable white row in a list (a match, a draft): ≥64dp, content laid out in a row. */
export function ListRow({ onPress, accessibilityLabel, children }: ListRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      className="min-h-16 flex-row items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 active:bg-canvas"
    >
      {children}
    </Pressable>
  );
}
