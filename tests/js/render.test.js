// @vitest-environment jsdom

import { describe, expect, test } from "vitest";

import { createRenderer } from "../../static/js/ui/render.js";
import { TIMER_MODES, TIMER_STATUS, createInitialState } from "../../static/js/domain/timer.js";

function createRoot() {
  const root = document.createElement("div");
  root.innerHTML = `
    <span data-time-display></span>
    <p data-mode-label></p>
    <div data-progress-ring></div>
    <div data-completed-count></div>
    <div data-focus-duration></div>
    <button data-start-button></button>
    <button data-mode="focus"></button>
    <button data-mode="short_break"></button>
    <button data-mode="long_break"></button>
  `;
  return root;
}

describe("renderer", () => {
  test("render updates the DOM from state", () => {
    const root = createRoot();
    const render = createRenderer(root);
    const state = {
      ...createInitialState(),
      remainingSeconds: 65,
      completedPomodorosToday: 4,
      focusedSecondsToday: 6000,
      status: TIMER_STATUS.paused,
      mode: TIMER_MODES.longBreak,
    };

    render(state);

    expect(root.querySelector("[data-time-display]").textContent).toBe("01:05");
    expect(root.querySelector("[data-mode-label]").textContent).toBe("長い休憩");
    expect(root.querySelector("[data-completed-count]").textContent).toBe("4");
    expect(root.querySelector("[data-focus-duration]").textContent).toBe("1時間40分");
    expect(root.querySelector("[data-start-button]").textContent).toBe("再開");
    expect(root.querySelector("[data-progress-ring]").style.getPropertyValue("--progress")).toBe("0.9277777777777778");
    expect(root.querySelector('[data-mode="long_break"]').classList.contains("is-active")).toBe(true);
    expect(root.querySelector('[data-mode="focus"]').disabled).toBe(false);
  });

  test("render disables mode buttons while running", () => {
    const root = createRoot();
    const render = createRenderer(root);
    const state = {
      ...createInitialState(),
      status: TIMER_STATUS.running,
    };

    render(state);

    const buttons = root.querySelectorAll("[data-mode]");
    buttons.forEach((button) => {
      expect(button.disabled).toBe(true);
    });
  });
});
