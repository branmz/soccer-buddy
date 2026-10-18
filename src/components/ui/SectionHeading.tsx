import type { ReactNode } from 'react';
import { Text } from 'react-native';

type SectionHeadingProps = {
  children: ReactNode;
  /** Layout only: spacing (`pt-3`) or `flex-1` beside an action. */
  className?: string;
  /**
   * Read as a heading (default). Pass false inside a button (a toggle that shows a section):
   * TalkBack reads the button, and a heading nested in it can't be focused on its own.
   */
  header?: boolean;
};

/** The small grey uppercase label above a group of rows or cards ("LAST RESULT"). */
export function SectionHeading({ children, className = '', header = true }: SectionHeadingProps) {
  return (
    <Text
      accessibilityRole={header ? 'header' : undefined}
      className={`text-caption font-semibold text-ink-muted uppercase ${className}`}
    >
      {children}
    </Text>
  );
}
