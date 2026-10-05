// Match clock, derived entirely from stored timestamps. Never count ticks: a UI interval only
// triggers re-renders, and this module turns the `match_periods` rows into what to show.

const MS_PER_MINUTE = 60_000;

/** The timestamp fields of a `match_periods` row (epoch ms). */
export type ClockPeriod = {
  periodNumber: number;
  startedAt: number;
  endedAt: number | null;
  pausedAt: number | null;
  pausedTotalMs: number;
};

/**
 * `periodEnded` covers both half-time and full-time: the caller knows the period count and
 * the match status.
 */
export type ClockPhase = 'notStarted' | 'running' | 'paused' | 'periodEnded';

export type ClockState = {
  phase: ClockPhase;
  /** 1-based. The period that is running, paused or just ended (1 before kickoff). */
  currentPeriod: number;
  /** Active time in the current period, pauses excluded, stoppage included. */
  periodElapsedMs: number;
  /** Active time across all periods. This is what events store as `game_time_ms`. */
  totalGameMs: number;
  isPaused: boolean;
  /** True once the current period runs past its regulation length. */
  isStoppage: boolean;
  stoppageMs: number;
  /** Football minute (1-based, stoppage counted past the period end); 0 before kickoff. */
  matchMinute: number;
  /** `MM:SS` of game time in regulation, `45+2'` in stoppage. */
  display: string;
};

/** Active time in one period: (paused_at ?? ended_at ?? now) − started_at − paused_total_ms. */
export function periodElapsedMs(period: ClockPeriod, now: number): number {
  const until = period.pausedAt ?? period.endedAt ?? now;
  return Math.max(0, until - period.startedAt - period.pausedTotalMs);
}

/**
 * The football minute for a moment in a period: 0:00–0:59 is minute 1. Regulation stops at
 * the period's end minute; stoppage keeps counting past it (46 = 45+1 in a 45-minute half).
 */
export function matchMinuteAt(
  periodNumber: number,
  elapsedMs: number,
  periodLengthMs: number,
): number {
  const lengthMinutes = Math.floor(periodLengthMs / MS_PER_MINUTE);
  const offset = (periodNumber - 1) * lengthMinutes;
  if (elapsedMs > periodLengthMs) {
    return offset + lengthMinutes + Math.floor((elapsedMs - periodLengthMs) / MS_PER_MINUTE) + 1;
  }
  return offset + Math.min(Math.floor(elapsedMs / MS_PER_MINUTE) + 1, lengthMinutes);
}

/** `23'`, or `45+2'` for a stoppage-time minute. */
export function formatMatchMinute(
  matchMinute: number,
  periodNumber: number,
  periodLengthMs: number,
): string {
  const periodEnd = periodNumber * Math.floor(periodLengthMs / MS_PER_MINUTE);
  if (matchMinute > periodEnd) return `${periodEnd}+${matchMinute - periodEnd}'`;
  return `${matchMinute}'`;
}

/** `MM:SS`; minutes grow past two digits rather than wrapping. */
export function formatClock(ms: number): string {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function getClockState(
  periods: readonly ClockPeriod[],
  periodLengthMs: number,
  now: number,
): ClockState {
  const sorted = [...periods].sort((a, b) => a.periodNumber - b.periodNumber);
  const current = sorted.at(-1);
  if (!current) {
    return {
      phase: 'notStarted',
      currentPeriod: 1,
      periodElapsedMs: 0,
      totalGameMs: 0,
      isPaused: false,
      isStoppage: false,
      stoppageMs: 0,
      matchMinute: 0,
      display: formatClock(0),
    };
  }

  const elapsed = periodElapsedMs(current, now);
  const totalGameMs = sorted.reduce((sum, p) => sum + periodElapsedMs(p, now), 0);
  const phase: ClockPhase =
    current.endedAt !== null ? 'periodEnded' : current.pausedAt !== null ? 'paused' : 'running';
  const isStoppage = elapsed > periodLengthMs;
  const matchMinute = matchMinuteAt(current.periodNumber, elapsed, periodLengthMs);
  const offsetMs = (current.periodNumber - 1) * periodLengthMs;

  return {
    phase,
    currentPeriod: current.periodNumber,
    periodElapsedMs: elapsed,
    totalGameMs,
    isPaused: phase === 'paused',
    isStoppage,
    stoppageMs: isStoppage ? elapsed - periodLengthMs : 0,
    matchMinute,
    display: isStoppage
      ? formatMatchMinute(matchMinute, current.periodNumber, periodLengthMs)
      : formatClock(offsetMs + elapsed),
  };
}
