## Root cause

The booking page calls the `calendar-public-booking` edge function for available slots, but that function currently returns **404 NOT_FOUND** at the gateway — it exists in the codebase (`supabase/functions/calendar-public-booking/index.ts`) but is not deployed. Every `available_slots` call silently fails, so the slot list is always empty even though your availability (Sun–Sat 09:00–17:00) and the "Meeting" type (30 min) are correctly saved in the database.

Verified:
- `calendar_profiles`: slug `santosh-ramrakhiani`, active ✓
- `calendar_availability`: 7 rows, all active ✓
- `calendar_meeting_types`: 1 active row ✓
- `calendar_available_slots` SQL function is `SECURITY DEFINER` and logic is correct ✓
- Direct curl to `/functions/v1/calendar-public-booking` → `404 NOT_FOUND` ✗

## Fix

1. Re-trigger deployment of `supabase/functions/calendar-public-booking/index.ts` by making a no-op touch (e.g. add a version comment header). Lovable auto-deploys edge functions on save.
2. Verify by curling the function with `action: available_slots` for the existing slug + meeting type and confirming a non-empty `slots` array.
3. Reload `/book/santosh-ramrakhiani/meeting` in preview and confirm time slots render after picking a date.

## Out of scope

No DB, RLS, or frontend changes — the SQL and the React flow are correct. Only the missing deployment needs to be addressed.