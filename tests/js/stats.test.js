import { describe, expect, test } from "vitest";

import { formatFocusDuration, syncStatsForToday } from "../../static/js/domain/stats.js";
import { TIMER_MODES, createInitialState } from "../../static/js/domain/timer.js";

describe("stats domain", () => {
  test("syncStatsForToday keeps same-day values and updates the date", () => {
    const state = {
      ...createInitialState(),
      completedPomodorosToday: 2,
      focusedSecondsToday: 3000,
      lastUpdatedDate: null,
    };

    const synced = syncStatsForToday(state, "2026-06-09");

    expect(synced.completedPomodorosToday).toBe(2);
    expect(synced.focusedSecondsToday).toBe(3000);
    expect(synced.lastUpdatedDate).toBe("2026-06-09");
  });

  test("syncStatsForToday resets stats on a new day", () => {
    const state = {
      ...createInitialState({ mode: TIMER_MODES.longBreak }),
      completedPomodorosToday: 3,
      focusedSecondsToday: 4200,
      completedFocusSessions: 3,
      lastUpdatedDate: "2026-06-08",
    };

    const resetState = syncStatsForToday(state, "2026-06-09");

    expect(resetState.completedPomodorosToday).toBe(0);
    expect(resetState.focusedSecondsToday).toBe(0);
    expect(resetState.completedFocusSessions).toBe(0);
    expect(resetState.mode).toBe(TIMER_MODES.focus);
    expect(resetState.lastUpdatedDate).toBe("2026-06-09");
  });

  test("formatFocusDuration formats minutes and hours", () => {
    expect(formatFocusDuration(45 * 60)).toBe("45分");
    expect(formatFocusDuration(60 * 60)).toBe("1時間");
    expect(formatFocusDuration((2 * 60 * 60) + (15 * 60))).toBe("2時間15分");
  });
});
