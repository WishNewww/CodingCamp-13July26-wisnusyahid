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

// ─── DOMContentLoaded initialisation sequence ─────────────────────────────────
// ThemeManager.init() must run first (task 3.1) to prevent a theme flash.
// Remaining widgets are wired in task 10.1.

document.addEventListener('DOMContentLoaded', function () {
  // 1. Check localStorage availability and show banner if unavailable
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

  // 2. ThemeManager.init()  ← task 3.1
  // 3. GreetingWidget.init()
  GreetingWidget.init();
  // 4. TimerWidget.init()   ← task 6.4
  // 5. TodoWidget.init()    ← task 7.10
  // 6. LinkWidget.init()    ← task 9.6
});
