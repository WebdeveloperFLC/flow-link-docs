CREATE UNIQUE INDEX IF NOT EXISTS app_notifications_user_dedupe_key
  ON public.app_notifications (user_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;