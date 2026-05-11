
-- ============= ENUMS =============
DO $$ BEGIN
  CREATE TYPE public.assessment_invite_status AS ENUM ('pending','registered','expired','revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.assessment_lead_source AS ENUM ('invite','referral','existing_client');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.assessment_session_status AS ENUM ('draft','in_progress','submitted','counselor_reviewed','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============= TABLES =============

CREATE TABLE IF NOT EXISTS public.assessment_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  email text NOT NULL,
  phone text,
  first_name text,
  middle_name text,
  last_name text,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.assessment_invite_status NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  redeemed_at timestamptz,
  redeemed_lead_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_assessment_invites_email ON public.assessment_invitations(lower(email));
CREATE INDEX IF NOT EXISTS idx_assessment_invites_status ON public.assessment_invitations(status);

CREATE TABLE IF NOT EXISTS public.assessment_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  middle_name text,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  email_verified_at timestamptz,
  referral_code_used text,
  source public.assessment_lead_source NOT NULL,
  invitation_id uuid REFERENCES public.assessment_invitations(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_assessment_leads_email_ci ON public.assessment_leads(lower(email));
CREATE INDEX IF NOT EXISTS idx_assessment_leads_auth ON public.assessment_leads(auth_user_id);

CREATE TABLE IF NOT EXISTS public.assessment_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.assessment_leads(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  country text NOT NULL DEFAULT 'Canada',
  goal text NOT NULL DEFAULT 'permanent_residence',
  status public.assessment_session_status NOT NULL DEFAULT 'draft',
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb NOT NULL DEFAULT '{}'::jsonb,
  pdf_path text,
  temperature text,
  assigned_counselor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at timestamptz,
  last_emailed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_lead ON public.assessment_sessions(lead_id);
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_status ON public.assessment_sessions(status);
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_client ON public.assessment_sessions(client_id);

CREATE TABLE IF NOT EXISTS public.assessment_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  section text NOT NULL,
  q_type text NOT NULL,
  label text NOT NULL,
  help_text text,
  options jsonb,
  required boolean NOT NULL DEFAULT false,
  conditional_on jsonb,
  order_index int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  country text NOT NULL DEFAULT 'Canada',
  goal text NOT NULL DEFAULT 'permanent_residence',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_assessment_questions_section ON public.assessment_questions(section, order_index);

CREATE TABLE IF NOT EXISTS public.assessment_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  country text NOT NULL DEFAULT 'Canada',
  goal text NOT NULL DEFAULT 'permanent_residence',
  match_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.assessment_pdf_wrapper (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  header_text text,
  footer_text text,
  cover_pdf_path text,
  extra_pdfs jsonb NOT NULL DEFAULT '[]'::jsonb,
  primary_color text DEFAULT '#1e40af',
  company_name text,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.assessment_pdf_wrapper (id, company_name) VALUES (1, 'Future Link Consultants')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.assessment_email_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.assessment_leads(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  email text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '48 hours'),
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_assessment_email_verifications_lead ON public.assessment_email_verifications(lead_id);

-- ============= UPDATED_AT TRIGGERS =============
DO $$ BEGIN
  CREATE TRIGGER trg_assessment_invitations_touch BEFORE UPDATE ON public.assessment_invitations
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_assessment_leads_touch BEFORE UPDATE ON public.assessment_leads
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_assessment_sessions_touch BEFORE UPDATE ON public.assessment_sessions
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_assessment_questions_touch BEFORE UPDATE ON public.assessment_questions
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_assessment_programs_touch BEFORE UPDATE ON public.assessment_programs
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============= RLS =============
ALTER TABLE public.assessment_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_pdf_wrapper ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_email_verifications ENABLE ROW LEVEL SECURITY;

-- staff helper inline
-- INVITATIONS: staff manage
CREATE POLICY "assessment_invites_staff_all" ON public.assessment_invitations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'counselor'::app_role) OR public.has_role(auth.uid(),'telecaller'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'counselor'::app_role) OR public.has_role(auth.uid(),'telecaller'::app_role));

-- LEADS: staff all; lead can see own row
CREATE POLICY "assessment_leads_staff_all" ON public.assessment_leads
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'counselor'::app_role) OR public.has_role(auth.uid(),'telecaller'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'counselor'::app_role) OR public.has_role(auth.uid(),'telecaller'::app_role));
CREATE POLICY "assessment_leads_self_select" ON public.assessment_leads
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

-- SESSIONS: staff all; lead can read+update own non-submitted; submitted read-only
CREATE POLICY "assessment_sessions_staff_all" ON public.assessment_sessions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'counselor'::app_role) OR public.has_role(auth.uid(),'telecaller'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'counselor'::app_role) OR public.has_role(auth.uid(),'telecaller'::app_role));
CREATE POLICY "assessment_sessions_self_select" ON public.assessment_sessions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assessment_leads l WHERE l.id = assessment_sessions.lead_id AND l.auth_user_id = auth.uid()));
CREATE POLICY "assessment_sessions_self_update" ON public.assessment_sessions
  FOR UPDATE TO authenticated
  USING (status IN ('draft','in_progress') AND EXISTS (SELECT 1 FROM public.assessment_leads l WHERE l.id = assessment_sessions.lead_id AND l.auth_user_id = auth.uid()))
  WITH CHECK (status IN ('draft','in_progress','submitted') AND EXISTS (SELECT 1 FROM public.assessment_leads l WHERE l.id = assessment_sessions.lead_id AND l.auth_user_id = auth.uid()));

-- QUESTIONS/PROGRAMS: admin write; authenticated read
CREATE POLICY "assessment_questions_admin_write" ON public.assessment_questions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "assessment_questions_read" ON public.assessment_questions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "assessment_programs_admin_write" ON public.assessment_programs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "assessment_programs_read" ON public.assessment_programs
  FOR SELECT TO authenticated USING (true);

-- PDF WRAPPER: admin write, staff read
CREATE POLICY "assessment_pdf_wrapper_admin_write" ON public.assessment_pdf_wrapper
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "assessment_pdf_wrapper_staff_read" ON public.assessment_pdf_wrapper
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'counselor'::app_role) OR public.has_role(auth.uid(),'telecaller'::app_role));

-- EMAIL VERIFICATIONS: edge-functions only (deny client direct)
CREATE POLICY "assessment_email_verifications_deny" ON public.assessment_email_verifications
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- ============= STORAGE BUCKET =============
INSERT INTO storage.buckets (id, name, public) VALUES ('assessment-pdf-assets','assessment-pdf-assets', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "assessment_pdf_assets_staff_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'assessment-pdf-assets' AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'counselor'::app_role) OR public.has_role(auth.uid(),'telecaller'::app_role)));
CREATE POLICY "assessment_pdf_assets_admin_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'assessment-pdf-assets' AND public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "assessment_pdf_assets_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'assessment-pdf-assets' AND public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "assessment_pdf_assets_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'assessment-pdf-assets' AND public.has_role(auth.uid(),'admin'::app_role));

-- ============= SEED PR QUESTIONS =============
INSERT INTO public.assessment_questions (code, section, q_type, label, options, required, order_index) VALUES
  ('age','personal','number','What is your age?',NULL,true,10),
  ('marital_status','personal','select','Marital status?', '["single","married","common_law","divorced","widowed","separated"]'::jsonb, true, 20),
  ('dependents','personal','number','Number of dependent children?', NULL, false, 30),
  ('highest_education','education','select','Highest level of completed education?', '["high_school","one_year_diploma","two_year_diploma","bachelors","two_or_more_credentials","masters","phd"]'::jsonb, true, 40),
  ('eca_done','education','boolean','Have you completed an Educational Credential Assessment (ECA)?', NULL, false, 50),
  ('eca_agency','education','select','ECA agency (if applicable)', '["WES","IQAS","CES","ICES","ICAS","MCC","PEBC","none"]'::jsonb, false, 55),
  ('english_test','language','select','English test taken?', '["IELTS","CELPIP","PTE","none"]'::jsonb, true, 60),
  ('english_overall','language','number','English overall score', NULL, false, 65),
  ('french_test','language','select','French test taken?', '["TEF","TCF","none"]'::jsonb, false, 70),
  ('french_overall','language','number','French overall score', NULL, false, 75),
  ('work_experience_years','work','number','Years of skilled work experience', NULL, true, 80),
  ('noc_teer','work','select','Your occupation TEER level', '["TEER 0","TEER 1","TEER 2","TEER 3","TEER 4","TEER 5","not_sure"]'::jsonb, false, 85),
  ('canadian_work_experience','work','number','Years of Canadian work experience', NULL, false, 90),
  ('canadian_study','canada','boolean','Have you studied in Canada?', NULL, false, 100),
  ('canadian_relatives','canada','boolean','Do you have eligible relatives in Canada?', NULL, false, 105),
  ('job_offer','canada','boolean','Do you have a valid Canadian job offer?', NULL, false, 110),
  ('lmia','canada','boolean','Is the job offer LMIA-backed?', NULL, false, 115),
  ('province_preference','province','multiselect','Preferred province(s)', '["Alberta","BC","Manitoba","New Brunswick","Newfoundland","Nova Scotia","Ontario","PEI","Quebec","Saskatchewan","Yukon","NWT","Nunavut","no_preference"]'::jsonb, false, 120),
  ('settlement_funds','funds','number','Settlement funds available (CAD)', NULL, true, 130),
  ('criminal_history','compliance','boolean','Any criminal history?', NULL, true, 140),
  ('medical_issues','compliance','boolean','Any serious medical conditions?', NULL, false, 145),
  ('refusal_history','compliance','boolean','Any prior visa refusal (any country)?', NULL, true, 150),
  ('overstay_history','compliance','boolean','Any overstay history?', NULL, false, 155),
  ('passport_valid','documents','boolean','Do you hold a valid passport?', NULL, true, 160),
  ('ielts_report_available','documents','boolean','IELTS/CELPIP/PTE result available?', NULL, false, 165),
  ('eca_report_available','documents','boolean','ECA report available?', NULL, false, 170),
  ('proof_of_funds_available','documents','boolean','Proof of funds available?', NULL, false, 175)
ON CONFLICT (code) DO NOTHING;

-- ============= SEED PROGRAMS =============
INSERT INTO public.assessment_programs (code, label, description, match_rules, order_index) VALUES
  ('express_entry','Express Entry (FSW/CEC/FST)','Federal points-based PR pathway for skilled workers.','{"min":{"english_overall":6.0,"work_experience_years":1}}'::jsonb,10),
  ('pnp','Provincial Nominee Program','Province-nominated PR streams; widely available.','{}'::jsonb,20),
  ('atlantic','Atlantic Immigration Program','PR via a designated employer in Atlantic Canada.','{"requires":["job_offer"],"province_in":["New Brunswick","Newfoundland","Nova Scotia","PEI"]}'::jsonb,30),
  ('rural_pilot','Rural Community Immigration Pilot','Community-recommended PR pathway in rural Canada.','{"requires":["job_offer"]}'::jsonb,40),
  ('francophone','Francophone Mobility / Francophone Pathways','Faster paths for French-speaking applicants.','{"min":{"french_overall":5}}'::jsonb,50),
  ('quebec','Quebec Programs (PEQ/QSW)','Quebec-managed PR programs with French and provincial criteria.','{"province_in":["Quebec"]}'::jsonb,60),
  ('caregiver','Caregiver / Home Care Worker Pilot','PR pathway for in-home care workers.','{}'::jsonb,70)
ON CONFLICT (code) DO NOTHING;
