# Flow: Automation Triggers

## Active triggers (canonical list)
See `04-database-map.md → Triggers (critical ones)` for the table.

## Dormant hooks (stubs — IF false branches)
- `on_visa_approved` — would mark commission students approved + AI suggestion.
- `on_application_submitted` — would create commission student row.
- `on_consent_form_submitted` — would unblock commission eligibility.

**Do not** delete these — they are activation points for UPI commissions when that workflow goes live.

## Scheduled / cron
- `odoo-cron` — periodic Odoo sync.
- `upi-renewal-scan`, `upi-sync-process-batch` — UPI maintenance (invoked on demand or scheduled outside Supabase).
- `process-email-queue` — drains pgmq queue.

## Realtime publications
Add tables to `supabase_realtime` publication only when needed; current consumers:
- `client_timeline`, `client_notifications`, `chat_messages`, `chat_read_receipts`, `call_queue_items`, `call_sessions`.

## Idempotency rules
- Receipt snapshot: guarded by NULL check.
- Invoice snapshot: keyed by status transitions only.
- Wallet recompute: rebuilds from scratch on every point_transaction change.