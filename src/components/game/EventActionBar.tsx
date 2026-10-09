import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { capitalizeWords } from '@/domain/text';
import { usePressScale } from '@/hooks/usePressScale';
import { tapHaptic } from '@/lib/haptics';

import { RefereeCardIcon } from './RefereeCardIcon';

type IconName = ComponentProps<typeof Ionicons>['name'];

type EventActionBarProps = {
  onGoal: () => void;
  onOpponentGoal: () => void;
  onCard: () => void;
  /** Opens the match log. Subs are made on the board (drag, or two taps) or with quick subs. */
  onLog: () => void;
  onUndo: () => void;
  canUndo: boolean;
  /** Bottom safe-area inset: the bar sits on the navigation bar. */
  insetBottom: number;
};

/** Big labelled buttons along the bottom, within thumb reach on the sideline. */
export function EventActionBar({
  onGoal,
  onOpponentGoal,
  onCard,
  onLog,
  onUndo,
  canUndo,
  insetBottom,
}: EventActionBarProps) {
  return (
    <View
      className="flex-row gap-1.5 border-t border-gray-200 bg-white px-2 pt-2"
      style={{ paddingBottom: Math.max(insetBottom, 8) }}
    >
      <ActionButton label="Goal" icon="football" tone="green" haptic onPress={onGoal} />
      {/* Dark, not white like Log and Undo: next to the green Goal it must never pass for it.
          No tap haptic: it records at once, and recording has its own. */}
      <ActionButton
        label="Their goal"
        icon="football-outline"
        tone="dark"
        onPress={onOpponentGoal}
      />
      <ActionButton
        label="Card"
        icon={<RefereeCardIcon color="both" size={26} />}
        tone="amber"
        haptic
        onPress={onCard}
      />
      <ActionButton label="Log" icon="list" tone="gray" haptic onPress={onLog} />
      <ActionButton
        label="Undo"
        icon="arrow-undo"
        tone="gray"
        haptic
        onPress={onUndo}
        disabled={!canUndo}
      />
    </View>
  );
}

const TONE = {
  green: {
    box: 'border-brand bg-brand active:bg-pitch-dark',
    text: 'text-white',
    icon: '#ffffff',
  },
  dark: {
    box: 'border-gray-900 bg-gray-900 active:bg-gray-700',
    text: 'text-white',
    icon: '#ffffff',
  },
  amber: {
    box: 'border-amber-300 bg-amber-100 active:bg-amber-200',
    text: 'text-gray-900',
    icon: '#b45309',
  },
  gray: {
    box: 'border-gray-300 bg-white active:bg-gray-100',
    text: 'text-gray-900',
    icon: '#111827',
  },
  /** Any button while disabled: muted but readable, not a 40% fade. */
  disabled: {
    box: 'border-gray-200 bg-gray-100 active:bg-gray-100',
    text: 'text-gray-500',
    icon: '#6b7280',
  },
} as const;

type ActionButtonProps = {
  label: string;
  /** An Ionicons name, or a custom icon. */
  icon: IconName | ReactNode;
  tone: Exclude<keyof typeof TONE, 'disabled'>;
  onPress: () => void;
  /** A light tick on press, for buttons that open something rather than record. */
  haptic?: boolean;
  disabled?: boolean;
};

function ActionButton({
  label,
  icon,
  tone,
  onPress,
  haptic = false,
  disabled = false,
}: ActionButtonProps) {
  const style = TONE[disabled ? 'disabled' : tone];
  const press = usePressScale();
  return (
    <Animated.View className="flex-1" style={press.style}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        onPress={() => {
          if (haptic) tapHaptic();
          onPress();
        }}
        // flex-1 fills the wrapper's height, so all five keep one height at large font sizes.
        className={`min-h-16 flex-1 items-center justify-center gap-0.5 rounded-xl border ${style.box}`}
      >
        {typeof icon === 'string' ? (
          <Ionicons name={icon as IconName} size={24} color={style.icon} />
        ) : (
          icon
        )}
        <Text numberOfLines={1} className={`text-sm font-semibold ${style.text}`}>
          {capitalizeWords(label)}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
