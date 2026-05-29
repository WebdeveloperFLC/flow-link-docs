# In-App Notification Center

Isolated subsystem — does **not** replace the email dispatcher (`notifications-dispatch`) or
the legacy `client_notifications` (portal) table.

## Schema

- `app_notifications` — per-user in-app feed. RLS: users read/update own; admins read all;
  staff-only insert (viewers and clients cannot insert — enforced by `staff insert notifications` policy).
  - Dedup via `(user_id, dedupe_key)` partial unique index.
  - Realtime publication enabled (`supabase_realtime`).
- `user_notification_prefs` — per-user `sound_enabled`, `browser_push_enabled`.

## Realtime flow

1. Producer (frontend lib) inserts a row via `notifyUsers(...)`.
2. Supabase Realtime broadcasts INSERT on `app_notifications` filtered by `user_id=eq.<uid>`.
3. `NotificationCenter` subscribed channel `app_notifications:<uid>` receives row, dedupes by
   `id`, prepends to list, raises sonner toast, plays chime if `shouldPlaySoundFor(category)`
   and user not muted.
4. UPDATE events sync `is_read` state across tabs.

## Sound categories (play chime)

`payment_verified`, `new_task_assigned`, `client_assigned`, `portal_message`, `urgent_review_required`.
All others are silent (autosave, passive logs, etc.).

## Safeguards

- `notifyUsers` never throws — wrapped in try/catch, errors only logged.
- Insert uses `upsert(..., { onConflict: "user_id,dedupe_key", ignoreDuplicates: true })` → no
  duplicate notifications even if a producer is called twice.
- Sound debounced 600 ms + per-notification-id dedupe set.
- Subscription cleanup on unmount via `supabase.removeChannel`.
- No polling — purely Realtime-driven.

## Wired producers (current)

All producers call `notifyUsers({...})` from `src/lib/appNotifications.ts`.

| Producer                               | File                                                                         | Category                 | Sound | Recipient(s)                   |
| -------------------------------------- | ---------------------------------------------------------------------------- | ------------------------ | ----- | ------------------------------ |
| Payment posted (awaiting verification) | `ClientInvoicesPanel.tsx`                                                    | `payment_received`       | ✗     | Assigned counselor / owner     |
| Payment verified                       | `ClientInvoicesPanel.tsx`                                                    | `payment_verified`       | ✔     | Assigned counselor / owner     |
| Receipt generated                      | `ClientInvoicesPanel.tsx`                                                    | `receipt_generated`      | ✗     | Assigned counselor / owner     |
| Task assigned                          | `src/lib/clientTasks.ts`                                                     | `new_task_assigned`      | ✔     | Assignee user                  |
| Document uploaded                      | `ClientDocumentsPanel.tsx`                                                   | `document_uploaded`      | ✗     | Assigned counselor / owner     |
| Portal invite sent                     | `InviteClientCard.tsx` / `ClientAccessDialog.tsx`                            | `portal_invite_sent`     | ✗     | Assigned counselor / owner     |
| Lead converted to client               | `LeadConversionDialog.tsx`                                                   | `lead_converted`         | ✗     | Staff stakeholders             |
| Client access granted                  | `ClientAccessDialog.tsx`                                                     | `client_assigned`        | ✔     | Newly assigned staff member    |
| **Lead handoff**                       | `src/lib/handoffs.ts` → `pushHandoff()`                                      | `client_assigned`        | ✔     | `toUserId` (handoff recipient) |
| **Payment needs verification**         | `ClientInvoicesPanel.tsx` (after payment post, status=awaiting_verification) | `urgent_review_required` | ✔     | All active `accounting_users`  |
| **Portal client sends chat message**   | `src/lib/chat.ts` → `sendMessage()` (senderType="client")                    | `portal_message`         | ✔     | Assigned counselor / owner     |

### Handoff notification detail

`pushHandoff()` in `src/lib/handoffs.ts` fires `notifyUsers` after the `lead_handoffs`
INSERT succeeds. Uses category `client_assigned` (sound-enabled). Body is composed as
`Task: <taskLabel> — <note>` when a task label is present.  
`dedupeKey = handoff:<lead_handoffs.id>` — one notification per handoff row.

### Urgent review notification detail

Fires in `ClientInvoicesPanel.tsx` alongside the existing `payment_received` notification
when `verified === false` (payment enters `awaiting_verification` status).  
Recipients resolved via `resolveAccountingVerifierUserIds()` — queries `accounting_users`
where `status = 'ACTIVE'` and returns their `auth_user_id` list.  
`dedupeKey = verification:<payment_id>`.

### Portal message notification detail

`sendMessage()` in `src/lib/chat.ts` fires `notifyUsers` when `senderType === "client"`.
Recipients resolved via `resolveAllClientStakeholderUserIds(clientId)`.  
`dedupeKey = portal_msg:<channel_id>:<message_id>`.

## Helper functions in `src/lib/appNotifications.ts`

| Function                                              | Purpose                                                                     |
| ----------------------------------------------------- | --------------------------------------------------------------------------- |
| `notifyUsers({ userIds, category, ... })`             | Fire-and-forget per-user insert with dedup                                  |
| `resolveCounselorNotificationUserIds(clientRow, ctx)` | Resolves `assigned_counselor_id` → `auth.users` id for a single client      |
| `resolveAllClientStakeholderUserIds(clientId, ctx)`   | Resolves all staff with access to a client (counselor + editors)            |
| `resolveAccountingVerifierUserIds(ctx)`               | Queries all ACTIVE `accounting_users` and returns their `auth_user_id` list |

## HandoffBell — retired

`src/components/notifications/HandoffBell.tsx` is now a **no-op stub** (`return null`).  
The legacy localStorage + polling approach has been replaced by `client_assigned`
notifications flowing through `app_notifications` → `NotificationCenter`.  
The stub file is kept so stale imports compile. It can be deleted in a cleanup pass.

`src/components/layout/Topbar.tsx` no longer imports or renders `HandoffBell`.
`src/components/layout/AppLayout.tsx` no longer imports `HandoffBell`.

## RLS note

The `staff insert notifications` policy restricts INSERT to authenticated users who do
**not** have role `viewer` or `client`. This prevents portal clients from injecting
notifications into staff feeds.  
Applied in migration `20260528024339_4a6a0662-6f52-42ba-80c3-7dc2819f20d4.sql`.

## Files

| File                                                  | Role                                                    |
| ----------------------------------------------------- | ------------------------------------------------------- |
| `src/lib/appNotifications.ts`                         | `notifyUsers` helper, sound engine, resolver helpers    |
| `src/components/notifications/NotificationCenter.tsx` | Bell UI, Realtime subscription, toast + chime           |
| `src/components/layout/Topbar.tsx`                    | Mounts `NotificationCenter` in the fixed top-right slot |
| `src/components/layout/AppLayout.tsx`                 | Renders `<Topbar />`                                    |
| `src/components/notifications/HandoffBell.tsx`        | **Retired no-op stub** — do not re-activate             |
