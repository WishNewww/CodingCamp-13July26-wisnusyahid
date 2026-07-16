# Design Document: Personal Dashboard

## Overview

The Personal Dashboard is a fully client-side, single-page web application built with plain HTML, CSS, and vanilla JavaScript. It functions as a browser new-tab replacement or a standalone productivity page. There is no backend — all state lives in the browser's `localStorage`.

The application is composed of four independent widgets that communicate through a shared storage layer:

1. **Greeting Widget** — real-time clock, date, time-of-day greeting, and custom user name
2. **Pomodoro Timer Widget** — configurable countdown timer with start/stop/reset controls
3. **To-Do List Widget** — persistent task list with add, edit, complete, delete, sort, and duplicate-prevention
4. **Quick Links Panel** — saved shortcut links that open in new tabs

The build is deployable as a static site on GitHub Pages with no build step required.

---

## Architecture

The application follows a **module-per-widget** architecture within a single JavaScript file (`js/app.js`). There are no module bundlers or ES module imports — each widget is a self-contained object/namespace within the file. A shared `Storage` utility wraps `localStorage` for consistent read/write/error-handling.

```
index.html
├── css/
│   └── style.css          ← single stylesheet (layout, themes, widgets)
└── js/
    └── app.js             ← all application logic
        ├── Storage        ← localStorage wrapper with error handling
        ├── ThemeManager   ← light/dark mode, prefers-color-scheme
        ├── GreetingWidget ← clock, date, greeting, user name
        ├── TimerWidget    ← Pomodoro countdown
        ├── TodoWidget     ← task CRUD, sort, duplicate check
        └── LinkWidget     ← quick links CRUD
```

### Initialization Sequence

Theme is applied **before** any DOM rendering to prevent a flash of the wrong theme. The sequence on `DOMContentLoaded` is:

```
1. ThemeManager.init()   ← reads localStorage, sets data-theme attribute
2. GreetingWidget.init() ← starts clock interval, loads user name
3. TimerWidget.init()    ← loads saved duration, renders idle state
4. TodoWidget.init()     ← loads tasks, applies saved sort
5. LinkWidget.init()     ← loads links, renders panel
```

### Layout Strategy

A CSS Grid layout on the main container switches between multi-column (≥768 px) and single-column (<768 px) via a single media query breakpoint.

```
┌─────────────────────────────────────────┐
│             Greeting Widget             │  ← full width
├──────────────────┬──────────────────────┤
│  Pomodoro Timer  │   To-Do List         │  ← 2-column ≥768px
├──────────────────┴──────────────────────┤
│             Quick Links Panel           │  ← full width
└─────────────────────────────────────────┘
```

At <768 px all four widgets stack vertically.

---

## Components and Interfaces

### Storage Utility

Wraps all `localStorage` operations. All widgets interact with storage exclusively through this utility.

```js
Storage = {
  get(key)          // returns parsed value or null; logs warning on parse error
  set(key, value)   // JSON-stringifies and writes; shows non-blocking error on failure
  remove(key)       // removes a key
  isAvailable()     // returns boolean — tests localStorage availability
}
```

**Storage keys:**

| Key                       | Type     | Default    |
|---------------------------|----------|------------|
| `pd_theme`                | string   | `"light"`  |
| `pd_username`             | string   | `""`       |
| `pd_pomodoro_duration`    | number   | `25`       |
| `pd_tasks`                | array    | `[]`       |
| `pd_tasks_sort`           | string   | `"default"`|
| `pd_links`                | array    | `[]`       |

---

### ThemeManager

Applies the saved theme before first render. Listens for toggle events.

**Interface:**
```js
ThemeManager = {
  init()         // reads pd_theme (or prefers-color-scheme), sets document.documentElement dataset.theme
  toggle()       // flips theme, saves to localStorage, re-applies
  getCurrent()   // returns "light" | "dark"
}
```

**Theme application:** Setting `data-theme="dark"` on `<html>` allows CSS custom properties to switch all colors in a single cascade without touching individual elements.

---

### GreetingWidget

Manages the clock interval and greeting text.

**Interface:**
```js
GreetingWidget = {
  init()              // loads user name, starts setInterval(tick, 1000)
  tick()              // called every second: updates time display, date, greeting
  getGreeting(hour)   // pure function: returns greeting string for a given hour (0–23)
  setUserName(name)   // validates, trims, saves/removes from localStorage
  renderUserName()    // updates greeting with current saved name
}
```

**Greeting logic (pure function, easily testable):**

| Hour range     | Greeting          |
|----------------|-------------------|
| 5 ≤ h < 12     | "Good Morning"    |
| 12 ≤ h < 17    | "Good Afternoon"  |
| 17 ≤ h < 21    | "Good Evening"    |
| 21 ≤ h or h < 5| "Good Night"      |

---

### TimerWidget

Manages countdown state via `setInterval`.

**Interface:**
```js
TimerWidget = {
  init()            // loads saved duration, renders idle
  start()           // begins setInterval(countdown, 1000)
  stop()            // clears interval, retains remaining time
  reset()           // clears interval, restores display to full duration
  countdown()       // decrements remaining; calls onComplete() at 00:00
  onComplete()      // plays audio alert, shows visible notification
  setDuration(mins) // validates 1–60, saves to localStorage
  formatTime(secs)  // pure function: converts seconds → "MM:SS"
}
```

**State variables (module-scoped):**
- `intervalId` — the active `setInterval` handle (or `null`)
- `remainingSeconds` — current countdown value
- `totalSeconds` — full duration in seconds (from saved or default)

---

### TodoWidget

Manages the task array and all CRUD operations.

**Interface:**
```js
TodoWidget = {
  init()                    // loads tasks and sort preference, renders list
  addTask(text)             // validates, checks duplicate, pushes to array, saves
  editTask(index, newText)  // validates, updates array entry, saves
  toggleComplete(index)     // flips completed flag, saves
  deleteTask(index)         // splices array, saves
  getSortedTasks()          // returns display copy sorted per current preference
  setSort(option)           // saves sort preference, re-renders
  isDuplicate(text)         // pure function: true if trimmed+lower text matches any task
  saveTasks()               // writes tasks array to localStorage
  render()                  // rebuilds task list DOM from getSortedTasks()
}
```

**Task object shape:**
```js
{
  id: string,         // crypto.randomUUID() or Date.now().toString()
  text: string,       // trimmed task text
  completed: boolean,
  createdAt: number   // Date.now() — used for "Default" sort order
}
```

**Sort options:**
- `"default"` — order by `createdAt` ascending
- `"az"` — alphabetical ascending (case-insensitive)
- `"za"` — alphabetical descending (case-insensitive)
- `"completed-last"` — incomplete tasks first, then completed tasks (within each group, preserves default order)

**Duplicate check:** `task.text.trim().toLowerCase()` compared against every existing task's same normalized form.

---

### LinkWidget

Manages the links array and panel rendering.

**Interface:**
```js
LinkWidget = {
  init()              // loads links, renders panel
  addLink(label, url) // validates, checks 20-link cap, pushes to array, saves
  deleteLink(index)   // splices array, saves, re-renders
  saveLinks()         // writes links array to localStorage
  render()            // rebuilds link panel DOM
  validateUrl(url)    // pure function: true if url starts with http:// or https://
}
```

**Link object shape:**
```js
{
  id: string,
  label: string,  // trimmed, 1–30 chars
  url: string     // validated URL, 1–2048 chars
}
```

---

## Data Models

### Persisted State Summary

All data is stored as JSON strings in `localStorage` under the keys listed in the Storage section. On load, each widget calls `Storage.get(key)` and falls back to a safe default if the result is `null` or fails to parse.

### Task Array Schema

```json
[
  {
    "id": "1721234567890",
    "text": "Buy groceries",
    "completed": false,
    "createdAt": 1721234567890
  }
]
```

- `id` and `createdAt` are both set from `Date.now()` at creation time (or `crypto.randomUUID()` if available)
- `text` is always stored trimmed
- `completed` defaults to `false`

### Link Array Schema

```json
[
  {
    "id": "1721234567891",
    "label": "GitHub",
    "url": "https://github.com"
  }
]
```

### Scalar Preferences

| Key                    | Stored value example     |
|------------------------|--------------------------|
| `pd_theme`             | `"dark"`                 |
| `pd_username`          | `"Alex"`                 |
| `pd_pomodoro_duration` | `30`                     |
| `pd_tasks_sort`        | `"az"`                   |

### Corruption Handling

On `Storage.get()`, if `JSON.parse` throws, the utility catches the error, logs a `console.warn`, and returns `null`. Each widget's `init()` treats a `null` return as a missing key and applies its hardcoded default. This means a corrupted entry silently resets to the default without crashing the application.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Greeting is exhaustive and correct for all hours

*For any* integer hour in [0, 23], `GreetingWidget.getGreeting(hour)` SHALL return a non-empty string that is exactly one of {"Good Morning", "Good Afternoon", "Good Evening", "Good Night"}, corresponding to the correct time-of-day range (5–11 → Morning, 12–16 → Afternoon, 17–20 → Evening, 21–23 and 0–4 → Night), such that every possible hour maps to exactly one greeting with no gaps or overlaps.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

---

### Property 2: User name whitespace rejection

*For any* string composed entirely of whitespace characters, `GreetingWidget.setUserName(name)` SHALL NOT persist the value to localStorage, and a subsequent `Storage.get("pd_username")` SHALL return `null` or the previously stored non-whitespace name.

**Validates: Requirements 3.5**

---

### Property 3: User name round-trip

*For any* non-whitespace string of up to 50 characters, saving the User_Name and then reloading from localStorage SHALL recover the original trimmed value.

**Validates: Requirements 3.2, 3.3**

---

### Property 4: Timer format correctness

*For any* integer number of seconds in [0, 3599], `TimerWidget.formatTime(secs)` SHALL return a string matching the pattern `MM:SS` where MM and SS are zero-padded two-digit integers and SS is in [00, 59].

**Validates: Requirements 4.2, 4.3**

---

### Property 5: Duplicate task prevention

*For any* task list and any new task text, if the trimmed, case-insensitive form of the new text matches any existing task's normalized text, `TodoWidget.isDuplicate(text)` SHALL return `true` and `addTask` SHALL reject the addition, leaving the task list unchanged.

**Validates: Requirements 5.5**

---

### Property 6: Empty/whitespace task rejection

*For any* string that is empty or composed entirely of whitespace characters, `TodoWidget.addTask(text)` SHALL reject the input and the task list length SHALL remain unchanged.

**Validates: Requirements 5.4**

---

### Property 7: Task addition round-trip

*For any* valid task text (non-empty, non-duplicate, ≤200 chars after trim), calling `addTask(text)` and then `Storage.get("pd_tasks")` SHALL yield an array that contains a task entry with the trimmed text and `completed: false`.

**Validates: Requirements 5.2, 11.1**

---

### Property 8: Task toggle idempotent complement

*For any* task in the task list, toggling its completion status twice SHALL return the task to its original `completed` state, and the list length SHALL be unchanged.

**Validates: Requirements 7.2, 7.3**

---

### Property 9: Sort does not mutate persisted order

*For any* task list and any sort option other than "default", calling `getSortedTasks()` SHALL return a reordered array without modifying the underlying storage array (i.e., the order in `Storage.get("pd_tasks")` SHALL equal the insertion order before and after sorting).

**Validates: Requirements 8.2**

---

### Property 10: URL validation

*For any* string, `LinkWidget.validateUrl(url)` SHALL return `true` if and only if the string begins with `http://` or `https://` (case-sensitive).

**Validates: Requirements 9.2, 9.3**

---

### Property 11: Link addition round-trip

*For any* valid link (label 1–30 chars, URL starting with http:// or https://, total links < 20), calling `addLink(label, url)` and then `Storage.get("pd_links")` SHALL yield an array containing a link entry with the exact label and url values.

**Validates: Requirements 9.2, 11.1**

---

### Property 12: Theme toggle round-trip

*For any* starting theme ("light" or "dark"), calling `ThemeManager.toggle()` twice SHALL result in the same theme as the starting state, and `Storage.get("pd_theme")` SHALL reflect the current theme after each toggle.

**Validates: Requirements 10.1, 10.2, 10.3**

---

## Error Handling

### localStorage Unavailability

`Storage.isAvailable()` is called once on `DOMContentLoaded`. If it returns `false` (e.g., private browsing with storage blocked, or storage quota exceeded), a non-blocking banner is displayed at the top of the page: *"Storage is unavailable. Your changes will not be saved."* All widgets initialize with defaults and continue functioning in-memory for the session.

### localStorage Write Failures

Each `Storage.set()` call is wrapped in a `try/catch`. If the write fails (e.g., quota exceeded mid-session), a transient non-blocking toast notification is displayed: *"Could not save changes."* The UI state is not rolled back — the user's in-memory state remains intact.

### Corrupted Data

`Storage.get()` wraps `JSON.parse` in a `try/catch`. On parse failure, it logs `console.warn("Corrupted data at key: " + key)` and returns `null`. Each widget's `init()` treats `null` as missing and falls back to its default (empty array for tasks/links, `"light"` for theme, `25` for duration, `""` for username).

### Input Validation Errors

All validation errors are displayed inline as small text nodes adjacent to the relevant input field. They are not modal dialogs and do not block interaction with other widgets. Validation messages are cleared when the user begins typing again.

### Timer Completion

When the countdown reaches `00:00`:
- `clearInterval` stops the ticker
- A visible in-widget notification is shown ("Session complete!")
- An `AudioContext`-generated beep (or an `<audio>` element) plays the alert
- The timer stays at `00:00` until the user presses Reset

### Cross-Browser Audio

`AudioContext` is gated behind a feature-detection check (`window.AudioContext || window.webkitAudioContext`). If neither is available, the audible alert is silently skipped — the visible notification still fires.

---

## Testing Strategy

Because the project constraint prohibits any test framework or setup, the testing strategy describes properties and examples that a developer would verify manually or that could be validated with a lightweight testing approach if a framework were added later.

### Unit-Testable Pure Functions

The following functions have no side effects and are straightforward to unit test in isolation:

| Function                          | What to verify                                           |
|-----------------------------------|----------------------------------------------------------|
| `GreetingWidget.getGreeting(h)`   | Returns correct string for all 24 hours                  |
| `TimerWidget.formatTime(secs)`    | Returns "MM:SS" for 0–3599; handles boundary values      |
| `TodoWidget.isDuplicate(text)`    | Returns true/false for normalized duplicate detection    |
| `LinkWidget.validateUrl(url)`     | Returns true only for http:// and https:// prefixes      |
| `Storage.get/set round-trip`      | Stored value equals retrieved parsed value               |

### Property-Based Test Targets

If a PBT library (e.g., fast-check) were introduced, these properties are the highest-value targets:

- **Property 1**: `getGreeting` covers all hours exactly once with no gaps
- **Property 2–3**: User name save/load preserves trimmed value; whitespace rejected
- **Property 4**: `formatTime` always produces valid `MM:SS` for all valid input seconds
- **Property 5–6**: Duplicate and empty task rejection leaves list unchanged
- **Property 7**: Task add round-trip to localStorage
- **Property 8**: Toggle twice = original state
- **Property 9**: Sort view does not mutate persisted storage
- **Property 10–11**: URL validation and link add round-trip
- **Property 12**: Theme toggle twice = original theme

### Manual / Integration Checks

| Scenario                                      | Expected outcome                                               |
|-----------------------------------------------|----------------------------------------------------------------|
| Load page — theme flashes wrong color         | Should NOT happen; theme applied before render                 |
| Add task → reload → task present              | Task persists across reload                                    |
| Add duplicate task                            | Rejected with message; list unchanged                         |
| Set timer to 1 min, let expire                | Alert fires at 00:00                                          |
| Add 20 links, try to add 21st                 | Rejected; panel capped at 20                                  |
| Resize to <768 px                             | All widgets stack in single column                            |
| Corrupt `pd_tasks` in DevTools, reload        | Default empty list shown; no crash                            |
| Block localStorage in private mode            | Non-blocking warning shown; app works in memory               |

### Accessibility Checks

- All interactive controls (buttons, inputs) have accessible labels (`aria-label` or `<label for>`)
- Theme contrast ratios meet WCAG 2.1 AA (4.5:1 for normal text, 3:1 for large text)
- Keyboard navigation: all controls reachable via Tab, activated via Enter/Space
- Timer notifications include both visual and audible feedback for users with hearing/vision differences
- Full validation with assistive technologies (screen readers) requires manual testing by an accessibility expert
