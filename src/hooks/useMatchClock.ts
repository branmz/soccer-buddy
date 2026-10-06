import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { getClockState, type ClockPeriod, type ClockState } from '@/domain/clock';

/** Re-render often enough that the seconds never visibly skip. */
const TICK_MS = 250;

/**
 * The match clock, derived from the stored periods on every render. The interval only
 * triggers re-renders (never counts time), and only while the clock is running; coming back
 * to the app re-renders at once, so the clock is right after a screen lock.
 *
 * Call `refresh` right after a clock write (pause, resume, …): otherwise the new periods
 * would render against the last tick's time and a resume could briefly show the wrong time.
 */
export function useMatchClock(
  periods: readonly ClockPeriod[],
  periodLengthMs: number,
): { clock: ClockState; refresh: () => void } {
  const [now, setNow] = useState(() => Date.now());
  const clock = getClockState(periods, periodLengthMs, now);
  const running = clock.phase === 'running';

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, [running]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') setNow(Date.now());
    });
    return () => subscription.remove();
  }, []);

  return { clock, refresh: () => setNow(Date.now()) };
}
