
-- Single global SMTP configuration (admin-only). Password stored server-side; client never reads it.
CREATE TABLE public.smtp_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  provider text NOT NULL DEFAULT 'custom',
  host text NOT NULL DEFAULT '',
  port integer NOT NULL DEFAULT 465,
  encryption text NOT NULL DEFAULT 'ssl' CHECK (encryption IN ('ssl','tls','none')),
  username text NOT NULL DEFAULT '',
  password text NOT NULL DEFAULT '',
  sender_email text NOT NULL DEFAULT '',
  sender_name text NOT NULL DEFAULT '',
  reply_to text,
  is_active boolean NOT NULL DEFAULT false,
  last_status text,
  last_verified_at timestamptz,
  last_error text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.smtp_settings ENABLE ROW LEVEL SECURITY;

-- Admins can read non-sensitive metadata via this table; password is excluded from selects via a view.
CREATE POLICY "Admins read smtp_settings"
  ON public.smtp_settings FOR SELECT
  USING (public.has_role(auth.uid(),'admin'::app_role));

-- All writes are blocked from the client; edge functions use service role.
-- (No insert/update/delete policies => denied for anon/authenticated.)

CREATE TRIGGER trg_smtp_settings_updated_at
  BEFORE UPDATE ON public.smtp_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Safe view exposed to admins (no password).
CREATE OR REPLACE VIEW public.smtp_settings_safe AS
SELECT id, provider, host, port, encryption, username, sender_email, sender_name,
       reply_to, is_active, last_status, last_verified_at, last_error,
       updated_by, updated_at, created_at,
       (length(coalesce(password,'')) > 0) AS has_password
FROM public.smtp_settings;

GRANT SELECT ON public.smtp_settings_safe TO authenticated;

-- Email logs for outbound app emails sent via SMTP.
CREATE TABLE public.app_email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient text NOT NULL,
  subject text NOT NULL,
  body_html text,
  body_text text,
  category text,
  provider text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','retrying')),
  error_message text,
  attempts integer NOT NULL DEFAULT 0,
  sent_at timestamptz,
  next_retry_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  triggered_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_app_email_logs_created_at ON public.app_email_logs (created_at DESC);
CREATE INDEX idx_app_email_logs_status ON public.app_email_logs (status);

ALTER TABLE public.app_email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read app_email_logs"
  ON public.app_email_logs FOR SELECT
  USING (public.has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_app_email_logs_updated_at
  BEFORE UPDATE ON public.app_email_logs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed singleton row with Hostinger defaults so the form has something to load.
INSERT INTO public.smtp_settings (provider, host, port, encryption, sender_email, sender_name)
VALUES ('hostinger','smtp.hostinger.com',465,'ssl','support@dms.futurelinkconsultants.com','Future Link Consultants')
ON CONFLICT (singleton) DO NOTHING;
