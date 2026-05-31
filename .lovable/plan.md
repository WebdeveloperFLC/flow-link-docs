# Finish Calendar Management Integration

Wire up the already-built Calendar Management scaffolding into the app shell so users can navigate to it.

## Changes

1. **`src/App.tsx`** — Register two authenticated routes:
   - `/calendar` → `CalendarDashboard`
   - `/calendar/settings` → `CalendarSettings`
   
   Both wrapped in the existing auth/layout wrapper used by other authenticated routes.

2. **`src/components/AppLayout.tsx`** (or wherever the sidebar nav is defined) — Add a "Calendar" entry with a calendar icon (lucide `Calendar`) pointing to `/calendar`. Place it in a sensible spot in the existing nav order.

3. **`src/calendar/pages/CalendarDashboard.tsx`** — Add a small `AvailabilityPreview` section (optional widget) showing today's working hours pulled from `useAvailability`, so the dashboard feels complete. If time-bounded, skip and leave as-is.

## Out of scope
- No DB changes
- No new components beyond the optional preview
- No public booking page
- No changes to existing routes or sidebar entries

## Acceptance
- Signed-in user sees "Calendar" in the sidebar
- Clicking it loads the dashboard with stat cards, booking link, and upcoming meetings table
- Settings page is reachable from the dashboard's Quick Actions and renders all tabs
