# In-App Notification Center

Isolated subsystem — does **not** replace the email dispatcher (`notifications-dispatch`) or
the legacy `client_notifications` (portal) table.

## Schema
- `app_notifications` — per-user in-app feed. RLS: users read/update own; admins read all; authenticated insert.
  - Dedup via `(user_id, dedupe_key)` partial unique index.
  - Realtime publication enabled (`supabase_realtime`).
- `user_notification_prefs` — per-user `sound_enabled`, `browser_push_enabled`.

## Realtime flow
1. Producer (frontend or edge fn) inserts a row via `notifyUsers(...)`.
2. Supabase Realtime broadcasts INSERT on `app_notifications` filtered by `user_id=eq.<uid>`.
3. `NotificationCenter` subscribed channel `app_notifications:<uid>` receives row, dedupes by `id`, prepends to list, raises sonner toast, plays chime if `shouldPlaySoundFor(category)` and user not muted.
4. UPDATE events sync `is_read` state across tabs.

## Sound categories (play)
`payment_verified`, `new_task_assigned`, `client_assigned`, `portal_message`, `urgent_review_required`.
All others are silent (autosave, passive logs, etc.).

## Safeguards
- `notifyUsers` never throws — wrapped in try/catch, errors only logged.
- Insert uses `upsert(..., { onConflict: "user_id,dedupe_key", ignoreDuplicates: true })` → no duplicate notifications.
- Sound debounced 600 ms + per-notification-id dedupe set.
- Subscription cleanup on unmount via `supabase.removeChannel`.
- No polling.

## Wired producers (Phase 1)
- `ClientInvoicesPanel` — after payment post → `payment_received` / `payment_verified`.
- `ClientInvoicesPanel` — after receipt generation → `receipt_generated`.

Future producers (task assign, client assign, document upload, portal invite, lead converted, urgent review) plug in by calling `notifyUsers({...})` from their existing flow — no new infra required.

## Files
- `src/lib/appNotifications.ts` — helper + sound engine
- `src/components/notifications/NotificationCenter.tsx` — bell UI
- `src/components/layout/AppLayout.tsx` — mounted next to `HandoffBell`