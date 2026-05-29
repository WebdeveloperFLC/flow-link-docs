# Dependency Analysis

## High-blast-radius components (changes here can affect many flows)

| Component                                                 | Why it's risky                                                                                                                                                                                                                             |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/components/clients/ClientInvoicesPanel.tsx`          | Used by both CRM and accounting views; orchestrates invoice/payment/receipt/email; multiple nested dialogs. Now also fires `payment_received`, `payment_verified`, `receipt_generated`, and `urgent_review_required` in-app notifications. |
| `src/contexts/AuthContext.tsx`                            | Resolves all role flags; consumed by every protected route.                                                                                                                                                                                |
| `src/integrations/supabase/client.ts`                     | Auto-generated — **never edit**.                                                                                                                                                                                                           |
| `src/components/ui/dialog.tsx`, `alert-dialog.tsx`        | shadcn primitives — z-index and portal behaviour ripple everywhere.                                                                                                                                                                        |
| `src/components/layout/AppLayout.tsx`                     | Sidebar nav + role gating.                                                                                                                                                                                                                 |
| `src/lib/timeline.ts`                                     | Event-type strings are an implicit contract with renderers.                                                                                                                                                                                |
| `supabase/functions/notifications-dispatch`               | Bypasses caller permission to send emails — change recipient logic carefully. Dual-path: direct SMTP or `notification_emails` queue depending on `QUEUE_EMAILS` flag.                                                                      |
| `supabase/functions/smtp-send`                            | Sole outbound mail path. Called by both `notifications-dispatch` (direct path) and `process-notification-email-queue` worker (queue path).                                                                                                 |
| **`supabase/functions/process-notification-email-queue`** | New (2026-05-29). Cron worker — silently stops all notification email delivery if it errors without logging. Changes to retry logic, TTL, or DLQ handling affect every queued notification email.                                          |
| **`src/lib/appNotifications.ts`**                         | Central producer hub — `notifyUsers`, all resolver helpers. All 11 in-app notification producers depend on this file. Changes to `NotificationCategory` type or `notifyUsers` signature require updating every call site.                  |

## Shared tables (changes ripple)

- `clients` — 40+ FKs.
- `client_timeline` — UI in many places filters by `event_type`.
- `client_invoices` — locked-edit flag enforced in multiple panels.
- `accounting_users` — drives `is_accounting_*` everywhere. Also used by `resolveAccountingVerifierUserIds()` to resolve recipients for `urgent_review_required` notifications. Adding/removing rows directly changes who gets verification alerts.
- `user_roles` — drives `has_role`.
- `profiles.email` — used by dispatcher for counselor CC; missing email = silent skip.
- `app_notifications` — Realtime feed for all 11 in-app notification producers. `(user_id, dedupe_key)` unique index means changing a `dedupeKey` format silently creates duplicate notifications.
- `app_email_logs` — written by both `smtp-send` and `process-notification-email-queue`. The `metadata` jsonb column is queried by the worker for idempotency; removing or renaming it breaks dedup.

## Tight couplings

1. **CRM ↔ Accounting clients** via `fn_sync_accounting_client`. Trigger failure rolls back client write.
2. **Invoice totals ↔ payment rows** via `fn_recompute_invoice_totals`. Changing payment schema requires updating the recompute logic.
3. **Receipt snapshot ↔ entity/branch/firm** via `fn_take_receipt_snapshot`. Renaming `firm_profile` columns breaks snapshots.
4. **Lead score ↔ call outcomes & remarks** via `fn_recalc_lead_score`. Adding new call statuses must update the SQL.
5. **Portal access ↔ `client_portal_links`** — without a link row, `getMyPortalClientId` returns null and the portal is empty.
6. **Notifications ↔ `notification_settings` singleton** — deleting the row disables BCC/CC routing.
7. **Notification email queue ↔ `QUEUE_EMAILS` flag** — `notifications-dispatch` and `process-notification-email-queue` both read this env var independently. Mismatch (e.g. flag true in dispatch, not set in worker) causes enqueuing without draining.
8. **Worker idempotency ↔ `app_email_logs.metadata`** — the worker stores and queries `message_id` in the `metadata` jsonb column. If `smtp-send` changes how it writes this row, or if a migration alters the column, the dedup check silently fails and emails can be sent twice.

## Fragile / known-brittle areas

- **Modal stacking** in `ClientInvoicesPanel` (history of bugs).
- **Realtime subscriptions** that don't clean up on route change (memory + stale state).
- **Storage policies** — RLS-equivalent policies on buckets must mirror table RLS; drift causes 403s.
- **Email queue (Lovable pipeline)** — `auth_emails` / `transactional_emails` pgmq DLQ requires manual triage via `process-email-queue` logs.
- **Notification email queue** — `notification_emails` DLQ (`notification_emails_dlq`) requires manual triage via Supabase Dashboard → Database → Queues. Every DLQ move also writes a `failed` row to `app_email_logs` with `metadata.dlq=true` for visibility in the Email Logs page.
- **Dormant trigger stubs** (`on_visa_approved` etc.) — must remain in place even though their bodies are inert.
- **`QUEUE_EMAILS` flag drift** — if the env var is set on `notifications-dispatch` but not on `process-notification-email-queue` (or vice versa), emails queue up without being drained. Monitor both functions together.
- **`HandoffBell` stub** — `src/components/notifications/HandoffBell.tsx` returns null. Do not re-activate or add logic to it. Delete the file and its import sites in a future cleanup pass.

## Reusable utilities (safe to extend, avoid forking)

- `src/lib/timeline.ts`, `src/lib/email.ts`, `src/lib/portal.ts`, `src/lib/activity.ts`.
- `src/lib/supabaseSafeInsert.ts`.
- `src/lib/appNotifications.ts` — `notifyUsers`, `resolveCounselorNotificationUserIds`, `resolveAllClientStakeholderUserIds`, `resolveAccountingVerifierUserIds`. Add new producers by calling `notifyUsers` — do not fork the resolver helpers.
- `src/components/ui/*` (shadcn).
- `src/accounting/lib/format.ts`, `fx.ts`.
