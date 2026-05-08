-- Admin-only telephony provider settings (singleton row pattern)
CREATE TABLE IF NOT EXISTS public.telephony_provider_settings (
  id text PRIMARY KEY DEFAULT 'global',
  provider text NOT NULL DEFAULT 'telecmi',
  app_id text,
  secret text,
  webhook_secret text,
  from_number text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT telephony_provider_settings_singleton CHECK (id = 'global')
);

ALTER TABLE public.telephony_provider_settings ENABLE ROW LEVEL SECURITY;

-- Strict: only admins can SELECT/INSERT/UPDATE. No DELETE policy = no deletes.
-- Note: SELECT policy returns rows but the application/edge function never returns
-- raw secrets to the client; UI uses an edge function that emits masked previews.
CREATE POLICY "Admins can view telephony provider settings"
  ON public.telephony_provider_settings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert telephony provider settings"
  ON public.telephony_provider_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update telephony provider settings"
  ON public.telephony_provider_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_telephony_provider_settings_updated_at
  BEFORE UPDATE ON public.telephony_provider_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed singleton row if missing
INSERT INTO public.telephony_provider_settings (id, provider)
VALUES ('global', 'telecmi')
ON CONFLICT (id) DO NOTHING;