## Changes

### 1. Single Meeting Types location
Today meeting types appear twice: as a dedicated sidebar route (`/calendar/meeting-types`) and as a tab inside **Calendar → Availability & Settings**. Keep only the version inside Availability & Settings.

- `src/components/layout/AppLayout.tsx` — remove the `Meeting Types` entry from `calendarNav`.
- Leave `MeetingTypesPage` route/file in place (no broken links) but it's no longer reachable from navigation.
- `CalendarSettings.tsx` keeps its existing `meetings` tab (`MeetingTypesEditor`).

### 2. Profile overview after save
In **Availability & Settings → Profile**, replace the always-on edit form with a two-mode card:

- **View mode (default when a profile exists):** shows company logo (top), profile photo (square, larger), display name, designation, company, location, timezone, booking slug, and booking-page intro — read-only. A single **Edit** button switches to edit mode.
- **Edit mode:** the current form with **Save** and **Cancel**. After a successful save it returns to view mode.
- If no profile exists yet, open directly in edit mode.

File: `src/calendar/components/ProfileSettingsCard.tsx` — add `mode: "view" | "edit"` state, render an overview block when in view mode, keep all current form fields for edit mode, wire Save → setMode("view"), Cancel → reset form from `profile` and setMode("view").

### 3. Reorder Calendar sidebar
File: `src/components/layout/AppLayout.tsx` → `calendarNav`.

New order:
```text
Calendar
Availability & Settings
Approvals
Analytics
Reports
Activity
```

(Analytics + Reports stay adjacent as the "Reports & Analytics" pair; Activity moves to the bottom; Meeting Types removed per #1; Availability & Settings moves up to second position.)

## Out of scope
No DB/schema changes, no edge-function changes, no business-logic changes.
