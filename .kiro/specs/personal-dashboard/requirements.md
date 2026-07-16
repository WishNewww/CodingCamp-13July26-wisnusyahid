# Requirements Document

## Introduction

A Personal Dashboard is a client-side web application that serves as a browser new-tab replacement or standalone page. It provides a focused productivity workspace combining a real-time clock and greeting, a Pomodoro focus timer, a persistent to-do list, and a quick-links panel. All data is stored in the browser's Local Storage — no backend or network connection is required. The application is built with plain HTML, CSS, and vanilla JavaScript, and is deployable as a static site via GitHub Pages.

---

## Glossary

- **Dashboard**: The single-page web application described in this document.
- **Timer**: The Pomodoro focus timer widget within the Dashboard.
- **Task**: A single to-do item managed in the To-Do List widget.
- **Task_List**: The collection of Tasks displayed and managed by the Dashboard.
- **Link**: A user-defined shortcut consisting of a label and a URL, stored in the Quick Links widget.
- **Link_Panel**: The widget that displays and manages Links.
- **Local_Storage**: The browser's `localStorage` API used for all client-side persistence.
- **Greeting_Widget**: The widget that displays the current time, date, and a time-of-day greeting.
- **Theme**: The visual color scheme of the Dashboard, either light or dark.
- **User_Name**: An optional custom name entered by the user, displayed in the greeting.
- **Pomodoro_Duration**: The configurable length of a single focus session in minutes.
- **Duplicate_Task**: A Task whose text, after trimming whitespace, is identical (case-insensitive) to an existing Task in the Task_List.

---

## Requirements

---

### Requirement 1: Real-Time Clock and Date Display

**User Story:** As a user, I want to see the current time and date on my dashboard, so that I always know the time without switching apps.

#### Acceptance Criteria

1. THE Greeting_Widget SHALL display the current time in HH:MM:SS format, updated every second.
2. THE Greeting_Widget SHALL display the current date in a human-readable format including the full weekday name, month name, day, and four-digit year (e.g., "Wednesday, July 16, 2025").
3. WHEN the displayed second changes, THE Greeting_Widget SHALL update the time display without requiring a page reload.

---

### Requirement 2: Time-of-Day Greeting

**User Story:** As a user, I want to see a greeting that changes based on the time of day, so that the dashboard feels personalized and context-aware.

#### Acceptance Criteria

1. WHEN the local time is between 05:00 (inclusive) and 12:00 (exclusive), THE Greeting_Widget SHALL display the greeting "Good Morning".
2. WHEN the local time is between 12:00 (inclusive) and 17:00 (exclusive), THE Greeting_Widget SHALL display the greeting "Good Afternoon".
3. WHEN the local time is between 17:00 (inclusive) and 21:00 (exclusive), THE Greeting_Widget SHALL display the greeting "Good Evening".
4. WHEN the local time is between 21:00 (inclusive) and 05:00 (exclusive, next day), THE Greeting_Widget SHALL display the greeting "Good Night".
5. WHERE the User_Name feature is enabled and a User_Name has been saved, THE Greeting_Widget SHALL append the User_Name to the greeting (e.g., "Good Morning, Alex").

---

### Requirement 3: Custom User Name in Greeting

**User Story:** As a user, I want to set my name so that the greeting addresses me personally.

#### Acceptance Criteria

1. THE Dashboard SHALL provide an input field that allows the user to enter a User_Name of up to 50 characters.
2. WHEN the user submits a User_Name, THE Dashboard SHALL save the User_Name to Local_Storage.
3. WHEN the Dashboard loads, THE Greeting_Widget SHALL retrieve and display the saved User_Name from Local_Storage.
4. WHEN the user clears the User_Name field and saves, THE Dashboard SHALL remove the User_Name from Local_Storage and display the greeting without a name.
5. IF the user submits a User_Name consisting entirely of whitespace, THEN THE Dashboard SHALL treat the input as empty and SHALL NOT save it to Local_Storage.

---

### Requirement 4: Pomodoro Focus Timer

**User Story:** As a user, I want a Pomodoro timer so that I can work in focused intervals and manage my time effectively.

#### Acceptance Criteria

1. THE Timer SHALL initialize with a default Pomodoro_Duration of 25 minutes.
2. WHEN the user activates the Start control, THE Timer SHALL begin counting down from the current Pomodoro_Duration in MM:SS format, decrementing once per second.
3. WHILE the Timer is counting down, THE Timer SHALL display the remaining time in MM:SS format.
4. WHEN the user activates the Stop control, THE Timer SHALL pause the countdown and retain the remaining time.
5. WHEN the user activates the Reset control, THE Timer SHALL stop the countdown and restore the display to the full Pomodoro_Duration.
6. WHEN the countdown reaches 00:00, THE Timer SHALL stop automatically and notify the user that the session has ended (e.g., via an audible alert or visible notification).
7. WHERE the Change Pomodoro Time feature is enabled, THE Timer SHALL provide a numeric input that allows the user to set Pomodoro_Duration to a whole number of minutes between 1 and 60 (inclusive).
8. WHERE the Change Pomodoro Time feature is enabled and the user saves a new Pomodoro_Duration, THE Timer SHALL save the Pomodoro_Duration to Local_Storage and apply it on the next Reset.
9. WHEN the Dashboard loads, THE Timer SHALL retrieve the saved Pomodoro_Duration from Local_Storage and use it as the initial countdown value.
10. IF the user attempts to set a Pomodoro_Duration outside the range of 1 to 60 minutes, THEN THE Timer SHALL reject the input and display a validation message indicating the valid range.

---

### Requirement 5: To-Do List — Add and Display Tasks

**User Story:** As a user, I want to add tasks to a list so that I can track what I need to do.

#### Acceptance Criteria

1. THE Task_List SHALL provide a text input field for entering new Task text.
2. WHEN the user submits a new Task, THE Task_List SHALL add the Task to the list and save the updated Task_List to Local_Storage.
3. WHEN the Dashboard loads, THE Task_List SHALL retrieve all Tasks from Local_Storage and display them in the order they were last saved.
4. IF the user submits an empty or whitespace-only Task, THEN THE Task_List SHALL NOT add the Task and SHALL display a validation message.
5. WHERE the Prevent Duplicate Tasks feature is enabled and the user submits a Task whose text matches an existing Task (case-insensitive, after trimming whitespace), THEN THE Task_List SHALL NOT add the Duplicate_Task and SHALL display a message indicating the Task already exists.

---

### Requirement 6: To-Do List — Edit Tasks

**User Story:** As a user, I want to edit existing tasks so that I can correct or update them without deleting and re-adding.

#### Acceptance Criteria

1. THE Task_List SHALL provide an edit control for each Task.
2. WHEN the user activates the edit control for a Task, THE Task_List SHALL replace the Task display with an editable text field pre-filled with the Task's current text.
3. WHEN the user confirms the edit, THE Task_List SHALL update the Task text, save the updated Task_List to Local_Storage, and restore the normal Task display.
4. WHEN the user cancels the edit, THE Task_List SHALL discard the changes and restore the original Task text without modifying Local_Storage.
5. IF the user confirms an edit with empty or whitespace-only text, THEN THE Task_List SHALL NOT save the change and SHALL display a validation message.

---

### Requirement 7: To-Do List — Complete and Delete Tasks

**User Story:** As a user, I want to mark tasks as done and delete them so that I can track progress and keep my list clean.

#### Acceptance Criteria

1. THE Task_List SHALL provide a completion toggle control (e.g., a checkbox) for each Task.
2. WHEN the user activates the completion toggle for a Task, THE Task_List SHALL mark the Task as complete, apply a visual completion style (e.g., strikethrough), and save the updated state to Local_Storage.
3. WHEN the user activates the completion toggle for an already-complete Task, THE Task_List SHALL mark the Task as incomplete, remove the visual completion style, and save the updated state to Local_Storage.
4. THE Task_List SHALL provide a delete control for each Task.
5. WHEN the user activates the delete control for a Task, THE Task_List SHALL remove the Task from the list and save the updated Task_List to Local_Storage.

---

### Requirement 8: To-Do List — Sort Tasks

**User Story:** As a user, I want to sort my tasks so that I can organize them by priority or completion status.

#### Acceptance Criteria

1. WHERE the Sort Tasks feature is enabled, THE Task_List SHALL provide a sort control with at least the following options: "Default" (original insertion order), "A–Z" (alphabetical ascending), "Z–A" (alphabetical descending), and "Completed Last".
2. WHEN the user selects a sort option, THE Task_List SHALL reorder the displayed Tasks according to the selected option without modifying the persisted order in Local_Storage.
3. WHEN the Dashboard loads, THE Task_List SHALL display Tasks in the "Default" insertion order unless a sort option was previously selected and saved.

---

### Requirement 9: Quick Links Panel

**User Story:** As a user, I want to save and access my favorite websites quickly so that I can navigate to them in one click.

#### Acceptance Criteria

1. THE Link_Panel SHALL provide input fields for a Link label (up to 30 characters) and a Link URL.
2. WHEN the user submits a new Link, THE Link_Panel SHALL validate that the URL begins with `http://` or `https://`, add the Link to the panel, and save the updated Link collection to Local_Storage.
3. IF the user submits a Link with an empty label or a URL that does not begin with `http://` or `https://`, THEN THE Link_Panel SHALL NOT add the Link and SHALL display a descriptive validation message.
4. WHEN the user activates a Link button, THE Link_Panel SHALL open the corresponding URL in a new browser tab.
5. THE Link_Panel SHALL provide a delete control for each Link.
6. WHEN the user activates the delete control for a Link, THE Link_Panel SHALL remove the Link from the panel and save the updated Link collection to Local_Storage.
7. WHEN the Dashboard loads, THE Link_Panel SHALL retrieve all Links from Local_Storage and display them.

---

### Requirement 10: Light / Dark Mode

**User Story:** As a user, I want to switch between light and dark themes so that I can use the dashboard comfortably in different lighting conditions.

#### Acceptance Criteria

1. WHERE the Light/Dark Mode feature is enabled, THE Dashboard SHALL provide a toggle control that switches the Theme between light and dark.
2. WHEN the user activates the theme toggle, THE Dashboard SHALL apply the selected Theme to all visible UI elements immediately without a page reload.
3. WHEN the user activates the theme toggle, THE Dashboard SHALL save the selected Theme to Local_Storage.
4. WHEN the Dashboard loads, THE Dashboard SHALL retrieve the saved Theme from Local_Storage and apply it before rendering content to prevent a flash of the default theme.
5. IF no Theme has been saved in Local_Storage, THEN THE Dashboard SHALL apply the light Theme as the default.

---

### Requirement 11: Data Persistence

**User Story:** As a user, I want my settings and data to be saved automatically so that I don't lose anything when I close or reload the browser tab.

#### Acceptance Criteria

1. THE Dashboard SHALL save all user data — Tasks, Links, User_Name, Theme, and Pomodoro_Duration — exclusively to Local_Storage with no network requests.
2. WHEN the Dashboard loads, THE Dashboard SHALL restore all persisted data from Local_Storage and render the UI in the previously saved state.
3. IF Local_Storage is unavailable or a read operation fails, THEN THE Dashboard SHALL display a non-blocking warning message and operate with default values for all widgets.
4. IF a Local_Storage write operation fails, THEN THE Dashboard SHALL display a non-blocking error message indicating that the data could not be saved.

---

### Requirement 12: Cross-Browser Compatibility and Layout

**User Story:** As a user, I want the dashboard to work correctly across modern browsers so that I can use it regardless of my preferred browser.

#### Acceptance Criteria

1. THE Dashboard SHALL render and function correctly in the current stable versions of Chrome, Firefox, Edge, and Safari.
2. THE Dashboard SHALL load and become interactive within 2 seconds on a modern desktop device under a standard broadband connection.
3. THE Dashboard SHALL use a single CSS file located at `css/` and a single JavaScript file located at `js/` within the project directory.
4. THE Dashboard SHALL use only standard HTML, CSS, and vanilla JavaScript APIs with no external frameworks or libraries.
5. WHILE the viewport width is 768 pixels or greater, THE Dashboard SHALL display all widgets in a multi-column layout.
6. WHILE the viewport width is below 768 pixels, THE Dashboard SHALL display all widgets in a single-column stacked layout.
