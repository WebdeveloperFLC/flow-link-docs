-- ============================================================
-- Offers Module — Birthday Automation: cron schedule
--
-- Registers a DAILY pg_cron job that invokes the offers-lifecycle-tick
-- edge function (deployed in Steps 1-2). The function generates birthday
-- offers for clients whose date_of_birth is set and whose birthday is
-- ~7 days ahead (Gate B: NULL dob skipped inside the function).
--
-- This migration ONLY schedules the cron. No table is created or altered.
-- No invoice/payment/billing/accounting/financial object is touched.
-- Mirrors the existing process-notification-email-queue cron pattern.
--
-- Schedule: 06:00 UTC daily ('0 6 * * *').
--
-- Rollback:
--   SELECT cron.unschedule('offers-lifecycle-tick');
-- ============================================================

-- Safe no-ops if already installed
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- Idempotent: unschedule first if it exists.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'offers-lifecycle-tick') THEN
    PERFORM cron.unschedule('offers-lifecycle-tick');
  END IF;
END $$;

SELECT cron.schedule(
  'offers-lifecycle-tick',
  '0 6 * * *',
  $cron$
  SELECT extensions.http_post(
    url    := 'https://auofttkyosgjhxcbhscw.supabase.co/functions/v1/offers-lifecycle-tick',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1b2Z0dGt5b3Nnamh4Y2Joc2N3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0Mzc4NTMsImV4cCI6MjA5MzAxMzg1M30.rgxyaq_QLojaXemX9cwmiFy1mXj-x9arQqOgfULrD3w'
    ),
    body   := jsonb_build_object('triggered_by', 'cron')
  );
  $cron$
);