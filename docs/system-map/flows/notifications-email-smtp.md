# Flow: Notifications, Email & SMTP

## Channels
1. **Transactional (events)** — `notifications-dispatch` for Phase-1 events (receipt_generated, payment_received). Direct SMTP via `smtp-send`. Logs into `app_email_logs` + `client_timeline`.
2. **Generic transactional** — `email-send` / `send-transactional-email` with templates from `email_templates`. May use queue (`process-email-queue` + pgmq).
3. **Inbound** — `email-inbound` ingests replies into `email_threads`.
4. **Bulk / preview** — `preview-transactional-email` (no JWT) renders for the UI.
5. **In-app** — `client_notifications` table + realtime channel to the portal bell.

## SMTP config
- Stored in `integration_settings` (or `firm_profile`) — read by `smtp-send` and `smtp-admin`.
- Single firm SMTP today; per-entity SMTP not implemented.

## Routing settings (`notification_settings` singleton)
- `accounting_inbox_email` — BCC target.
- `bcc_accounting_inbox` — boolean toggle.
- `cc_assigned_counselor` — boolean toggle.
UI: `src/components/settings/NotificationRoutingCard.tsx` → `/email-smtp`.

## Recipient resolution (Phase 1)
For `receipt_generated` / `payment_received`:
- **To**: `clients.email`
- **Cc**: `profiles.email` where id = `clients.assigned_counselor_id` (if toggle on)
- **Bcc**: `notification_settings.accounting_inbox_email` (if toggle on)

## Logo source
Per-entity logo: `accounting_entities.logo_url`, fallback `firm_profile.logo_url`. Resolved by dispatcher.

## Templates
HTML rendered inline in `notifications-dispatch/index.ts`. Phase-2 should move to `email_templates`.

## Suppression / unsubscribe
- `email_unsubscribe_tokens` + `handle-email-unsubscribe` / `handle-email-suppression` (public, no JWT).
- Dispatcher does **not** currently check suppression — TODO before sending bulk.

## Logs
- `app_email_logs` — every send attempt (success/error, message id).
- `email_send_log`, `email_send_state`, `email_events`, `email_read_receipts` — queued pipeline analytics.

## Failure modes
- SMTP credentials missing → `smtp-send` returns 500; dispatcher logs error to timeline as `notification.error`.
- Caller lacks accounting access → still works (dispatcher runs server-side resolution).
- Counselor without email in `profiles` → CC silently skipped.
- Accounting inbox unset → BCC silently skipped.