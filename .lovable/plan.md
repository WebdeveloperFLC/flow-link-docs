## Issues

1. **"null value in column slug" error** — `MeetingTypesEditor` (Settings → Meeting types tab) inserts new rows without a `slug`, but the DB column is `NOT NULL` (added in Phase 5). Inline-saving an existing row also drops the slug if it's empty.
2. **No booking link visible after saving profile** — `BookingLinkCard` exists but is not rendered on the Profile tab, so users have nothing to copy/share after saving.

## Fix

### 1. `src/calendar/components/MeetingTypesEditor.tsx`
- On **Add**, auto-generate a slug via `suggestMeetingSlug(user.id, "new-meeting")` (uses existing RPC `fn_suggest_meeting_slug`) and include it in the insert payload along with `category: "Consultation"`, `booking_window_days: 30`, `reservation_ttl_minutes: 10`, `requires_approval: false`.
- Add a **Slug** input column to each row; on blur, re-slugify and save. If the user clears it, regenerate from the meeting name.
- Show the per-meeting booking URL (`/book/{profile.booking_slug}/{mt.slug}`) with a small Copy button per row, mirroring the richer `MeetingTypesPage`.
- Guard every inline `save.mutate` to ensure `slug` is always present (fallback to `slugify(meeting_name)` or existing slug).

### 2. `src/calendar/components/ProfileSettingsCard.tsx`
- After the Save button, render `BookingLinkCard` inline (or render it just below the form inside the same `CardContent`) so the public booking URL with Copy / Open / Regenerate appears immediately once a profile exists.
- Alternative: render `<BookingLinkCard />` below `<ProfileSettingsCard />` in `CalendarSettings.tsx` under the Profile tab. Use this approach — keeps `ProfileSettingsCard` focused and `BookingLinkCard` already self-hydrates from `useCalendarProfile`.

### 3. `src/calendar/pages/CalendarSettings.tsx`
- In the `profile` TabsContent, render `<ProfileSettingsCard />` followed by `<BookingLinkCard />` (stacked with `space-y-4`).

## Out of scope
No DB migrations, no changes to `MeetingTypesPage` (already correct), no auth/RBAC changes.
