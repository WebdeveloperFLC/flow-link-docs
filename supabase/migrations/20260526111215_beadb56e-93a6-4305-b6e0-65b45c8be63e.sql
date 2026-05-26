-- Enterprise realtime notification center: per-user notifications

CREATE TABLE IF NOT EXISTS public.app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text,
  link text,
  entity_type text,
  entity_id uuid,
  dedupe_key text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_notifications_user_created
  ON public.app_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_notifications_user_unread
  ON public.app_notifications(user_id) WHERE is_read = false;
CREATE UNIQUE INDEX IF NOT EXISTS uq_app_notifications_dedupe
  ON public.app_notifications(user_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own notifications"
  ON public.app_notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "users update own notifications"
  ON public.app_notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "authenticated insert notifications"
  ON public.app_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "admins read all notifications"
  ON public.app_notifications FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- per-user notification preferences (sound mute, etc.)
CREATE TABLE IF NOT EXISTS public.user_notification_prefs (
  user_id uuid PRIMARY KEY,
  sound_enabled boolean NOT NULL DEFAULT true,
  browser_push_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_notification_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user manages own prefs"
  ON public.user_notification_prefs FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- enable realtime
ALTER TABLE public.app_notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_notifications;