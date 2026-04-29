
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'odoo-cron-every-5min') THEN
    PERFORM cron.unschedule('odoo-cron-every-5min');
  END IF;
END $$;

SELECT cron.schedule(
  'odoo-cron-every-5min',
  '*/5 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://auofttkyosgjhxcbhscw.supabase.co/functions/v1/odoo-cron',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'apikey','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1b2Z0dGt5b3Nnamh4Y2Joc2N3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0Mzc4NTMsImV4cCI6MjA5MzAxMzg1M30.rgxyaq_QLojaXemX9cwmiFy1mXj-x9arQqOgfULrD3w'
    ),
    body := jsonb_build_object('time', now())
  );
  $cron$
);
