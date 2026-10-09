import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';

import { BRAND } from '@/constants/colors';
import { breakName, periodName, type ClockAction, type ClockState } from '@/domain/clock';
import type { Score } from '@/domain/stats';
import { capitalizeWords } from '@/domain/text';

type ClockBarProps = {
  teamName: string;
  opponentName: string;
  score: Score;
  clock: ClockState;
  periodCount: number;
  subsUsed: number;
  maxSubs: number | null;
  actions: ClockAction[];
  onAction: (action: ClockAction) => void;
  onBack: () => void;
  onMore: () => void;
  /** Opens the match log. */
  onScorePress: () => void;
  /** Top safe-area inset: the bar runs under the status bar. */
  insetTop: number;
};

type IconName = ComponentProps<typeof Ionicons>['name'];

function actionLabel(action: ClockAction, clock: ClockState, periodCount: number): string {
  switch (action) {
    case 'pause':
      return 'Pause';
    case 'resume':
      return 'Resume';
    case 'startNextPeriod':
      return `Start ${periodName(clock.currentPeriod + 1, periodCount)}`;
    case 'endPeriod':
      return `End ${periodName(clock.currentPeriod, periodCount)}`;
    case 'finish':
      return 'End match';
  }
}

const ACTION_ICON: Record<ClockAction, IconName> = {
  pause: 'pause',
  resume: 'play',
  startNextPeriod: 'play',
  endPeriod: 'stop',
  finish: 'flag',
};

/**
 * The bar's colors. Paused turns the whole bar amber, so a glance from the sideline tells a
 * stopped clock from a running one; a small chip didn't. Both states set every value (removing
 * a class leaves a one-frame ghost on Android).
 */
const BAR = {
  running: {
    box: 'bg-pitch-dark',
    soft: 'text-green-100',
    subs: 'text-green-200',
    strong: 'text-white',
    icon: '#ffffff',
    press: 'active:bg-white/10',
  },
  paused: {
    box: 'bg-amber-400',
    soft: 'text-gray-900',
    subs: 'text-gray-900',
    strong: 'text-gray-950',
    icon: '#030712',
    press: 'active:bg-black/10',
  },
} as const;

/** Score, clock, period and the clock controls, across the top of the live screen. */
export function ClockBar({
  teamName,
  opponentName,
  score,
  clock,
  periodCount,
  subsUsed,
  maxSubs,
  actions,
  onAction,
  onBack,
  onMore,
  onScorePress,
  insetTop,
}: ClockBarProps) {
  const paused = clock.isPaused;
  const bar = paused ? BAR.paused : BAR.running;
  const period =
    clock.phase === 'periodEnded'
      ? breakName(clock.currentPeriod, periodCount)
      : periodName(clock.currentPeriod, periodCount);
  // Pause/resume/next period is the big button; ending is secondary. The final "End match" is
  // only shown here once it's the natural next step (last period, or full time).
  const primary = actions.find((a) => a !== 'endPeriod' && a !== 'finish');
  const lastPeriod = clock.currentPeriod >= periodCount;
  const secondary = actions.find((a) => a === 'endPeriod' || (a === 'finish' && lastPeriod));
  const digitsColor = paused ? bar.strong : clock.isStoppage ? 'text-yellow-300' : 'text-white';

  return (
    <View className={`gap-2 px-2 pb-3 ${bar.box}`} style={{ paddingTop: insetTop + 4 }}>
      <View className="flex-row items-center">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to Game Day"
          hitSlop={8}
          onPress={onBack}
          className={`h-11 w-11 items-center justify-center rounded-full ${bar.press}`}
        >
          <Ionicons name="chevron-back" size={26} color={bar.icon} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${teamName} ${score.us}, ${opponentName} ${score.them}. Open match log`}
          onPress={onScorePress}
          className={`flex-1 flex-row items-center justify-center gap-3 rounded-xl py-1 ${bar.press}`}
        >
          <Text
            numberOfLines={1}
            className={`shrink text-right text-base font-semibold ${bar.soft}`}
          >
            {teamName}
          </Text>
          <Text className={`text-3xl font-black ${bar.strong}`}>
            {score.us} – {score.them}
          </Text>
          <Text numberOfLines={1} className={`shrink text-base font-semibold ${bar.soft}`}>
            {opponentName}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="More match options"
          hitSlop={8}
          onPress={onMore}
          className={`h-11 w-11 items-center justify-center rounded-full ${bar.press}`}
        >
          <Ionicons name="ellipsis-vertical" size={24} color={bar.icon} />
        </Pressable>
      </View>

      <View className="flex-row items-center gap-3 px-2">
        <View className="flex-1">
          <Text
            accessibilityRole="timer"
            accessibilityLabel={`Clock ${clock.display}${paused ? ', paused' : ''}`}
            className={`text-5xl font-black ${digitsColor}`}
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {clock.display}
          </Text>
          <View className="flex-row items-center gap-2">
            <Text className={`text-base font-semibold ${bar.soft}`}>
              {paused ? `PAUSED · ${period}` : period}
            </Text>
            <Text className={`text-base ${bar.subs}`}>
              · Subs {subsUsed}
              {maxSubs === null ? '' : ` / ${maxSubs}`}
            </Text>
          </View>
        </View>
        <View className="gap-2">
          {primary && (
            <ClockButton
              label={actionLabel(primary, clock, periodCount)}
              icon={ACTION_ICON[primary]}
              tone={primary === 'pause' ? 'amber' : paused ? 'dark' : 'light'}
              onPress={() => onAction(primary)}
            />
          )}
          {secondary && (
            <ClockButton
              label={actionLabel(secondary, clock, periodCount)}
              icon={ACTION_ICON[secondary]}
              tone={paused ? 'outlineDark' : 'outline'}
              onPress={() => onAction(secondary)}
            />
          )}
        </View>
      </View>
    </View>
  );
}

/** Solid fills with dark-on-light or light-on-dark text: green on green washed out in sun. */
const TONE = {
  /** Start the next period, on the green bar. */
  light: {
    box: 'border-white bg-white active:bg-gray-200',
    text: 'text-gray-950',
    icon: BRAND,
  },
  /** Resume, on the amber (paused) bar. */
  dark: {
    box: 'border-gray-950 bg-gray-950 active:bg-gray-800',
    text: 'text-white',
    icon: '#ffffff',
  },
  amber: {
    box: 'border-amber-300 bg-amber-400 active:bg-amber-500',
    text: 'text-gray-900',
    icon: '#111827',
  },
  outline: {
    box: 'border-white/60 bg-transparent active:bg-white/10',
    text: 'text-white',
    icon: '#ffffff',
  },
  outlineDark: {
    box: 'border-gray-900/60 bg-transparent active:bg-black/10',
    text: 'text-gray-950',
    icon: '#030712',
  },
} as const;

type ClockButtonProps = {
  label: string;
  icon: IconName;
  tone: keyof typeof TONE;
  onPress: () => void;
};

function ClockButton({ label, icon, tone, onPress }: ClockButtonProps) {
  const style = TONE[tone];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={`min-h-12 min-w-36 flex-row items-center justify-center gap-1.5 rounded-xl border px-3 ${style.box}`}
    >
      <Ionicons name={icon} size={20} color={style.icon} />
      <Text className={`text-base font-bold ${style.text}`}>{capitalizeWords(label)}</Text>
    </Pressable>
  );
}
