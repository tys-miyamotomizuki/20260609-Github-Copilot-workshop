export const TIMER_MODES = {
  focus: "focus",
  shortBreak: "short_break",
  longBreak: "long_break",
};

export const TIMER_STATUS = {
  idle: "idle",
  running: "running",
  paused: "paused",
};

export const DEFAULT_DURATIONS = {
  [TIMER_MODES.focus]: 25 * 60,
  [TIMER_MODES.shortBreak]: 5 * 60,
  [TIMER_MODES.longBreak]: 15 * 60,
};

export function createInitialState(overrides = {}) {
  const mode = overrides.mode || TIMER_MODES.focus;
  const durations = {
    ...DEFAULT_DURATIONS,
    ...(overrides.durations || {}),
  };

  return {
    mode,
    status: TIMER_STATUS.idle,
    durations,
    remainingSeconds: durations[mode],
    endAt: null,
    completedPomodorosToday: 0,
    focusedSecondsToday: 0,
    completedFocusSessions: 0,
    lastUpdatedDate: null,
    ...overrides,
  };
}

export function setMode(state, mode, currentTime) {
  if (!state.durations[mode]) {
    return state;
  }

  const normalizedState = computeCurrentState(state, currentTime);

  return {
    ...normalizedState,
    mode,
    status: TIMER_STATUS.idle,
    remainingSeconds: normalizedState.durations[mode],
    endAt: null,
  };
}

export function startTimer(state, currentTime) {
  if (state.status === TIMER_STATUS.running) {
    return state;
  }

  return {
    ...state,
    status: TIMER_STATUS.running,
    endAt: currentTime + (state.remainingSeconds * 1000),
  };
}

export function pauseTimer(state, currentTime) {
  if (state.status !== TIMER_STATUS.running) {
    return state;
  }

  const remainingSeconds = getRemainingSeconds(state, currentTime);

  return {
    ...state,
    status: TIMER_STATUS.paused,
    remainingSeconds,
    endAt: null,
  };
}

export function resetTimer(state) {
  return {
    ...state,
    status: TIMER_STATUS.idle,
    remainingSeconds: state.durations[state.mode],
    endAt: null,
  };
}

export function computeCurrentState(state, currentTime) {
  if (state.status !== TIMER_STATUS.running || !state.endAt) {
    return state;
  }

  const remainingSeconds = getRemainingSeconds(state, currentTime);

  if (remainingSeconds > 0) {
    return {
      ...state,
      remainingSeconds,
    };
  }

  return completeSession({
    ...state,
    remainingSeconds: 0,
    endAt: null,
    status: TIMER_STATUS.idle,
  });
}

export function getRemainingSeconds(state, currentTime) {
  if (!state.endAt) {
    return state.remainingSeconds;
  }

  return Math.max(0, Math.ceil((state.endAt - currentTime) / 1000));
}

export function completeSession(state) {
  if (state.mode !== TIMER_MODES.focus) {
    return {
      ...state,
      remainingSeconds: state.durations[state.mode],
    };
  }

  const completedFocusSessions = state.completedFocusSessions + 1;
  const nextMode = completedFocusSessions % 4 === 0
    ? TIMER_MODES.longBreak
    : TIMER_MODES.shortBreak;

  return {
    ...state,
    completedPomodorosToday: state.completedPomodorosToday + 1,
    focusedSecondsToday: state.focusedSecondsToday + state.durations[TIMER_MODES.focus],
    completedFocusSessions,
    mode: nextMode,
    remainingSeconds: state.durations[nextMode],
  };
}

export function getProgress(state) {
  const totalSeconds = state.durations[state.mode];

  if (!totalSeconds) {
    return 0;
  }

  return Math.min(1, Math.max(0, (totalSeconds - state.remainingSeconds) / totalSeconds));
}

export function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
