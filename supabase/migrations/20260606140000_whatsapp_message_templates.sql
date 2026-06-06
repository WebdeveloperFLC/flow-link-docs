-- Phase 2b: Meta-approved message templates (outside 24h session)

CREATE TABLE IF NOT EXISTS public.whatsapp_message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  language_code text NOT NULL DEFAULT 'en',
  label text NOT NULL,
  body_preview text,
  param_count integer NOT NULL DEFAULT 0 CHECK (param_count >= 0 AND param_count <= 10),
  param_labels jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_message_templates_name_lang_unique UNIQUE (name, language_code)
);

-- Default follow-up — create matching template in Meta Business Manager (name must match exactly)
INSERT INTO public.whatsapp_message_templates (
  name, language_code, label, body_preview, param_count, param_labels
)
VALUES (
  'fl_helpline_followup',
  'en',
  'Helpline follow-up',
  'Hello {{1}}, this is {{2}} from Future Link. We are here to help with your study abroad query. Please reply when convenient.',
  2,
  '["Client first name", "Counselor name"]'::jsonb
)
ON CONFLICT (name, language_code) DO NOTHING;

ALTER TABLE public.whatsapp_message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_templates_select"
  ON public.whatsapp_message_templates FOR SELECT TO authenticated
  USING (active = true);

CREATE POLICY "whatsapp_templates_admin_write"
  ON public.whatsapp_message_templates FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'administrator'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'administrator'::public.app_role)
  );
