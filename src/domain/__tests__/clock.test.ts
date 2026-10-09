import {
  availableClockActions,
  breakName,
  clockControls,
  clockTransition,
  formatClock,
  formatMatchMinute,
  getClockState,
  matchMinuteAt,
  periodElapsedMs,
  periodName,
  type ClockAction,
  type ClockPeriod,
} from '../clock';

const MIN = 60_000;
const HALF = 45 * MIN;
const T0 = 1_700_000_000_000;

const period = (overrides: Partial<ClockPeriod> & { periodNumber: number }): ClockPeriod => ({
  startedAt: T0,
  endedAt: null,
  pausedAt: null,
  pausedTotalMs: 0,
  ...overrides,
});

describe('periodElapsedMs', () => {
  it('counts from the start to now while running', () => {
    expect(periodElapsedMs(period({ periodNumber: 1 }), T0 + 5 * MIN)).toBe(5 * MIN);
  });

  it('subtracts the total paused time', () => {
    const p = period({ periodNumber: 1, pausedTotalMs: 2 * MIN });
    expect(periodElapsedMs(p, T0 + 5 * MIN)).toBe(3 * MIN);
  });

  it('freezes at the pause time', () => {
    const p = period({ periodNumber: 1, pausedAt: T0 + 4 * MIN });
    expect(periodElapsedMs(p, T0 + 50 * MIN)).toBe(4 * MIN);
  });

  it('freezes at the end time', () => {
    const p = period({ periodNumber: 1, endedAt: T0 + 46 * MIN, pausedTotalMs: MIN });
    expect(periodElapsedMs(p, T0 + 90 * MIN)).toBe(45 * MIN);
  });

  it('prefers the pause time when a paused period was ended', () => {
    const p = period({ periodNumber: 1, pausedAt: T0 + 10 * MIN, endedAt: T0 + 20 * MIN });
    expect(periodElapsedMs(p, T0 + 30 * MIN)).toBe(10 * MIN);
  });

  it('never goes negative when the device clock moved backwards', () => {
    expect(periodElapsedMs(period({ periodNumber: 1 }), T0 - MIN)).toBe(0);
  });
});

describe('matchMinuteAt', () => {
  it('starts at minute 1', () => {
    expect(matchMinuteAt(1, 0, HALF)).toBe(1);
    expect(matchMinuteAt(1, MIN - 1, HALF)).toBe(1);
    expect(matchMinuteAt(1, MIN, HALF)).toBe(2);
  });

  it('caps regulation at the period end minute', () => {
    expect(matchMinuteAt(1, HALF - 1, HALF)).toBe(45);
    expect(matchMinuteAt(1, HALF, HALF)).toBe(45);
  });

  it('counts stoppage minutes past the period end', () => {
    expect(matchMinuteAt(1, HALF + 1, HALF)).toBe(46);
    expect(matchMinuteAt(1, HALF + MIN + 1, HALF)).toBe(47);
  });

  it('offsets later periods', () => {
    expect(matchMinuteAt(2, 0, HALF)).toBe(46);
    expect(matchMinuteAt(2, HALF + 1, HALF)).toBe(91);
  });
});

describe('formatMatchMinute', () => {
  it('shows regulation minutes plainly', () => {
    expect(formatMatchMinute(23, 1, HALF)).toBe("23'");
    expect(formatMatchMinute(45, 1, HALF)).toBe("45'");
    expect(formatMatchMinute(46, 2, HALF)).toBe("46'");
  });

  it('shows stoppage as end+extra', () => {
    expect(formatMatchMinute(47, 1, HALF)).toBe("45+2'");
    expect(formatMatchMinute(91, 2, HALF)).toBe("90+1'");
  });
});

describe('formatClock', () => {
  it('pads minutes and seconds', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(65_999)).toBe('01:05');
    expect(formatClock(105 * MIN)).toBe('105:00');
  });
});

describe('getClockState', () => {
  it('is not started without periods', () => {
    expect(getClockState([], HALF, T0)).toEqual({
      phase: 'notStarted',
      currentPeriod: 1,
      periodElapsedMs: 0,
      totalGameMs: 0,
      isPaused: false,
      isStoppage: false,
      stoppageMs: 0,
      matchMinute: 0,
      display: '00:00',
    });
  });

  it('runs in the first period', () => {
    const state = getClockState([period({ periodNumber: 1 })], HALF, T0 + 12 * MIN + 34_000);
    expect(state).toMatchObject({
      phase: 'running',
      currentPeriod: 1,
      periodElapsedMs: 12 * MIN + 34_000,
      totalGameMs: 12 * MIN + 34_000,
      isPaused: false,
      isStoppage: false,
      matchMinute: 13,
      display: '12:34',
    });
  });

  it('reports a paused period', () => {
    const p = period({ periodNumber: 1, pausedAt: T0 + 10 * MIN });
    expect(getClockState([p], HALF, T0 + 20 * MIN)).toMatchObject({
      phase: 'paused',
      isPaused: true,
      periodElapsedMs: 10 * MIN,
      display: '10:00',
    });
  });

  it('shows stoppage time as end+minute', () => {
    const state = getClockState([period({ periodNumber: 1 })], HALF, T0 + HALF + 90_000);
    expect(state).toMatchObject({
      isStoppage: true,
      stoppageMs: 90_000,
      matchMinute: 47,
      display: "45+2'",
    });
  });

  it('is not stoppage exactly at the period length', () => {
    const state = getClockState([period({ periodNumber: 1 })], HALF, T0 + HALF);
    expect(state).toMatchObject({ isStoppage: false, display: '45:00', matchMinute: 45 });
  });

  it('reports the end of a period and keeps its final time', () => {
    const p1 = period({ periodNumber: 1, endedAt: T0 + HALF + 2 * MIN });
    expect(getClockState([p1], HALF, T0 + 60 * MIN)).toMatchObject({
      phase: 'periodEnded',
      currentPeriod: 1,
      periodElapsedMs: HALF + 2 * MIN,
      totalGameMs: HALF + 2 * MIN,
      isPaused: false,
      display: "45+3'",
    });
  });

  it('offsets the display in later periods and sums game time across periods', () => {
    const p1 = period({ periodNumber: 1, endedAt: T0 + HALF + 2 * MIN });
    const p2Start = T0 + 60 * MIN;
    const p2 = period({ periodNumber: 2, startedAt: p2Start, pausedTotalMs: MIN });
    // Passed out of order on purpose.
    const state = getClockState([p2, p1], HALF, p2Start + 11 * MIN);
    expect(state).toMatchObject({
      phase: 'running',
      currentPeriod: 2,
      periodElapsedMs: 10 * MIN,
      totalGameMs: HALF + 2 * MIN + 10 * MIN,
      matchMinute: 56,
      display: '55:00',
    });
  });

  it('reports a period ended while paused as ended, not paused', () => {
    const p = period({ periodNumber: 1, pausedAt: T0 + 30 * MIN, endedAt: T0 + 31 * MIN });
    expect(getClockState([p], HALF, T0 + 40 * MIN)).toMatchObject({
      phase: 'periodEnded',
      isPaused: false,
      periodElapsedMs: 30 * MIN,
    });
  });

  it('reports a paused second period', () => {
    const p1 = period({ periodNumber: 1, endedAt: T0 + HALF });
    const p2 = period({ periodNumber: 2, startedAt: T0 + 60 * MIN, pausedAt: T0 + 65 * MIN });
    expect(getClockState([p1, p2], HALF, T0 + 80 * MIN)).toMatchObject({
      phase: 'paused',
      currentPeriod: 2,
      totalGameMs: HALF + 5 * MIN,
      display: '50:00',
    });
  });

  it('handles short youth periods', () => {
    const p1 = period({ periodNumber: 1, endedAt: T0 + 20 * MIN });
    const p2 = period({ periodNumber: 2, startedAt: T0 + 30 * MIN });
    const state = getClockState([p1, p2], 20 * MIN, T0 + 51 * MIN);
    expect(state).toMatchObject({ currentPeriod: 2, isStoppage: true, display: "40+2'" });
  });
});

describe('availableClockActions', () => {
  const at = (periods: ClockPeriod[]) => getClockState(periods, HALF, T0 + 10 * MIN);

  it('offers nothing before kickoff', () => {
    expect(availableClockActions(at([]), 2)).toEqual([]);
  });

  it('offers pause and end period while running', () => {
    expect(availableClockActions(at([period({ periodNumber: 1 })]), 2)).toEqual([
      'pause',
      'endPeriod',
      'finish',
    ]);
  });

  it('offers finish instead of end period in the last period', () => {
    const p1 = period({ periodNumber: 1, endedAt: T0 + MIN });
    const p2 = period({ periodNumber: 2, startedAt: T0 + 2 * MIN, pausedAt: T0 + 3 * MIN });
    expect(availableClockActions(at([p1, p2]), 2)).toEqual(['resume', 'finish']);
  });

  it('offers the next period at half-time and only finish at full time', () => {
    const p1 = period({ periodNumber: 1, endedAt: T0 + MIN });
    expect(availableClockActions(at([p1]), 2)).toEqual(['startNextPeriod', 'finish']);
    expect(availableClockActions(at([p1]), 1)).toEqual(['finish']);
  });
});

describe('clockControls', () => {
  const at = (periods: ClockPeriod[]) => getClockState(periods, HALF, T0 + 10 * MIN);
  const p1Ended = period({ periodNumber: 1, endedAt: T0 + MIN });

  it('has nothing before kickoff', () => {
    expect(clockControls(at([]), 2)).toEqual({ main: null, end: null });
  });

  it('puts pause or resume in the thumb zone and ending the period up top', () => {
    expect(clockControls(at([period({ periodNumber: 1 })]), 2)).toEqual({
      main: 'pause',
      end: 'endPeriod',
    });
    const paused = period({ periodNumber: 1, pausedAt: T0 + 5 * MIN });
    expect(clockControls(at([paused]), 2)).toEqual({ main: 'resume', end: 'endPeriod' });
  });

  it('ends the match up top in the last period, running or paused', () => {
    const p2 = period({ periodNumber: 2, startedAt: T0 + 2 * MIN });
    expect(clockControls(at([p1Ended, p2]), 2)).toEqual({ main: 'pause', end: 'finish' });
    const p2Paused = { ...p2, pausedAt: T0 + 3 * MIN };
    expect(clockControls(at([p1Ended, p2Paused]), 2)).toEqual({
      main: 'resume',
      end: 'finish',
    });
  });

  it('ends quarters until the last one, which ends the match (four periods)', () => {
    const ended = (n: number) =>
      period({ periodNumber: n, startedAt: T0 + n * MIN, endedAt: T0 + n * MIN + 30_000 });
    const running = (n: number) => period({ periodNumber: n, startedAt: T0 + n * MIN });
    expect(clockControls(at([running(1)]), 4)).toEqual({ main: 'pause', end: 'endPeriod' });
    expect(clockControls(at([ended(1), ended(2)]), 4)).toEqual({
      main: 'startNextPeriod',
      end: null,
    });
    expect(clockControls(at([ended(1), ended(2), running(3)]), 4)).toEqual({
      main: 'pause',
      end: 'endPeriod',
    });
    expect(clockControls(at([ended(1), ended(2), ended(3), running(4)]), 4)).toEqual({
      main: 'pause',
      end: 'finish',
    });
  });

  it('starts the next period from the thumb zone at half-time, with nothing up top', () => {
    expect(clockControls(at([p1Ended]), 2)).toEqual({ main: 'startNextPeriod', end: null });
  });

  it('makes ending the match the main control at full time', () => {
    expect(clockControls(at([p1Ended]), 1)).toEqual({ main: 'finish', end: null });
  });
});

describe('clockTransition', () => {
  const running = period({ periodNumber: 1, pausedTotalMs: MIN });
  const now = T0 + 20 * MIN;

  const change = (periods: ClockPeriod[], action: ClockAction, periodCount = 2) => {
    const result = clockTransition(periods, action, now, periodCount);
    if (!result.ok) throw new Error(result.error);
    return result.value;
  };

  it('pauses the running period', () => {
    expect(change([running], 'pause')).toEqual({
      update: { periodNumber: 1, patch: { pausedAt: now } },
      insert: null,
      finishMatch: false,
    });
  });

  it('resumes, adding the pause to the paused total', () => {
    const paused = { ...running, pausedAt: T0 + 15 * MIN };
    expect(change([paused], 'resume').update).toEqual({
      periodNumber: 1,
      patch: { pausedAt: null, pausedTotalMs: 6 * MIN },
    });
  });

  it('ends a period without changing its elapsed time', () => {
    const paused = { ...running, pausedAt: T0 + 15 * MIN };
    const patch = change([paused], 'endPeriod').update?.patch;
    expect(patch).toEqual({ endedAt: now, pausedAt: null, pausedTotalMs: 6 * MIN });
    const ended = { ...paused, ...patch };
    expect(periodElapsedMs(ended, now + HALF)).toBe(periodElapsedMs(paused, now));
  });

  it('starts the next period', () => {
    const ended = { ...running, endedAt: T0 + HALF };
    expect(change([ended], 'startNextPeriod')).toEqual({
      update: null,
      insert: { periodNumber: 2, startedAt: now, endedAt: null, pausedAt: null, pausedTotalMs: 0 },
      finishMatch: false,
    });
  });

  it('finishes, ending the open period', () => {
    expect(change([running], 'finish')).toEqual({
      update: { periodNumber: 1, patch: { endedAt: now } },
      insert: null,
      finishMatch: true,
    });
    const ended = { ...running, endedAt: T0 + HALF };
    expect(change([ended], 'finish', 1)).toEqual({
      update: null,
      insert: null,
      finishMatch: true,
    });
  });

  it('rejects actions that are not available', () => {
    expect(clockTransition([running], 'resume', now, 2).ok).toBe(false);
    expect(clockTransition([], 'pause', now, 2).ok).toBe(false);
    expect(clockTransition([{ ...running, endedAt: now }], 'startNextPeriod', now, 1).ok).toBe(
      false,
    );
  });
});

describe('periodName / breakName', () => {
  it('names halves, quarters and other periods', () => {
    expect(periodName(1, 2)).toBe('1st half');
    expect(periodName(2, 2)).toBe('2nd half');
    expect(periodName(3, 4)).toBe('Q3');
    expect(periodName(2, 3)).toBe('Period 2');
    expect(periodName(1, 1)).toBe('Game');
  });

  it('names breaks', () => {
    expect(breakName(1, 2)).toBe('Half-time');
    expect(breakName(2, 2)).toBe('Full time');
    expect(breakName(2, 4)).toBe('End of Q2');
  });
});
