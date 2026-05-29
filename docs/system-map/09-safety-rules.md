# Safety Rules for Future Builds

**Every PR must comply.** Cite the rule number in the PR description when it applies.

## R1 — Financial integrity

- Never modify `client_invoices`, `client_invoice_payments`, `client_invoice_receipts`, or their triggers without re-reading `flows/invoices-payments-receipts.md` **and** running the existing flow end-to-end in preview.
- Never bypass `fn_recompute_invoice_totals` by hand-setting `amount_paid` or `status` on `client_invoices`.
- Never delete a payment row in production — set `archived_at` instead so the recompute trigger can run.

## R2 — Snapshots are immutable

- Do not edit `client_invoice_snapshots` or the `receipt_snapshot_jsonb` field. Replay history depends on them.
- Do not change column names referenced inside `fn_take_invoice_snapshot` / `fn_take_receipt_snapshot` (`firm_profile.*`, `accounting_entities.*`, `branches.*`) without updating the function in the same migration.

## R3 — RLS changes

- Never change an RLS policy without listing every helper function it depends on (`has_role`, `user_client_permission`, `is_accounting_*`, `user_has_module`, `dsh_can`).
- Never inline a `SELECT FROM user_roles` inside a policy on `user_roles` — use the SECURITY DEFINER helper. (Infinite recursion.)
- Never grant `ALL` to `public` on a CRM table.

## R4 — Modal architecture

- Never nest an `AlertDialog` inside a `Dialog`. Render as siblings with z-[70] on the AlertDialog content.
- Always add `onPointerDownOutside` + `onEscapeKeyDown` handlers to confirm dialogs that live above another dialog.
- Always include `e.preventDefault()` on the confirm-button click handler.

## R5 — Autosave & permissions

- Never change autosave without verifying that the field is covered by `can_edit_client` (or accounting equivalent).
- Never silently swallow `update().eq(...)` errors — surface via toast.

## R6 — Timeline event-type strings

- Never rename an existing `client_timeline.event_type` value. Add a new one and migrate readers first.
- Keep dispatcher events namespaced (`notification.*`).

## R7 — Notifications dispatcher

- Never change recipient resolution in `notifications-dispatch` without re-reading `flows/notifications-email-smtp.md`.
- Never remove the `bcc_accounting_inbox` / `cc_assigned_counselor` toggles silently.
- Always route outbound mail through `smtp-send`. Do not call SMTP from other edge functions directly.
- The `QUEUE_EMAILS` env flag controls delivery path. Both paths (`smtp-send` direct and `notification_emails` queue → worker → `smtp-send`) must produce identical recipient lists and identical `app_email_logs` entries — never diverge them.

## R8 — CRM ↔ Accounting sync

- Never write to `accounting_clients` from CRM code. Use the `fn_sync_accounting_client` trigger.
- Preserve `linked_crm_client_id` — it's the join key.

## R9 — Telemetry before refactor

- Add `console.info` breadcrumbs in any sensitive flow (invoice, payment, dispatcher) **before** refactoring. Remove only after verification.

## R10 — Auto-generated files

- Never edit `src/integrations/supabase/client.ts`, `types.ts`, or `.env`.
- Never edit existing files under `supabase/migrations/` — add a new timestamped migration.

## R11 — Dormant stubs

- Do not remove `on_visa_approved`, `on_application_submitted`, `on_consent_form_submitted`. They're activation points for UPI commissions.

## R12 — Storage

- Never change a bucket from private to public without a written security review.
- Always issue signed URLs for client-facing reads.

## R13 — Backward compatibility

- Do not remove a column referenced by any trigger, RPC, edge function, or UI. Deprecate via a follow-up migration after readers are updated.

## R14 — Notification email queue

- Never change the `QUEUE_EMAILS` flag on `notifications-dispatch` without also verifying it is set identically on `process-notification-email-queue`. Mismatch causes silent email loss (enqueued but never drained).
- Never alter `app_email_logs.metadata` column type or remove it. The worker queries `metadata @> '{"message_id": "..."}'` for idempotency — breaking this causes duplicate email delivery.
- Never add a new pgmq queue for notification emails without registering a corresponding cron job and DLQ. An undrainable queue grows silently.
- Never change `MAX_RETRIES` (currently 3) or `TTL_MINUTES` (currently 60) in the worker without considering the impact on in-flight messages already in the queue.
- To disable the queue entirely: set `QUEUE_EMAILS=false` on `notifications-dispatch` — no code change or redeploy needed. Do not delete the queue or the cron job while messages may still be in-flight.

## R15 — In-app notification producers

- Never add a new `NotificationCategory` value to `appNotifications.ts` without deciding whether it should play a chime. Sound categories are declared in `SOUND_CATEGORIES` in the same file — an omission causes silent delivery with no feedback to the user.
- Never change the `dedupeKey` format for an existing producer without clearing stale `app_notifications` rows first. A format change silently re-enables notifications that users have already seen and dismissed.
- Never call `notifyUsers` with `userIds: []` — it is a no-op but adds noise to logs. Always guard with an early return if the resolved recipient list is empty.
- The `HandoffBell` component (`src/components/notifications/HandoffBell.tsx`) is a retired no-op stub. Do not add logic to it. Remove it and all import sites in a dedicated cleanup PR — do not bundle the deletion with a feature change.
