(function () {
  const DURATIONS = {
    focus: 25 * 60 * 1000,
    break: 5 * 60 * 1000,
  };

  const state = {
    mode: 'focus',
    durationMs: DURATIONS.focus,
    remainingMs: DURATIONS.focus,
    isRunning: false,
    endAt: null,
    settings: {
      smoothAnimation: true,
      dynamicColor: true,
      ambientEffect: true,
    },
  };

  const elements = {
    ring: document.querySelector('[data-progress-ring]'),
    timeDisplay: document.querySelector('[data-time-display]'),
    modeLabel: document.querySelector('[data-mode-label]'),
    statusLabel: document.querySelector('[data-status-label]'),
    modeButtons: Array.from(document.querySelectorAll('[data-mode]')),
    actionButtons: Array.from(document.querySelectorAll('[data-action]')),
    settingInputs: Array.from(document.querySelectorAll('[data-setting]')),
  };

  let animationFrameId = null;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function mixColor(startColor, endColor, ratio) {
    return startColor.map(function (channel, index) {
      return Math.round(channel + (endColor[index] - channel) * ratio);
    });
  }

  function formatColor(rgb) {
    return 'rgb(' + rgb.join(', ') + ')';
  }

  function getProgressColor(progressRatio) {
    if (!state.settings.dynamicColor) {
      return '#4ea8ff';
    }

    const blue = [78, 168, 255];
    const yellow = [250, 204, 21];
    const red = [248, 113, 113];

    if (progressRatio >= 0.5) {
      return formatColor(mixColor(yellow, blue, (progressRatio - 0.5) / 0.5));
    }

    return formatColor(mixColor(red, yellow, progressRatio / 0.5));
  }

  function getRawRemainingMs(now) {
    if (!state.isRunning || !state.endAt) {
      return state.remainingMs;
    }

    return Math.max(0, state.endAt - now);
  }

  function getDisplayedRemainingMs(now) {
    const rawRemainingMs = getRawRemainingMs(now);

    if (state.settings.smoothAnimation || rawRemainingMs === 0) {
      return rawRemainingMs;
    }

    return Math.ceil(rawRemainingMs / 1000) * 1000;
  }

  function formatTime(remainingMs) {
    const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
  }

  function getStatusText(isComplete) {
    if (isComplete) {
      return state.mode === 'focus' ? '集中時間が完了しました' : '休憩時間が完了しました';
    }

    if (state.isRunning) {
      return state.mode === 'focus' ? '集中セッション進行中' : '休憩セッション進行中';
    }

    return '開始準備完了';
  }

  function syncModeButtons() {
    elements.modeButtons.forEach(function (button) {
      button.classList.toggle('is-active', button.dataset.mode === state.mode);
    });
  }

  function syncAmbientEffect() {
    const shouldShowAmbientEffect =
      state.settings.ambientEffect && state.mode === 'focus' && state.isRunning && state.remainingMs > 0;

    document.body.classList.toggle('effects-enabled', shouldShowAmbientEffect);
    document.body.classList.toggle('focus-active', shouldShowAmbientEffect);
  }

  function render() {
    const now = Date.now();
    const rawRemainingMs = getRawRemainingMs(now);
    const isComplete = state.isRunning && rawRemainingMs === 0;

    if (state.isRunning) {
      state.remainingMs = rawRemainingMs;
      if (isComplete) {
        state.isRunning = false;
        state.endAt = null;
      }
    }

    const displayedRemainingMs = getDisplayedRemainingMs(now);
    const progressRatio = state.durationMs === 0 ? 0 : clamp(displayedRemainingMs / state.durationMs, 0, 1);

    elements.ring.style.setProperty('--progress-angle', String(progressRatio * 360) + 'deg');
    elements.ring.style.setProperty('--progress-color', getProgressColor(progressRatio));
    elements.timeDisplay.textContent = formatTime(displayedRemainingMs);
    elements.modeLabel.textContent = state.mode === 'focus' ? '集中時間' : '休憩時間';
    elements.statusLabel.textContent = getStatusText(isComplete);

    syncModeButtons();
    syncAmbientEffect();

    if (!state.isRunning && animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  function runTimer() {
    render();

    if (state.isRunning) {
      animationFrameId = requestAnimationFrame(runTimer);
    }
  }

  function startTimer() {
    if (state.isRunning || state.remainingMs === 0) {
      return;
    }

    state.isRunning = true;
    state.endAt = Date.now() + state.remainingMs;

    if (!animationFrameId) {
      animationFrameId = requestAnimationFrame(runTimer);
    }

    render();
  }

  function pauseTimer() {
    if (!state.isRunning) {
      return;
    }

    state.remainingMs = getRawRemainingMs(Date.now());
    state.isRunning = false;
    state.endAt = null;
    render();
  }

  function resetTimer() {
    state.isRunning = false;
    state.endAt = null;
    state.remainingMs = state.durationMs;
    render();
  }

  function setMode(mode) {
    state.mode = mode;
    state.durationMs = DURATIONS[mode];
    state.remainingMs = state.durationMs;
    state.isRunning = false;
    state.endAt = null;
    render();
  }

  elements.modeButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      setMode(button.dataset.mode);
    });
  });

  elements.actionButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      switch (button.dataset.action) {
        case 'start':
          startTimer();
          break;
        case 'pause':
          pauseTimer();
          break;
        case 'reset':
          resetTimer();
          break;
      }
    });
  });

  elements.settingInputs.forEach(function (input) {
    input.addEventListener('change', function () {
      state.settings[input.dataset.setting] = input.checked;
      render();
    });
  });

  render();
})();
