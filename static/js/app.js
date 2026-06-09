import { now } from "./services/clock.js";
import { clearState, loadState, saveState } from "./services/storage.js";
import { syncStatsForToday } from "./domain/stats.js";
import {
  computeCurrentState,
  createInitialState,
  pauseTimer,
  resetTimer,
  setMode,
  startTimer,
  TIMER_STATUS,
} from "./domain/timer.js";
import { createRenderer } from "./ui/render.js";

const render = createRenderer(document);
const startButton = document.querySelector("[data-start-button]");
const resetButton = document.querySelector("[data-reset-button]");
const modeButtons = document.querySelectorAll("[data-mode]");

let timerId = null;
let state = initializeState();

renderAndPersist();
startTickerIfNeeded();

startButton.addEventListener("click", () => {
  const currentTime = now();
  state = syncStatsForToday(state, getTodayDate(currentTime));

  if (state.status === TIMER_STATUS.running) {
    state = pauseTimer(state, currentTime);
  } else {
    state = startTimer(state, currentTime);
  }

  renderAndPersist();
  startTickerIfNeeded();
});

resetButton.addEventListener("click", () => {
  state = resetTimer(state);
  renderAndPersist();
  stopTickerIfIdle();
});

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const currentTime = now();
    state = syncStatsForToday(state, getTodayDate(currentTime));
    state = setMode(state, button.dataset.mode, currentTime);
    renderAndPersist();
    stopTickerIfIdle();
  });
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    return;
  }

  syncRunningState();
});

function initializeState() {
  const currentTime = now();
  const storedState = loadState();
  const baseState = createInitialState();
  const safeStoredState = storedState && typeof storedState === "object" ? storedState : {};
  const durations = { ...baseState.durations, ...(safeStoredState.durations || {}) };
  const mode = durations[safeStoredState.mode] ? safeStoredState.mode : baseState.mode;

  let nextState = {
    ...baseState,
    ...safeStoredState,
    durations,
    mode,
    remainingSeconds: Number.isFinite(safeStoredState.remainingSeconds)
      ? safeStoredState.remainingSeconds
      : durations[mode],
    endAt: Number.isFinite(safeStoredState.endAt) ? safeStoredState.endAt : null,
  };

  nextState = syncStatsForToday(nextState, getTodayDate(currentTime));
  nextState = computeCurrentState(nextState, currentTime);

  return nextState;
}

function renderAndPersist() {
  render(state);

  if (shouldPersistState(state)) {
    saveState(state);
  } else {
    clearState();
  }
}

function startTickerIfNeeded() {
  if (state.status !== TIMER_STATUS.running || timerId !== null) {
    return;
  }

  timerId = window.setInterval(() => {
    syncRunningState();
  }, 250);
}

function stopTickerIfIdle() {
  if (state.status === TIMER_STATUS.running || timerId === null) {
    return;
  }

  window.clearInterval(timerId);
  timerId = null;
}

function syncRunningState() {
  const currentTime = now();
  state = syncStatsForToday(state, getTodayDate(currentTime));
  state = computeCurrentState(state, currentTime);
  renderAndPersist();

  if (state.status !== TIMER_STATUS.running && timerId !== null) {
    window.clearInterval(timerId);
    timerId = null;
  }
}

function shouldPersistState(nextState) {
  return nextState.completedPomodorosToday > 0
    || nextState.focusedSecondsToday > 0
    || nextState.status !== TIMER_STATUS.idle
    || nextState.mode !== "focus";
}

function getTodayDate(currentTime) {
  return new Date(currentTime).toLocaleDateString("sv-SE");
}
