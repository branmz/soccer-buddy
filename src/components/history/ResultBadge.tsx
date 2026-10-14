import { Text, View } from 'react-native';

import type { MatchResult } from '@/domain/stats';

// White letters need a dark enough badge: gray-500 for a draw (gray-400 was 2.5:1).
const RESULT_STYLE: Record<MatchResult, { letter: string; label: string; className: string }> = {
  win: { letter: 'W', label: 'Win', className: 'bg-brand' },
  draw: { letter: 'D', label: 'Draw', className: 'bg-gray-500' },
  loss: { letter: 'L', label: 'Loss', className: 'bg-red-600' },
};

/** Spoken name of a result: "Win", "Draw", "Loss". */
export function resultLabel(result: MatchResult): string {
  return RESULT_STYLE[result].label;
}

/** A W / D / L square: green, gray or red. */
export function ResultBadge({ result, size = 'md' }: { result: MatchResult; size?: 'sm' | 'md' }) {
  const style = RESULT_STYLE[result];
  const box = size === 'md' ? 'h-9 w-9 rounded-lg' : 'h-7 w-7 rounded-md';
  const text = size === 'md' ? 'text-lg' : 'text-base';
  return (
    <View className={`items-center justify-center ${box} ${style.className}`}>
      <Text className={`font-black text-white ${text}`}>{style.letter}</Text>
    </View>
  );
}
