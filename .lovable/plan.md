# Calendar View & Appointment Management

Build the internal calendar + appointment management UI on top of the existing `calendar_events`, `calendar_participants`, `calendar_event_audit`, and `calendar_meeting_types` tables. Add image upload for profile photo + company logo.

## 1. Database / storage (additive only)

Migration:
- Create public storage bucket **`calendar-branding`** with RLS:
  - Public SELECT
  - Authenticated INSERT/UPDATE/DELETE limited to objects under `{auth.uid()}/...`
- Add nullable columns to `calendar_events`:
  - `appointment_type text` (Consultation / Student Visa / Visitor Visa / Spouse Visa / Follow-Up / Coaching / Internal / Custom — free text, validated client-side)
  - `cancellation_reason text`
  - `internal_notes text` (host-only; already gated by RLS on the row)
- Add `no_show` value to `calendar_event_status` enum and extend `fn_calendar_events_status_guard` transitions: `scheduled → no_show`, terminal.
- New table `calendar_internal_notes` (id, event_id FK, author_id, body, created_at) with owner/admin RLS — used for the multi-note thread on the details page. (Single `internal_notes` column kept as fallback summary.)
- Extend `fn_calendar_events_validate` triggers already cover working hours, overlaps, unavailable dates, breaks — reused as-is for create/reschedule/drag-drop.

No changes to existing triggers' logic beyond the enum addition + new optional columns.

## 2. Data hooks (`src/calendar/hooks/`)

Extend `useCalendarData.ts` (or add `useAppointments.ts`):
- `useAppointmentsRange(from, to, filters)` — fetch events + joined participants in a date range; admin sees all, user sees own.
- `useAppointment(id)` — single event with participants, audit trail, internal notes.
- Mutations: `createAppointment`, `updateAppointment`, `rescheduleAppointment`, `cancelAppointment(reason)`, `markCompleted`, `markNoShow`, `addInternalNote`, `uploadBrandingImage(file, kind)`.
- All mutations rely on existing triggers for conflict/availability validation; surface trigger errors as toasts.

## 3. Pages & routes

- `/calendar` → upgraded **CalendarDashboard** (replaces current minimal version):
  - 5 stat cards: Today / Upcoming / Pending / Completed / Cancelled
  - View switcher: Day | Week | Month | Agenda (defaults to Agenda on viewport < 768px)
  - Toolbar: prev/next/today, date jump, search box, filter popover (status, type, date range, assigned user [admin only]), "+ New Appointment" button
- `/calendar/appointments/:id` → **AppointmentDetailPage**
- `/calendar/settings` → existing (unchanged except profile photo + company logo upload).

Register routes in `src/App.tsx` under `ProtectedRoute`.

## 4. Calendar views (`src/calendar/components/views/`)

- `DayView.tsx` — 24-hour vertical grid, 30-min rows, event blocks positioned by start/duration, click → details, drag → reschedule, resize handle → duration change.
- `WeekView.tsx` — 7 columns Mon–Sun, same grid mechanics.
- `MonthView.tsx` — month grid with per-day count badge + first 2 events; click day → Day view.
- `AgendaView.tsx` — chronological list grouped by day, mobile-first card layout.

Drag-and-drop via lightweight pointer events (no extra dep): on drop, call `rescheduleAppointment`; trigger validates and rolls back via toast on conflict.

Shared `AppointmentCard` component shows subject, client name, time, duration, status pill.

## 5. Create / Edit appointment dialog

`ManualAppointmentDialog.tsx` (react-hook-form + zod):
- Subject, appointment_type (select with the 8 categories + Custom freeform), meeting_type_id (drives duration), date, start_time
- Participant: full_name, email, mobile, optional company, notes
- Submit → insert `calendar_events` + `calendar_participants`; triggers validate availability/conflicts.
- Edit mode reuses the same form (PATCH event + first participant).

`RescheduleDialog.tsx` — date + time pickers showing available slots from `calendar_available_slots` RPC for the selected meeting type.

`CancelDialog.tsx` — required reason textarea → status='cancelled' + cancellation_reason.

## 6. Appointment Details Page

Tabs / sections:
- **Header**: reference, status pill, action buttons (Edit, Reschedule, Cancel, Mark Completed, Mark No Show — disabled per status state machine)
- **Client Information** card (from participants)
- **Appointment Information** card
- **Internal Notes** thread (add note, list with author + timestamp; host-only)
- **Activity Timeline** from `calendar_event_audit` + derived events (created/updated)
- **Reminders** panel from `calendar_notifications` (Scheduled / Sent / Failed)

## 7. Search & filters

Implemented client-side over the fetched range:
- Search: client name, email, mobile, subject (case-insensitive)
- Filters: status multi-select, appointment_type, date range, assigned user (admin only — adds `user_id` predicate to query)

## 8. Profile photo + company logo upload

In `ProfileSettingsCard.tsx`:
- Two `<ImageUploader>` controls (new shared component `src/calendar/components/ImageUploader.tsx`) for `profile_photo` and `company_logo`.
- Upload to `calendar-branding/{user_id}/profile-{ts}.{ext}` and `…/logo-{ts}.{ext}`, store public URL in `calendar_profiles.profile_photo` / `company_logo`.
- Validate: max 2 MB, image/* only, square crop preview, replace removes previous file.
- Public booking page (future phase) will render both; for now also surface them in `BookingLinkCard` preview so the host sees how it appears.

## 9. Permissions

- Standard user: queries filtered by `user_id = auth.uid()` via existing RLS.
- Admin (`has_role(auth.uid(),'admin')`): existing RLS already allows all rows; UI exposes "Assigned user" filter + ability to open any event.
- No reassignment of `user_id` in this phase (would require trigger relaxation) — call out as out-of-scope.

## 10. Responsiveness

- View switcher auto-selects Agenda on `<768px`.
- Day/Week grids horizontally scrollable on tablet.
- Detail page stacks single-column on mobile.

## Out of scope

- Public booking page UI
- Email / WhatsApp reminders dispatch
- CRM lead linkage automation
- Cross-user reassignment
- Recurring appointments

## Acceptance

1. `/calendar` shows 5 stat cards and 4 working views with real data.
2. Creating, editing, rescheduling, cancelling, completing, marking no-show all work and are blocked by triggers on conflicts.
3. Drag/resize updates persist or roll back with a clear toast.
4. Search + filters narrow the visible events instantly.
5. Detail page shows audit trail + internal notes thread + reminder status.
6. Profile photo and company logo upload + persist + render in the settings preview.
7. Mobile viewport defaults to Agenda view; all pages usable at 375px width.

## Technical notes

- New deps: none required (drag-drop hand-rolled; date math via existing `date-fns`).
- All new files under `src/calendar/`; no changes to other modules.
- Storage bucket is the only structural change beyond additive columns + one new table.
