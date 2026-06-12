-- Schedule notifications-reminders-tick (due-soon + overdue task alerts, payment SLAs, portal messages).
-- Run after deploying the edge function and 20260617166000_application_task_assignment.sql.
--
-- Flow:
--   pg_cron (every 5 min)
--     → notifications-reminders-tick edge function
--     → app_notifications (due_soon_tasks, overdue_tasks, …)
--
-- Rollback:
--   SELECT cron.unschedule('notifications-reminders-tick');

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'notifications-reminders-tick') THEN
    PERFORM cron.unschedule('notifications-reminders-tick');
  END IF;
END $$;

SELECT cron.schedule(
  'notifications-reminders-tick',
  '*/5 * * * *',
  $cron$
  SELECT extensions.http_post(
    url    := 'https://auofttkyosgjhxcbhscw.supabase.co/functions/v1/notifications-reminders-tick',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1b2Z0dGt5b3Nnamh4Y2Joc2N3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0Mzc4NTMsImV4cCI6MjA5MzAxMzg1M30.rgxyaq_QLojaXemX9cwmiFy1mXj-x9arQqOgfULrD3w'
    ),
    body   := jsonb_build_object('triggered_by', 'cron')
  );
  $cron$
);

-- Verify:
-- SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'notifications-reminders-tick';
--
-- If CRON_SECRET is set on the edge function and invocations return 403,
-- add 'x-cron-secret', '<value>' to headers above, or pass Authorization Bearer service_role.
