
# Calendar Management & Availability Configuration

Frontend + integration on top of the Calendar Foundation already in the DB. No backend schema changes — uses the existing tables (`calendar_profiles`, `calendar_meeting_types`, `calendar_availability`, `calendar_unavailable_dates`, `calendar_events`) and RPCs (`calendar_generate_slug`, `calendar_event_transition`, etc.). One small additive migration adds optional preference columns that the UI needs but were not part of Phase 1.

## Additive migration (minimal)

Add nullable / defaulted columns only — no behavior change:

- `calendar_profiles`: `location text`, `auto_confirm boolean default false`, `require_approval boolean default true`, `allow_reschedule boolean default true`, `allow_cancellation boolean default true`.
- New table `calendar_breaks(id, user_id, day_of_week smallint, start_time time, end_time time, name text, is_active bool, repeat_weekly bool default true, timestamps)` with the same owner-only RLS pattern as `calendar_availability`. Extends `fn_calendar_events_validate` with an extra check that the slot does not overlap an active break (additive — pre-existing events still pass because column defaults are safe).

That's the only DB change. Everything else is UI + existing RPCs.

## File layout

```text
src/calendar/
  lib/
    calendarApi.ts          // typed wrappers around supabase queries + RPCs
    calendarTypes.ts        // shared TS types
    slug.ts                 // client-side slug preview helper
  hooks/
    useCalendarProfile.ts
    useMeetingTypes.ts
    useAvailability.ts
    useBreaks.ts
    useUnavailableDates.ts
    useCalendarEvents.ts    // upcoming + stats
  components/
    CalendarStatsCards.tsx
    QuickActions.tsx
    ProfileSettingsCard.tsx
    BookingPreferencesCard.tsx
    BookingLinkCard.tsx     // copy / open / regenerate slug
    WorkingHoursEditor.tsx  // 7-day grid, multiple blocks per day
    BreaksEditor.tsx
    MeetingTypesEditor.tsx  // duration + buffer per type
    UnavailableDatesEditor.tsx
    AvailabilityPreview.tsx // 7-day visual: avail / breaks / blocked / bookings
    UpcomingMeetingsTable.tsx
    ManualBookingDialog.tsx // host-created booking
  pages/
    CalendarDashboard.tsx   // route: /calendar
    CalendarSettings.tsx    // route: /calendar/settings (tabs: Profile · Availability · Meeting Types · Blocked Dates · Preferences)
```

Routes registered in `src/App.tsx` behind the existing auth wrapper. Sidebar entry added in `src/components/layout/AppLayout.tsx` (new `calendarNav` section, icon `CalendarDays`, label "Calendar"). Visible to any signed-in user.

## Dashboard (`/calendar`)

- 4 stat cards: Total Bookings (all-time), Upcoming Meetings (status in pending/scheduled, date≥today), Pending Requests (status='pending'), Cancelled Meetings (status='cancelled', last 30 days). One supabase query with `count: 'exact', head: true` per card via `useCalendarEvents`.
- Quick actions row: Edit Availability (→ settings tab), Create Manual Booking (opens `ManualBookingDialog`), Copy Booking Link (toast), View Schedule (scrolls to upcoming table).
- Booking link card with copy / open / regenerate.
- Upcoming meetings table (next 20) with inline Confirm / Decline / Cancel / Complete buttons calling `calendar_event_transition` RPC.

## Settings (`/calendar/settings`)

Tabs:

1. **Profile** — name, designation, department, photo (storage bucket `branding` reused), slug, timezone (full IANA list), location, description. Slug field shows live availability via `calendar_generate_slug` debounced.
2. **Availability** — `WorkingHoursEditor` (toggle each weekday on/off, add multiple start/end blocks; client + server validate start<end and non-overlap) + `BreaksEditor` (per-day blocks). Saves via `calendar_availability` / `calendar_breaks` upserts.
3. **Meeting Types** — list + add/edit. Duration select (15/30/45/60/90/120 min). Buffer before/after dropdowns (0/5/10/15/30). Color, active toggle. Note: existing `calendar_meeting_types` has only `buffer_minutes`; "before"/"after" stored as before+after sum in `buffer_minutes` (we'll keep a single buffer field in v1 to avoid a schema change — surfaced as "Buffer between meetings"). Confirms with user before locking that design.
4. **Blocked Dates** — `UnavailableDatesEditor` with date picker + reason. Partial-day blocking is deferred (current schema is full-day); UI marks the toggle as coming soon.
5. **Preferences** — Booking enabled (maps to `is_active`), auto-confirm, require approval, allow reschedule, allow cancellation (new columns).

## Availability Preview

Right-rail/below-form component that renders the upcoming 7 days, drawing:
- green bars for availability windows minus breaks,
- striped bars for breaks,
- red strikethrough for blocked dates,
- solid blue dots for existing non-cancelled events.
Pure client-side compose from the loaded data; no extra API calls.

## Validation

Client (Zod + react-hook-form) and server (existing triggers) both enforce: end>start, no overlapping blocks per day, slug pattern, unique slug (server), buffer applied at slot generation (already in `calendar_available_slots`). Manual booking flow re-uses `calendar_events` insert path so triggers enforce duration / availability / overlap.

## Permissions

All UI components query with the authenticated client; RLS already restricts each user to their own rows. Admin role gets read access only — admin write UI is out of scope here.

## Acceptance

1. Migration applies; new columns and `calendar_breaks` show up; no linter regressions.
2. A signed-in user can open `/calendar`, see four stat cards, copy their booking link, and confirm/decline a pending event.
3. `/calendar/settings` allows full CRUD on profile, working hours, breaks, meeting types, blocked dates, preferences with toast feedback and Zod validation.
4. Slot generator respects breaks (verified by booking a slot inside a break being rejected by the validate trigger after we extend it).
5. Desktop and mobile layouts: 4-card grid collapses to 1 column under `md`, tabs become a select on mobile.

## Out of scope

Public booking page (next phase), Google/Outlook sync, team calendars, partial-day blocking, separate before/after buffer columns, video integrations, reminders cron.
