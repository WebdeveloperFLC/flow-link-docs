Create the migration file `supabase/migrations/20260529120000_notification_email_queue.sql` with the exact SQL you provided. It sets up:

- `pg_net`, `pg_cron`, `pgmq` extensions (idempotent)
- pgmq queues: `notification_emails` and `notification_emails_dlq`
- cron job `process-notification-email-queue` running every minute, POSTing to the `process-notification-email-queue` edge function with the project anon key

No other files will be touched. Approve to switch to build mode and write the file.

Note: the SQL uses `extensions.http_post` (pg_net). If your project exposes it as `net.http_post` instead, the cron call will fail at runtime — let me know and I'll adjust before applying.