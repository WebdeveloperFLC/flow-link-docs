
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true,
  accounting_inbox_email TEXT,
  bcc_accounting_inbox BOOLEAN NOT NULL DEFAULT true,
  cc_assigned_counselor BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT notification_settings_singleton CHECK (id = true)
);

INSERT INTO public.notification_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read notification settings"
  ON public.notification_settings FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins manage notification settings"
  ON public.notification_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
