## Goal
Make `/book/:slug` a fully functional public booking page using the existing `calendar-public-booking` edge function and add a Share action to the booking link card.

## Current state
- Edge function `calendar-public-booking` already exposes `resolve_profile`, `available_slots`, and `create_booking` actions via RPCs `calendar_resolve_profile`, `calendar_available_slots`, `calendar_create_booking`.
- `PublicBookingPage.tsx` reads profile/meeting types directly but only renders a placeholder ("Booking form coming soon"). No date picker, no slots, no submit.
- `BookingLinkCard` has Copy / Open / Regenerate but no Share.

## Changes

### 1. Rewrite `src/calendar/pages/PublicBookingPage.tsx`
Two-step flow on a single page:

- **Step 1 — Meeting selection** (when no `meetingSlug` in URL): keep existing card list.
- **Step 2 — Slot picker + form** (when `meetingSlug` present):
  - Header card: company logo + name, profile photo, full name, designation, bio (already partially built — keep and polish).
  - Left column: date picker using shadcn `Calendar` (`react-day-picker`). Restrict to today → today + meeting type's `booking_window_days` (default 30). Disable `calendar_unavailable_dates` entries (fetch once via edge function or a new lightweight RPC; for v1 we just disable past dates and rely on empty-slot response).
  - Right column: when a date is selected, call edge function `available_slots`. Render slot buttons; show "No availability" if empty.
  - When a slot is clicked, reveal an inline visitor form: full_name, email, mobile, optional company/designation, optional purpose/notes. Submit calls `create_booking` with the browser's IANA timezone. On success, show confirmation card with appointment date/time and "Add another booking" link.
- Use `supabase.functions.invoke('calendar-public-booking', { body: { action: ... } })` for all calls (anon, no auth required).
- Keep the legacy slug redirect logic that already exists.

### 2. `src/calendar/components/BookingLinkCard.tsx`
- Add a **Share** button. Use `navigator.share({ title, url })` when available; otherwise fall back to copying the URL and toasting "Link copied — share it anywhere".
- Layout: Copy · Share · Open · Regenerate.

### 3. No DB or edge function changes
The edge function and RPCs already cover everything needed.

## Out of scope
- Reminder emails / WhatsApp (separate phase).
- Approval flow on public page (already gated by `requires_approval` server-side; UI just shows "Pending approval" in confirmation when applicable — already returned by `calendar_create_booking`).
- Visitor self-cancel via token (already a separate route).
