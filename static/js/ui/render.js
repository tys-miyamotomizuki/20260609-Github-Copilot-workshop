import { formatFocusDuration } from "../domain/stats.js";
import { formatTime, getProgress, TIMER_MODES, TIMER_STATUS } from "../domain/timer.js";

const MODE_LABELS = {
  [TIMER_MODES.focus]: "作業中",
  [TIMER_MODES.shortBreak]: "短い休憩",
  [TIMER_MODES.longBreak]: "長い休憩",
};

const PRIMARY_LABELS = {
  [TIMER_STATUS.idle]: "開始",
  [TIMER_STATUS.running]: "一時停止",
  [TIMER_STATUS.paused]: "再開",
};

export function createRenderer(root = document) {
  const timeDisplay = root.querySelector("[data-time-display]");
  const modeLabel = root.querySelector("[data-mode-label]");
  const progressRing = root.querySelector("[data-progress-ring]");
  const completedCount = root.querySelector("[data-completed-count]");
  const focusDuration = root.querySelector("[data-focus-duration]");
  const startButton = root.querySelector("[data-start-button]");
  const modeButtons = Array.from(root.querySelectorAll("[data-mode]"));

  return function render(state) {
    timeDisplay.textContent = formatTime(state.remainingSeconds);
    modeLabel.textContent = MODE_LABELS[state.mode];
    progressRing.style.setProperty("--progress", String(getProgress(state)));
    completedCount.textContent = String(state.completedPomodorosToday);
    focusDuration.textContent = formatFocusDuration(state.focusedSecondsToday);
    startButton.textContent = PRIMARY_LABELS[state.status];

    modeButtons.forEach((button) => {
      const isCurrentMode = button.dataset.mode === state.mode;
      button.classList.toggle("is-active", isCurrentMode);
      button.setAttribute("aria-pressed", String(isCurrentMode));
      button.disabled = state.status === TIMER_STATUS.running;
    });
  };
}
