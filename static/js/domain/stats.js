import { createInitialState, TIMER_MODES } from "./timer.js";

export function syncStatsForToday(state, dateString) {
  if (!state.lastUpdatedDate || state.lastUpdatedDate === dateString) {
    return {
      ...state,
      lastUpdatedDate: dateString,
    };
  }

  return {
    ...createInitialState({
      durations: state.durations,
      mode: TIMER_MODES.focus,
    }),
    lastUpdatedDate: dateString,
  };
}

export function formatFocusDuration(totalSeconds) {
  if (totalSeconds < 3600) {
    return `${Math.floor(totalSeconds / 60)}分`;
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (minutes === 0) {
    return `${hours}時間`;
  }

  return `${hours}時間${minutes}分`;
}
