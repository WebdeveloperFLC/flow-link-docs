-- 1. Letter templates table
CREATE TABLE public.letter_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('cover','rcic','statdec')),
  version INTEGER NOT NULL DEFAULT 1,
  file_path TEXT,
  style_text TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_letter_templates_kind_active ON public.letter_templates(kind, is_active);

ALTER TABLE public.letter_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "letter_templates readable by authenticated"
  ON public.letter_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins insert letter_templates"
  ON public.letter_templates FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "admins update letter_templates"
  ON public.letter_templates FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "admins delete letter_templates"
  ON public.letter_templates FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER letter_templates_touch
BEFORE UPDATE ON public.letter_templates
FOR EACH ROW EXECUTE FUNCTION public.touch_client_profile_updated_at();

-- 2. Firm profile (singleton)
CREATE TABLE public.firm_profile (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_name TEXT,
  firm_address TEXT,
  firm_phone TEXT,
  firm_email TEXT,
  firm_website TEXT,
  logo_path TEXT,
  rcic_name TEXT,
  rcic_number TEXT,
  rcic_jurisdiction TEXT,
  signature_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.firm_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "firm_profile readable by authenticated"
  ON public.firm_profile FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins insert firm_profile"
  ON public.firm_profile FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "admins update firm_profile"
  ON public.firm_profile FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "admins delete firm_profile"
  ON public.firm_profile FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER firm_profile_touch
BEFORE UPDATE ON public.firm_profile
FOR EACH ROW EXECUTE FUNCTION public.touch_client_profile_updated_at();

-- 3. Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('letter-templates','letter-templates', false)
ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('branding','branding', false)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage policies
CREATE POLICY "letter-templates readable by authenticated"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'letter-templates');
CREATE POLICY "admins write letter-templates"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'letter-templates' AND has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "admins update letter-templates"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'letter-templates' AND has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "admins delete letter-templates"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'letter-templates' AND has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "branding readable by authenticated"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'branding');
CREATE POLICY "admins write branding"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'branding' AND has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "admins update branding"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'branding' AND has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "admins delete branding"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'branding' AND has_role(auth.uid(),'admin'::app_role));