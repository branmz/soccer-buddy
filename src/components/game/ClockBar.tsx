import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, type ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { breakName, periodName, type ClockState, type EndClockAction } from '@/domain/clock';
import type { Score } from '@/domain/stats';
import { capitalizeWords } from '@/domain/text';
import { usePressScale } from '@/hooks/usePressScale';
import { tapHaptic } from '@/lib/haptics';

type ClockBarProps = {
  teamName: string;
  opponentName: string;
  score: Score;
  clock: ClockState;
  periodCount: number;
  subsUsed: number;
  maxSubs: number | null;
  /**
   * End the period (or the match, in the last one), top right: rare and confirmed, so it's
   * fine out of thumb reach. Pause / resume live in the bottom bar. Null hides it.
   */
  endAction: EndClockAction | null;
  onEnd: (action: EndClockAction) => void;
  onBack: () => void;
  onMore: () => void;
  /** Opens the match log. */
  onScorePress: () => void;
  /** Top safe-area inset: the bar runs under the status bar. */
  insetTop: number;
};

type IconName = ComponentProps<typeof Ionicons>['name'];

function endLabel(action: EndClockAction, clock: ClockState, periodCount: number): string {
  return action === 'endPeriod'
    ? `End ${periodName(clock.currentPeriod, periodCount)}`
    : 'End match';
}

const endIcon = (action: EndClockAction): IconName => (action === 'endPeriod' ? 'stop' : 'flag');

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

/** Score, clock, period, subs and the end-of-period control, across the top of the live screen. */
export function ClockBar({
  teamName,
  opponentName,
  score,
  clock,
  periodCount,
  subsUsed,
  maxSubs,
  endAction,
  onEnd,
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
  const digitsColor = paused ? bar.strong : clock.isStoppage ? 'text-yellow-300' : 'text-white';
  const subsLeft = maxSubs === null ? null : maxSubs - subsUsed;
  // Near the limit the count becomes a chip that pops on the green and the amber bar alike.
  // Every state sets the same classes (no Android ghosting); only the values change.
  const subsClass =
    subsLeft !== null && subsLeft <= 0
      ? 'rounded bg-red-600 px-1.5 text-white'
      : subsLeft === 1
        ? 'rounded bg-white px-1.5 text-amber-800'
        : `rounded bg-transparent px-0 ${bar.subs}`;
  const subsSpoken =
    subsLeft === null
      ? `${subsUsed} subs used`
      : `${subsUsed} of ${maxSubs} subs used${subsLeft <= 0 ? ', none left' : subsLeft === 1 ? ', one left' : ''}`;

  // The score bumps when it changes: it's the confirmation the coach actually looks at.
  const scoreScale = useSharedValue(1);
  const scoreStyle = useAnimatedStyle(() => ({ transform: [{ scale: scoreScale.get() }] }));
  const scoreKey = `${score.us}-${score.them}`;
  const lastScoreKey = useRef(scoreKey);
  useEffect(() => {
    if (lastScoreKey.current === scoreKey) return;
    lastScoreKey.current = scoreKey;
    scoreScale.set(
      withSequence(withTiming(1.3, { duration: 140 }), withTiming(1, { duration: 260 })),
    );
  }, [scoreKey, scoreScale]);

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
          <Animated.View style={scoreStyle}>
            <Text className={`text-3xl font-black ${bar.strong}`}>
              {score.us} – {score.them}
            </Text>
          </Animated.View>
          <Text numberOfLines={1} className={`shrink text-base font-semibold ${bar.soft}`}>
            {opponentName}
          </Text>
          {/* Says the score opens the log (Log left the bottom bar for pause / resume). */}
          <Ionicons name="list" size={18} color={bar.icon} />
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
            <Text className={`text-base ${bar.subs}`}>·</Text>
            <Text
              accessibilityLabel={subsSpoken}
              className={`text-base font-semibold ${subsClass}`}
            >
              Subs {subsUsed}
              {maxSubs === null ? '' : ` / ${maxSubs}`}
            </Text>
          </View>
        </View>
        {endAction && (
          <EndButton
            label={endLabel(endAction, clock, periodCount)}
            icon={endIcon(endAction)}
            tone={paused ? 'outlineDark' : 'outline'}
            onPress={() => onEnd(endAction)}
          />
        )}
      </View>
    </View>
  );
}

/** An outline on the green bar, or a dark one on the amber (paused) bar. */
const TONE = {
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

type EndButtonProps = {
  label: string;
  icon: IconName;
  tone: keyof typeof TONE;
  onPress: () => void;
};

/** Ending always opens a confirm, so it ticks like any button that opens something. */
function EndButton({ label, icon, tone, onPress }: EndButtonProps) {
  const style = TONE[tone];
  const press = usePressScale();
  return (
    <Animated.View style={press.style}>
      <Pressable
        accessibilityRole="button"
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        onPress={() => {
          tapHaptic();
          onPress();
        }}
        className={`min-h-12 min-w-36 flex-row items-center justify-center gap-1.5 rounded-xl border px-3 ${style.box}`}
      >
        <Ionicons name={icon} size={20} color={style.icon} />
        <Text className={`text-base font-bold ${style.text}`}>{capitalizeWords(label)}</Text>
      </Pressable>
    </Animated.View>
  );
}
