# Implementation Plan: Personal Dashboard

## Overview

Implement a fully client-side Personal Dashboard as a single `index.html`, one `css/style.css`, and one `js/app.js`. No frameworks, no build step. All state lives in `localStorage`. Widgets are plain-object namespaces inside `app.js`, initialized in theme-first order to prevent a flash of the wrong theme.

---

## Tasks

- [~] 1. Set up project structure and HTML skeleton
  - Create `index.html` with a semantic layout: `<header>` for the greeting widget, `<main>` with a CSS-grid container holding the Pomodoro timer section, the to-do list section, and the quick-links section
  - Add placeholder `<section>` elements with `id` attributes for each widget: `#greeting`, `#timer`, `#todo`, `#links`
  - Link `css/style.css` and `js/app.js` (defer)
  - Create `css/style.css` with an empty file and `js/app.js` with a `DOMContentLoaded` listener stub
  - _Requirements: 12.3, 12.4_

- [ ] 2. Implement Storage utility and global error banner
  - [x] 2.1 Implement the `Storage` utility object in `app.js`
    - Write `Storage.isAvailable()` using a try/catch write-and-delete test
    - Write `Storage.get(key)` — `JSON.parse` wrapped in try/catch; returns `null` on failure and logs `console.warn`
    - Write `Storage.set(key, value)` — `JSON.stringify` + `localStorage.setItem` in try/catch; shows a non-blocking toast on failure
    - Write `Storage.remove(key)`
    - _Requirements: 11.1, 11.3, 11.4_
  - [ ]* 2.2 Write property test for Storage round-trip
    - **Property 3 (partial): User name round-trip** — for a set of representative string values, call `Storage.set` then `Storage.get` and assert the returned value deeply equals the original
    - **Validates: Requirements 11.1, 11.2**
  - [-] 2.3 Implement the `localStorage` unavailability banner
    - On `DOMContentLoaded`, call `Storage.isAvailable()`; if `false`, inject a non-blocking `<div role="alert">` banner at the top of `<body>`: *"Storage is unavailable. Your changes will not be saved."*
    - _Requirements: 11.3_

- [ ] 3. Implement ThemeManager
  - [-] 3.1 Implement `ThemeManager` in `app.js`
    - Write `ThemeManager.getCurrent()` — returns `"light"` or `"dark"`
    - Write `ThemeManager.init()` — reads `pd_theme` from `Storage`; falls back to `"light"` if `null`; sets `document.documentElement.dataset.theme`
    - Write `ThemeManager.toggle()` — flips current theme, saves to `Storage`, re-applies `dataset.theme`
    - Wire the theme toggle `<button>` in HTML (add it to `index.html` in the header); bind `ThemeManager.toggle()` to its click event inside `ThemeManager.init()`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  - [-] 3.2 Add CSS custom properties and theme switching to `style.css`
    - Define `:root` custom properties for light theme colors (background, surface, text, accent)
    - Add `[data-theme="dark"]` override block with dark palette values
    - _Requirements: 10.2, 10.4_
  - [ ]* 3.3 Write property test for theme toggle round-trip
    - **Property 12: Theme toggle round-trip** — call `ThemeManager.toggle()` twice from both starting states; assert `ThemeManager.getCurrent()` equals the initial theme and `Storage.get("pd_theme")` matches
    - **Validates: Requirements 10.1, 10.2, 10.3**

- [ ] 4. Implement GreetingWidget
  - [x] 4.1 Add greeting HTML structure to `index.html`
    - Inside `#greeting`: add `<time id="clock">`, `<p id="date-display">`, `<h1 id="greeting-text">`, `<input id="username-input" maxlength="50">`, `<button id="username-save">Save</button>`, and an `<span id="username-error">` for validation messages
    - _Requirements: 1.1, 1.2, 2.1–2.5, 3.1_
  - [-] 4.2 Implement `GreetingWidget.getGreeting(hour)` pure function
    - Returns `"Good Morning"` for 5 ≤ h < 12, `"Good Afternoon"` for 12 ≤ h < 17, `"Good Evening"` for 17 ≤ h < 21, `"Good Night"` otherwise
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [ ]* 4.3 Write property test for greeting exhaustiveness
    - **Property 1: Greeting is exhaustive and correct for all hours** — iterate hours 0–23; assert each returns exactly one of the four strings per the specified ranges with no gaps or overlaps
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
  - [-] 4.4 Implement `GreetingWidget.tick()`, `GreetingWidget.renderUserName()`, and `GreetingWidget.setUserName(name)`
    - `tick()` — calls `new Date()`, formats `HH:MM:SS` for `#clock`, formats full date string for `#date-display`, calls `getGreeting` with current hour and updates `#greeting-text` (appending trimmed User_Name if present)
    - `setUserName(name)` — trims input; if blank/whitespace, calls `Storage.remove("pd_username")` and clears display name; otherwise validates ≤50 chars, calls `Storage.set("pd_username", trimmed)`, and calls `renderUserName()`; shows inline error in `#username-error` on failure
    - `renderUserName()` — reads `Storage.get("pd_username")`; updates greeting suffix
    - _Requirements: 1.1, 1.2, 1.3, 2.5, 3.1–3.5_
  - [~] 4.5 Implement `GreetingWidget.init()`
    - Loads saved user name via `Storage.get("pd_username")`, pre-fills `#username-input`, calls `renderUserName()`
    - Binds `#username-save` click to `setUserName(input.value)`; binds `input` event to clear `#username-error`
    - Starts `setInterval(GreetingWidget.tick, 1000)` and calls `tick()` immediately
    - _Requirements: 1.3, 3.2, 3.3_
  - [ ]* 4.6 Write property test for user name whitespace rejection
    - **Property 2: User name whitespace rejection** — for a variety of whitespace-only strings (space, tab, mixed), call `setUserName`; assert `Storage.get("pd_username")` does not store them
    - **Validates: Requirements 3.5**
  - [ ]* 4.7 Write property test for user name round-trip
    - **Property 3: User name round-trip** — for valid strings up to 50 chars, call `setUserName`, then assert `Storage.get("pd_username")` equals the trimmed value
    - **Validates: Requirements 3.2, 3.3**

- [~] 5. Checkpoint — Greeting and theme working end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement TimerWidget
  - [x] 6.1 Add timer HTML structure to `index.html`
    - Inside `#timer`: `<div id="timer-display">25:00</div>`, `<button id="timer-start">Start</button>`, `<button id="timer-stop">Stop</button>`, `<button id="timer-reset">Reset</button>`, `<input id="timer-duration-input" type="number" min="1" max="60">`, `<button id="timer-duration-save">Set</button>`, `<span id="timer-error">`, `<div id="timer-notification" aria-live="polite">`
    - _Requirements: 4.1–4.10_
  - [-] 6.2 Implement `TimerWidget.formatTime(secs)` pure function
    - Converts integer seconds to `"MM:SS"` with zero-padding; handles 0–3599
    - _Requirements: 4.2, 4.3_
  - [ ]* 6.3 Write property test for timer format correctness
    - **Property 4: Timer format correctness** — for all integers 0–3599, assert result matches `/^\d{2}:\d{2}$/`, MM is 0–59, SS is 0–59
    - **Validates: Requirements 4.2, 4.3**
  - [-] 6.4 Implement `TimerWidget` state and controls
    - Module-scoped: `intervalId`, `remainingSeconds`, `totalSeconds`
    - `start()` — if not already running, starts `setInterval(TimerWidget.countdown, 1000)`; disables Start, enables Stop
    - `stop()` — `clearInterval(intervalId)`; enables Start, disables Stop
    - `reset()` — calls `stop()`, resets `remainingSeconds = totalSeconds`, updates `#timer-display`
    - `countdown()` — decrements `remainingSeconds`; updates display; calls `onComplete()` at 0
    - `onComplete()` — clears interval; shows `#timer-notification` ("Session complete!"); plays audio alert via `AudioContext` (feature-detected; silent fallback)
    - `setDuration(mins)` — validates 1–60; saves `pd_pomodoro_duration`; updates `totalSeconds`; does NOT reset active countdown
    - `init()` — reads `pd_pomodoro_duration` (default 25), sets `remainingSeconds = totalSeconds`; renders idle state; binds all button clicks; binds duration save button; clears error on duration input `input` event
    - _Requirements: 4.1–4.10_

- [ ] 7. Implement TodoWidget
  - [x] 7.1 Add to-do HTML structure to `index.html`
    - Inside `#todo`: `<input id="todo-input">`, `<button id="todo-add">Add</button>`, `<span id="todo-error">`, `<select id="todo-sort">` with options (default, az, za, completed-last), `<ul id="todo-list">`
    - _Requirements: 5.1, 6.1, 7.1, 7.4, 8.1_
  - [-] 7.2 Implement `TodoWidget.isDuplicate(text)` pure function
    - Compares `text.trim().toLowerCase()` against every task's same normalized form; returns boolean
    - _Requirements: 5.5_
  - [ ]* 7.3 Write property test for duplicate task prevention
    - **Property 5: Duplicate task prevention** — given a task list with known entries, assert `isDuplicate` returns `true` for case/whitespace variants of existing tasks and `false` for genuinely new text
    - **Validates: Requirements 5.5**
  - [-] 7.4 Implement `TodoWidget.addTask(text)`, `editTask(index, newText)`, `toggleComplete(index)`, `deleteTask(index)`, and `saveTasks()`
    - `addTask` — trims; rejects empty (error in `#todo-error`); rejects duplicate (error in `#todo-error`); creates task object (`id`, `text`, `completed: false`, `createdAt`); pushes to internal array; calls `saveTasks()` and `render()`
    - `editTask` — trims; rejects empty (show inline error per task row); updates array entry; calls `saveTasks()` and `render()`
    - `toggleComplete` — flips `.completed`; calls `saveTasks()` and `render()`
    - `deleteTask` — splices array; calls `saveTasks()` and `render()`
    - `saveTasks()` — calls `Storage.set("pd_tasks", tasksArray)`
    - _Requirements: 5.2, 5.4, 5.5, 6.3, 6.4, 6.5, 7.2, 7.3, 7.5_
  - [ ]* 7.5 Write property test for empty/whitespace task rejection
    - **Property 6: Empty/whitespace task rejection** — for empty string and whitespace-only strings, assert `addTask` does not change the array length
    - **Validates: Requirements 5.4**
  - [ ]* 7.6 Write property test for task addition round-trip
    - **Property 7: Task addition round-trip** — call `addTask` with valid text, then assert `Storage.get("pd_tasks")` contains an entry with the trimmed text and `completed: false`
    - **Validates: Requirements 5.2, 11.1**
  - [~] 7.7 Implement `TodoWidget.getSortedTasks()` and `setSort(option)`
    - `getSortedTasks()` — returns a shallow copy of `tasksArray` sorted by current sort option (default: `createdAt` asc; az/za: case-insensitive text; completed-last: incomplete first, then completed, each sub-group by `createdAt`)
    - `setSort(option)` — saves `pd_tasks_sort` to Storage; calls `render()`
    - _Requirements: 8.1, 8.2, 8.3_
  - [ ]* 7.8 Write property test for sort immutability
    - **Property 9: Sort does not mutate persisted order** — after calling `getSortedTasks()` with any non-default sort, assert `Storage.get("pd_tasks")` array order matches the original insertion order
    - **Validates: Requirements 8.2**
  - [ ]* 7.9 Write property test for toggle idempotency
    - **Property 8: Task toggle idempotent complement** — for any task, call `toggleComplete` twice; assert `completed` state equals original and list length is unchanged
    - **Validates: Requirements 7.2, 7.3**
  - [~] 7.10 Implement `TodoWidget.render()` and `TodoWidget.init()`
    - `render()` — clears `#todo-list`; calls `getSortedTasks()`; for each task creates an `<li>` containing: checkbox (pre-checked if completed), task text span (strikethrough class when completed), Edit button, Delete button; binds all per-row event handlers; in edit mode replaces text span with `<input>` pre-filled with task text and Confirm/Cancel buttons
    - `init()` — reads `pd_tasks` (default `[]`) and `pd_tasks_sort` (default `"default"`); renders list; binds `#todo-add` click to `addTask(input.value)` and Enter keypress; binds `#todo-sort` change to `setSort`; binds `#todo-input` input event to clear `#todo-error`
    - _Requirements: 5.1, 5.3, 6.1, 6.2, 6.3, 6.4, 7.1, 7.4, 8.1, 8.3_

- [~] 8. Checkpoint — Timer and To-Do list working end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Implement LinkWidget
  - [x] 9.1 Add quick-links HTML structure to `index.html`
    - Inside `#links`: `<input id="link-label-input" maxlength="30">`, `<input id="link-url-input">`, `<button id="link-add">Add Link</button>`, `<span id="link-error">`, `<div id="link-panel">`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_
  - [-] 9.2 Implement `LinkWidget.validateUrl(url)` pure function
    - Returns `true` if `url` starts with `"http://"` or `"https://"` (case-sensitive); `false` otherwise
    - _Requirements: 9.2, 9.3_
  - [ ]* 9.3 Write property test for URL validation
    - **Property 10: URL validation** — for a set of valid and invalid URL strings, assert `validateUrl` returns `true` only for `http://` or `https://` prefixed strings; assert it returns `false` for empty string, `ftp://`, `//`, relative paths, etc.
    - **Validates: Requirements 9.2, 9.3**
  - [-] 9.4 Implement `LinkWidget.addLink(label, url)`, `deleteLink(index)`, `saveLinks()`, and `render()`
    - `addLink` — trims label; validates label non-empty and ≤30 chars; validates URL with `validateUrl`; checks 20-link cap; creates link object; pushes; calls `saveLinks()` and `render()`; shows descriptive error in `#link-error` on any failure
    - `deleteLink` — splices; calls `saveLinks()` and `render()`
    - `saveLinks()` — calls `Storage.set("pd_links", linksArray)`
    - `render()` — clears `#link-panel`; for each link creates a `<button>` (opens URL in new tab via `window.open(url, "_blank", "noopener")`) and a Delete button beside it
    - _Requirements: 9.1–9.7_
  - [ ]* 9.5 Write property test for link addition round-trip
    - **Property 11: Link addition round-trip** — for valid label/url pairs with total links < 20, call `addLink` and assert `Storage.get("pd_links")` contains an entry with matching `label` and `url`
    - **Validates: Requirements 9.2, 11.1**
  - [~] 9.6 Implement `LinkWidget.init()`
    - Reads `pd_links` (default `[]`); calls `render()`; binds `#link-add` click to `addLink(labelInput.value, urlInput.value)`; binds `input` events on both fields to clear `#link-error`
    - _Requirements: 9.7_

- [ ] 10. Wire initialization sequence and finalize `app.js`
  - [~] 10.1 Wire the full initialization order inside `DOMContentLoaded`
    - Call in order: `Storage.isAvailable()` check + banner, `ThemeManager.init()`, `GreetingWidget.init()`, `TimerWidget.init()`, `TodoWidget.init()`, `LinkWidget.init()`
    - Ensure `ThemeManager.init()` is called before any widget renders (prevents theme flash)
    - _Requirements: 10.4, 11.2, 12.1_
  - [~] 10.2 Add accessibility attributes throughout `index.html`
    - All `<button>` elements have descriptive `aria-label` or visible label text
    - All `<input>` elements are associated with `<label>` elements via `for`/`id` pairing
    - `#timer-notification` and `#timer-display` use `aria-live="polite"`
    - Theme toggle button updates `aria-pressed` on each toggle
    - _Requirements: 12.1_

- [ ] 11. Style all widgets in `style.css`
  - [~] 11.1 Implement responsive grid layout
    - CSS Grid on `<main>`: `grid-template-columns: 1fr 1fr` at ≥768 px; single column via `@media (max-width: 767px)`
    - Greeting widget spans full width; links panel spans full width; timer and todo side-by-side at ≥768 px
    - _Requirements: 12.5, 12.6_
  - [~] 11.2 Style each widget and interactive states
    - Style the clock, date, greeting text, user-name input/button
    - Style timer display (large monospace font), start/stop/reset/set buttons, duration input, notification
    - Style todo list items (strikethrough for completed), inline edit fields, sort select, add input/button
    - Style link panel buttons (truncate long labels), delete controls
    - Style validation error spans (small, red/warning color)
    - Style non-blocking storage toast/banner
    - Ensure all interactive elements have `:focus-visible` outlines for keyboard navigation
    - _Requirements: 7.2, 4.6, 12.1_
  - [~] 11.3 Verify color contrast for both themes
    - Check foreground/background pairs in both light and dark themes meet WCAG 2.1 AA (4.5:1 normal text, 3:1 large/UI)
    - Adjust palette variables in `:root` / `[data-theme="dark"]` as needed
    - _Requirements: 12.1_

- [~] 12. Final checkpoint — full integration pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP delivery
- Because no test framework is set up, property test sub-tasks describe the logic to verify manually in browser DevTools or via a temporary inline test harness; they can be added to a future test suite
- All widget namespaces are plain objects in a single `app.js` — no ES module syntax, no import/export
- `crypto.randomUUID()` is used for task/link IDs where available; falls back to `Date.now().toString()`
- The 20-link cap is enforced in `LinkWidget.addLink`; no UI affordance needed beyond the error message
- Inline validation errors are cleared on the next `input` event on the relevant field

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "4.1", "6.1", "7.1", "9.1"] },
    { "id": 1, "tasks": ["2.3", "3.1", "4.2", "6.2", "7.2", "9.2"] },
    { "id": 2, "tasks": ["2.2", "3.2", "4.3", "4.4", "6.3", "6.4", "7.3", "7.4", "9.3", "9.4"] },
    { "id": 3, "tasks": ["3.3", "4.5", "4.6", "4.7", "7.5", "7.6", "7.7", "9.5", "9.6"] },
    { "id": 4, "tasks": ["7.8", "7.9", "7.10", "10.1", "10.2"] },
    { "id": 5, "tasks": ["11.1", "11.2"] },
    { "id": 6, "tasks": ["11.3"] }
  ]
}
```
