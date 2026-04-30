-- Phase 1: Forms Library + Questionnaire foundation + Sections + Filled Forms

-- ============================================================
-- 1. case_sections (seeded list of binder sections)
-- ============================================================
CREATE TABLE public.case_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT true,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.case_sections (key, label, sort_order) VALUES
  ('identity', 'Identity', 10),
  ('academics', 'Academics', 20),
  ('experience', 'Experience', 30),
  ('finance', 'Finance', 40),
  ('family', 'Family', 50),
  ('other', 'Other', 60);

ALTER TABLE public.case_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "case_sections readable by authenticated"
  ON public.case_sections FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage case_sections"
  ON public.case_sections FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- 2. visa_forms (Forms Library)
-- ============================================================
CREATE TABLE public.visa_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL,
  category text NOT NULL,
  name text NOT NULL,
  code text,
  version int NOT NULL DEFAULT 1,
  file_path text NOT NULL,
  file_name text NOT NULL,
  size_bytes bigint,
  is_active boolean NOT NULL DEFAULT true,
  is_archived boolean NOT NULL DEFAULT false,
  requires_validation boolean NOT NULL DEFAULT false,
  auto_questionnaire boolean NOT NULL DEFAULT true,
  send_mode text NOT NULL DEFAULT 'manual', -- manual | auto
  email_template_id uuid,
  notes text,
  parent_form_id uuid, -- previous version reference
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_visa_forms_country_category ON public.visa_forms(country, category) WHERE NOT is_archived;
CREATE INDEX idx_visa_forms_active ON public.visa_forms(is_active) WHERE NOT is_archived;

ALTER TABLE public.visa_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visa_forms readable by authenticated"
  ON public.visa_forms FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins insert visa_forms"
  ON public.visa_forms FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins update visa_forms"
  ON public.visa_forms FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins delete visa_forms"
  ON public.visa_forms FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- 3. questionnaire_email_templates
-- ============================================================
CREATE TABLE public.questionnaire_email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.questionnaire_email_templates (name, subject, body_html, is_default) VALUES (
  'Default questionnaire invitation',
  'Please complete your application questionnaire',
  '<p>Hello {{client_name}},</p><p>Please complete the questionnaire for your <strong>{{form_name}}</strong> application by clicking the link below.</p><p><a href="{{link}}">Open questionnaire</a></p><p>You can save your progress and return any time using this same link.</p><p>Thank you,<br/>{{firm_name}}</p>',
  true
);

ALTER TABLE public.questionnaire_email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qet readable by authenticated"
  ON public.questionnaire_email_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage qet"
  ON public.questionnaire_email_templates FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add FK after table exists
ALTER TABLE public.visa_forms
  ADD CONSTRAINT fk_visa_forms_email_template
  FOREIGN KEY (email_template_id) REFERENCES public.questionnaire_email_templates(id) ON DELETE SET NULL;

-- ============================================================
-- 4. questionnaire_schemas
-- ============================================================
CREATE TABLE public.questionnaire_schemas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid REFERENCES public.visa_forms(id) ON DELETE CASCADE,
  name text NOT NULL,
  country text,
  category text,
  service_type text,
  version int NOT NULL DEFAULT 1,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{key,label,fields:[{id,label,type,options,required,repeatable,mapping_key,pdf_field}]}]
  mappings jsonb NOT NULL DEFAULT '{}'::jsonb, -- field_id -> {table, column}
  is_active boolean NOT NULL DEFAULT false, -- admin must activate after review
  is_draft boolean NOT NULL DEFAULT true,
  generated_by_ai boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_qschemas_form ON public.questionnaire_schemas(form_id);

ALTER TABLE public.questionnaire_schemas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qschemas readable by authenticated"
  ON public.questionnaire_schemas FOR SELECT TO authenticated USING (true);
CREATE POLICY "team manages qschemas"
  ON public.questionnaire_schemas FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'counselor'::app_role) OR has_role(auth.uid(), 'documentation'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'counselor'::app_role) OR has_role(auth.uid(), 'documentation'::app_role));

-- ============================================================
-- 5. questionnaire_instances
-- ============================================================
CREATE TABLE public.questionnaire_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  schema_id uuid NOT NULL REFERENCES public.questionnaire_schemas(id) ON DELETE CASCADE,
  form_id uuid REFERENCES public.visa_forms(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft', -- draft | sent | in_progress | submitted | reviewed
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  share_token text UNIQUE,
  expires_at timestamptz,
  last_saved_at timestamptz,
  submitted_at timestamptz,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_qinst_client ON public.questionnaire_instances(client_id);
CREATE INDEX idx_qinst_token ON public.questionnaire_instances(share_token) WHERE share_token IS NOT NULL;

ALTER TABLE public.questionnaire_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qinst readable by authenticated"
  ON public.questionnaire_instances FOR SELECT TO authenticated USING (true);
CREATE POLICY "team manages qinst"
  ON public.questionnaire_instances FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'counselor'::app_role) OR has_role(auth.uid(), 'documentation'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'counselor'::app_role) OR has_role(auth.uid(), 'documentation'::app_role));

-- ============================================================
-- 6. filled_forms
-- ============================================================
CREATE TABLE public.filled_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  form_id uuid NOT NULL REFERENCES public.visa_forms(id) ON DELETE CASCADE,
  instance_id uuid REFERENCES public.questionnaire_instances(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  size_bytes bigint,
  status text NOT NULL DEFAULT 'draft', -- draft | confirmed | validated | invalid
  validation_report jsonb,
  validated_at timestamptz,
  confirmed_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_filled_forms_client ON public.filled_forms(client_id);

ALTER TABLE public.filled_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "filled_forms readable by authenticated"
  ON public.filled_forms FOR SELECT TO authenticated USING (true);
CREATE POLICY "team manages filled_forms"
  ON public.filled_forms FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'counselor'::app_role) OR has_role(auth.uid(), 'documentation'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'counselor'::app_role) OR has_role(auth.uid(), 'documentation'::app_role));

-- ============================================================
-- 7. Extend client_documents with section + ordering
-- ============================================================
ALTER TABLE public.client_documents
  ADD COLUMN IF NOT EXISTS section_id uuid REFERENCES public.case_sections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS section_order int NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_client_docs_section ON public.client_documents(section_id);

-- ============================================================
-- 8. Extend binders with scope + selected items
-- ============================================================
ALTER TABLE public.binders
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'final', -- section | final
  ADD COLUMN IF NOT EXISTS section_id uuid REFERENCES public.case_sections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS included_items jsonb,
  ADD COLUMN IF NOT EXISTS order_mode text NOT NULL DEFAULT 'auto'; -- auto | manual

-- ============================================================
-- 9. Per-client section settings (order mode per section per client)
-- ============================================================
CREATE TABLE public.client_section_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  section_id uuid NOT NULL REFERENCES public.case_sections(id) ON DELETE CASCADE,
  order_mode text NOT NULL DEFAULT 'auto', -- auto | manual
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, section_id)
);

ALTER TABLE public.client_section_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "css readable by authenticated"
  ON public.client_section_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "team manages css"
  ON public.client_section_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'counselor'::app_role) OR has_role(auth.uid(), 'documentation'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'counselor'::app_role) OR has_role(auth.uid(), 'documentation'::app_role));

-- ============================================================
-- 10. Storage bucket for visa form templates (private)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('visa-forms', 'visa-forms', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "authenticated read visa-forms"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'visa-forms');
CREATE POLICY "admins write visa-forms"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'visa-forms' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins update visa-forms"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'visa-forms' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins delete visa-forms"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'visa-forms' AND has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- 11. updated_at triggers
-- ============================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_visa_forms_updated BEFORE UPDATE ON public.visa_forms
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_qet_updated BEFORE UPDATE ON public.questionnaire_email_templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_qschemas_updated BEFORE UPDATE ON public.questionnaire_schemas
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_qinst_updated BEFORE UPDATE ON public.questionnaire_instances
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_filled_forms_updated BEFORE UPDATE ON public.filled_forms
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_css_updated BEFORE UPDATE ON public.client_section_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();