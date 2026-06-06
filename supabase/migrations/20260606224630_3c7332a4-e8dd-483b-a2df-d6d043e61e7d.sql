DROP INDEX IF EXISTS public.app_notifications_user_dedupe_key;
DROP INDEX IF EXISTS public.uq_app_notifications_dedupe;
ALTER TABLE public.app_notifications
  ADD CONSTRAINT app_notifications_user_dedupe_key UNIQUE (user_id, dedupe_key);