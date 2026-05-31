# Booking flow fixes + profile page polish

## 1. Fix "Confirm booking" 400 error (root cause)

DB logs show the real failure inside `calendar_create_booking`:
```
ERROR: function gen_random_bytes(integer) does not exist
```
`gen_random_bytes` lives in the `extensions` schema, but the function runs with `search_path = public`.

**Migration**: `CREATE OR REPLACE FUNCTION public.calendar_create_booking(...)` (same body) with `SET search_path = public, extensions` so `gen_random_bytes(32)` resolves. No other behaviour change.

**Edge function**: in `supabase/functions/calendar-public-booking/index.ts`, stringify RPC errors properly so we never surface `[object Object]` again (use `e.message ?? JSON.stringify(e)`).

## 2. Timezone converter on the booking page

In `PublicBookingPage.tsx` `BookingFlow`:
- Add a `<Select>` above the slot grid: "Times shown in" with the visitor's browser TZ pre-selected, plus a searchable list of common IANA zones (use `Intl.supportedValuesOf('timeZone')` with fallback to a curated list).
- Keep slot fetching keyed off the host date as today (slots returned by `calendar_available_slots` are in the host's timezone, as `HH:mm` strings).
- For display only: convert each slot from host TZ (`profile.timezone`) to visitor TZ using `date-fns-tz` (`zonedTimeToUtc` then `formatInTimeZone`). Show the converted label on the button, keep the original host `HH:mm` as the value sent to `create_booking`.
- Show a small caption: "All times in <visitor TZ>. Host is in <host TZ>."
- Pass the selected visitor TZ as `visitor_timezone` in the booking call (already wired, just swap from `Intl…` to the select value).

If `date-fns-tz` isn't already installed, add it.

## 3. Profile page (public booking) layout

Rewrite `HeaderCard` in `PublicBookingPage.tsx`:

```
┌─────────────────────────────────────────┐
│         [ Company logo, centered ]      │
│         Company name (small)            │
│                                         │
│   [ Profile photo — square, 128×128 ]   │
│   Full name (h1)                        │
│   Designation (muted)                   │
│                                         │
│   Intro / bio paragraph                 │
└─────────────────────────────────────────┘
```

- Company logo on top, centered, `h-12 w-auto`, above everything.
- Profile photo: `h-32 w-32 rounded-md object-cover` (square, not tiny circle).
- Intro text = `profile.short_bio` (renamed in UI to "Booking page intro").
- Drop the inline logo+name row that's currently next to the photo.

## 4. Move "Booking page intro" to Profile settings, hide on Branding

- `CompanyBrandingPage.tsx`: remove the "Booking page intro" textarea + form field (company-level intro is gone).
- `ProfileSettingsCard.tsx`: relabel the existing `short_bio` textarea to **"Booking page intro"** with helper text "Shown on your public booking page." No DB change — reuse `calendar_profiles.short_bio`.

## 5. Hide branding section

- Remove the "Company branding" entry from the calendar sidebar/menu (wherever `/calendar/branding` is linked).
- Leave the route file in place so existing links don't 404, but it's no longer surfaced in nav.

## Technical notes

- Files touched:
  - `supabase/migrations/<new>.sql` — recreate `calendar_create_booking` with `search_path = public, extensions`.
  - `supabase/functions/calendar-public-booking/index.ts` — better error message stringification.
  - `src/calendar/pages/PublicBookingPage.tsx` — HeaderCard rewrite + TZ selector + slot conversion.
  - `src/calendar/components/ProfileSettingsCard.tsx` — relabel `short_bio` field.
  - `src/calendar/pages/CompanyBrandingPage.tsx` — remove intro field.
  - Sidebar/menu component that lists "Company branding" — hide the link.
- Dependency: add `date-fns-tz` if not present.
- No schema/data changes beyond the function replacement.

## Validation

1. `curl` the edge function with `action: create_booking` → expect `event_id` + `manage_token`.
2. In the preview, complete a booking end-to-end and see the confirmation card.
3. Change the TZ selector and confirm slot labels shift accordingly; booking still lands at the right host time in `calendar_events`.
4. Visit `/book/santosh-ramrakhiani` and confirm the new header layout (logo on top, square photo, intro paragraph).
5. Confirm "Company branding" link is gone from the sidebar and intro field appears under Profile in Availability & Settings.
