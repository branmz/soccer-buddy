import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import type { MainClockAction } from '@/domain/clock';
import { capitalizeWords } from '@/domain/text';
import { usePressScale } from '@/hooks/usePressScale';
import { tapHaptic } from '@/lib/haptics';

import { RefereeCardIcon } from './RefereeCardIcon';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** The clock's main control, shown in the middle of the bar. */
export type ClockControl = {
  action: MainClockAction;
  /** Short enough for the button ("Pause", "2nd Half"). */
  label: string;
  /** The full action for screen readers ("Start 2nd half"). */
  spoken: string;
};

type EventActionBarProps = {
  onGoal: () => void;
  onOpponentGoal: () => void;
  onCard: () => void;
  /** Pause, resume, next period or (at full time) end the match; null before kickoff. */
  clock: ClockControl | null;
  onClockAction: (action: MainClockAction) => void;
  onUndo: () => void;
  canUndo: boolean;
  /** Bottom safe-area inset: the bar sits on the navigation bar. */
  insetBottom: number;
};

const CLOCK_ICON: Record<MainClockAction, IconName> = {
  pause: 'pause',
  resume: 'play',
  startNextPeriod: 'play',
  finish: 'flag',
};

/**
 * Big labelled buttons along the bottom, within thumb reach on the sideline. The clock's
 * pause / resume, pressed all match, sits in the middle, the easiest spot for either thumb;
 * it also keeps Goal and Their goal apart. Subs are made on the board (drag, or two taps)
 * or with quick subs; the match log opens from the score (or ⋮).
 */
export function EventActionBar({
  onGoal,
  onOpponentGoal,
  onCard,
  clock,
  onClockAction,
  onUndo,
  canUndo,
  insetBottom,
}: EventActionBarProps) {
  return (
    <View
      className="flex-row gap-1.5 border-t border-gray-200 bg-white px-2 pt-2"
      style={{ paddingBottom: Math.max(insetBottom, 8) }}
    >
      <ActionButton
        label="Card"
        icon={<RefereeCardIcon color="both" size={26} />}
        tone="amber"
        haptic
        onPress={onCard}
      />
      <ActionButton label="Goal" icon="football" tone="green" haptic onPress={onGoal} />
      {clock ? (
        <ActionButton
          label={clock.label}
          accessibilityLabel={clock.spoken}
          icon={CLOCK_ICON[clock.action]}
          // White while running (pause = stop the clock); amber while stopped, like the
          // paused clock bar: the button that gets play going again.
          tone={clock.action === 'pause' ? 'pause' : 'go'}
          // Starting a period or ending the match opens a confirm (at half-time this spot held
          // Pause all half: a habit tap mustn't start the clock). Pause / resume record at
          // once, with their own haptic.
          haptic={clock.action === 'startNextPeriod' || clock.action === 'finish'}
          onPress={() => onClockAction(clock.action)}
        />
      ) : (
        <ActionButton label="Clock" icon="time-outline" tone="pause" disabled onPress={noop} />
      )}
      {/* Dark: it must never pass for the green Goal. No tap haptic: it records at once. */}
      <ActionButton
        label="Their goal"
        icon="football-outline"
        tone="dark"
        onPress={onOpponentGoal}
      />
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

function noop() {}

// Each tone sets its border width too: the clock button switches tones as it's pressed.
const TONE = {
  green: {
    box: 'border border-brand bg-brand active:bg-pitch-dark',
    text: 'text-white',
    icon: '#ffffff',
  },
  dark: {
    box: 'border border-gray-900 bg-gray-900 active:bg-gray-700',
    text: 'text-white',
    icon: '#ffffff',
  },
  amber: {
    box: 'border border-amber-300 bg-amber-100 active:bg-amber-200',
    text: 'text-gray-900',
    icon: '#b45309',
  },
  gray: {
    box: 'border border-gray-300 bg-white active:bg-gray-100',
    text: 'text-gray-900',
    icon: '#111827',
  },
  /** Pause: a heavy dark outline, so it doesn't read like the plain white Undo. */
  pause: {
    box: 'border-2 border-gray-900 bg-white active:bg-gray-100',
    text: 'text-gray-950',
    icon: '#030712',
  },
  /** Resume, next period, end match: solid amber, like the paused clock bar. */
  go: {
    box: 'border-2 border-amber-500 bg-amber-400 active:bg-amber-500',
    text: 'text-gray-950',
    icon: '#030712',
  },
  /** Any button while disabled: muted but readable, not a 40% fade. */
  disabled: {
    box: 'border border-gray-200 bg-gray-100 active:bg-gray-100',
    text: 'text-gray-500',
    icon: '#6b7280',
  },
} as const;

type ActionButtonProps = {
  label: string;
  /** For screen readers, when the label is abbreviated. */
  accessibilityLabel?: string;
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
  accessibilityLabel,
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
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        onPress={() => {
          if (haptic) tapHaptic();
          onPress();
        }}
        // flex-1 fills the wrapper's height, so all five keep one height at large font sizes.
        className={`min-h-16 flex-1 items-center justify-center gap-0.5 rounded-xl ${style.box}`}
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
