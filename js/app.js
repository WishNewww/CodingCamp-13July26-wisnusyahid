// Personal Dashboard — app.js
// Widget logic populated by tasks 2.1, 2.3, 3.1, 4.2–4.5, 6.2–6.4, 7.2–7.10, 9.2–9.6, 10.1

// ─── Storage Utility ───────────────────────────────────────────────────────────
// Wraps localStorage with consistent error handling. All widgets use this
// exclusively so that failures surface uniformly across the app.

var Storage = {
  /**
   * Tests whether localStorage is available and writable.
   * @returns {boolean}
   */
  isAvailable: function () {
    try {
      var testKey = '__pd_test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Reads and JSON-parses a value from localStorage.
   * Returns null if the key is missing or parsing fails.
   * @param {string} key
   * @returns {*}
   */
  get: function (key) {
    try {
      var raw = localStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('Corrupted data at key: ' + key);
      return null;
    }
  },

  /**
   * JSON-stringifies a value and writes it to localStorage.
   * Shows a non-blocking toast on failure.
   * @param {string} key
   * @param {*} value
   */
  set: function (key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      Storage._showSaveError();
    }
  },

  /**
   * Removes a key from localStorage.
   * @param {string} key
   */
  remove: function (key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      // Removal failures are silently ignored — the value is effectively gone
      // from the app's perspective even if the underlying call fails.
    }
  },

  /** @private — shows a transient save-failure toast */
  _showSaveError: function () {
    var existing = document.getElementById('pd-save-error-toast');
    if (existing) return; // already visible

    var toast = document.createElement('div');
    toast.id = 'pd-save-error-toast';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.textContent = 'Could not save changes.';
    toast.style.cssText = [
      'position:fixed', 'bottom:1rem', 'right:1rem',
      'padding:0.5rem 1rem', 'background:#c0392b', 'color:#fff',
      'border-radius:4px', 'z-index:9999', 'font-size:0.875rem'
    ].join(';');
    document.body.appendChild(toast);

    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 4000);
  }
};

// ─── ThemeManager ──────────────────────────────────────────────────────────────
// Reads the saved theme preference (or falls back to "light") and applies it
// to document.documentElement before any widget renders, preventing a flash of
// the wrong theme. Provides toggle() and getCurrent() for the theme button.

var ThemeManager = {

  /**
   * Returns the currently active theme: "light" or "dark".
   * Derives the value directly from the data-theme attribute so it always
   * reflects the live DOM state.
   *
   * Requirements: 10.1, 10.3
   *
   * @returns {"light"|"dark"}
   */
  getCurrent: function () {
    var theme = document.documentElement.dataset.theme;
    return theme === 'dark' ? 'dark' : 'light';
  },

  /**
   * Applies the given theme string to the <html> element and syncs
   * aria-pressed on the toggle button.
   *
   * @private
   * @param {"light"|"dark"} theme
   */
  _apply: function (theme) {
    document.documentElement.dataset.theme = theme;
    var btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    }
  },

  /**
   * Initialises ThemeManager.
   *  - Reads pd_theme from Storage; falls back to "light" if null.
   *  - Sets document.documentElement.dataset.theme immediately (before any
   *    widget renders) to prevent a theme flash.
   *  - Wires the #theme-toggle button's click event to toggle().
   *
   * Requirements: 10.1, 10.2, 10.4, 10.5
   */
  init: function () {
    var saved = Storage.get('pd_theme');
    var theme = (saved === 'dark') ? 'dark' : 'light';
    ThemeManager._apply(theme);

    var btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.addEventListener('click', function () {
        ThemeManager.toggle();
      });
    }
  },

  /**
   * Flips the current theme between "light" and "dark", persists the new
   * value to localStorage, and re-applies it to the document.
   *
   * Requirements: 10.1, 10.2, 10.3
   */
  toggle: function () {
    var next = ThemeManager.getCurrent() === 'dark' ? 'light' : 'dark';
    Storage.set('pd_theme', next);
    ThemeManager._apply(next);
  }

};

// ─── GreetingWidget ────────────────────────────────────────────────────────────
// Manages the real-time clock, date display, time-of-day greeting, and the
// optional custom user name.

var GreetingWidget = {

  // ── 4.2 ── Pure greeting function ─────────────────────────────────────────

  /**
   * Returns the time-of-day greeting string for a given hour (0–23).
   * This is a pure function with no side-effects; it is straightforward to
   * test in isolation (see Property 1 in design.md).
   *
   * | Hour range      | Greeting         |
   * |-----------------|------------------|
   * | 5 ≤ h < 12      | "Good Morning"   |
   * | 12 ≤ h < 17     | "Good Afternoon" |
   * | 17 ≤ h < 21     | "Good Evening"   |
   * | 21–23 or 0–4    | "Good Night"     |
   *
   * Requirements: 2.1, 2.2, 2.3, 2.4
   *
   * @param {number} hour - Integer in [0, 23]
   * @returns {string}
   */
  getGreeting: function (hour) {
    if (hour >= 5 && hour < 12)  return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    if (hour >= 17 && hour < 21) return 'Good Evening';
    return 'Good Night';
  },

  // ── 4.4 ── tick() ─────────────────────────────────────────────────────────

  /**
   * Called every second by the interval started in init().
   * Updates #clock (HH:MM:SS), #date-display (full human-readable date), and
   * #greeting-text (time-of-day greeting + saved user name if present).
   *
   * Requirements: 1.1, 1.2, 1.3, 2.5
   */
  tick: function () {
    var now = new Date();

    // ── Time: HH:MM:SS ──────────────────────────────────────────────────────
    var hh = String(now.getHours()).padStart(2, '0');
    var mm = String(now.getMinutes()).padStart(2, '0');
    var ss = String(now.getSeconds()).padStart(2, '0');
    var timeString = hh + ':' + mm + ':' + ss;

    var clockEl = document.getElementById('clock');
    if (clockEl) {
      clockEl.textContent = timeString;
      // Keep the machine-readable datetime attribute in sync (HH:MM:SS)
      clockEl.setAttribute('datetime', timeString);
    }

    // ── Date: full human-readable string ────────────────────────────────────
    // e.g. "Wednesday, July 16, 2025"
    var dateString = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    var dateEl = document.getElementById('date-display');
    if (dateEl) {
      dateEl.textContent = dateString;
    }

    // ── Greeting text ────────────────────────────────────────────────────────
    // Base greeting from hour; append name if one is saved (Requirement 2.5)
    var greeting = GreetingWidget.getGreeting(now.getHours());
    var savedName = Storage.get('pd_username');
    var trimmedName = (typeof savedName === 'string') ? savedName.trim() : '';

    var greetingEl = document.getElementById('greeting-text');
    if (greetingEl) {
      greetingEl.textContent = trimmedName
        ? greeting + ', ' + trimmedName
        : greeting;
    }
  },

  // ── 4.4 ── renderUserName() ───────────────────────────────────────────────

  /**
   * Reads pd_username from Storage and refreshes the greeting suffix in
   * #greeting-text to reflect the current saved name.
   *
   * Called after a successful setUserName() and during init().
   *
   * Requirements: 2.5, 3.3
   */
  renderUserName: function () {
    var savedName = Storage.get('pd_username');
    var trimmedName = (typeof savedName === 'string') ? savedName.trim() : '';
    var greetingEl = document.getElementById('greeting-text');

    if (!greetingEl) return;

    // Re-derive the base greeting from the current hour so the greeting
    // phrase stays correct even when renderUserName is called mid-day.
    var baseGreeting = GreetingWidget.getGreeting(new Date().getHours());

    greetingEl.textContent = trimmedName
      ? baseGreeting + ', ' + trimmedName
      : baseGreeting;
  },

  // ── 4.4 ── setUserName(name) ──────────────────────────────────────────────

  /**
   * Validates, persists, and renders a new user name.
   *
   * Behaviour:
   *  - Trims the input first.
   *  - If blank/whitespace → removes pd_username from Storage, clears the
   *    greeting suffix.  No error message (clearing is valid).
   *  - If trimmed length > 50 → shows inline error in #username-error, does
   *    NOT persist.
   *  - Otherwise → calls Storage.set("pd_username", trimmed) and
   *    renderUserName().
   *
   * Requirements: 3.1, 3.2, 3.4, 3.5
   *
   * @param {string} name - Raw value from the input field
   */
  setUserName: function (name) {
    var errorEl = document.getElementById('username-error');

    // Always start with a clean error state
    if (errorEl) errorEl.textContent = '';

    var trimmed = (typeof name === 'string') ? name.trim() : '';

    // ── Empty / whitespace-only ──────────────────────────────────────────────
    // Requirement 3.4: clear saved name; Requirement 3.5: don't save whitespace
    if (trimmed === '') {
      Storage.remove('pd_username');
      GreetingWidget.renderUserName();
      return;
    }

    // ── Length validation ────────────────────────────────────────────────────
    // Requirement 3.1: max 50 characters
    if (trimmed.length > 50) {
      if (errorEl) {
        errorEl.textContent = 'Name must be 50 characters or fewer.';
      }
      return;
    }

    // ── Persist and display ──────────────────────────────────────────────────
    // Requirements 3.2, 3.3
    Storage.set('pd_username', trimmed);
    GreetingWidget.renderUserName();
  },

  // ── 4.5 ── init() ─────────────────────────────────────────────────────────

  /**
   * Initialises the Greeting Widget.
   * - Pre-fills #username-input with any saved name
   * - Renders the greeting suffix via renderUserName()
   * - Binds the Save button and clears the error on input
   * - Starts the 1-second clock interval and fires tick() immediately
   *
   * Requirements: 1.3, 3.2, 3.3
   */
  init: function () {
    var inputEl  = document.getElementById('username-input');
    var saveBtn  = document.getElementById('username-save');
    var errorEl  = document.getElementById('username-error');

    // Pre-fill the input with the saved name (if any)
    var savedName = Storage.get('pd_username');
    if (inputEl && typeof savedName === 'string' && savedName.trim() !== '') {
      inputEl.value = savedName.trim();
    }

    // Show the name in the greeting immediately
    GreetingWidget.renderUserName();

    // Bind Save button
    if (saveBtn && inputEl) {
      saveBtn.addEventListener('click', function () {
        GreetingWidget.setUserName(inputEl.value);
      });
    }

    // Clear inline error as soon as the user starts typing
    if (inputEl && errorEl) {
      inputEl.addEventListener('input', function () {
        errorEl.textContent = '';
      });
    }

    // Start the clock — fire once immediately so there's no 1-second blank,
    // then update every second (Requirement 1.1, 1.3)
    GreetingWidget.tick();
    setInterval(GreetingWidget.tick, 1000);
  }

};

// ─── TimerWidget ──────────────────────────────────────────────────────────────
// Manages a configurable Pomodoro countdown timer with start/stop/reset controls
// and an audible + visible alert on completion.
// Requirements: 4.1–4.10

var TimerWidget = (function () {

  // ── Module-scoped state ──────────────────────────────────────────────────────
  var intervalId       = null;   // active setInterval handle, or null when idle
  var remainingSeconds = 0;      // current countdown value in seconds
  var totalSeconds     = 0;      // full duration (restored on reset)

  return {

    // ── 6.2 ── formatTime(secs) ───────────────────────────────────────────────

    /**
     * Pure function — converts an integer number of seconds to "MM:SS".
     * Both parts are zero-padded to two digits.
     *
     * Property 4 (design.md): validates Requirements 4.2, 4.3
     *
     * @param {number} secs - Integer in [0, 3599]
     * @returns {string}    - e.g. "05:00", "00:00", "59:59"
     */
    formatTime: function (secs) {
      var m = Math.floor(secs / 60);
      var s = secs % 60;
      return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    },

    // ── Internal helper ── _updateDisplay() ─────────────────────────────────

    /** @private — writes the current remainingSeconds to #timer-display */
    _updateDisplay: function () {
      var displayEl = document.getElementById('timer-display');
      if (displayEl) {
        displayEl.textContent = TimerWidget.formatTime(remainingSeconds);
      }
    },

    // ── 6.4 ── countdown() ────────────────────────────────────────────────────

    /**
     * Called every second by the active interval.
     * Decrements remainingSeconds, updates the display, and calls onComplete()
     * when the countdown reaches zero.
     *
     * Requirements: 4.5, 4.7
     */
    countdown: function () {
      remainingSeconds -= 1;
      TimerWidget._updateDisplay();
      if (remainingSeconds <= 0) {
        TimerWidget.onComplete();
      }
    },

    // ── 6.4 ── onComplete() ───────────────────────────────────────────────────

    /**
     * Fired when the countdown reaches 00:00.
     *  - Clears the active interval
     *  - Shows a visible notification in #timer-notification
     *  - Plays an audible beep via AudioContext (silent fallback if unavailable)
     *  - Re-enables Start, disables Stop
     *
     * Requirements: 4.7, 4.8, 4.9
     */
    onComplete: function () {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }

      // ── UI state ─────────────────────────────────────────────────────────────
      var startBtn = document.getElementById('timer-start');
      var stopBtn  = document.getElementById('timer-stop');
      if (startBtn) startBtn.disabled = false;
      if (stopBtn)  stopBtn.disabled  = true;

      // ── Visible notification ─────────────────────────────────────────────────
      var notifEl = document.getElementById('timer-notification');
      if (notifEl) {
        notifEl.textContent = 'Session complete!';
        // Auto-clear the notification after 5 seconds
        setTimeout(function () {
          if (notifEl.textContent === 'Session complete!') {
            notifEl.textContent = '';
          }
        }, 5000);
      }

      // ── Audible alert (AudioContext; silent fallback) ─────────────────────────
      try {
        var AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          var ctx        = new AudioCtx();
          var oscillator = ctx.createOscillator();
          var gainNode   = ctx.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(880, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 1);
        }
      } catch (e) {
        // Silently skip audio if AudioContext is unavailable or blocked
      }
    },

    // ── 6.4 ── start() ────────────────────────────────────────────────────────

    /**
     * Starts the countdown interval if one is not already running.
     * Disables the Start button and enables Stop.
     *
     * Requirements: 4.4
     */
    start: function () {
      if (intervalId !== null) return; // already running

      var startBtn = document.getElementById('timer-start');
      var stopBtn  = document.getElementById('timer-stop');
      if (startBtn) startBtn.disabled = true;
      if (stopBtn)  stopBtn.disabled  = false;

      intervalId = setInterval(TimerWidget.countdown, 1000);
    },

    // ── 6.4 ── stop() ─────────────────────────────────────────────────────────

    /**
     * Pauses the countdown by clearing the active interval.
     * Retains remainingSeconds so the timer can be resumed.
     * Enables Start, disables Stop.
     *
     * Requirements: 4.5
     */
    stop: function () {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }

      var startBtn = document.getElementById('timer-start');
      var stopBtn  = document.getElementById('timer-stop');
      if (startBtn) startBtn.disabled = false;
      if (stopBtn)  stopBtn.disabled  = true;
    },

    // ── 6.4 ── reset() ────────────────────────────────────────────────────────

    /**
     * Stops any active countdown and restores the display to the full
     * duration (totalSeconds). Clears any completion notification.
     *
     * Requirements: 4.6
     */
    reset: function () {
      TimerWidget.stop();
      remainingSeconds = totalSeconds;
      TimerWidget._updateDisplay();

      var notifEl = document.getElementById('timer-notification');
      if (notifEl) notifEl.textContent = '';
    },

    // ── 6.4 ── setDuration(mins) ──────────────────────────────────────────────

    /**
     * Validates the given duration in minutes (must be an integer in [1, 60]),
     * persists it to localStorage under "pd_pomodoro_duration", and updates
     * totalSeconds.
     *
     * Does NOT interrupt an active countdown (per design.md).
     * Shows an inline error in #timer-error on invalid input.
     *
     * Requirements: 4.10
     *
     * @param {*} mins - Raw value from the duration input field
     */
    setDuration: function (mins) {
      var errorEl = document.getElementById('timer-error');
      var parsed  = parseInt(mins, 10);

      if (isNaN(parsed) || parsed < 1 || parsed > 60) {
        if (errorEl) errorEl.textContent = 'Duration must be between 1 and 60 minutes.';
        return;
      }

      if (errorEl) errorEl.textContent = '';
      Storage.set('pd_pomodoro_duration', parsed);
      totalSeconds = parsed * 60;

      // Update display only when the timer is idle (not actively counting down)
      if (intervalId === null) {
        remainingSeconds = totalSeconds;
        TimerWidget._updateDisplay();
      }
    },

    // ── 6.4 ── init() ─────────────────────────────────────────────────────────

    /**
     * Initialises the TimerWidget.
     *  - Reads pd_pomodoro_duration (default 25) from Storage
     *  - Sets totalSeconds and remainingSeconds
     *  - Renders the idle display
     *  - Binds Start, Stop, Reset buttons and the duration Set button
     *  - Clears #timer-error on duration input events
     *
     * Requirements: 4.1, 4.4, 4.5, 4.6, 4.10
     */
    init: function () {
      var saved    = Storage.get('pd_pomodoro_duration');
      var duration = (typeof saved === 'number' && saved >= 1 && saved <= 60) ? saved : 25;

      totalSeconds     = duration * 60;
      remainingSeconds = totalSeconds;

      TimerWidget._updateDisplay();

      // ── Button bindings ──────────────────────────────────────────────────────
      var startBtn    = document.getElementById('timer-start');
      var stopBtn     = document.getElementById('timer-stop');
      var resetBtn    = document.getElementById('timer-reset');
      var durationInput = document.getElementById('timer-duration-input');
      var durationSave  = document.getElementById('timer-duration-save');
      var errorEl       = document.getElementById('timer-error');

      if (startBtn) startBtn.addEventListener('click', function () { TimerWidget.start(); });
      if (stopBtn)  stopBtn.addEventListener('click',  function () { TimerWidget.stop();  });
      if (resetBtn) resetBtn.addEventListener('click', function () { TimerWidget.reset(); });

      if (durationSave && durationInput) {
        durationSave.addEventListener('click', function () {
          TimerWidget.setDuration(durationInput.value);
        });
      }

      // Clear inline error as the user types a new duration
      if (durationInput && errorEl) {
        durationInput.addEventListener('input', function () {
          errorEl.textContent = '';
        });
      }

      // Ensure Stop is disabled in idle state (matches the HTML disabled attr)
      if (stopBtn) stopBtn.disabled = true;
    }

  };

}()); // end TimerWidget IIFE

// ─── LinkWidget ───────────────────────────────────────────────────────────────
// Manages the Quick Links panel: add, delete, persist, and render saved links.
// Requirements: 9.1–9.7

var LinkWidget = {

  /** @private — in-memory links array */
  _links: [],

  // ── 9.2 ── validateUrl(url) ───────────────────────────────────────────────

  /**
   * Pure function — returns true if and only if the URL begins with
   * "http://" or "https://" (case-sensitive).
   *
   * Property 10 (design.md): validates Requirements 9.2, 9.3
   *
   * @param {string} url
   * @returns {boolean}
   */
  validateUrl: function (url) {
    return (
      typeof url === 'string' &&
      (url.indexOf('http://') === 0 || url.indexOf('https://') === 0)
    );
  },

  // ── 9.4 ── saveLinks() ────────────────────────────────────────────────────

  /**
   * Persists the current links array to localStorage under "pd_links".
   *
   * Requirements: 9.2, 9.6, 11.1
   */
  saveLinks: function () {
    Storage.set('pd_links', this._links);
  },

  // ── 9.4 ── addLink(label, url) ────────────────────────────────────────────

  /**
   * Validates inputs and, if valid, creates a new link object, pushes it to
   * the internal array, persists, and re-renders the panel.
   *
   * Validation rules:
   *  - label (after trim) must be non-empty and ≤ 30 characters
   *  - url must pass validateUrl()
   *  - total links must be < 20 (the 20-link cap)
   *
   * On any failure, a descriptive message is written to #link-error.
   * On success, #link-error is cleared.
   *
   * Link object shape: { id: string, label: string, url: string }
   *
   * Requirements: 9.1, 9.2, 9.3, 9.7
   *
   * @param {string} label - Raw label value from the input field
   * @param {string} url   - Raw URL value from the input field
   */
  addLink: function (label, url) {
    var errorEl = document.getElementById('link-error');

    // ── Trim inputs ──────────────────────────────────────────────────────────
    var trimmedLabel = (typeof label === 'string' ? label : '').trim();
    var trimmedUrl   = (typeof url   === 'string' ? url   : '').trim();

    // ── Label: non-empty ────────────────────────────────────────────────────
    if (trimmedLabel.length === 0) {
      if (errorEl) errorEl.textContent = 'Label is required.';
      return;
    }

    // ── Label: ≤ 30 characters ──────────────────────────────────────────────
    if (trimmedLabel.length > 30) {
      if (errorEl) errorEl.textContent = 'Label must be 30 characters or fewer.';
      return;
    }

    // ── URL: must start with http:// or https:// ────────────────────────────
    if (!this.validateUrl(trimmedUrl)) {
      if (errorEl) errorEl.textContent = 'URL must start with http:// or https://';
      return;
    }

    // ── 20-link cap ─────────────────────────────────────────────────────────
    if (this._links.length >= 20) {
      if (errorEl) errorEl.textContent = 'You can save a maximum of 20 links.';
      return;
    }

    // ── Clear error and create link object ──────────────────────────────────
    if (errorEl) errorEl.textContent = '';

    var id = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : Date.now().toString();

    this._links.push({ id: id, label: trimmedLabel, url: trimmedUrl });
    this.saveLinks();
    this.render();
  },

  // ── 9.4 ── deleteLink(index) ──────────────────────────────────────────────

  /**
   * Removes the link at the given index, persists, and re-renders the panel.
   *
   * Requirements: 9.5, 9.6
   *
   * @param {number} index - Zero-based index into the links array
   */
  deleteLink: function (index) {
    this._links.splice(index, 1);
    this.saveLinks();
    this.render();
  },

  // ── 9.4 ── render() ───────────────────────────────────────────────────────

  /**
   * Rebuilds the #link-panel DOM from the current _links array.
   *
   * For each link:
   *  - A <button> that calls window.open(url, "_blank", "noopener") on click
   *  - A "Delete" <button> beside it that calls deleteLink(index)
   * Both are wrapped in a <div class="link-item">.
   *
   * Requirements: 9.4, 9.5, 9.7
   */
  render: function () {
    var panel = document.getElementById('link-panel');
    if (!panel) return;

    // Clear previous content
    panel.innerHTML = '';

    var self = this;

    this._links.forEach(function (link, index) {
      var item = document.createElement('div');
      item.className = 'link-item';

      // ── Link button ────────────────────────────────────────────────────────
      var linkBtn = document.createElement('button');
      linkBtn.type = 'button';
      linkBtn.className = 'link-btn';
      linkBtn.textContent = link.label;
      linkBtn.setAttribute('aria-label', 'Open ' + link.label + ' in a new tab');
      // Capture url in closure to guard against array mutations during iteration
      (function (capturedUrl) {
        linkBtn.addEventListener('click', function () {
          window.open(capturedUrl, '_blank', 'noopener');
        });
      })(link.url);

      // ── Delete button ──────────────────────────────────────────────────────
      var delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'link-delete-btn';
      delBtn.textContent = 'Delete';
      delBtn.setAttribute('aria-label', 'Delete link ' + link.label);
      // Capture index in closure to guard against re-render index shifts
      (function (capturedIndex) {
        delBtn.addEventListener('click', function () {
          self.deleteLink(capturedIndex);
        });
      })(index);

      item.appendChild(linkBtn);
      item.appendChild(delBtn);
      panel.appendChild(item);
    });
  },

  // ── 9.6 ── init() ─────────────────────────────────────────────────────────

  /**
   * Initialises the LinkWidget.
   * - Loads persisted links from localStorage (default: [])
   * - Calls render() to populate #link-panel
   * - Binds #link-add click to addLink()
   * - Binds input events on label/url fields to clear #link-error
   *
   * Requirements: 9.7
   */
  init: function () {
    var saved = Storage.get('pd_links');
    this._links = Array.isArray(saved) ? saved : [];
    this.render();

    var self      = this;
    var labelInput = document.getElementById('link-label-input');
    var urlInput   = document.getElementById('link-url-input');
    var addBtn     = document.getElementById('link-add');
    var errorEl    = document.getElementById('link-error');

    if (addBtn) {
      addBtn.addEventListener('click', function () {
        self.addLink(
          labelInput ? labelInput.value : '',
          urlInput   ? urlInput.value   : ''
        );
        // Clear input fields after a successful add (error would have returned early)
        if (errorEl && errorEl.textContent === '') {
          if (labelInput) labelInput.value = '';
          if (urlInput)   urlInput.value   = '';
        }
      });
    }

    if (labelInput && errorEl) {
      labelInput.addEventListener('input', function () { errorEl.textContent = ''; });
    }
    if (urlInput && errorEl) {
      urlInput.addEventListener('input', function () { errorEl.textContent = ''; });
    }
  }

};


// ─── TodoWidget ───────────────────────────────────────────────────────────────
// Manages the task list: add, edit, complete, delete, sort, and duplicate check.
// Requirements: 5.2, 5.4, 5.5, 6.3, 6.4, 6.5, 7.2, 7.3, 7.5, 8.1, 8.2, 8.3
var TodoWidget = {

  /** @private — in-memory tasks array (insertion order preserved) */
  tasksArray: [],

  /** @private — current sort preference */
  currentSort: 'default',

  // ── 7.2 ── isDuplicate(text) ──────────────────────────────────────────────
  /**
   * Pure function — returns true when the trimmed, lower-cased form of `text`
   * matches any existing task's normalised text.
   *
   * Property 5 (design.md): validates Requirement 5.5
   *
   * @param {string} text - Raw input text
   * @returns {boolean}
   */
  isDuplicate: function (text) {
    var normalized = text.trim().toLowerCase();
    return this.tasksArray.some(function (task) {
      return task.text.trim().toLowerCase() === normalized;
    });
  },

  // ── 7.4 ── saveTasks() ────────────────────────────────────────────────────
  /**
   * Persists the current tasksArray to localStorage under "pd_tasks".
   *
   * Requirements: 5.2, 7.2, 7.3, 7.5, 11.1
   */
  saveTasks: function () {
    Storage.set('pd_tasks', this.tasksArray);
  },

  // ── 7.4 ── addTask(text) ──────────────────────────────────────────────────
  /**
   * Validates the input, rejects empty or duplicate tasks, creates a task
   * object, pushes it to the internal array, persists, and re-renders.
   *
   * Validation:
   *  - Trims input first.
   *  - Empty / whitespace-only → error in #todo-error (Req 5.4)
   *  - Duplicate (case-insensitive after trim) → error in #todo-error (Req 5.5)
   *
   * Task object shape:
   *   { id: string, text: string, completed: false, createdAt: number }
   *
   * Requirements: 5.2, 5.4, 5.5
   *
   * @param {string} text - Raw value from #todo-input
   */
  addTask: function (text) {
    var errorEl = document.getElementById('todo-error');
    var trimmed = (typeof text === 'string') ? text.trim() : '';

    // ── Reject empty / whitespace-only (Req 5.4) ────────────────────────────
    if (trimmed === '') {
      if (errorEl) errorEl.textContent = 'Task cannot be empty.';
      return;
    }

    // ── Reject duplicate (Req 5.5) ───────────────────────────────────────────
    if (this.isDuplicate(trimmed)) {
      if (errorEl) errorEl.textContent = 'This task already exists.';
      return;
    }

    // ── Clear previous error ─────────────────────────────────────────────────
    if (errorEl) errorEl.textContent = '';

    // ── Create task object ───────────────────────────────────────────────────
    var task = {
      id: (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
        ? crypto.randomUUID()
        : Date.now().toString(),
      text: trimmed,
      completed: false,
      createdAt: Date.now()
    };

    this.tasksArray.push(task);
    this.saveTasks();
    this.render();
  },

  // ── 7.4 ── editTask(index, newText) ──────────────────────────────────────
  /**
   * Validates the new text, updates the array entry at the given index,
   * persists, and re-renders.
   *
   * An empty / whitespace-only newText is rejected with an inline error shown
   * in the edit row by _enterEditMode() before this method is ever called;
   * this method also guards against it defensively.
   *
   * Requirements: 6.3, 6.5
   *
   * @param {number} index   - Zero-based index into tasksArray
   * @param {string} newText - New task text (may be untrimmed)
   */
  editTask: function (index, newText) {
    var trimmed = (typeof newText === 'string') ? newText.trim() : '';

    // ── Reject empty text (Req 6.5) ──────────────────────────────────────────
    if (trimmed === '') {
      return; // inline error already shown by _enterEditMode confirm handler
    }

    if (index < 0 || index >= this.tasksArray.length) return;

    this.tasksArray[index].text = trimmed;
    this.saveTasks();
    this.render();
  },

  // ── 7.4 ── toggleComplete(index) ─────────────────────────────────────────
  /**
   * Flips the `completed` boolean on the task at the given index,
   * persists, and re-renders.
   *
   * Toggling twice returns the task to its original state (Property 8).
   *
   * Requirements: 7.2, 7.3
   *
   * @param {number} index - Zero-based index into tasksArray
   */
  toggleComplete: function (index) {
    if (index < 0 || index >= this.tasksArray.length) return;
    this.tasksArray[index].completed = !this.tasksArray[index].completed;
    this.saveTasks();
    this.render();
  },

  // ── 7.4 ── deleteTask(index) ─────────────────────────────────────────────
  /**
   * Removes the task at the given index from the array, persists, and
   * re-renders.
   *
   * Requirements: 7.5
   *
   * @param {number} index - Zero-based index into tasksArray
   */
  deleteTask: function (index) {
    if (index < 0 || index >= this.tasksArray.length) return;
    this.tasksArray.splice(index, 1);
    this.saveTasks();
    this.render();
  },

  // ── 7.7 ── getSortedTasks() ───────────────────────────────────────────────
  /**
   * Returns a shallow copy of tasksArray sorted according to currentSort.
   * The original array order (and therefore the localStorage order) is NEVER
   * mutated — only the display copy is reordered (Property 9 / Req 8.2).
   *
   * Sort options:
   *  "default"        — createdAt ascending (insertion order)
   *  "az"             — case-insensitive alphabetical ascending
   *  "za"             — case-insensitive alphabetical descending
   *  "completed-last" — incomplete first, then completed; within each group
   *                     ordered by createdAt ascending
   *
   * Requirements: 8.1, 8.2, 8.3
   *
   * @returns {Array} Sorted shallow copy of tasksArray
   */
  getSortedTasks: function () {
    var copy   = this.tasksArray.slice();
    var option = this.currentSort;

    if (option === 'az') {
      copy.sort(function (a, b) {
        return a.text.toLowerCase().localeCompare(b.text.toLowerCase());
      });
    } else if (option === 'za') {
      copy.sort(function (a, b) {
        return b.text.toLowerCase().localeCompare(a.text.toLowerCase());
      });
    } else if (option === 'completed-last') {
      copy.sort(function (a, b) {
        if (a.completed === b.completed) return a.createdAt - b.createdAt;
        return a.completed ? 1 : -1;
      });
    } else {
      // 'default' — insertion order by createdAt ascending
      copy.sort(function (a, b) { return a.createdAt - b.createdAt; });
    }

    return copy;
  },

  // ── 7.7 ── setSort(option) ────────────────────────────────────────────────
  /**
   * Saves the new sort preference to localStorage and re-renders.
   *
   * Requirements: 8.1, 8.2
   *
   * @param {string} option - One of "default", "az", "za", "completed-last"
   */
  setSort: function (option) {
    this.currentSort = option;
    Storage.set('pd_tasks_sort', option);
    this.render();
  },

  // ── 7.10 ── render() ──────────────────────────────────────────────────────
  /**
   * Clears #todo-list and rebuilds it from getSortedTasks().
   *
   * Each task row contains:
   *  - <input type="checkbox"> (pre-checked when completed)
   *  - <span class="task-text"> (strikethrough class when completed)
   *  - Edit <button>
   *  - Delete <button>
   *
   * Clicking Edit switches the row to inline-edit mode via _enterEditMode().
   *
   * Requirements: 5.1, 5.3, 6.1, 6.2, 7.1, 7.4, 8.1, 8.3
   */
  render: function () {
    var listEl = document.getElementById('todo-list');
    if (!listEl) return;

    var sorted = this.getSortedTasks();
    var self   = this;

    listEl.innerHTML = '';

    sorted.forEach(function (task) {
      // Resolve the real index in the unsorted array so mutations are correct
      var realIndex = self.tasksArray.indexOf(task);

      var li = document.createElement('li');
      li.className = 'todo-item' + (task.completed ? ' completed' : '');

      // ── Checkbox ────────────────────────────────────────────────────────────
      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.completed;
      checkbox.setAttribute('aria-label',
        'Mark "' + task.text + '" as ' + (task.completed ? 'incomplete' : 'complete'));
      (function (capturedIndex) {
        checkbox.addEventListener('change', function () {
          self.toggleComplete(capturedIndex);
        });
      })(realIndex);

      // ── Task text ────────────────────────────────────────────────────────────
      var textSpan = document.createElement('span');
      textSpan.className = 'task-text';
      textSpan.textContent = task.text;

      // ── Edit button ──────────────────────────────────────────────────────────
      var editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.textContent = 'Edit';
      editBtn.className = 'btn-edit';
      editBtn.setAttribute('aria-label', 'Edit task: ' + task.text);
      (function (capturedLi, capturedTask, capturedIndex) {
        editBtn.addEventListener('click', function () {
          self._enterEditMode(capturedLi, capturedTask, capturedIndex);
        });
      })(li, task, realIndex);

      // ── Delete button ────────────────────────────────────────────────────────
      var deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.textContent = 'Delete';
      deleteBtn.className = 'btn-delete';
      deleteBtn.setAttribute('aria-label', 'Delete task: ' + task.text);
      (function (capturedIndex) {
        deleteBtn.addEventListener('click', function () {
          self.deleteTask(capturedIndex);
        });
      })(realIndex);

      li.appendChild(checkbox);
      li.appendChild(textSpan);
      li.appendChild(editBtn);
      li.appendChild(deleteBtn);
      listEl.appendChild(li);
    });
  },

  // ── Internal helper ── _enterEditMode(li, task, realIndex) ────────────────
  /**
   * Replaces a task row's normal view with an inline editor.
   *
   * The row becomes:
   *  <input class="edit-input"> (pre-filled)
   *  <span class="edit-error" role="alert">
   *  <button class="btn-confirm">Confirm</button>
   *  <button class="btn-cancel">Cancel</button>
   *
   * Confirm validates (non-empty) then calls editTask().
   * Cancel calls render() to restore the normal view (Req 6.4 — no save).
   * Enter key = Confirm; Escape key = Cancel.
   *
   * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
   *
   * @param {HTMLElement} li         - The <li> element being edited
   * @param {Object}      task       - Task object (for pre-fill)
   * @param {number}      realIndex  - Index in tasksArray for editTask()
   */
  _enterEditMode: function (li, task, realIndex) {
    var self = this;

    li.innerHTML = '';

    // ── Edit input ───────────────────────────────────────────────────────────
    var editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.value = task.text;
    editInput.className = 'edit-input';
    editInput.setAttribute('aria-label', 'Editing task: ' + task.text);

    // ── Inline error span (Req 6.5) ──────────────────────────────────────────
    var editError = document.createElement('span');
    editError.className = 'edit-error';
    editError.setAttribute('role', 'alert');

    // ── Confirm button ───────────────────────────────────────────────────────
    var confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.textContent = 'Confirm';
    confirmBtn.className = 'btn-confirm';
    confirmBtn.setAttribute('aria-label', 'Confirm edit');
    confirmBtn.addEventListener('click', function () {
      var newText = editInput.value.trim();
      if (newText === '') {
        editError.textContent = 'Task text cannot be empty.';
        return;
      }
      self.editTask(realIndex, editInput.value);
    });

    // ── Cancel button (Req 6.4 — discard without saving) ────────────────────
    var cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.className = 'btn-cancel';
    cancelBtn.setAttribute('aria-label', 'Cancel edit');
    cancelBtn.addEventListener('click', function () {
      self.render(); // re-render restores the normal view
    });

    // Clear inline error on input
    editInput.addEventListener('input', function () {
      editError.textContent = '';
    });

    // Keyboard shortcuts: Enter = confirm, Escape = cancel
    editInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter')  confirmBtn.click();
      if (e.key === 'Escape') cancelBtn.click();
    });

    li.appendChild(editInput);
    li.appendChild(editError);
    li.appendChild(confirmBtn);
    li.appendChild(cancelBtn);

    editInput.focus();
  },

  // ── 7.10 ── init() ────────────────────────────────────────────────────────
  /**
   * Initialises the TodoWidget.
   *  - Loads persisted tasks and sort preference from localStorage
   *  - Renders the task list
   *  - Syncs the #todo-sort <select> to the saved preference
   *  - Binds #todo-add click and Enter keypress on #todo-input to addTask()
   *  - Clears #todo-error on every input event
   *
   * Requirements: 5.1, 5.3, 6.1, 7.1, 8.1, 8.3
   */
  init: function () {
    var self = this;

    // ── Load persisted state ─────────────────────────────────────────────────
    var savedTasks = Storage.get('pd_tasks');
    this.tasksArray = Array.isArray(savedTasks) ? savedTasks : [];
    this.currentSort = Storage.get('pd_tasks_sort') || 'default';

    // ── Render initial list ──────────────────────────────────────────────────
    this.render();

    // ── Sync sort <select> ───────────────────────────────────────────────────
    var sortEl = document.getElementById('todo-sort');
    if (sortEl) {
      sortEl.value = this.currentSort;
      sortEl.addEventListener('change', function () {
        self.setSort(sortEl.value);
      });
    }

    // ── Wire Add button and Enter key ────────────────────────────────────────
    var inputEl = document.getElementById('todo-input');
    var addBtn  = document.getElementById('todo-add');
    var errorEl = document.getElementById('todo-error');

    if (addBtn && inputEl) {
      addBtn.addEventListener('click', function () {
        self.addTask(inputEl.value);
        // Clear the input only when there was no error (error implies nothing was added)
        if (errorEl && errorEl.textContent === '') {
          inputEl.value = '';
        }
      });

      inputEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          self.addTask(inputEl.value);
          if (errorEl && errorEl.textContent === '') {
            inputEl.value = '';
          }
        }
      });
    }

    // ── Clear #todo-error when user begins typing ────────────────────────────
    if (inputEl && errorEl) {
      inputEl.addEventListener('input', function () {
        errorEl.textContent = '';
      });
    }
  }

};

// ─── DOMContentLoaded initialisation sequence ─────────────────────────────────
// ThemeManager.init() must run first (task 3.1) to prevent a theme flash.
// Remaining widgets are wired in task 10.1.

document.addEventListener('DOMContentLoaded', function () {
  // ── Step 1: Storage availability check + banner ──────────────────────────
  // Show a non-blocking banner if localStorage is unavailable so all widgets
  // below can still run in-memory for the session.
  // Requirements: 11.2, 11.3
  if (!Storage.isAvailable()) {
    var banner = document.createElement('div');
    banner.setAttribute('role', 'alert');
    banner.setAttribute('aria-live', 'assertive');
    banner.textContent = 'Storage is unavailable. Your changes will not be saved.';
    banner.style.cssText = [
      'position:sticky', 'top:0', 'z-index:9998',
      'padding:0.5rem 1rem', 'background:#e67e22', 'color:#fff',
      'text-align:center', 'font-size:0.9rem'
    ].join(';');
    document.body.insertBefore(banner, document.body.firstChild);
  }

  // ── Step 2: ThemeManager.init() ──────────────────────────────────────────
  // MUST run before any widget renders to prevent a flash of the wrong theme.
  // Reads pd_theme from localStorage and sets data-theme on <html> immediately.
  // Requirements: 10.4, 12.1
  ThemeManager.init();

  // ── Step 3: GreetingWidget.init() ────────────────────────────────────────
  // Loads saved user name, starts the 1-second clock interval, fires tick()
  // immediately so there is no blank second on load.
  // Requirements: 1.1, 1.3, 3.2
  GreetingWidget.init();

  // ── Step 4: TimerWidget.init() ───────────────────────────────────────────
  // Reads saved Pomodoro duration (default 25 min), renders idle state, and
  // binds Start / Stop / Reset / Set controls.
  // Requirements: 4.1, 4.9
  TimerWidget.init();

  // ── Step 5: TodoWidget.init() ────────────────────────────────────────────
  // Loads persisted tasks and sort preference, renders the list, and binds
  // the Add / Edit / Delete / Complete / Sort controls.
  // Requirements: 5.1, 5.3, 8.3
  TodoWidget.init();

  // ── Step 6: LinkWidget.init() ────────────────────────────────────────────
  // Loads persisted links, renders the panel, and binds the Add / Delete
  // controls.
  // Requirements: 9.7
  LinkWidget.init();
});
