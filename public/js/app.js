(function () {
  const storageKey = 'pomodoro-settings';
  const defaultSettings = {
    focusDuration: 25,
    breakDuration: 5,
    theme: 'dark',
    sounds: {
      start: true,
      end: true,
      tick: false
    }
  };

  const elements = {
    root: document.documentElement,
    sessionLabel: document.getElementById('session-label'),
    timerDisplay: document.getElementById('timer-display'),
    statusText: document.getElementById('status-text'),
    focusDuration: document.getElementById('focus-duration'),
    breakDuration: document.getElementById('break-duration'),
    focusMinutesInput: document.getElementById('focus-minutes-input'),
    themeSelect: document.getElementById('theme-select'),
    soundStart: document.getElementById('sound-start'),
    soundEnd: document.getElementById('sound-end'),
    soundTick: document.getElementById('sound-tick'),
    startPauseButton: document.getElementById('start-pause-button'),
    resetButton: document.getElementById('reset-button'),
    skipButton: document.getElementById('skip-button')
  };

  let settings = loadSettings();
  let isFocusSession = true;
  let isRunning = false;
  let remainingSeconds = settings.focusDuration * 60;
  let intervalId;
  let audioContext;

  function loadSettings() {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey));
      return {
        focusDuration: normalizeValue(stored && stored.focusDuration, [15, 25, 35, 45], defaultSettings.focusDuration),
        breakDuration: normalizeValue(stored && stored.breakDuration, [5, 10, 15], defaultSettings.breakDuration),
        theme: normalizeValue(stored && stored.theme, ['dark', 'light', 'focus'], defaultSettings.theme),
        sounds: {
          start: typeof stored?.sounds?.start === 'boolean' ? stored.sounds.start : defaultSettings.sounds.start,
          end: typeof stored?.sounds?.end === 'boolean' ? stored.sounds.end : defaultSettings.sounds.end,
          tick: typeof stored?.sounds?.tick === 'boolean' ? stored.sounds.tick : defaultSettings.sounds.tick
        }
      };
    } catch (error) {
      return { ...defaultSettings, sounds: { ...defaultSettings.sounds } };
    }
  }

  function normalizeValue(value, allowedValues, fallback) {
    const normalized = typeof fallback === 'number' ? Number(value) : value;
    return allowedValues.includes(normalized) ? normalized : fallback;
  }

  function saveSettings() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(settings));
    } catch (error) {
      // Persistence is best-effort; ignore write failures (quota/blocked storage).
    }
  }

  function getSessionDuration() {
    return (isFocusSession ? settings.focusDuration : settings.breakDuration) * 60;
  }

  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function updateTheme() {
    elements.root.dataset.theme = settings.theme;
  }

  function updateDisplay() {
    elements.sessionLabel.textContent = isFocusSession ? '集中セッション' : '休憩セッション';
    elements.timerDisplay.textContent = formatTime(remainingSeconds);
    elements.startPauseButton.textContent = isRunning ? '一時停止' : '開始';
    if (isRunning) {
      elements.statusText.textContent = `${isFocusSession ? '集中' : '休憩'}タイマーを進行中です。`;
      return;
    }
    elements.statusText.textContent = `${isFocusSession ? '集中' : '休憩'}時間は${isFocusSession ? settings.focusDuration : settings.breakDuration}分に設定されています。`;
  }

  function syncControls() {
    elements.focusDuration.value = String(settings.focusDuration);
    elements.breakDuration.value = String(settings.breakDuration);
    if (elements.focusMinutesInput) {
      elements.focusMinutesInput.value = String(settings.focusDuration);
    }
    elements.themeSelect.value = settings.theme;
    elements.soundStart.checked = settings.sounds.start;
    elements.soundEnd.checked = settings.sounds.end;
    elements.soundTick.checked = settings.sounds.tick;
    updateTheme();
    updateDisplay();
  }

  function ensureAudioContext() {
    if (!audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        return null;
      }
      audioContext = new AudioContextClass();
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {
        // Ignore resume failures (e.g., browser autoplay / background restrictions).
      });
    }
    return audioContext;
  }

  function playTone(type) {
    const context = ensureAudioContext();
    if (!context) {
      return;
    }
    const patterns = {
      start: [{ frequency: 660, duration: 0.12 }, { frequency: 880, duration: 0.14 }],
      end: [{ frequency: 880, duration: 0.14 }, { frequency: 660, duration: 0.14 }, { frequency: 520, duration: 0.18 }],
      tick: [{ frequency: 520, duration: 0.05 }]
    };
    let currentTime = context.currentTime;
    patterns[type].forEach((note) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = note.frequency;
      gain.gain.setValueAtTime(0.0001, currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, currentTime + note.duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(currentTime);
      oscillator.stop(currentTime + note.duration);
      currentTime += note.duration + 0.03;
    });
  }

  function resetTimer(keepSession) {
    clearInterval(intervalId);
    isRunning = false;
    if (!keepSession) {
      isFocusSession = true;
    }
    remainingSeconds = getSessionDuration();
    updateDisplay();
  }

  function switchSession() {
    isFocusSession = !isFocusSession;
    remainingSeconds = getSessionDuration();
    if (settings.sounds.end) {
      playTone('end');
    }
    updateDisplay();
  }

  function startPauseTimer() {
    if (isRunning) {
      clearInterval(intervalId);
      isRunning = false;
      updateDisplay();
      return;
    }

    isRunning = true;
    if (settings.sounds.start) {
      playTone('start');
    }
    updateDisplay();
    intervalId = window.setInterval(() => {
      remainingSeconds -= 1;
      if (!document.hidden && settings.sounds.tick && remainingSeconds > 0) {
        playTone('tick');
      }
      if (remainingSeconds <= 0) {
        switchSession();
      }
      updateDisplay();
    }, 1000);
  }

  function updateSetting(key, value) {
    settings[key] = value;
    if (key === 'focusDuration' && elements.focusMinutesInput) {
      elements.focusMinutesInput.value = String(value);
    }
    saveSettings();
    updateTheme();
    resetTimer(true);
  }

  elements.focusDuration.addEventListener('change', (event) => {
    updateSetting('focusDuration', Number(event.target.value));
  });

  elements.breakDuration.addEventListener('change', (event) => {
    updateSetting('breakDuration', Number(event.target.value));
  });

  elements.themeSelect.addEventListener('change', (event) => {
    settings.theme = event.target.value;
    saveSettings();
    updateTheme();
  });

  elements.soundStart.addEventListener('change', (event) => {
    settings.sounds.start = event.target.checked;
    saveSettings();
  });

  elements.soundEnd.addEventListener('change', (event) => {
    settings.sounds.end = event.target.checked;
    saveSettings();
  });

  elements.soundTick.addEventListener('change', (event) => {
    settings.sounds.tick = event.target.checked;
    saveSettings();
  });

  elements.startPauseButton.addEventListener('click', startPauseTimer);
  elements.resetButton.addEventListener('click', () => resetTimer(false));
  elements.skipButton.addEventListener('click', switchSession);

  syncControls();
})();
