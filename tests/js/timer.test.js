import { describe, expect, test } from "vitest";

import {
  TIMER_MODES,
  TIMER_STATUS,
  completeSession,
  computeCurrentState,
  createInitialState,
  formatTime,
  getProgress,
  pauseTimer,
  setMode,
  startTimer,
} from "../../static/js/domain/timer.js";

describe("timer domain", () => {
  test("createInitialState returns focus defaults", () => {
    const state = createInitialState();

    expect(state.mode).toBe(TIMER_MODES.focus);
    expect(state.status).toBe(TIMER_STATUS.idle);
    expect(state.remainingSeconds).toBe(25 * 60);
    expect(state.completedPomodorosToday).toBe(0);
  });

  test("startTimer sets running state and endAt", () => {
    const state = createInitialState();
    const started = startTimer(state, 1_000);

    expect(started.status).toBe(TIMER_STATUS.running);
    expect(started.endAt).toBe(1_501_000);
  });

  test("pauseTimer stores remaining seconds from endAt", () => {
    const state = startTimer(createInitialState(), 2_000);
    const paused = pauseTimer(state, 32_500);

    expect(paused.status).toBe(TIMER_STATUS.paused);
    expect(paused.endAt).toBeNull();
    expect(paused.remainingSeconds).toBe(1470);
  });

  test("setMode resets timer to selected mode duration", () => {
    const state = startTimer(createInitialState(), 1_000);
    const switched = setMode(state, TIMER_MODES.shortBreak, 10_000);

    expect(switched.mode).toBe(TIMER_MODES.shortBreak);
    expect(switched.status).toBe(TIMER_STATUS.idle);
    expect(switched.remainingSeconds).toBe(5 * 60);
    expect(switched.endAt).toBeNull();
  });

  test("computeCurrentState completes a focus session and moves to short break", () => {
    const state = {
      ...createInitialState(),
      status: TIMER_STATUS.running,
      endAt: 5_000,
      remainingSeconds: 10,
    };

    const completed = computeCurrentState(state, 5_100);

    expect(completed.status).toBe(TIMER_STATUS.idle);
    expect(completed.completedPomodorosToday).toBe(1);
    expect(completed.focusedSecondsToday).toBe(25 * 60);
    expect(completed.mode).toBe(TIMER_MODES.shortBreak);
    expect(completed.remainingSeconds).toBe(5 * 60);
  });

  test("completeSession moves every fourth focus session to long break", () => {
    const state = {
      ...createInitialState(),
      completedFocusSessions: 3,
      mode: TIMER_MODES.focus,
    };

    const completed = completeSession(state);

    expect(completed.completedFocusSessions).toBe(4);
    expect(completed.mode).toBe(TIMER_MODES.longBreak);
    expect(completed.remainingSeconds).toBe(15 * 60);
  });

  test("getProgress calculates elapsed ratio", () => {
    const state = {
      ...createInitialState(),
      remainingSeconds: 750,
    };

    expect(getProgress(state)).toBe(0.5);
  });

  test("formatTime pads minutes and seconds", () => {
    expect(formatTime(65)).toBe("01:05");
  });
});
