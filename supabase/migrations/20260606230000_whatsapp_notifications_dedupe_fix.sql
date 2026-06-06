-- Run once in Supabase SQL editor if Lovable notification migrations failed.
-- Safe to re-run (idempotent).

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_notifications TO authenticated;
GRANT ALL ON public.app_notifications TO service_role;

ALTER TABLE public.app_notifications
  DROP CONSTRAINT IF EXISTS app_notifications_user_dedupe_key;

DROP INDEX IF EXISTS public.uq_app_notifications_dedupe;
DROP INDEX IF EXISTS public.app_notifications_user_dedupe_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'app_notifications_user_dedupe_key'
      AND conrelid = 'public.app_notifications'::regclass
  ) THEN
    ALTER TABLE public.app_notifications
      ADD CONSTRAINT app_notifications_user_dedupe_key UNIQUE (user_id, dedupe_key);
  END IF;
END $$;
