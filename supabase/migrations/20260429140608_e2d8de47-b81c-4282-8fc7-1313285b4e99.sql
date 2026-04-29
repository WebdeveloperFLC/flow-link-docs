
CREATE TABLE public.integration_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT false,
  mode text NOT NULL DEFAULT 'two_way',
  auto_on_open boolean NOT NULL DEFAULT true,
  interval_minutes integer NOT NULL DEFAULT 0,
  last_sync_at timestamptz,
  last_sync_status text,
  last_sync_message text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT integration_settings_mode_check CHECK (mode IN ('off','pull','push','two_way'))
);

ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "integration_settings readable by authenticated"
  ON public.integration_settings FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "admins insert integration_settings"
  ON public.integration_settings FOR INSERT
  TO authenticated WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "admins update integration_settings"
  ON public.integration_settings FOR UPDATE
  TO authenticated USING (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "admins delete integration_settings"
  ON public.integration_settings FOR DELETE
  TO authenticated USING (has_role(auth.uid(),'admin'::app_role));

CREATE OR REPLACE FUNCTION public.touch_integration_settings_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER integration_settings_touch_updated_at
BEFORE UPDATE ON public.integration_settings
FOR EACH ROW EXECUTE FUNCTION public.touch_integration_settings_updated_at();

INSERT INTO public.integration_settings (key, enabled, mode, auto_on_open, interval_minutes)
VALUES ('odoo', false, 'two_way', true, 0)
ON CONFLICT (key) DO NOTHING;
