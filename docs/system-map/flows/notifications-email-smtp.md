# Flow: Notifications, Email & SMTP

## Channels

1. **Notification events (Phase 1)** — `notifications-dispatch` for `receipt_generated` and
   `payment_received`. Resolves recipients, renders HTML, then routes via the
   **QUEUE_EMAILS feature flag** (see below). Logs into `app_email_logs` + `client_timeline`.
2. **Generic transactional** — `email-send` / `send-transactional-email` with templates from
   `email_templates`. Uses the Lovable-managed queue (`process-email-queue` + pgmq
   `auth_emails` / `transactional_emails`). **Separate pipeline from channel 1.**
3. **Inbound** — `email-inbound` ingests replies into `email_threads`.
4. **Bulk / preview** — `preview-transactional-email` (no JWT) renders for the UI.
5. **In-app** — `app_notifications` table + Supabase Realtime channel → `NotificationCenter`
   bell in the Topbar. See `notification-center.md`.

---

## QUEUE_EMAILS feature flag

Controls whether `notifications-dispatch` delivers synchronously or via the async queue.

| `QUEUE_EMAILS` env var     | Delivery path                                                         | Retry   | DLQ                       |
| -------------------------- | --------------------------------------------------------------------- | ------- | ------------------------- |
| `false` or unset (default) | dispatch → `smtp-send` directly (synchronous)                         | none    | none                      |
| `true`                     | dispatch → `notification_emails` queue → worker → `smtp-send` (async) | up to 3 | `notification_emails_dlq` |

Set in Supabase Dashboard → Edge Functions → `notifications-dispatch` → Secrets.
**Rollback**: set `QUEUE_EMAILS=false` — takes effect immediately on next call, no redeploy needed.

---

## Notification email queue architecture (QUEUE_EMAILS=true)

```
notifications-dispatch
  │
  ├─ [QUEUE_EMAILS=true]
  │    enqueue_email('notification_emails', payload)
  │         │
  │         ▼
  │    pgmq: notification_emails queue
  │         │
  │    pg_cron every 1 min
  │         │
  │         ▼
  │    process-notification-email-queue (worker, verify_jwt=false)
  │         │  reads batch (VT=30s, batch=10)
  │         │  checks TTL (60 min)
  │         │  checks idempotency (app_email_logs metadata.message_id=sent)
  │         │  checks retry count (max 3 failed rows in app_email_logs)
  │         │
  │         ├─ ok → POST smtp-send → app_email_logs (sent) → delete from queue
  │         │                      → UPDATE app_email_logs.metadata { message_id }
  │         │                      → INSERT client_timeline (best-effort)
  │         │
  │         ├─ smtp error → INSERT app_email_logs (failed, retry_count+1)
  │         │               message stays in queue (VT expires, retried next cycle)
  │         │
  │         └─ TTL / max retries → move_to_dlq → notification_emails_dlq
  │                               → INSERT app_email_logs (failed, dlq=true)
  │
  └─ [QUEUE_EMAILS=false / fallback]
       POST smtp-send directly (original synchronous path)
       → app_email_logs (written by smtp-send)
       → INSERT client_timeline (written by dispatch)
```

### Queue payload schema

Every message in `notification_emails` carries:

| Field           | Type         | Notes                                             |
| --------------- | ------------ | ------------------------------------------------- |
| `to`            | string       | Recipient email                                   |
| `subject`       | string       | Rendered subject line                             |
| `html`          | string       | Full rendered HTML                                |
| `category`      | string       | e.g. `notif:receipt_generated`                    |
| `entity_id`     | uuid \| null | For per-entity SMTP routing                       |
| `message_id`    | string       | `notif:<event>:<client_id>:<to>:<ts>` — dedup key |
| `label`         | string       | e.g. `notif:receipt_generated`                    |
| `queued_at`     | ISO string   | TTL anchor                                        |
| `client_id`     | uuid \| null | For timeline write                                |
| `actor_user_id` | uuid         | Auth user who triggered dispatch                  |
| `event_type`    | string       | e.g. `receipt_generated`                          |

### Worker idempotency guarantee

Before every send attempt the worker queries:

```sql
SELECT id FROM app_email_logs
WHERE status = 'sent'
  AND metadata @> '{"message_id": "<id>"}'
LIMIT 1
```

If a row is found the message is deleted from the queue without re-sending.
This covers the crash-after-send-before-queue-delete scenario.

### VT / concurrency safety

pgmq visibility timeout = 30 s. Only one worker instance can hold a message
at a time. If the worker crashes mid-batch, messages become visible again after
30 s and are retried by the next cron tick.

### DLQ triage

Inspect `notification_emails_dlq` in Supabase Dashboard → Database → Queues.
Every DLQ move also writes a row to `app_email_logs` with `status='failed'`
and `metadata.dlq=true` so the Email Logs page shows it.

---

## SMTP config

- Global config: `smtp_settings` singleton (host, port, encryption, credentials).
- Per-entity override: `entity_smtp_settings` — matched by `entity_id` in the
  queue payload / smtp-send request body.
- Read by `smtp-send` only. Never read directly by `notifications-dispatch` or the worker.
- Single firm SMTP today; per-entity override active for accounting entities that
  have a row in `entity_smtp_settings`.

---

## Routing settings (`notification_settings` singleton)

| Column                   | Purpose                                   |
| ------------------------ | ----------------------------------------- |
| `accounting_inbox_email` | BCC target email                          |
| `bcc_accounting_inbox`   | boolean — include accounting inbox as BCC |
| `cc_assigned_counselor`  | boolean — CC the assigned counselor       |

UI: `src/components/settings/NotificationRoutingCard.tsx` → `/email-smtp`.

---

## Recipient resolution (Phase 1)

For `receipt_generated` and `payment_received` — fully resolved in `notifications-dispatch`
before the queue/smtp branch. Recipient logic is **identical** in both delivery paths.

| Slot    | Source                                                                                                                           |
| ------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **To**  | `clients.email`                                                                                                                  |
| **Cc**  | `profiles.email` where `id = clients.assigned_counselor_id` (if toggle on). Falls back to `clients.owner_id` for legacy records. |
| **Bcc** | `notification_settings.accounting_inbox_email` (if toggle on)                                                                    |

Each recipient becomes a separate queue message (or separate smtp-send call in
direct path). `metadata.category` groups them in `app_email_logs`.

---

## Suppression check

Performed in `notifications-dispatch` before enqueue/send — independent of delivery path.

1. Checks `suppressed_emails` table (bounces, complaints).
2. Checks `email_unsubscribe_tokens` where `used_at IS NOT NULL`.
3. Suppressed primary → timeline row written, returns `{ skipped: true }`.
4. Suppressed counselor or accounting inbox → silently excluded from recipient list.

---

## Logo source

Per-entity: `accounting_entities.logo_url` → fallback `firm_profile.logo_url`.
Resolved by `notifications-dispatch` before building HTML.

---

## HTML templates

Rendered inline in `notifications-dispatch/index.ts`. Phase-2 should move to
`email_templates` rows. Current supported events:

| `event_type`        | Template content                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| `receipt_generated` | Receipt number, date, invoice ref, payment method, amount paid, outstanding                                   |
| `payment_received`  | Invoice ref, payment date, method, amount, outstanding, verification notice if `status=awaiting_verification` |

---

## Logs

| Table              | Written by                                                    | Contains                                                                                                                                  |
| ------------------ | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `app_email_logs`   | `smtp-send` (success/fail/pending), worker (failed/dlq rows)  | `recipient`, `subject`, `body_html`, `category`, `provider`, `status`, `attempts`, `error_message`, `sent_at`, `triggered_by`, `metadata` |
| `email_send_log`   | `process-email-queue`                                         | Used by Lovable-managed pipeline only — **not** this channel                                                                              |
| `email_send_state` | `process-email-queue`                                         | Rate-limit cooldown — **not** this channel                                                                                                |
| `client_timeline`  | `notifications-dispatch` (direct path) or worker (queue path) | `event_type = notification.<event_type>`                                                                                                  |

---

## Debug log tags

All notification email logs are prefixed for easy filtering in Supabase Edge Function Logs.

| Tag                                               | Emitted by               | Meaning                                                                      |
| ------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------- |
| `[notification-email-debug] enqueue_start`        | `notifications-dispatch` | About to call `enqueue_email` RPC                                            |
| `[notification-email-debug] enqueue_success`      | `notifications-dispatch` | Row inserted into `notification_emails` queue                                |
| `[notification-email-debug] enqueue_error`        | `notifications-dispatch` | `enqueue_email` RPC returned error                                           |
| `[notification-email-debug] fallback_direct_send` | `notifications-dispatch` | `QUEUE_EMAILS` not `true`, using direct smtp-send path                       |
| `[notification-email-debug] worker_received`      | worker                   | Batch read; includes `queue_depth`, `batch_size`, `retry_count`, `dlq_count` |
| `[notification-email-debug] worker_skipped`       | worker                   | `QUEUE_EMAILS` not `true`, worker exited as no-op                            |
| `[notification-email-debug] smtp_send_start`      | worker                   | About to call smtp-send for this message                                     |
| `[notification-email-debug] smtp_send_success`    | worker                   | smtp-send returned 2xx                                                       |
| `[notification-email-debug] smtp_send_failed`     | worker                   | smtp-send returned non-2xx or fetch exception                                |
| `[notification-email-debug] moved_to_dlq`         | worker                   | Message moved to `notification_emails_dlq`                                   |

---

## Failure modes

| Scenario                                            | Behaviour                                                                                                |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| SMTP credentials missing                            | `smtp-send` returns 400/500; worker logs `failed` to `app_email_logs`; message retried up to 3× then DLQ |
| SMTP timeout                                        | Worker fetch exception; `failed` logged; retried next cron tick                                          |
| `enqueue_email` RPC fails                           | `enqueue_error` logged; `sendResults` marks `ok=false`; no queue row; email not sent                     |
| Worker crashes mid-batch                            | Messages become visible after VT=30s; idempotency check skips already-sent                               |
| Counselor has no email in `profiles`                | CC silently skipped (logged as `[notif] counselor_skipped`)                                              |
| Accounting inbox unset                              | BCC silently skipped                                                                                     |
| Primary email suppressed                            | Timeline row written, returns `{ skipped: true, reason: "primary_suppressed" }`                          |
| `QUEUE_EMAILS` toggled off while queue has messages | Worker drains remaining messages safely (flag check is non-destructive)                                  |

---

## Files

| File                                                              | Role                                                                      |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `supabase/functions/notifications-dispatch/index.ts`              | Dispatcher — recipient resolution, HTML rendering, enqueue or direct-send |
| `supabase/functions/process-notification-email-queue/index.ts`    | Worker — queue drain → smtp-send                                          |
| `supabase/functions/smtp-send/index.ts`                           | Sole SMTP sender — **never call SMTP from anywhere else**                 |
| `supabase/migrations/20260529120000_notification_email_queue.sql` | Creates queues + cron job                                                 |

---

## Cron job

| Job name                           | Schedule                  | Function called                                                |
| ---------------------------------- | ------------------------- | -------------------------------------------------------------- |
| `process-notification-email-queue` | `* * * * *` (every 1 min) | `process-notification-email-queue` edge fn via `net.http_post` |

Registered in `supabase/migrations/20260529120000_notification_email_queue.sql`.
Uses anon key (function has `verify_jwt=false`). Idempotent — unschedules and
re-registers if the job already exists.
