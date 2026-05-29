-- ============================================================
-- Notification Email Queue
-- Creates dedicated pgmq queues for async notification email
-- delivery via the process-notification-email-queue worker.
--
-- Flow:
--   notifications-dispatch (QUEUE_EMAILS=true)
--     → enqueue_email('notification_emails', payload)
--     → process-notification-email-queue (cron, every 1 min)
--     → smtp-send
--     → app_email_logs
--
-- Rollback:
--   SELECT pgmq.drop_queue('notification_emails');
--   SELECT pgmq.drop_queue('notification_emails_dlq');
--   SELECT cron.unschedule('process-notification-email-queue');
-- ============================================================

-- Extensions (safe no-ops if already installed)
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pgmq;

-- Create the main notification email queue
DO $$ BEGIN
  PERFORM pgmq.create('notification_emails');
EXCEPTION WHEN OTHERS THEN
  -- Queue already exists — safe to ignore
  NULL;
END $$;

-- Create the dead-letter queue
DO $$ BEGIN
  PERFORM pgmq.create('notification_emails_dlq');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Register cron job: fires every minute, calls the worker edge function.
-- Uses anon key (verify_jwt=false on the function) so no vault secret needed.
-- Idempotent: unschedule first if it exists.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-notification-email-queue') THEN
    PERFORM cron.unschedule('process-notification-email-queue');
  END IF;
END $$;

SELECT cron.schedule(
  'process-notification-email-queue',
  '* * * * *',
  $cron$
  SELECT extensions.http_post(
    url    := 'https://auofttkyosgjhxcbhscw.supabase.co/functions/v1/process-notification-email-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1b2Z0dGt5b3Nnamh4Y2Joc2N3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0Mzc4NTMsImV4cCI6MjA5MzAxMzg1M30.rgxyaq_QLojaXemX9cwmiFy1mXj-x9arQqOgfULrD3w'
    ),
    body   := jsonb_build_object('triggered_by', 'cron')
  );
  $cron$
);