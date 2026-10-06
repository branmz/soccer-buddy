// Match clock, derived entirely from stored timestamps. Never count ticks: a UI interval only
// triggers re-renders, and this module turns the `match_periods` rows into what to show.

import type { ParseResult } from './types';

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

/** What the coach can do to the clock. Kickoff (starting period 1) is separate. */
export type ClockAction = 'pause' | 'resume' | 'endPeriod' | 'startNextPeriod' | 'finish';

export type PeriodPatch = Partial<Pick<ClockPeriod, 'endedAt' | 'pausedAt' | 'pausedTotalMs'>>;

/** The writes for one clock action: one DB write per start/pause/resume/end. */
export type ClockChange = {
  update: { periodNumber: number; patch: PeriodPatch } | null;
  insert: ClockPeriod | null;
  /** The match is over (status → finished). */
  finishMatch: boolean;
};

/**
 * The actions available now. Ending the last period finishes the match, so it's offered as
 * `finish` rather than `endPeriod`; `finish` is always available once the match has started
 * (games get cut short).
 */
export function availableClockActions(state: ClockState, periodCount: number): ClockAction[] {
  const hasNext = state.currentPeriod < periodCount;
  switch (state.phase) {
    case 'notStarted':
      return [];
    case 'running':
      return hasNext ? ['pause', 'endPeriod', 'finish'] : ['pause', 'finish'];
    case 'paused':
      return hasNext ? ['resume', 'endPeriod', 'finish'] : ['resume', 'finish'];
    case 'periodEnded':
      return hasNext ? ['startNextPeriod', 'finish'] : ['finish'];
  }
}

/** Ends a period, folding an open pause into `pausedTotalMs` so elapsed time is unchanged. */
function endPatch(period: ClockPeriod, now: number): PeriodPatch {
  const end = Math.max(now, period.startedAt);
  if (period.pausedAt === null) return { endedAt: end };
  return {
    endedAt: end,
    pausedAt: null,
    pausedTotalMs: period.pausedTotalMs + Math.max(0, end - period.pausedAt),
  };
}

export function clockTransition(
  periods: readonly ClockPeriod[],
  action: ClockAction,
  now: number,
  periodCount: number,
): ParseResult<ClockChange> {
  const state = getClockState(periods, 0, now);
  if (!availableClockActions(state, periodCount).includes(action)) {
    return { ok: false, error: "That can't be done right now" };
  }
  const current = [...periods].sort((a, b) => a.periodNumber - b.periodNumber).at(-1);
  if (!current) return { ok: false, error: "The match hasn't kicked off" };
  const update = (patch: PeriodPatch) => ({ periodNumber: current.periodNumber, patch });
  const change: ClockChange = { update: null, insert: null, finishMatch: false };

  switch (action) {
    case 'pause':
      return {
        ok: true,
        value: { ...change, update: update({ pausedAt: Math.max(now, current.startedAt) }) },
      };
    case 'resume': {
      const pausedAt = current.pausedAt ?? now;
      const pausedTotalMs = current.pausedTotalMs + Math.max(0, now - pausedAt);
      return { ok: true, value: { ...change, update: update({ pausedAt: null, pausedTotalMs }) } };
    }
    case 'endPeriod':
      return { ok: true, value: { ...change, update: update(endPatch(current, now)) } };
    case 'startNextPeriod':
      return {
        ok: true,
        value: {
          ...change,
          insert: {
            periodNumber: current.periodNumber + 1,
            startedAt: now,
            endedAt: null,
            pausedAt: null,
            pausedTotalMs: 0,
          },
        },
      };
    case 'finish':
      return {
        ok: true,
        value: {
          ...change,
          update: current.endedAt === null ? update(endPatch(current, now)) : null,
          finishMatch: true,
        },
      };
  }
}

/** `1st half` / `2nd half` for two periods, `Q1`–`Q4` for four, otherwise `Period n`. */
export function periodName(periodNumber: number, periodCount: number): string {
  if (periodCount === 2) return periodNumber === 1 ? '1st half' : '2nd half';
  if (periodCount === 4) return `Q${periodNumber}`;
  if (periodCount === 1) return 'Game';
  return `Period ${periodNumber}`;
}

/** What to call the break after a period ends. */
export function breakName(periodNumber: number, periodCount: number): string {
  if (periodNumber >= periodCount) return 'Full time';
  if (periodCount === 2) return 'Half-time';
  return `End of ${periodName(periodNumber, periodCount)}`;
}
