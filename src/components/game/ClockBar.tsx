import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';

import { breakName, periodName, type ClockAction, type ClockState } from '@/domain/clock';
import type { Score } from '@/domain/stats';

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
  const status =
    clock.phase === 'periodEnded'
      ? breakName(clock.currentPeriod, periodCount)
      : periodName(clock.currentPeriod, periodCount);
  // Pause/resume/next period is the big button; ending is secondary. The final "End match" is
  // only shown here once it's the natural next step (last period, or full time).
  const primary = actions.find((a) => a !== 'endPeriod' && a !== 'finish');
  const lastPeriod = clock.currentPeriod >= periodCount;
  const secondary = actions.find((a) => a === 'endPeriod' || (a === 'finish' && lastPeriod));

  return (
    <View className="gap-2 bg-pitch-dark px-2 pb-3" style={{ paddingTop: insetTop + 4 }}>
      <View className="flex-row items-center">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to Game Day"
          hitSlop={8}
          onPress={onBack}
          className="h-11 w-11 items-center justify-center rounded-full active:bg-white/10"
        >
          <Ionicons name="chevron-back" size={26} color="#ffffff" />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${teamName} ${score.us}, ${opponentName} ${score.them}. Open match log`}
          onPress={onScorePress}
          className="flex-1 flex-row items-center justify-center gap-3 rounded-xl py-1 active:bg-white/10"
        >
          <Text
            numberOfLines={1}
            className="shrink text-right text-base font-semibold text-green-100"
          >
            {teamName}
          </Text>
          <Text className="text-3xl font-black text-white">
            {score.us} – {score.them}
          </Text>
          <Text numberOfLines={1} className="shrink text-base font-semibold text-green-100">
            {opponentName}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="More match options"
          hitSlop={8}
          onPress={onMore}
          className="h-11 w-11 items-center justify-center rounded-full active:bg-white/10"
        >
          <Ionicons name="ellipsis-vertical" size={24} color="#ffffff" />
        </Pressable>
      </View>

      <View className="flex-row items-center gap-3 px-2">
        <View className="flex-1">
          <Text
            accessibilityRole="timer"
            accessibilityLabel={`Clock ${clock.display}`}
            className={`text-5xl font-black ${clock.isStoppage ? 'text-yellow-300' : 'text-white'}`}
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {clock.display}
          </Text>
          <View className="flex-row items-center gap-2">
            <Text className="text-base font-semibold text-green-100">{status}</Text>
            {clock.isPaused && (
              <Text className="rounded bg-amber-400 px-1.5 text-sm font-bold text-gray-900">
                PAUSED
              </Text>
            )}
            <Text className="text-base text-green-200">
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
              tone={primary === 'pause' ? 'amber' : 'green'}
              onPress={() => onAction(primary)}
            />
          )}
          {secondary && (
            <ClockButton
              label={actionLabel(secondary, clock, periodCount)}
              icon={ACTION_ICON[secondary]}
              tone="outline"
              onPress={() => onAction(secondary)}
            />
          )}
        </View>
      </View>
    </View>
  );
}

const TONE = {
  green: {
    box: 'border-green-400 bg-green-500 active:bg-green-600',
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
      <Text className={`text-base font-bold ${style.text}`}>{label}</Text>
    </Pressable>
  );
}
