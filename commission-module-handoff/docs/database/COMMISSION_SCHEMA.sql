-- COMMISSION MODULE SCHEMA REFERENCE (concatenated migrations)
-- Apply in chronological order in a fresh Supabase project.
-- Foundational migrations first, then phase 1/2A/2B.

-- ===== FILE: 20260516010849_7e57a616-8535-4d70-8371-6ccd32b6b008.sql =====

-- ============ LOOKUPS ============
CREATE TABLE upi_countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  iso_alpha2 char(2) UNIQUE,
  iso_alpha3 char(3) UNIQUE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE upi_program_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

INSERT INTO upi_program_levels (name, slug, sort_order) VALUES
  ('Certificate', 'certificate', 10),
  ('Diploma', 'diploma', 20),
  ('Advanced Diploma', 'advanced-diploma', 30),
  ('Associate Degree', 'associate-degree', 40),
  ('Bachelor', 'bachelor', 50),
  ('Graduate Certificate', 'graduate-certificate', 55),
  ('Graduate Diploma', 'graduate-diploma', 60),
  ('Master', 'master', 70),
  ('MBA', 'mba', 75),
  ('PhD / Doctorate', 'phd', 80),
  ('Postdoctoral', 'postdoctoral', 90)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE upi_study_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE upi_discipline_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  study_area_id uuid REFERENCES upi_study_areas(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE upi_taxonomy_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  category_type text,
  parent_id uuid REFERENCES upi_taxonomy_categories(id) ON DELETE SET NULL,
  is_system boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE upi_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text,
  created_at timestamptz DEFAULT now()
);

-- ============ INSTITUTIONS ============
CREATE TABLE upi_institutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  country_id uuid REFERENCES upi_countries(id) ON DELETE SET NULL,
  country_name text,
  website_url text,
  logo_url text,
  phone text,
  email text,
  address text,
  city text,
  state_province text,
  institution_type text,
  ranking_info text,
  accreditation text,
  established_year int,
  total_programs int,
  is_active boolean DEFAULT true,
  is_partner boolean DEFAULT false,
  partner_since date,
  notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE upi_institution_tags (
  institution_id uuid REFERENCES upi_institutions(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES upi_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (institution_id, tag_id)
);

CREATE TABLE upi_campuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES upi_institutions(id) ON DELETE CASCADE,
  name text NOT NULL,
  city text,
  state_province text,
  country_id uuid REFERENCES upi_countries(id) ON DELETE SET NULL,
  country_name text,
  is_main_campus boolean DEFAULT false,
  address text,
  phone text,
  email text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============ SOURCES & SYNC ============
CREATE TABLE upi_institution_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES upi_institutions(id) ON DELETE CASCADE,
  name text,
  source_type text NOT NULL CHECK (source_type IN (
    'website_url','listing_page','scholarship_page','tuition_page',
    'international_page','pdf_brochure','excel_sheet','csv_feed',
    'api_endpoint','uploaded_email','json_feed','sitemap'
  )),
  url text,
  file_path text,
  parser_type text DEFAULT 'auto',
  crawl_status text DEFAULT 'idle' CHECK (crawl_status IN (
    'idle','queued','running','completed','failed','paused'
  )),
  last_synced_at timestamptz,
  next_sync_at timestamptz,
  sync_frequency text DEFAULT 'manual' CHECK (sync_frequency IN (
    'manual','daily','weekly','monthly'
  )),
  extracted_records_count int DEFAULT 0,
  confidence_score int DEFAULT 0 CHECK (confidence_score BETWEEN 0 AND 100),
  pages_found int DEFAULT 0,
  pages_scanned int DEFAULT 0,
  error_log jsonb DEFAULT '[]',
  is_active boolean DEFAULT true,
  priority int DEFAULT 0,
  notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE upi_sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES upi_institution_sources(id) ON DELETE CASCADE,
  institution_id uuid REFERENCES upi_institutions(id) ON DELETE SET NULL,
  triggered_by uuid,
  status text DEFAULT 'queued' CHECK (status IN (
    'queued','running','completed','completed_with_errors','failed','cancelled'
  )),
  pages_discovered int DEFAULT 0,
  pages_scanned int DEFAULT 0,
  pages_failed int DEFAULT 0,
  records_extracted int DEFAULT 0,
  records_upserted int DEFAULT 0,
  records_rejected int DEFAULT 0,
  error_summary text,
  started_at timestamptz,
  completed_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE upi_sync_logs (
  id bigserial PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES upi_sync_jobs(id) ON DELETE CASCADE,
  level text DEFAULT 'info' CHECK (level IN ('debug','info','warn','error')),
  page_url text,
  message text NOT NULL,
  detail jsonb,
  created_at timestamptz DEFAULT now()
);

-- ============ DOCUMENTS ============
CREATE TABLE upi_uploaded_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES upi_institutions(id) ON DELETE SET NULL,
  source_id uuid REFERENCES upi_institution_sources(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text,
  file_size_bytes bigint,
  mime_type text,
  raw_text text,
  page_count int,
  classification jsonb DEFAULT '{}',
  detected_language text,
  confidence_score int DEFAULT 0 CHECK (confidence_score BETWEEN 0 AND 100),
  review_status text DEFAULT 'pending' CHECK (review_status IN (
    'pending','processing','approved','rejected','needs_review'
  )),
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  is_processed boolean DEFAULT false,
  processing_error text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE upi_document_categories (
  document_id uuid REFERENCES upi_uploaded_documents(id) ON DELETE CASCADE,
  category_id uuid REFERENCES upi_taxonomy_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (document_id, category_id)
);

CREATE TABLE upi_extraction_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES upi_uploaded_documents(id) ON DELETE CASCADE,
  job_id uuid REFERENCES upi_sync_jobs(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_key text,
  entity_value text,
  entity_value_structured jsonb,
  confidence int DEFAULT 0 CHECK (confidence BETWEEN 0 AND 100),
  source_text text,
  page_number int,
  field_path text,
  is_approved boolean DEFAULT false,
  is_rejected boolean DEFAULT false,
  routed_to text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE upi_ai_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES upi_institutions(id) ON DELETE SET NULL,
  document_id uuid REFERENCES upi_uploaded_documents(id) ON DELETE SET NULL,
  source_id uuid REFERENCES upi_institution_sources(id) ON DELETE SET NULL,
  suggestion_type text NOT NULL CHECK (suggestion_type IN (
    'new_category','new_field','new_program','commission_structure',
    'promotion','scholarship','intake_update','tuition_update',
    'eligibility_rule','language_requirement','general'
  )),
  title text,
  description text,
  suggestion_data jsonb DEFAULT '{}',
  confidence int DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN (
    'pending','accepted','dismissed','deferred'
  )),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_by text DEFAULT 'ai',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- ============ AGREEMENTS ============
CREATE TABLE upi_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES upi_institutions(id) ON DELETE CASCADE,
  title text NOT NULL,
  agreement_type text DEFAULT 'general' CHECK (agreement_type IN (
    'general','commission','scholarship','partnership','mou','other'
  )),
  file_path text,
  valid_from date,
  valid_to date,
  status text DEFAULT 'active' CHECK (status IN (
    'draft','active','expired','terminated','suspended'
  )),
  signed_by_institution text,
  signed_by_us text,
  signed_date date,
  renewal_reminder_days int DEFAULT 30,
  extracted_data jsonb DEFAULT '{}',
  notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE upi_agreement_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL REFERENCES upi_agreements(id) ON DELETE CASCADE,
  version_number int NOT NULL,
  file_path text,
  change_summary text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- ============ COMMISSIONS ============
CREATE TABLE upi_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES upi_institutions(id) ON DELETE CASCADE,
  agreement_id uuid REFERENCES upi_agreements(id) ON DELETE SET NULL,
  name text NOT NULL,
  model_type text NOT NULL CHECK (model_type IN (
    'fixed','percentage','slab','yearly','semester','bonus','conditional','hybrid'
  )),
  currency text DEFAULT 'CAD',
  description text,
  is_active boolean DEFAULT false,
  is_proposed boolean DEFAULT true,
  version int DEFAULT 1,
  effective_from date,
  effective_to date,
  source text DEFAULT 'manual' CHECK (source IN (
    'manual','ai_extracted','imported','inherited'
  )),
  notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE upi_commission_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_id uuid NOT NULL REFERENCES upi_commissions(id) ON DELETE CASCADE,
  rule_name text,
  rule_type text CHECK (rule_type IN (
    'base','slab_tier','bonus','penalty','seasonal','program_specific','conditional'
  )),
  condition_field text,
  condition_operator text,
  condition_value text,
  payout_amount numeric(12,2),
  payout_type text CHECK (payout_type IN ('fixed','percentage','multiplier')),
  payout_currency text DEFAULT 'CAD',
  min_value numeric(12,2),
  max_value numeric(12,2),
  effective_from date,
  effective_to date,
  sort_order int DEFAULT 0,
  notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- ============ COURSES STAGING ============
CREATE TABLE upi_courses_staging (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES upi_institutions(id) ON DELETE SET NULL,
  campus_id uuid REFERENCES upi_campuses(id) ON DELETE SET NULL,
  source_id uuid REFERENCES upi_institution_sources(id) ON DELETE SET NULL,
  job_id uuid REFERENCES upi_sync_jobs(id) ON DELETE SET NULL,
  study_area_id uuid REFERENCES upi_study_areas(id) ON DELETE SET NULL,
  discipline_area_id uuid REFERENCES upi_discipline_areas(id) ON DELETE SET NULL,
  program_level_id uuid REFERENCES upi_program_levels(id) ON DELETE SET NULL,
  dedup_hash text UNIQUE,
  source_identifier text,
  course_title text NOT NULL,
  course_description text,
  campus_name text,
  country_name text,
  state_province text,
  city text,
  program_url text,
  source_url text,
  duration_value numeric(6,2),
  duration_unit text,
  tuition_fee numeric(14,2),
  tuition_fee_per text,
  application_fee numeric(10,2),
  currency text,
  intake_months jsonb DEFAULT '[]',
  ielts_overall numeric(3,1),
  ielts_min_component numeric(3,1),
  pte_overall int,
  toefl_overall int,
  duolingo_overall int,
  cambridge_overall int,
  gpa_requirement text,
  work_experience_years int,
  age_requirement text,
  has_scholarship boolean,
  scholarship_amount numeric(12,2),
  scholarship_currency text,
  scholarship_detail text,
  is_coop boolean,
  is_pr_pathway boolean,
  is_online boolean,
  is_part_time boolean,
  commission_info text,
  bonus_info text,
  review_status text DEFAULT 'pending_review' CHECK (review_status IN (
    'pending_review','approved','rejected','published','needs_update'
  )),
  confidence_score int DEFAULT 0 CHECK (confidence_score BETWEEN 0 AND 100),
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  published_course_id text,
  source_last_updated date,
  extracted_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE upi_course_intakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES upi_courses_staging(id) ON DELETE CASCADE,
  month text NOT NULL,
  year int,
  is_confirmed boolean DEFAULT true,
  notes text
);

CREATE TABLE upi_language_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES upi_courses_staging(id) ON DELETE CASCADE,
  test_name text NOT NULL,
  overall_score numeric(5,2),
  min_component_score numeric(5,2),
  component_name text,
  notes text,
  metadata jsonb DEFAULT '{}'
);

CREATE TABLE upi_scholarship_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES upi_courses_staging(id) ON DELETE CASCADE,
  institution_id uuid REFERENCES upi_institutions(id) ON DELETE SET NULL,
  name text,
  amount numeric(12,2),
  currency text,
  coverage text,
  eligibility text,
  deadline_month text,
  is_automatic boolean DEFAULT false,
  notes text,
  metadata jsonb DEFAULT '{}'
);

CREATE TABLE upi_eligibility_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES upi_courses_staging(id) ON DELETE CASCADE,
  rule_type text,
  description text NOT NULL,
  raw_text text,
  metadata jsonb DEFAULT '{}'
);

-- ============ PROMOTIONS & CAMPAIGNS ============
CREATE TABLE upi_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES upi_institutions(id) ON DELETE CASCADE,
  title text NOT NULL,
  promo_type text CHECK (promo_type IN (
    'scholarship','pr_pathway','low_ielts','coop','seasonal',
    'high_demand','affordable','work_permit','fast_track','general'
  )),
  description text,
  valid_from date,
  valid_to date,
  target_countries jsonb DEFAULT '[]',
  target_disciplines jsonb DEFAULT '[]',
  conditions jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  auto_detected boolean DEFAULT false,
  detection_source text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE upi_marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES upi_institutions(id) ON DELETE SET NULL,
  promotion_id uuid REFERENCES upi_promotions(id) ON DELETE SET NULL,
  title text,
  channel text NOT NULL CHECK (channel IN (
    'email','whatsapp','social_post','brochure','counselor_note','sms','push'
  )),
  generated_content text,
  prompt_context jsonb DEFAULT '{}',
  approved_by uuid,
  approved_at timestamptz,
  sent_at timestamptz,
  status text DEFAULT 'draft' CHECK (status IN (
    'draft','approved','sent','archived','rejected'
  )),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============ AUDIT ============
CREATE TABLE upi_audit_logs (
  id bigserial PRIMARY KEY,
  table_name text NOT NULL,
  record_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('insert','update','delete','approve','reject','publish')),
  changed_by uuid,
  changed_fields jsonb,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_upi_sources_institution ON upi_institution_sources(institution_id);
CREATE INDEX IF NOT EXISTS idx_upi_sync_jobs_source ON upi_sync_jobs(source_id, status);
CREATE INDEX IF NOT EXISTS idx_upi_staging_dedup ON upi_courses_staging(dedup_hash);
CREATE INDEX IF NOT EXISTS idx_upi_staging_review ON upi_courses_staging(review_status);
CREATE INDEX IF NOT EXISTS idx_upi_staging_institution ON upi_courses_staging(institution_id);
CREATE INDEX IF NOT EXISTS idx_upi_suggestions_status ON upi_ai_suggestions(status, institution_id);
CREATE INDEX IF NOT EXISTS idx_upi_extraction_document ON upi_extraction_results(document_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_upi_audit_table ON upi_audit_logs(table_name, record_id);

-- ============ SAFE EXTENSION OF EXISTING courses TABLE ============
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='courses') THEN
    EXECUTE 'ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS upi_institution_id uuid REFERENCES upi_institutions(id) ON DELETE SET NULL';
    EXECUTE 'ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS upi_source_id uuid REFERENCES upi_institution_sources(id) ON DELETE SET NULL';
    EXECUTE 'ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS upi_staging_id uuid REFERENCES upi_courses_staging(id) ON DELETE SET NULL';
    EXECUTE 'ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS import_source_url text';
    EXECUTE 'ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS last_synced_at timestamptz';
    EXECUTE 'ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_imported boolean DEFAULT false';
    EXECUTE 'ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS import_confidence int';
  END IF;
END $$;

-- ============ RLS ============
DO $$
DECLARE
  t text;
  tbls text[] := ARRAY[
    'upi_countries','upi_program_levels','upi_study_areas','upi_discipline_areas',
    'upi_taxonomy_categories','upi_tags','upi_institutions','upi_institution_tags',
    'upi_campuses','upi_institution_sources','upi_sync_jobs','upi_sync_logs',
    'upi_uploaded_documents','upi_document_categories','upi_extraction_results',
    'upi_ai_suggestions','upi_agreements','upi_agreement_versions','upi_commissions',
    'upi_commission_rules','upi_courses_staging','upi_course_intakes',
    'upi_language_requirements','upi_scholarship_rules','upi_eligibility_rules',
    'upi_promotions','upi_marketing_campaigns'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "auth_select_%s" ON public.%I FOR SELECT TO authenticated USING (true)', t, t);
    EXECUTE format('CREATE POLICY "auth_insert_%s" ON public.%I FOR INSERT TO authenticated WITH CHECK (true)', t, t);
    EXECUTE format('CREATE POLICY "auth_update_%s" ON public.%I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', t, t);
    EXECUTE format('CREATE POLICY "auth_delete_%s" ON public.%I FOR DELETE TO authenticated USING (true)', t, t);
  END LOOP;
END $$;

-- Audit logs: insert-only for authenticated, no update/delete
ALTER TABLE public.upi_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_upi_audit_logs" ON public.upi_audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_upi_audit_logs" ON public.upi_audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.upi_sync_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.upi_sync_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.upi_ai_suggestions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.upi_uploaded_documents;

-- ============ STORAGE BUCKET ============
INSERT INTO storage.buckets (id, name, public) VALUES ('institution-documents', 'institution-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "auth_select_institution_documents" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'institution-documents');
CREATE POLICY "auth_insert_institution_documents" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'institution-documents');
CREATE POLICY "auth_update_institution_documents" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'institution-documents');
CREATE POLICY "auth_delete_institution_documents" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'institution-documents');

-- ===== FILE: 20260516033040_ddeda665-93ce-4b39-9f8a-e563a65d6f5e.sql =====

-- Pipeline events for uploaded documents
CREATE TABLE IF NOT EXISTS public.upi_document_pipeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.upi_uploaded_documents(id) ON DELETE CASCADE,
  state text NOT NULL CHECK (state IN ('uploaded','processing','extracted','needs_review','approved','rejected','failed')),
  edge_function text,
  message text,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS upi_doc_pipeline_doc_idx ON public.upi_document_pipeline_events(document_id, created_at DESC);
ALTER TABLE public.upi_document_pipeline_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_pipeline_events" ON public.upi_document_pipeline_events FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Document extras
ALTER TABLE public.upi_uploaded_documents
  ADD COLUMN IF NOT EXISTS pipeline_status text DEFAULT 'uploaded',
  ADD COLUMN IF NOT EXISTS extracted_payload jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS linked_record_refs jsonb DEFAULT '[]'::jsonb;

-- Claim cycles
CREATE TABLE IF NOT EXISTS public.upi_claim_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.upi_institutions(id) ON DELETE CASCADE,
  period_label text NOT NULL,
  intake text,
  status text DEFAULT 'open' CHECK (status IN ('open','submitted','partially_paid','closed','disputed')),
  claim_due_date date,
  invoice_due_date date,
  total_expected numeric(14,2) DEFAULT 0,
  total_received numeric(14,2) DEFAULT 0,
  currency text DEFAULT 'CAD',
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.upi_claim_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_claim_cycles" ON public.upi_claim_cycles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Invoices
CREATE TABLE IF NOT EXISTS public.upi_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.upi_institutions(id) ON DELETE CASCADE,
  claim_cycle_id uuid REFERENCES public.upi_claim_cycles(id) ON DELETE SET NULL,
  invoice_no text,
  amount numeric(14,2) DEFAULT 0,
  currency text DEFAULT 'CAD',
  status text DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','partially_paid','overdue','disputed','void')),
  sent_at timestamptz,
  paid_at timestamptz,
  file_path text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.upi_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_invoices" ON public.upi_invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Renewal alerts
CREATE TABLE IF NOT EXISTS public.upi_renewal_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL REFERENCES public.upi_agreements(id) ON DELETE CASCADE,
  threshold_days integer NOT NULL,
  fire_at date NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending','fired','dismissed','snoozed')),
  risk_flags jsonb DEFAULT '[]'::jsonb,
  dismissed_by uuid,
  dismissed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agreement_id, threshold_days)
);
ALTER TABLE public.upi_renewal_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_renewal_alerts" ON public.upi_renewal_alerts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER upi_claim_cycles_updated_at BEFORE UPDATE ON public.upi_claim_cycles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER upi_invoices_updated_at BEFORE UPDATE ON public.upi_invoices
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== FILE: 20260516051211_845aa517-ee97-4b47-a372-693ff9f1aed5.sql =====

-- Student-level commission tracking
CREATE TABLE public.upi_commission_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_cycle_id uuid NOT NULL REFERENCES public.upi_claim_cycles(id) ON DELETE CASCADE,
  institution_id uuid REFERENCES public.upi_institutions(id) ON DELETE SET NULL,
  commission_id uuid REFERENCES public.upi_commissions(id) ON DELETE SET NULL,
  client_id uuid,
  student_name text NOT NULL,
  student_email text,
  student_id_at_institution text,
  passport_number text,
  nationality text,
  country_of_origin text,
  program_name text NOT NULL,
  program_level text,
  campus text,
  intake_term text,
  intake_month text,
  intake_year int,
  program_duration text,
  study_permit_number text,
  study_permit_approved_date date,
  study_permit_expiry date,
  cas_issued_date date,
  consent_form_submitted boolean DEFAULT false,
  consent_form_date date,
  consent_form_withdrawn boolean DEFAULT false,
  consent_withdrawal_date date,
  consent_withdrawal_before_sp boolean,
  enrollment_status text DEFAULT 'pending' CHECK (enrollment_status IN ('pending','enrolled','withdrawn','deferred','dismissed','graduated','on_leave')),
  enrollment_confirmed_date date,
  registered_credits int,
  is_full_time boolean DEFAULT true,
  tuition_amount numeric(12,2),
  tuition_currency text DEFAULT 'CAD',
  tuition_paid_amount numeric(12,2),
  tuition_paid_date date,
  tuition_payment_plan boolean DEFAULT false,
  tuition_full_payment_date date,
  commission_status text DEFAULT 'pending' CHECK (commission_status IN ('pending','eligible','blocked','paid','rejected','carried_forward','partially_paid')),
  commission_amount numeric(12,2),
  commission_rate_applied numeric(5,2),
  commission_calculated_date date,
  commission_paid_date date,
  block_reason text CHECK (block_reason IN ('no_consent_form','consent_withdrawn_before_sp','not_full_time','tuition_not_paid','open_studies','duplicate_claim','agency_changed','insufficient_credits','enrollment_not_confirmed','other')),
  block_notes text,
  is_carried_forward boolean DEFAULT false,
  carried_from_cycle_id uuid,
  carry_forward_reason text,
  carry_forward_to_cycle_id uuid,
  invoice_id uuid,
  submitted_by_agency_date date,
  validated_by_institution_date date,
  institution_validation_notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ucs_cycle ON public.upi_commission_students(claim_cycle_id);
CREATE INDEX idx_ucs_inst ON public.upi_commission_students(institution_id);
CREATE INDEX idx_ucs_status ON public.upi_commission_students(commission_status);
CREATE INDEX idx_ucs_invoice ON public.upi_commission_students(invoice_id);

CREATE TABLE public.upi_commission_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES public.upi_institutions(id) ON DELETE SET NULL,
  claim_cycle_id uuid REFERENCES public.upi_claim_cycles(id) ON DELETE SET NULL,
  commission_id uuid REFERENCES public.upi_commissions(id) ON DELETE SET NULL,
  invoice_number text NOT NULL UNIQUE,
  invoice_date date NOT NULL,
  due_date date,
  agency_name text DEFAULT 'Future Link Consultants Inc.',
  agency_address text DEFAULT '5 Vandorf Street, Toronto, Ontario, Canada M1B 4Y3',
  agency_phone text DEFAULT '+1 416 902 4524',
  agency_email text DEFAULT 'overseasrelations@futurelinkconsultants.com',
  agency_gst_hst_number text,
  institution_name text,
  institution_address text,
  institution_contact text,
  institution_email text,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  tax_amount numeric(10,2) DEFAULT 0,
  tax_type text,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text DEFAULT 'CAD',
  total_students int DEFAULT 0,
  eligible_students int DEFAULT 0,
  status text DEFAULT 'draft' CHECK (status IN ('draft','sent','submitted','approved','paid','partially_paid','overdue','disputed','cancelled')),
  payment_method text,
  payment_reference text,
  payment_received_date date,
  payment_received_amount numeric(12,2),
  submitted_date date,
  approved_date date,
  paid_date date,
  overdue_since date,
  notes text,
  internal_notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_uci_inst_cycle ON public.upi_commission_invoices(institution_id, claim_cycle_id);

CREATE TABLE public.upi_invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.upi_commission_invoices(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.upi_commission_students(id) ON DELETE SET NULL,
  description text NOT NULL,
  student_name text,
  program_name text,
  intake_term text,
  tuition_amount numeric(12,2),
  commission_rate numeric(5,2),
  line_amount numeric(12,2) NOT NULL,
  notes text,
  sort_order int DEFAULT 0
);

CREATE INDEX idx_uili_invoice ON public.upi_invoice_line_items(invoice_id);

ALTER TABLE public.upi_commission_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upi_commission_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upi_invoice_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_ucs" ON public.upi_commission_students FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_uci" ON public.upi_commission_invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_uili" ON public.upi_invoice_line_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_ucs_updated_at BEFORE UPDATE ON public.upi_commission_students FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_uci_updated_at BEFORE UPDATE ON public.upi_commission_invoices FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== FILE: 20260604140000_upi_two_tier_rls.sql =====
-- Two-tier UPI RLS aligned with UI module permissions:
--   catalog  → institutions module (view / edit)
--   confidential → commission admin, accounting users, or commissions module

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_confidential_upi_document(_metadata jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(_metadata->>'doc_kind', '') IN (
    'agreement', 'commission_sheet', 'invoice_template', 'renewal_document'
  )
$$;

CREATE OR REPLACE FUNCTION public.can_view_upi_catalog(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_has_module(_uid, 'institutions', 'view')
      OR public.user_has_module(_uid, 'institutions', 'edit')
$$;

CREATE OR REPLACE FUNCTION public.can_manage_upi_catalog(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_has_module(_uid, 'institutions', 'edit')
$$;

CREATE OR REPLACE FUNCTION public.can_view_upi_confidential(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_uid, 'admin'::app_role)
      OR public.is_commission_admin(_uid)
      OR public.is_accounting_user(_uid)
      OR public.user_has_module(_uid, 'commissions', 'view')
      OR public.user_has_module(_uid, 'commissions', 'edit')
$$;

CREATE OR REPLACE FUNCTION public.can_manage_upi_confidential(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_uid, 'admin'::app_role)
      OR public.is_commission_admin(_uid)
      OR public.user_has_module(_uid, 'commissions', 'edit')
$$;

GRANT EXECUTE ON FUNCTION public.is_confidential_upi_document(jsonb) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.can_view_upi_catalog(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_upi_catalog(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.can_view_upi_confidential(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_upi_confidential(uuid) TO authenticated, anon;

-- ---------------------------------------------------------------------------
-- Drop all existing policies on UPI tables (clean slate)
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  r record;
  t text;
  upi_tables text[] := ARRAY[
    'upi_countries', 'upi_program_levels', 'upi_study_areas', 'upi_discipline_areas',
    'upi_taxonomy_categories', 'upi_tags', 'upi_institutions', 'upi_institution_tags',
    'upi_campuses', 'upi_institution_sources', 'upi_sync_jobs', 'upi_sync_logs',
    'upi_uploaded_documents', 'upi_document_categories', 'upi_extraction_results',
    'upi_ai_suggestions', 'upi_agreements', 'upi_agreement_versions', 'upi_commissions',
    'upi_commission_rules', 'upi_courses_staging', 'upi_course_intakes',
    'upi_language_requirements', 'upi_scholarship_rules', 'upi_eligibility_rules',
    'upi_promotions', 'upi_marketing_campaigns', 'upi_audit_logs',
    'upi_document_pipeline_events', 'upi_renewal_alerts',
    'upi_claim_cycles', 'upi_commission_invoices', 'upi_commission_students',
    'upi_invoices', 'upi_invoice_line_items'
  ];
BEGIN
  FOREACH t IN ARRAY upi_tables LOOP
    FOR r IN
      SELECT pol.polname
      FROM pg_policy pol
      JOIN pg_class c ON c.oid = pol.polrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.polname, t);
    END LOOP;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Catalog tier — shared read, catalog edit for writes
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  t text;
  catalog_tables text[] := ARRAY[
    'upi_institutions', 'upi_institution_tags', 'upi_campuses', 'upi_institution_sources',
    'upi_sync_jobs', 'upi_sync_logs', 'upi_courses_staging', 'upi_course_intakes',
    'upi_language_requirements', 'upi_scholarship_rules', 'upi_eligibility_rules',
    'upi_promotions', 'upi_marketing_campaigns', 'upi_ai_suggestions', 'upi_extraction_results',
    'upi_countries', 'upi_program_levels', 'upi_study_areas', 'upi_discipline_areas',
    'upi_taxonomy_categories', 'upi_tags', 'upi_document_categories'
  ];
BEGIN
  FOREACH t IN ARRAY catalog_tables LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.can_view_upi_catalog(auth.uid()) OR public.can_view_upi_confidential(auth.uid()))',
      t || '_catalog_select', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.can_manage_upi_catalog(auth.uid()))',
      t || '_catalog_insert', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.can_manage_upi_catalog(auth.uid())) WITH CHECK (public.can_manage_upi_catalog(auth.uid()))',
      t || '_catalog_update', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.can_manage_upi_catalog(auth.uid()) OR public.has_role(auth.uid(), ''admin''::app_role))',
      t || '_catalog_delete', t
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Uploaded documents — row-level split by doc_kind metadata
-- ---------------------------------------------------------------------------

CREATE POLICY upi_uploaded_documents_select ON public.upi_uploaded_documents
  FOR SELECT TO authenticated
  USING (
    public.can_view_upi_confidential(auth.uid())
    OR (
      public.can_view_upi_catalog(auth.uid())
      AND NOT public.is_confidential_upi_document(metadata)
    )
  );

CREATE POLICY upi_uploaded_documents_insert ON public.upi_uploaded_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      public.can_manage_upi_catalog(auth.uid())
      AND NOT public.is_confidential_upi_document(metadata)
    )
    OR (
      public.can_manage_upi_confidential(auth.uid())
      AND public.is_confidential_upi_document(metadata)
    )
  );

CREATE POLICY upi_uploaded_documents_update ON public.upi_uploaded_documents
  FOR UPDATE TO authenticated
  USING (
    (
      public.can_manage_upi_catalog(auth.uid())
      AND NOT public.is_confidential_upi_document(metadata)
    )
    OR (
      public.can_manage_upi_confidential(auth.uid())
      AND public.is_confidential_upi_document(metadata)
    )
  )
  WITH CHECK (
    (
      public.can_manage_upi_catalog(auth.uid())
      AND NOT public.is_confidential_upi_document(metadata)
    )
    OR (
      public.can_manage_upi_confidential(auth.uid())
      AND public.is_confidential_upi_document(metadata)
    )
  );

CREATE POLICY upi_uploaded_documents_delete ON public.upi_uploaded_documents
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (
      public.can_manage_upi_catalog(auth.uid())
      AND NOT public.is_confidential_upi_document(metadata)
    )
    OR (
      public.can_manage_upi_confidential(auth.uid())
      AND public.is_confidential_upi_document(metadata)
    )
  );

-- ---------------------------------------------------------------------------
-- Confidential tier
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  t text;
  confidential_tables text[] := ARRAY[
    'upi_agreements', 'upi_agreement_versions', 'upi_commissions', 'upi_commission_rules',
    'upi_claim_cycles', 'upi_commission_invoices', 'upi_commission_students',
    'upi_invoices', 'upi_invoice_line_items', 'upi_renewal_alerts'
  ];
BEGIN
  FOREACH t IN ARRAY confidential_tables LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.can_view_upi_confidential(auth.uid()))',
      t || '_confidential_select', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.can_manage_upi_confidential(auth.uid()))',
      t || '_confidential_insert', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.can_manage_upi_confidential(auth.uid())) WITH CHECK (public.can_manage_upi_confidential(auth.uid()))',
      t || '_confidential_update', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.can_manage_upi_confidential(auth.uid()))',
      t || '_confidential_delete', t
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Audit logs & pipeline events — restricted
-- ---------------------------------------------------------------------------

CREATE POLICY upi_audit_logs_select ON public.upi_audit_logs
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_commission_admin(auth.uid())
  );

CREATE POLICY upi_audit_logs_insert ON public.upi_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.can_manage_upi_catalog(auth.uid())
    OR public.can_manage_upi_confidential(auth.uid())
  );

CREATE POLICY upi_document_pipeline_events_select ON public.upi_document_pipeline_events
  FOR SELECT TO authenticated
  USING (
    public.can_view_upi_catalog(auth.uid())
    OR public.can_view_upi_confidential(auth.uid())
  );

CREATE POLICY upi_document_pipeline_events_insert ON public.upi_document_pipeline_events
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_manage_upi_catalog(auth.uid())
    OR public.can_manage_upi_confidential(auth.uid())
  );

CREATE POLICY upi_document_pipeline_events_update ON public.upi_document_pipeline_events
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_commission_admin(auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_commission_admin(auth.uid())
  );

CREATE POLICY upi_document_pipeline_events_delete ON public.upi_document_pipeline_events
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ---------------------------------------------------------------------------
-- institution-documents storage bucket
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS auth_select_institution_documents ON storage.objects;
DROP POLICY IF EXISTS auth_insert_institution_documents ON storage.objects;
DROP POLICY IF EXISTS auth_update_institution_documents ON storage.objects;
DROP POLICY IF EXISTS auth_delete_institution_documents ON storage.objects;

CREATE POLICY upi_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'institution-documents'
    AND (
      public.can_view_upi_catalog(auth.uid())
      OR public.can_view_upi_confidential(auth.uid())
    )
  );

CREATE POLICY upi_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'institution-documents'
    AND (
      public.can_manage_upi_catalog(auth.uid())
      OR public.can_manage_upi_confidential(auth.uid())
    )
  );

CREATE POLICY upi_storage_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'institution-documents'
    AND (
      public.can_manage_upi_catalog(auth.uid())
      OR public.can_manage_upi_confidential(auth.uid())
    )
  );

CREATE POLICY upi_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'institution-documents'
    AND (
      public.can_manage_upi_catalog(auth.uid())
      OR public.can_manage_upi_confidential(auth.uid())
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  );

-- ===== FILE: 20260611100000_partnership_routes_and_aggregators.sql =====
-- Partnership channels: aggregators master, per-institution routes, commission snapshots.
-- Supports promotion-only institutions, direct tie-up, and multiple indirect aggregators.

-- ---------------------------------------------------------------------------
-- Aggregators master (ApplyBoard, Navitas, etc.)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.upi_aggregators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  short_code text,
  is_active boolean NOT NULL DEFAULT true,
  countries_served text[] DEFAULT '{}',
  website_url text,
  logo_url text,
  contact_name text,
  contact_email text,
  contact_phone text,
  contact_whatsapp text,
  address text,
  city text,
  country_name text,
  agreement_status text DEFAULT 'active' CHECK (agreement_status IN ('draft', 'active', 'expired', 'suspended')),
  agreement_valid_from date,
  agreement_valid_to date,
  agreement_reference text,
  default_portal_url text,
  default_payment_terms text,
  default_currency text DEFAULT 'CAD',
  billing_email text,
  tax_id text,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_upi_aggregators_short_code
  ON public.upi_aggregators (lower(trim(short_code)))
  WHERE short_code IS NOT NULL AND trim(short_code) <> '';

CREATE INDEX IF NOT EXISTS idx_upi_aggregators_active ON public.upi_aggregators (is_active, name);

-- ---------------------------------------------------------------------------
-- Partnership routes (many per institution: direct + indirect)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.upi_partnership_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.upi_institutions(id) ON DELETE CASCADE,
  channel_type text NOT NULL CHECK (channel_type IN ('direct', 'indirect', 'student_direct')),
  aggregator_id uuid REFERENCES public.upi_aggregators(id) ON DELETE SET NULL,
  route_code text,
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'expired', 'suspended')),
  valid_from date,
  valid_to date,
  intakes_covered text[] DEFAULT '{}',
  program_levels_covered text[] DEFAULT '{}',
  application_portal_url text,
  aggregator_institution_code text,
  is_default_route boolean NOT NULL DEFAULT false,
  priority_rank int NOT NULL DEFAULT 100,
  agreement_id uuid REFERENCES public.upi_agreements(id) ON DELETE SET NULL,
  -- Summary terms for compare UI (full rules live in upi_commissions)
  commission_model text,
  commission_rate numeric(8,4),
  commission_currency text DEFAULT 'CAD',
  bonus_notes text,
  payment_terms text,
  estimated_payout_days int,
  processing_sla_days int,
  application_fee numeric(12,2),
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT upi_partnership_routes_channel_chk CHECK (
    (channel_type = 'indirect' AND aggregator_id IS NOT NULL)
    OR (channel_type IN ('direct', 'student_direct') AND aggregator_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_upi_partnership_routes_inst
  ON public.upi_partnership_routes (institution_id, status);

CREATE INDEX IF NOT EXISTS idx_upi_partnership_routes_aggregator
  ON public.upi_partnership_routes (aggregator_id)
  WHERE aggregator_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_upi_partnership_routes_direct_unique
  ON public.upi_partnership_routes (institution_id)
  WHERE channel_type = 'direct' AND status = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS idx_upi_partnership_routes_indirect_unique
  ON public.upi_partnership_routes (institution_id, aggregator_id)
  WHERE channel_type = 'indirect' AND status = 'active' AND aggregator_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Commission calculation snapshots (audit / reports)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.upi_commission_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_route_id uuid REFERENCES public.upi_partnership_routes(id) ON DELETE SET NULL,
  commission_id uuid REFERENCES public.upi_commissions(id) ON DELETE SET NULL,
  institution_id uuid REFERENCES public.upi_institutions(id) ON DELETE SET NULL,
  aggregator_id uuid REFERENCES public.upi_aggregators(id) ON DELETE SET NULL,
  channel_type text,
  rules_json jsonb NOT NULL DEFAULT '[]',
  input_json jsonb NOT NULL DEFAULT '{}',
  breakdown_json jsonb NOT NULL DEFAULT '{}',
  total_amount numeric(14,2),
  currency text DEFAULT 'CAD',
  calculated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_upi_commission_snapshots_route
  ON public.upi_commission_snapshots (partnership_route_id, calculated_at DESC);

-- ---------------------------------------------------------------------------
-- Extend existing tables
-- ---------------------------------------------------------------------------

ALTER TABLE public.upi_institutions
  ADD COLUMN IF NOT EXISTS catalog_status text NOT NULL DEFAULT 'promoted'
    CHECK (catalog_status IN ('promoted', 'hidden', 'archived')),
  ADD COLUMN IF NOT EXISTS promotion_notes text;

ALTER TABLE public.upi_commissions
  ADD COLUMN IF NOT EXISTS partnership_route_id uuid REFERENCES public.upi_partnership_routes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS aggregator_id uuid REFERENCES public.upi_aggregators(id) ON DELETE SET NULL;

ALTER TABLE public.upi_commission_students
  ADD COLUMN IF NOT EXISTS partnership_route_id uuid REFERENCES public.upi_partnership_routes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS aggregator_id uuid REFERENCES public.upi_aggregators(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS channel_type text CHECK (channel_type IS NULL OR channel_type IN ('direct', 'indirect', 'student_direct', 'none')),
  ADD COLUMN IF NOT EXISTS commission_snapshot_id uuid REFERENCES public.upi_commission_snapshots(id) ON DELETE SET NULL;

ALTER TABLE public.upi_claim_cycles
  ADD COLUMN IF NOT EXISTS partnership_route_id uuid REFERENCES public.upi_partnership_routes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS aggregator_id uuid REFERENCES public.upi_aggregators(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payer_type text CHECK (payer_type IS NULL OR payer_type IN ('institution', 'aggregator'));

ALTER TABLE public.cf_universities
  ADD COLUMN IF NOT EXISTS upi_institution_id uuid REFERENCES public.upi_institutions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cf_universities_upi_inst
  ON public.cf_universities (upi_institution_id)
  WHERE upi_institution_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Backfill: is_partner institutions → direct route
-- ---------------------------------------------------------------------------

INSERT INTO public.upi_partnership_routes (
  institution_id,
  channel_type,
  display_name,
  status,
  valid_from,
  is_default_route,
  priority_rank,
  notes
)
SELECT
  i.id,
  'direct',
  'Direct partnership',
  'active',
  i.partner_since,
  true,
  1,
  'Migrated from is_partner flag'
FROM public.upi_institutions i
WHERE i.is_partner = true
  AND NOT EXISTS (
    SELECT 1 FROM public.upi_partnership_routes r
    WHERE r.institution_id = i.id AND r.channel_type = 'direct'
  );

-- Keep is_partner in sync: true when an active direct route exists
CREATE OR REPLACE FUNCTION public.sync_upi_institution_is_partner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.upi_institutions i
  SET is_partner = EXISTS (
    SELECT 1 FROM public.upi_partnership_routes r
    WHERE r.institution_id = i.id
      AND r.channel_type = 'direct'
      AND r.status = 'active'
  ),
  updated_at = now()
  WHERE i.id = COALESCE(NEW.institution_id, OLD.institution_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_is_partner_on_route ON public.upi_partnership_routes;
CREATE TRIGGER trg_sync_is_partner_on_route
  AFTER INSERT OR UPDATE OR DELETE ON public.upi_partnership_routes
  FOR EACH ROW EXECUTE FUNCTION public.sync_upi_institution_is_partner();

-- One-time sync after backfill
UPDATE public.upi_institutions i
SET is_partner = EXISTS (
  SELECT 1 FROM public.upi_partnership_routes r
  WHERE r.institution_id = i.id AND r.channel_type = 'direct' AND r.status = 'active'
);

-- ---------------------------------------------------------------------------
-- RLS (catalog tier for aggregators + routes; confidential for snapshots)
-- ---------------------------------------------------------------------------

ALTER TABLE public.upi_aggregators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upi_partnership_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upi_commission_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS upi_aggregators_catalog_select ON public.upi_aggregators;
DROP POLICY IF EXISTS upi_aggregators_catalog_insert ON public.upi_aggregators;
DROP POLICY IF EXISTS upi_aggregators_catalog_update ON public.upi_aggregators;
DROP POLICY IF EXISTS upi_aggregators_catalog_delete ON public.upi_aggregators;
DROP POLICY IF EXISTS upi_partnership_routes_catalog_select ON public.upi_partnership_routes;
DROP POLICY IF EXISTS upi_partnership_routes_catalog_insert ON public.upi_partnership_routes;
DROP POLICY IF EXISTS upi_partnership_routes_catalog_update ON public.upi_partnership_routes;
DROP POLICY IF EXISTS upi_partnership_routes_catalog_delete ON public.upi_partnership_routes;
DROP POLICY IF EXISTS upi_commission_snapshots_confidential_select ON public.upi_commission_snapshots;
DROP POLICY IF EXISTS upi_commission_snapshots_confidential_insert ON public.upi_commission_snapshots;

CREATE POLICY upi_aggregators_catalog_select ON public.upi_aggregators
  FOR SELECT TO authenticated
  USING (public.can_view_upi_catalog(auth.uid()) OR public.can_view_upi_confidential(auth.uid()));

CREATE POLICY upi_aggregators_catalog_insert ON public.upi_aggregators
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_upi_catalog(auth.uid()));

CREATE POLICY upi_aggregators_catalog_update ON public.upi_aggregators
  FOR UPDATE TO authenticated
  USING (public.can_manage_upi_catalog(auth.uid()))
  WITH CHECK (public.can_manage_upi_catalog(auth.uid()));

CREATE POLICY upi_aggregators_catalog_delete ON public.upi_aggregators
  FOR DELETE TO authenticated
  USING (public.can_manage_upi_catalog(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY upi_partnership_routes_catalog_select ON public.upi_partnership_routes
  FOR SELECT TO authenticated
  USING (public.can_view_upi_catalog(auth.uid()) OR public.can_view_upi_confidential(auth.uid()));

CREATE POLICY upi_partnership_routes_catalog_insert ON public.upi_partnership_routes
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_upi_catalog(auth.uid()));

CREATE POLICY upi_partnership_routes_catalog_update ON public.upi_partnership_routes
  FOR UPDATE TO authenticated
  USING (public.can_manage_upi_catalog(auth.uid()))
  WITH CHECK (public.can_manage_upi_catalog(auth.uid()));

CREATE POLICY upi_partnership_routes_catalog_delete ON public.upi_partnership_routes
  FOR DELETE TO authenticated
  USING (public.can_manage_upi_catalog(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY upi_commission_snapshots_confidential_select ON public.upi_commission_snapshots
  FOR SELECT TO authenticated
  USING (public.can_view_upi_confidential(auth.uid()));

CREATE POLICY upi_commission_snapshots_confidential_insert ON public.upi_commission_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_upi_confidential(auth.uid()));

DROP TRIGGER IF EXISTS upi_aggregators_updated_at ON public.upi_aggregators;
CREATE TRIGGER upi_aggregators_updated_at
  BEFORE UPDATE ON public.upi_aggregators
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS upi_partnership_routes_updated_at ON public.upi_partnership_routes;
CREATE TRIGGER upi_partnership_routes_updated_at
  BEFORE UPDATE ON public.upi_partnership_routes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== FILE: 20260611130000_upi_institutions_dedup_unique.sql =====
-- Merge duplicate institutions (same normalized name + country) and block future duplicates.
-- Same institution name in DIFFERENT countries is allowed (e.g. Arden Berlin/Germany vs Arden London/UK).

CREATE OR REPLACE FUNCTION public.upi_institution_dedup_key(_name text, _country text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT concat_ws(
    '||',
    public.upi_normalize_institution_name(_name),
    public.upi_normalize_country(coalesce(_country, ''))
  );
$$;

-- Build survivor map: duplicate id → canonical institution id.
CREATE TEMP TABLE _inst_merge_map ON COMMIT DROP AS
WITH keyed AS (
  SELECT
    i.*,
    public.upi_institution_dedup_key(i.name, i.country_name) AS dedup_key
  FROM public.upi_institutions i
),
ranked AS (
  SELECT
    id,
    dedup_key,
    ROW_NUMBER() OVER (
      PARTITION BY dedup_key
      ORDER BY
        is_partner DESC NULLS LAST,
        (nullif(trim(logo_url), '') IS NOT NULL) DESC,
        (nullif(trim(website_url), '') IS NOT NULL) DESC,
        is_active DESC NULLS LAST,
        created_at ASC
    ) AS rn
  FROM keyed
),
survivors AS (
  SELECT dedup_key, id AS survivor_id FROM ranked WHERE rn = 1
)
SELECT r.id AS dup_id, s.survivor_id
FROM ranked r
JOIN survivors s ON s.dedup_key = r.dedup_key
WHERE r.id <> s.survivor_id;

-- Drop duplicate partnership routes on dup rows when survivor already has the same channel.
DELETE FROM public.upi_partnership_routes pr
USING _inst_merge_map m
WHERE pr.institution_id = m.dup_id
  AND pr.channel_type = 'direct'
  AND pr.status = 'active'
  AND EXISTS (
    SELECT 1 FROM public.upi_partnership_routes existing
    WHERE existing.institution_id = m.survivor_id
      AND existing.channel_type = 'direct'
      AND existing.status = 'active'
  );

DELETE FROM public.upi_partnership_routes pr
USING _inst_merge_map m
WHERE pr.institution_id = m.dup_id
  AND pr.channel_type = 'indirect'
  AND pr.status = 'active'
  AND pr.aggregator_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.upi_partnership_routes existing
    WHERE existing.institution_id = m.survivor_id
      AND existing.channel_type = 'indirect'
      AND existing.status = 'active'
      AND existing.aggregator_id = pr.aggregator_id
  );

-- Reassign foreign keys from duplicates to survivors (partnership routes handled separately).
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'upi_campuses',
    'upi_institution_sources',
    'upi_sync_jobs',
    'upi_uploaded_documents',
    'upi_ai_suggestions',
    'upi_agreements',
    'upi_commissions',
    'upi_commission_students',
    'upi_commission_invoices',
    'upi_claim_cycles',
    'upi_invoices',
    'upi_courses_staging',
    'upi_scholarship_rules',
    'upi_promotions',
    'upi_marketing_campaigns',
    'upi_commission_snapshots'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'institution_id'
    ) THEN
      EXECUTE format(
        'UPDATE public.%I x SET institution_id = m.survivor_id FROM _inst_merge_map m WHERE x.institution_id = m.dup_id',
        t
      );
    END IF;
  END LOOP;
END $$;

UPDATE public.upi_partnership_routes x
SET institution_id = m.survivor_id,
    updated_at = now()
FROM _inst_merge_map m
WHERE x.institution_id = m.dup_id;

-- Collapse any remaining duplicate active routes after merge.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY institution_id
      ORDER BY is_default_route DESC, priority_rank ASC, created_at ASC
    ) AS rn
  FROM public.upi_partnership_routes
  WHERE channel_type = 'direct' AND status = 'active'
)
DELETE FROM public.upi_partnership_routes pr
USING ranked r
WHERE pr.id = r.id AND r.rn > 1;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY institution_id, aggregator_id
      ORDER BY is_default_route DESC, priority_rank ASC, created_at ASC
    ) AS rn
  FROM public.upi_partnership_routes
  WHERE channel_type = 'indirect' AND status = 'active' AND aggregator_id IS NOT NULL
)
DELETE FROM public.upi_partnership_routes pr
USING ranked r
WHERE pr.id = r.id AND r.rn > 1;

UPDATE public.upi_institution_tags ut
SET institution_id = m.survivor_id
FROM _inst_merge_map m
WHERE ut.institution_id = m.dup_id
  AND NOT EXISTS (
    SELECT 1 FROM public.upi_institution_tags x
    WHERE x.institution_id = m.survivor_id AND x.tag_id = ut.tag_id
  );

DELETE FROM public.upi_institution_tags ut
USING _inst_merge_map m
WHERE ut.institution_id = m.dup_id;

UPDATE public.clients c
SET linked_institution_id = m.survivor_id
FROM _inst_merge_map m
WHERE c.linked_institution_id = m.dup_id;

UPDATE public.cf_universities u
SET upi_institution_id = m.survivor_id
FROM _inst_merge_map m
WHERE u.upi_institution_id = m.dup_id;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'upi_institution_id'
  ) THEN
    UPDATE public.courses c
    SET upi_institution_id = m.survivor_id
    FROM _inst_merge_map m
    WHERE c.upi_institution_id = m.dup_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'dsh_media'
  ) THEN
    UPDATE public.dsh_media d
    SET institution_id = m.survivor_id
    FROM _inst_merge_map m
    WHERE d.institution_id = m.dup_id;
  END IF;
END $$;

-- Merge survivor metadata from duplicates (keep richest fields).
UPDATE public.upi_institutions s
SET
  logo_url = coalesce(nullif(trim(s.logo_url), ''), x.logo_url),
  website_url = coalesce(nullif(trim(s.website_url), ''), x.website_url),
  is_partner = s.is_partner OR x.is_partner,
  partner_since = coalesce(s.partner_since, x.partner_since),
  notes = coalesce(nullif(trim(s.notes), ''), nullif(trim(x.notes), '')),
  updated_at = now()
FROM (
  SELECT
    m.survivor_id,
    bool_or(i.is_partner) AS is_partner,
    min(i.partner_since) AS partner_since,
    max(nullif(trim(i.logo_url), '')) AS logo_url,
    max(nullif(trim(i.website_url), '')) AS website_url,
    max(nullif(trim(i.notes), '')) AS notes
  FROM _inst_merge_map m
  JOIN public.upi_institutions i ON i.id = m.dup_id
  GROUP BY m.survivor_id
) x
WHERE s.id = x.survivor_id;

DELETE FROM public.upi_institutions i
USING _inst_merge_map m
WHERE i.id = m.dup_id;

-- Re-dedup courses after institution merge (same program may exist on former duplicate rows).
UPDATE public.upi_courses_staging SET dedup_hash = NULL;

WITH computed AS (
  SELECT
    s.id,
    public.upi_staging_row_dedup_hash(
      s.institution_id,
      s.course_title,
      s.program_level_id,
      s.metadata,
      NULL
    ) AS new_hash,
    s.review_status,
    s.confidence_score,
    s.extracted_at
  FROM public.upi_courses_staging s
),
ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY new_hash
      ORDER BY
        CASE review_status
          WHEN 'published' THEN 1
          WHEN 'approved' THEN 2
          WHEN 'needs_update' THEN 3
          WHEN 'pending_review' THEN 4
          WHEN 'rejected' THEN 5
          ELSE 6
        END,
        confidence_score DESC NULLS LAST,
        extracted_at ASC NULLS LAST
    ) AS rn
  FROM computed
)
DELETE FROM public.upi_courses_staging s
USING ranked r
WHERE s.id = r.id AND r.rn > 1;

UPDATE public.upi_courses_staging s
SET dedup_hash = public.upi_staging_row_dedup_hash(
  s.institution_id,
  s.course_title,
  s.program_level_id,
  s.metadata,
  NULL
)
WHERE dedup_hash IS NULL;

-- Prevent duplicate institutions going forward (scoped by country — not name alone).
DROP INDEX IF EXISTS idx_upi_institutions_dedup_unique;
CREATE UNIQUE INDEX idx_upi_institutions_dedup_unique
  ON public.upi_institutions (
    public.upi_normalize_institution_name(name),
    public.upi_normalize_country(coalesce(country_name, ''))
  );

-- ===== FILE: 20260723120000_commission_phase1_billing_masters.sql =====
-- Commission Phase 1: billing profiles, agreement versioning, eligibility config,
-- hold/period masters, commission structure extensions, route linker.

-- ---------------------------------------------------------------------------
-- Billing profiles (institution + optional aggregator)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.upi_billing_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.upi_institutions(id) ON DELETE CASCADE,
  aggregator_id uuid REFERENCES public.upi_aggregators(id) ON DELETE SET NULL,
  profile_name text NOT NULL,
  legal_entity_name text,
  billing_address text,
  billing_email text,
  billing_phone text,
  tax_registration_number text,
  default_invoice_currency text NOT NULL DEFAULT 'CAD',
  default_receipt_currency text NOT NULL DEFAULT 'CAD',
  payment_terms_days int DEFAULT 30,
  remittance_instructions text,
  is_default boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_upi_billing_profiles_inst
  ON public.upi_billing_profiles (institution_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_upi_billing_profiles_default_inst
  ON public.upi_billing_profiles (institution_id)
  WHERE is_default = true AND aggregator_id IS NULL AND status = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS idx_upi_billing_profiles_default_agg
  ON public.upi_billing_profiles (institution_id, aggregator_id)
  WHERE is_default = true AND aggregator_id IS NOT NULL AND status = 'active';

DROP TRIGGER IF EXISTS trg_upi_billing_profiles_updated_at ON public.upi_billing_profiles;
CREATE TRIGGER trg_upi_billing_profiles_updated_at
  BEFORE UPDATE ON public.upi_billing_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Agreement version effective dating
-- ---------------------------------------------------------------------------
ALTER TABLE public.upi_agreement_versions
  ADD COLUMN IF NOT EXISTS effective_from date,
  ADD COLUMN IF NOT EXISTS effective_to date,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft'
    CHECK (status IS NULL OR status IN ('draft', 'published', 'superseded', 'archived'));

UPDATE public.upi_agreement_versions
SET status = COALESCE(status, 'published')
WHERE status IS NULL;

-- ---------------------------------------------------------------------------
-- Commission eligibility configuration (student eligibility — not claim rules)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.upi_commission_eligibility_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.upi_institutions(id) ON DELETE CASCADE,
  aggregator_id uuid REFERENCES public.upi_aggregators(id) ON DELETE SET NULL,
  partnership_route_id uuid REFERENCES public.upi_partnership_routes(id) ON DELETE SET NULL,
  agreement_version_id uuid REFERENCES public.upi_agreement_versions(id) ON DELETE SET NULL,
  config_name text NOT NULL,
  version_number int NOT NULL DEFAULT 1,
  effective_from date,
  effective_to date,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'superseded', 'archived')),
  trigger_type text NOT NULL DEFAULT 'deposit'
    CHECK (trigger_type IN (
      'deposit', 'visa', 'enrolled', 'registered', 'started_classes', 'custom'
    )),
  trigger_params jsonb NOT NULL DEFAULT '{}',
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_upi_eligibility_configs_inst
  ON public.upi_commission_eligibility_configs (institution_id, status, effective_from DESC);

DROP TRIGGER IF EXISTS trg_upi_eligibility_configs_updated_at ON public.upi_commission_eligibility_configs;
CREATE TRIGGER trg_upi_eligibility_configs_updated_at
  BEFORE UPDATE ON public.upi_commission_eligibility_configs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Hold reason master (11 codes — transfer is an event, not a hold type)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.upi_commission_hold_reasons (
  code text PRIMARY KEY,
  label text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.upi_commission_hold_reasons (code, label, description, sort_order) VALUES
  ('missing_consent', 'Missing consent', 'Consent form not on file', 10),
  ('tuition_pending', 'Tuition pending', 'Required tuition payment not confirmed', 20),
  ('enrollment_unconfirmed', 'Enrollment unconfirmed', 'Institution has not confirmed enrollment', 30),
  ('visa_pending', 'Visa pending', 'Study permit / visa not yet approved', 40),
  ('visa_refusal', 'Visa refusal', 'Visa refused — commission may be cancelled', 50),
  ('document_pending', 'Document pending', 'Required documents missing', 60),
  ('institution_audit', 'Institution audit', 'Awaiting institution internal review', 70),
  ('duplicate_review', 'Duplicate review', 'Possible duplicate claim under review', 80),
  ('transfer_under_review', 'Transfer under review', 'Student transfer event open', 90),
  ('agency_dispute', 'Agency dispute', 'Agency or routing dispute', 100),
  ('other', 'Other', 'Other deferral reason', 110)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Commission period master
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.upi_commission_periods (
  code text PRIMARY KEY,
  label text NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

INSERT INTO public.upi_commission_periods (code, label, description, sort_order) VALUES
  ('application', 'Application', 'Application-stage commission', 10),
  ('visa', 'Visa', 'Visa / study permit stage', 20),
  ('enrollment', 'Enrollment', 'Enrollment confirmation stage', 30),
  ('semester_1', 'Semester 1', 'First semester payout', 40),
  ('semester_2', 'Semester 2', 'Second semester payout', 50),
  ('year_1', 'Year 1', 'First academic year payout', 60),
  ('custom', 'Custom', 'Custom period label in metadata', 70)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Commission + rules extensions
-- ---------------------------------------------------------------------------
ALTER TABLE public.upi_commissions
  ADD COLUMN IF NOT EXISTS agreement_version_id uuid
    REFERENCES public.upi_agreement_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_by uuid,
  ADD COLUMN IF NOT EXISTS base_rate_percent numeric(7,4);

ALTER TABLE public.upi_commission_rules
  ADD COLUMN IF NOT EXISTS precedence_rank int DEFAULT 100,
  ADD COLUMN IF NOT EXISTS scope_country text,
  ADD COLUMN IF NOT EXISTS scope_campus text,
  ADD COLUMN IF NOT EXISTS scope_program_category text,
  ADD COLUMN IF NOT EXISTS scope_program_code text,
  ADD COLUMN IF NOT EXISTS scope_intake text,
  ADD COLUMN IF NOT EXISTS scope_promotion_id uuid;

ALTER TABLE public.upi_partnership_routes
  ADD COLUMN IF NOT EXISTS default_commission_id uuid
    REFERENCES public.upi_commissions(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- RLS: new tables (confidential tier)
-- ---------------------------------------------------------------------------
ALTER TABLE public.upi_billing_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upi_commission_eligibility_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upi_commission_hold_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upi_commission_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS upi_billing_profiles_confidential ON public.upi_billing_profiles;
CREATE POLICY upi_billing_profiles_confidential ON public.upi_billing_profiles
  FOR ALL TO authenticated
  USING (public.can_view_upi_confidential(auth.uid()))
  WITH CHECK (public.can_view_upi_confidential(auth.uid()));

DROP POLICY IF EXISTS upi_eligibility_configs_confidential ON public.upi_commission_eligibility_configs;
CREATE POLICY upi_eligibility_configs_confidential ON public.upi_commission_eligibility_configs
  FOR ALL TO authenticated
  USING (public.can_view_upi_confidential(auth.uid()))
  WITH CHECK (public.can_view_upi_confidential(auth.uid()));

DROP POLICY IF EXISTS upi_hold_reasons_read ON public.upi_commission_hold_reasons;
CREATE POLICY upi_hold_reasons_read ON public.upi_commission_hold_reasons
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS upi_commission_periods_read ON public.upi_commission_periods;
CREATE POLICY upi_commission_periods_read ON public.upi_commission_periods
  FOR SELECT TO authenticated USING (true);

GRANT SELECT ON public.upi_commission_hold_reasons TO authenticated;
GRANT SELECT ON public.upi_commission_periods TO authenticated;

-- ===== FILE: 20260723120100_commission_phase1_lifecycle_snapshots.sql =====
-- Commission Phase 1: three-axis lifecycle, currency, holds, multi-period,
-- snapshot expansion + immutability, transfer events, invoice extensions.

-- ---------------------------------------------------------------------------
-- Student commission: three-axis lifecycle + currency + holds + periods
-- ---------------------------------------------------------------------------
ALTER TABLE public.upi_commission_students
  ADD COLUMN IF NOT EXISTS eligibility_status text DEFAULT 'pending'
    CHECK (eligibility_status IN ('pending', 'eligible', 'ineligible', 'cancelled')),
  ADD COLUMN IF NOT EXISTS claim_status text DEFAULT 'not_ready'
    CHECK (claim_status IN ('not_ready', 'ready', 'submitted', 'approved', 'rejected', 'carried_forward')),
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'partially_paid', 'paid', 'written_off')),
  ADD COLUMN IF NOT EXISTS expected_amount numeric(14,2),
  ADD COLUMN IF NOT EXISTS amended_expected_amount numeric(14,2),
  ADD COLUMN IF NOT EXISTS approved_amount numeric(14,2),
  ADD COLUMN IF NOT EXISTS snapshot_currency text DEFAULT 'CAD',
  ADD COLUMN IF NOT EXISTS invoice_currency text DEFAULT 'CAD',
  ADD COLUMN IF NOT EXISTS receipt_currency text DEFAULT 'CAD',
  ADD COLUMN IF NOT EXISTS base_currency text DEFAULT 'CAD',
  ADD COLUMN IF NOT EXISTS eligibility_date date,
  ADD COLUMN IF NOT EXISTS agreement_version_id uuid
    REFERENCES public.upi_agreement_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS eligibility_config_id uuid
    REFERENCES public.upi_commission_eligibility_configs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS hold_status text DEFAULT 'none'
    CHECK (hold_status IN ('none', 'active', 'released')),
  ADD COLUMN IF NOT EXISTS hold_reason text
    REFERENCES public.upi_commission_hold_reasons(code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS hold_notes text,
  ADD COLUMN IF NOT EXISTS expected_claim_date date,
  ADD COLUMN IF NOT EXISTS commission_period_code text DEFAULT 'enrollment'
    REFERENCES public.upi_commission_periods(code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS commission_period_label text,
  ADD COLUMN IF NOT EXISTS clawback_amount numeric(14,2),
  ADD COLUMN IF NOT EXISTS clawback_status text
    CHECK (clawback_status IS NULL OR clawback_status IN ('none', 'pending', 'applied', 'waived')),
  ADD COLUMN IF NOT EXISTS institution_reference_number text,
  ADD COLUMN IF NOT EXISTS remittance_reference_number text,
  ADD COLUMN IF NOT EXISTS matched_rule_id uuid
    REFERENCES public.upi_commission_rules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS billing_profile_id uuid
    REFERENCES public.upi_billing_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ucs_lifecycle
  ON public.upi_commission_students (institution_id, eligibility_status, claim_status, payment_status);

CREATE INDEX IF NOT EXISTS idx_ucs_period
  ON public.upi_commission_students (institution_id, commission_period_code);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ucs_student_route_period
  ON public.upi_commission_students (
    COALESCE(client_id, id),
    COALESCE(partnership_route_id, '00000000-0000-0000-0000-000000000000'::uuid),
    commission_period_code
  )
  WHERE client_id IS NOT NULL AND commission_period_code IS NOT NULL;

-- Backfill three-axis from legacy commission_status
UPDATE public.upi_commission_students SET
  eligibility_status = CASE
    WHEN commission_status IN ('eligible', 'paid', 'partially_paid') THEN 'eligible'
    WHEN commission_status = 'rejected' THEN 'cancelled'
    WHEN commission_status = 'blocked' THEN 'ineligible'
    ELSE 'pending'
  END,
  claim_status = CASE
    WHEN is_carried_forward OR commission_status = 'carried_forward' THEN 'carried_forward'
    WHEN commission_status IN ('eligible', 'paid', 'partially_paid') THEN 'ready'
    ELSE 'not_ready'
  END,
  payment_status = CASE
    WHEN commission_status = 'paid' THEN 'paid'
    WHEN commission_status = 'partially_paid' THEN 'partially_paid'
    ELSE 'unpaid'
  END,
  expected_amount = COALESCE(expected_amount, commission_amount),
  snapshot_currency = COALESCE(snapshot_currency, tuition_currency, 'CAD'),
  invoice_currency = COALESCE(invoice_currency, tuition_currency, 'CAD'),
  receipt_currency = COALESCE(receipt_currency, tuition_currency, 'CAD'),
  base_currency = COALESCE(base_currency, tuition_currency, 'CAD')
WHERE eligibility_status IS NULL OR eligibility_status = 'pending';

-- Sync legacy commission_status from three-axis (for existing UI)
CREATE OR REPLACE FUNCTION public.sync_ucs_legacy_commission_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.commission_status := CASE
    WHEN NEW.payment_status = 'paid' THEN 'paid'
    WHEN NEW.payment_status = 'partially_paid' THEN 'partially_paid'
    WHEN NEW.claim_status = 'carried_forward' THEN 'carried_forward'
    WHEN NEW.eligibility_status = 'cancelled' OR NEW.eligibility_status = 'ineligible' THEN 'blocked'
    WHEN NEW.eligibility_status = 'eligible' THEN 'eligible'
    ELSE 'pending'
  END;
  NEW.commission_amount := COALESCE(NEW.amended_expected_amount, NEW.expected_amount, NEW.commission_amount);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_ucs_legacy_status ON public.upi_commission_students;
CREATE TRIGGER trg_sync_ucs_legacy_status
  BEFORE INSERT OR UPDATE OF eligibility_status, claim_status, payment_status,
    expected_amount, amended_expected_amount ON public.upi_commission_students
  FOR EACH ROW EXECUTE FUNCTION public.sync_ucs_legacy_commission_status();

-- ---------------------------------------------------------------------------
-- Snapshot expansion (immutable audit record)
-- ---------------------------------------------------------------------------
ALTER TABLE public.upi_commission_snapshots
  ADD COLUMN IF NOT EXISTS student_commission_id uuid
    REFERENCES public.upi_commission_students(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS agreement_version_id uuid
    REFERENCES public.upi_agreement_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS matched_rule_id uuid
    REFERENCES public.upi_commission_rules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS campus text,
  ADD COLUMN IF NOT EXISTS program_name text,
  ADD COLUMN IF NOT EXISTS program_category text,
  ADD COLUMN IF NOT EXISTS intake_term text,
  ADD COLUMN IF NOT EXISTS expected_amount numeric(14,2),
  ADD COLUMN IF NOT EXISTS eligibility_date date,
  ADD COLUMN IF NOT EXISTS snapshot_payload jsonb NOT NULL DEFAULT '{}';

CREATE OR REPLACE FUNCTION public.block_commission_snapshot_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'upi_commission_snapshots are immutable';
END;
$$;

DROP TRIGGER IF EXISTS trg_block_snapshot_update ON public.upi_commission_snapshots;
CREATE TRIGGER trg_block_snapshot_update
  BEFORE UPDATE OR DELETE ON public.upi_commission_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.block_commission_snapshot_mutation();

DROP POLICY IF EXISTS upi_commission_snapshots_confidential_update ON public.upi_commission_snapshots;
DROP POLICY IF EXISTS upi_commission_snapshots_confidential_delete ON public.upi_commission_snapshots;

-- ---------------------------------------------------------------------------
-- Transfer events (never mutate snapshots)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.upi_commission_transfer_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.upi_institutions(id) ON DELETE CASCADE,
  source_student_commission_id uuid NOT NULL
    REFERENCES public.upi_commission_students(id) ON DELETE CASCADE,
  replacement_student_commission_id uuid
    REFERENCES public.upi_commission_students(id) ON DELETE SET NULL,
  from_route_id uuid REFERENCES public.upi_partnership_routes(id) ON DELETE SET NULL,
  to_route_id uuid REFERENCES public.upi_partnership_routes(id) ON DELETE SET NULL,
  from_institution_id uuid REFERENCES public.upi_institutions(id) ON DELETE SET NULL,
  to_institution_id uuid REFERENCES public.upi_institutions(id) ON DELETE SET NULL,
  event_status text NOT NULL DEFAULT 'open'
    CHECK (event_status IN ('open', 'resolved', 'cancelled')),
  outcome text
    CHECK (outcome IS NULL OR outcome IN (
      'unchanged', 'amended', 'cancelled', 'replaced', 'under_review'
    )),
  transfer_reason text,
  notes text,
  initiated_by uuid,
  initiated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transfer_events_source
  ON public.upi_commission_transfer_events (source_student_commission_id, event_status);

DROP TRIGGER IF EXISTS trg_transfer_events_updated_at ON public.upi_commission_transfer_events;
CREATE TRIGGER trg_transfer_events_updated_at
  BEFORE UPDATE ON public.upi_commission_transfer_events
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.upi_commission_transfer_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS upi_transfer_events_confidential ON public.upi_commission_transfer_events;
CREATE POLICY upi_transfer_events_confidential ON public.upi_commission_transfer_events
  FOR ALL TO authenticated
  USING (public.can_view_upi_confidential(auth.uid()))
  WITH CHECK (public.can_view_upi_confidential(auth.uid()));

-- ---------------------------------------------------------------------------
-- Invoice billing profile + currency + line item period
-- ---------------------------------------------------------------------------
ALTER TABLE public.upi_commission_invoices
  ADD COLUMN IF NOT EXISTS billing_profile_id uuid
    REFERENCES public.upi_billing_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invoice_currency text DEFAULT 'CAD',
  ADD COLUMN IF NOT EXISTS receipt_currency text DEFAULT 'CAD',
  ADD COLUMN IF NOT EXISTS base_currency text DEFAULT 'CAD';

ALTER TABLE public.upi_invoice_line_items
  ADD COLUMN IF NOT EXISTS commission_period_code text
    REFERENCES public.upi_commission_periods(code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS snapshot_id uuid
    REFERENCES public.upi_commission_snapshots(id) ON DELETE SET NULL;

-- ===== FILE: 20260723120200_commission_phase1_rpcs.sql =====
-- Commission Phase 1 RPCs + counselor status view

-- ---------------------------------------------------------------------------
-- Rule resolver (precedence: promotion → intake → program → category → campus → country → default)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_resolve_commission_rule(
  p_institution_id uuid,
  p_partnership_route_id uuid DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_campus text DEFAULT NULL,
  p_program_category text DEFAULT NULL,
  p_program_code text DEFAULT NULL,
  p_intake text DEFAULT NULL,
  p_promotion_id uuid DEFAULT NULL,
  p_as_of date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  commission_id uuid,
  matched_rule_id uuid,
  commission_name text,
  base_rate_percent numeric,
  currency text,
  agreement_version_id uuid,
  match_level text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_commission_id uuid;
BEGIN
  IF p_partnership_route_id IS NOT NULL THEN
    SELECT r.default_commission_id INTO v_commission_id
    FROM public.upi_partnership_routes r
    WHERE r.id = p_partnership_route_id;
  END IF;

  IF v_commission_id IS NULL THEN
    SELECT c.id INTO v_commission_id
    FROM public.upi_commissions c
    WHERE c.institution_id = p_institution_id
      AND c.is_active = true
      AND (c.effective_from IS NULL OR c.effective_from <= p_as_of)
      AND (c.effective_to IS NULL OR c.effective_to >= p_as_of)
    ORDER BY c.effective_from DESC NULLS LAST, c.created_at DESC
    LIMIT 1;
  END IF;

  IF v_commission_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH ranked AS (
    SELECT
      c.id AS commission_id,
      r.id AS matched_rule_id,
      c.name AS commission_name,
      c.base_rate_percent,
      c.currency,
      c.agreement_version_id,
      CASE
        WHEN r.scope_promotion_id IS NOT NULL AND r.scope_promotion_id = p_promotion_id THEN 'promotion'
        WHEN r.scope_intake IS NOT NULL AND lower(r.scope_intake) = lower(COALESCE(p_intake, '')) THEN 'intake'
        WHEN r.scope_program_code IS NOT NULL AND lower(r.scope_program_code) = lower(COALESCE(p_program_code, '')) THEN 'program'
        WHEN r.scope_program_category IS NOT NULL AND lower(r.scope_program_category) = lower(COALESCE(p_program_category, '')) THEN 'category'
        WHEN r.scope_campus IS NOT NULL AND lower(r.scope_campus) = lower(COALESCE(p_campus, '')) THEN 'campus'
        WHEN r.scope_country IS NOT NULL AND lower(r.scope_country) = lower(COALESCE(p_country, '')) THEN 'country'
        WHEN r.rule_type = 'base' OR (
          r.scope_promotion_id IS NULL AND r.scope_intake IS NULL
          AND r.scope_program_code IS NULL AND r.scope_program_category IS NULL
          AND r.scope_campus IS NULL AND r.scope_country IS NULL
        ) THEN 'default'
        ELSE NULL
      END AS match_level,
      CASE
        WHEN r.scope_promotion_id IS NOT NULL AND r.scope_promotion_id = p_promotion_id THEN 1
        WHEN r.scope_intake IS NOT NULL AND lower(r.scope_intake) = lower(COALESCE(p_intake, '')) THEN 2
        WHEN r.scope_program_code IS NOT NULL AND lower(r.scope_program_code) = lower(COALESCE(p_program_code, '')) THEN 3
        WHEN r.scope_program_category IS NOT NULL AND lower(r.scope_program_category) = lower(COALESCE(p_program_category, '')) THEN 4
        WHEN r.scope_campus IS NOT NULL AND lower(r.scope_campus) = lower(COALESCE(p_campus, '')) THEN 5
        WHEN r.scope_country IS NOT NULL AND lower(r.scope_country) = lower(COALESCE(p_country, '')) THEN 6
        WHEN r.rule_type = 'base' OR (
          r.scope_promotion_id IS NULL AND r.scope_intake IS NULL
          AND r.scope_program_code IS NULL AND r.scope_program_category IS NULL
          AND r.scope_campus IS NULL AND r.scope_country IS NULL
        ) THEN 7
        ELSE 99
      END AS rank_order
    FROM public.upi_commissions c
    LEFT JOIN public.upi_commission_rules r ON r.commission_id = c.id
    WHERE c.id = v_commission_id
  )
  SELECT
    ranked.commission_id,
    ranked.matched_rule_id,
    ranked.commission_name,
    ranked.base_rate_percent,
    ranked.currency,
    ranked.agreement_version_id,
    ranked.match_level
  FROM ranked
  WHERE ranked.match_level IS NOT NULL
  ORDER BY ranked.rank_order
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_resolve_commission_rule(uuid, uuid, text, text, text, text, text, uuid, date) TO authenticated;

-- ---------------------------------------------------------------------------
-- Eligibility evaluation (config-driven)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_evaluate_eligibility(
  p_student_commission_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.upi_commission_students%ROWTYPE;
  cfg public.upi_commission_eligibility_configs%ROWTYPE;
  v_eligible boolean := false;
  v_reason text := 'pending';
BEGIN
  SELECT * INTO s FROM public.upi_commission_students WHERE id = p_student_commission_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'not_found');
  END IF;

  IF s.eligibility_config_id IS NOT NULL THEN
    SELECT * INTO cfg FROM public.upi_commission_eligibility_configs WHERE id = s.eligibility_config_id;
  ELSE
    SELECT * INTO cfg
    FROM public.upi_commission_eligibility_configs c
    WHERE c.institution_id = s.institution_id
      AND c.status = 'published'
      AND (c.partnership_route_id IS NULL OR c.partnership_route_id = s.partnership_route_id)
      AND (c.effective_from IS NULL OR c.effective_from <= CURRENT_DATE)
      AND (c.effective_to IS NULL OR c.effective_to >= CURRENT_DATE)
    ORDER BY
      CASE WHEN c.partnership_route_id IS NOT NULL THEN 0 ELSE 1 END,
      c.version_number DESC
    LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    -- Fallback: deposit paid heuristic for Phase 1 manual path
    v_eligible := s.tuition_paid_date IS NOT NULL OR (s.tuition_paid_amount IS NOT NULL AND s.tuition_paid_amount > 0);
    v_reason := CASE WHEN v_eligible THEN 'deposit_paid_fallback' ELSE 'no_config' END;
  ELSE
    CASE cfg.trigger_type
      WHEN 'deposit' THEN
        v_eligible := s.tuition_paid_date IS NOT NULL OR COALESCE(s.tuition_paid_amount, 0) > 0;
        v_reason := 'deposit';
      WHEN 'visa' THEN
        v_eligible := s.study_permit_approved_date IS NOT NULL;
        v_reason := 'visa';
      WHEN 'enrolled' THEN
        v_eligible := s.enrollment_status = 'enrolled' AND s.enrollment_confirmed_date IS NOT NULL;
        v_reason := 'enrolled';
      WHEN 'registered' THEN
        v_eligible := COALESCE(s.registered_credits, 0) > 0;
        v_reason := 'registered';
      WHEN 'started_classes' THEN
        v_eligible := s.enrollment_status = 'enrolled';
        v_reason := 'started_classes';
      ELSE
        v_eligible := false;
        v_reason := 'custom_not_implemented';
    END CASE;
  END IF;

  RETURN jsonb_build_object(
    'eligible', v_eligible,
    'reason', v_reason,
    'config_id', cfg.id,
    'trigger_type', COALESCE(cfg.trigger_type, 'fallback')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_evaluate_eligibility(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Create immutable snapshot + link student
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_create_commission_snapshot(
  p_student_commission_id uuid,
  p_breakdown jsonb DEFAULT '{}',
  p_rules jsonb DEFAULT '[]',
  p_input jsonb DEFAULT '{}',
  p_expected_amount numeric DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.upi_commission_students%ROWTYPE;
  snap_id uuid;
  v_total numeric;
BEGIN
  SELECT * INTO s FROM public.upi_commission_students WHERE id = p_student_commission_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'student commission not found';
  END IF;

  v_total := COALESCE(p_expected_amount, s.amended_expected_amount, s.expected_amount, s.commission_amount, 0);

  INSERT INTO public.upi_commission_snapshots (
    partnership_route_id, commission_id, institution_id, aggregator_id, channel_type,
    student_commission_id, agreement_version_id, matched_rule_id,
    country, campus, program_name, program_category, intake_term,
    expected_amount, eligibility_date, currency, total_amount,
    rules_json, input_json, breakdown_json, snapshot_payload
  ) VALUES (
    s.partnership_route_id, s.commission_id, s.institution_id, s.aggregator_id, s.channel_type,
    s.id, s.agreement_version_id, s.matched_rule_id,
    s.country_of_origin, s.campus, s.program_name, s.program_level, s.intake_term,
    v_total, s.eligibility_date, COALESCE(s.snapshot_currency, s.tuition_currency, 'CAD'), v_total,
    COALESCE(p_rules, '[]'::jsonb), COALESCE(p_input, '{}'::jsonb), COALESCE(p_breakdown, '{}'::jsonb),
    jsonb_build_object(
      'student_commission_id', s.id,
      'commission_id', s.commission_id,
      'agreement_version_id', s.agreement_version_id,
      'matched_rule_id', s.matched_rule_id,
      'expected_amount', v_total,
      'currency', COALESCE(s.snapshot_currency, s.tuition_currency, 'CAD'),
      'eligibility_date', s.eligibility_date
    )
  )
  RETURNING id INTO snap_id;

  UPDATE public.upi_commission_students
  SET commission_snapshot_id = snap_id,
      expected_amount = v_total
  WHERE id = s.id;

  RETURN snap_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_create_commission_snapshot(uuid, jsonb, jsonb, jsonb, numeric) TO authenticated;

-- ---------------------------------------------------------------------------
-- Mark student eligible (creates snapshot if missing)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_mark_student_eligible(
  p_student_commission_id uuid,
  p_eligibility_date date DEFAULT CURRENT_DATE
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  eval jsonb;
  snap_id uuid;
BEGIN
  eval := public.fn_evaluate_eligibility(p_student_commission_id);
  IF NOT (eval->>'eligible')::boolean THEN
    RAISE EXCEPTION 'Student not eligible: %', eval->>'reason';
  END IF;

  UPDATE public.upi_commission_students
  SET eligibility_status = 'eligible',
      eligibility_date = p_eligibility_date,
      claim_status = CASE WHEN hold_status = 'active' THEN claim_status ELSE 'ready' END
  WHERE id = p_student_commission_id;

  SELECT commission_snapshot_id INTO snap_id
  FROM public.upi_commission_students WHERE id = p_student_commission_id;

  IF snap_id IS NULL THEN
    snap_id := public.fn_create_commission_snapshot(p_student_commission_id);
  END IF;

  RETURN snap_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_mark_student_eligible(uuid, date) TO authenticated;

-- ---------------------------------------------------------------------------
-- Publish commission rules (conflict gate in app; RPC sets active)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_publish_commission_rules(
  p_commission_id uuid,
  p_published_by uuid DEFAULT auth.uid()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.upi_commissions
  SET is_active = true,
      is_proposed = false,
      published_at = now(),
      published_by = p_published_by
  WHERE id = p_commission_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'commission not found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_publish_commission_rules(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Hold apply / release
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_apply_commission_hold(
  p_student_commission_id uuid,
  p_hold_reason text,
  p_hold_notes text DEFAULT NULL,
  p_expected_claim_date date DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.upi_commission_hold_reasons WHERE code = p_hold_reason AND is_active) THEN
    RAISE EXCEPTION 'invalid hold reason: %', p_hold_reason;
  END IF;

  UPDATE public.upi_commission_students
  SET hold_status = 'active',
      hold_reason = p_hold_reason,
      hold_notes = p_hold_notes,
      expected_claim_date = p_expected_claim_date,
      claim_status = CASE WHEN claim_status = 'ready' THEN 'not_ready' ELSE claim_status END
  WHERE id = p_student_commission_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_apply_commission_hold(uuid, text, text, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_release_commission_hold(
  p_student_commission_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.upi_commission_students
  SET hold_status = 'released',
      hold_reason = NULL,
      hold_notes = NULL,
      claim_status = CASE
        WHEN eligibility_status = 'eligible' THEN 'ready'
        ELSE claim_status
      END
  WHERE id = p_student_commission_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_release_commission_hold(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Transfer events
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_initiate_commission_transfer(
  p_source_student_commission_id uuid,
  p_to_route_id uuid DEFAULT NULL,
  p_to_institution_id uuid DEFAULT NULL,
  p_transfer_reason text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.upi_commission_students%ROWTYPE;
  event_id uuid;
BEGIN
  SELECT * INTO s FROM public.upi_commission_students WHERE id = p_source_student_commission_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'source not found'; END IF;

  INSERT INTO public.upi_commission_transfer_events (
    institution_id, source_student_commission_id,
    from_route_id, to_route_id, from_institution_id, to_institution_id,
    event_status, outcome, transfer_reason, notes, initiated_by
  ) VALUES (
    s.institution_id, s.id,
    s.partnership_route_id, p_to_route_id, s.institution_id, p_to_institution_id,
    'open', 'under_review', p_transfer_reason, p_notes, auth.uid()
  )
  RETURNING id INTO event_id;

  PERFORM public.fn_apply_commission_hold(
    s.id, 'transfer_under_review', p_transfer_reason, NULL
  );

  RETURN event_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_initiate_commission_transfer(uuid, uuid, uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_process_transfer_outcome(
  p_event_id uuid,
  p_outcome text,
  p_replacement_student_commission_id uuid DEFAULT NULL,
  p_amended_amount numeric DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ev public.upi_commission_transfer_events%ROWTYPE;
BEGIN
  IF p_outcome NOT IN ('unchanged', 'amended', 'cancelled', 'replaced', 'under_review') THEN
    RAISE EXCEPTION 'invalid outcome';
  END IF;

  SELECT * INTO ev FROM public.upi_commission_transfer_events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'event not found'; END IF;

  UPDATE public.upi_commission_transfer_events
  SET event_status = CASE WHEN p_outcome = 'under_review' THEN 'open' ELSE 'resolved' END,
      outcome = p_outcome,
      replacement_student_commission_id = p_replacement_student_commission_id,
      resolved_at = CASE WHEN p_outcome = 'under_review' THEN NULL ELSE now() END
  WHERE id = p_event_id;

  CASE p_outcome
    WHEN 'unchanged' THEN
      PERFORM public.fn_release_commission_hold(ev.source_student_commission_id);
    WHEN 'amended' THEN
      UPDATE public.upi_commission_students
      SET amended_expected_amount = COALESCE(p_amended_amount, amended_expected_amount)
      WHERE id = ev.source_student_commission_id;
      PERFORM public.fn_release_commission_hold(ev.source_student_commission_id);
    WHEN 'cancelled' THEN
      UPDATE public.upi_commission_students
      SET eligibility_status = 'cancelled', claim_status = 'rejected'
      WHERE id = ev.source_student_commission_id;
      PERFORM public.fn_release_commission_hold(ev.source_student_commission_id);
    WHEN 'replaced' THEN
      UPDATE public.upi_commission_students
      SET eligibility_status = 'cancelled', claim_status = 'rejected'
      WHERE id = ev.source_student_commission_id;
      PERFORM public.fn_release_commission_hold(ev.source_student_commission_id);
    ELSE
      NULL;
  END CASE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_process_transfer_outcome(uuid, text, uuid, numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_create_replacement_commission(
  p_source_student_commission_id uuid,
  p_claim_cycle_id uuid,
  p_partnership_route_id uuid DEFAULT NULL,
  p_commission_period_code text DEFAULT 'enrollment'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  src public.upi_commission_students%ROWTYPE;
  new_id uuid;
BEGIN
  SELECT * INTO src FROM public.upi_commission_students WHERE id = p_source_student_commission_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'source not found'; END IF;

  INSERT INTO public.upi_commission_students (
    claim_cycle_id, institution_id, commission_id, client_id,
    student_name, student_email, passport_number, nationality, country_of_origin,
    program_name, program_level, campus, intake_term, intake_month, intake_year,
    tuition_amount, tuition_currency,
    partnership_route_id, aggregator_id, channel_type,
    commission_period_code, eligibility_status, claim_status, payment_status
  ) VALUES (
    p_claim_cycle_id, src.institution_id, src.commission_id, src.client_id,
    src.student_name, src.student_email, src.passport_number, src.nationality, src.country_of_origin,
    src.program_name, src.program_level, src.campus, src.intake_term, src.intake_month, src.intake_year,
    src.tuition_amount, src.tuition_currency,
    COALESCE(p_partnership_route_id, src.partnership_route_id), src.aggregator_id, src.channel_type,
    p_commission_period_code, 'pending', 'not_ready', 'unpaid'
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_create_replacement_commission(uuid, uuid, uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Counselor-safe view (status only — no amounts)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_client_commission_status AS
SELECT
  ucs.client_id,
  ucs.id AS student_commission_id,
  ucs.institution_id,
  i.name AS institution_name,
  ucs.program_name,
  ucs.intake_term,
  ucs.commission_period_code,
  ucs.eligibility_status,
  ucs.claim_status,
  ucs.payment_status,
  ucs.hold_status,
  ucs.hold_reason,
  ucs.eligibility_date,
  ucs.expected_claim_date,
  ucs.commission_status AS legacy_status
FROM public.upi_commission_students ucs
LEFT JOIN public.upi_institutions i ON i.id = ucs.institution_id
WHERE ucs.client_id IS NOT NULL;

GRANT SELECT ON public.v_client_commission_status TO authenticated;

-- ===== FILE: 20260723120300_commission_counselor_view.sql =====
-- Counselor-safe commission status view (definer rights — status columns only, no amounts in view)
-- Ensures lifecycle columns exist (20100 may not have run yet if migrations applied out of order).

ALTER TABLE public.upi_commission_students
  ADD COLUMN IF NOT EXISTS eligibility_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS claim_status text DEFAULT 'not_ready',
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS hold_status text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS hold_reason text,
  ADD COLUMN IF NOT EXISTS eligibility_date date,
  ADD COLUMN IF NOT EXISTS expected_claim_date date,
  ADD COLUMN IF NOT EXISTS commission_period_code text DEFAULT 'enrollment';

DROP VIEW IF EXISTS public.v_client_commission_status;

CREATE VIEW public.v_client_commission_status
WITH (security_invoker = false)
AS
SELECT
  ucs.client_id,
  ucs.id AS student_commission_id,
  ucs.institution_id,
  i.name AS institution_name,
  ucs.program_name,
  ucs.intake_term,
  ucs.commission_period_code,
  ucs.eligibility_status,
  ucs.claim_status,
  ucs.payment_status,
  ucs.hold_status,
  ucs.hold_reason,
  ucs.eligibility_date,
  ucs.expected_claim_date,
  ucs.commission_status AS legacy_status
FROM public.upi_commission_students ucs
LEFT JOIN public.upi_institutions i ON i.id = ucs.institution_id
WHERE ucs.client_id IS NOT NULL;

GRANT SELECT ON public.v_client_commission_status TO authenticated;

COMMENT ON VIEW public.v_client_commission_status IS
  'Counselor-safe commission lifecycle status (no amounts). security_invoker=false for read through confidential RLS.';

-- ===== FILE: 20260723120400_commission_counselor_view_hotfix.sql =====
-- Hotfix: counselor view requires Phase 1 lifecycle columns on upi_commission_students.
-- Safe if 20100 already applied; required when 20300 ran before 20100 or was pasted alone.

ALTER TABLE public.upi_commission_students
  ADD COLUMN IF NOT EXISTS eligibility_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS claim_status text DEFAULT 'not_ready',
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS hold_status text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS hold_reason text,
  ADD COLUMN IF NOT EXISTS eligibility_date date,
  ADD COLUMN IF NOT EXISTS expected_claim_date date,
  ADD COLUMN IF NOT EXISTS commission_period_code text DEFAULT 'enrollment';

DROP VIEW IF EXISTS public.v_client_commission_status;

CREATE VIEW public.v_client_commission_status
WITH (security_invoker = false)
AS
SELECT
  ucs.client_id,
  ucs.id AS student_commission_id,
  ucs.institution_id,
  i.name AS institution_name,
  ucs.program_name,
  ucs.intake_term,
  ucs.commission_period_code,
  ucs.eligibility_status,
  ucs.claim_status,
  ucs.payment_status,
  ucs.hold_status,
  ucs.hold_reason,
  ucs.eligibility_date,
  ucs.expected_claim_date,
  ucs.commission_status AS legacy_status
FROM public.upi_commission_students ucs
LEFT JOIN public.upi_institutions i ON i.id = ucs.institution_id
WHERE ucs.client_id IS NOT NULL;

GRANT SELECT ON public.v_client_commission_status TO authenticated;

COMMENT ON VIEW public.v_client_commission_status IS
  'Counselor-safe commission lifecycle status (no amounts). security_invoker=false for read through confidential RLS.';

-- ===== FILE: 20260801120000_commission_receipts_schema.sql =====
-- Phase 2A: Commission receipt posting + student allocation (schema)

-- ---------------------------------------------------------------------------
-- Remittance batches
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.upi_commission_remittance_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_reference text NOT NULL UNIQUE,
  payer_type text NOT NULL CHECK (payer_type IN ('institution', 'aggregator')),
  institution_id uuid REFERENCES public.upi_institutions(id) ON DELETE SET NULL,
  aggregator_id uuid REFERENCES public.upi_aggregators(id) ON DELETE SET NULL,
  total_amount numeric(14,2),
  currency text NOT NULL DEFAULT 'CAD',
  received_date date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reconciled', 'disputed')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_remittance_batches_updated_at ON public.upi_commission_remittance_batches;
CREATE TRIGGER trg_remittance_batches_updated_at
  BEFORE UPDATE ON public.upi_commission_remittance_batches
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Receipts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.upi_commission_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'ready', 'posted', 'voided')),

  payer_type text NOT NULL CHECK (payer_type IN ('institution', 'aggregator')),
  payer_id uuid NOT NULL,
  payer_name_snapshot text NOT NULL,
  institution_id uuid REFERENCES public.upi_institutions(id) ON DELETE SET NULL,
  aggregator_id uuid REFERENCES public.upi_aggregators(id) ON DELETE SET NULL,
  context_institution_id uuid REFERENCES public.upi_institutions(id) ON DELETE SET NULL,
  remittance_batch_id uuid REFERENCES public.upi_commission_remittance_batches(id) ON DELETE SET NULL,

  remittance_reference text,
  bank_reference text,
  receipt_date date NOT NULL DEFAULT CURRENT_DATE,
  posting_date date,

  receipt_currency text NOT NULL DEFAULT 'CAD',
  receipt_amount numeric(14,2) NOT NULL CHECK (receipt_amount > 0),
  exchange_rate numeric(12,6) NOT NULL DEFAULT 1 CHECK (exchange_rate > 0),
  base_currency text NOT NULL DEFAULT 'CAD',
  base_amount numeric(14,2) GENERATED ALWAYS AS (round(receipt_amount * exchange_rate, 2)) STORED,

  amount_allocated numeric(14,2) NOT NULL DEFAULT 0 CHECK (amount_allocated >= 0),
  unallocated_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (unallocated_amount >= 0),

  fx_review_status text NOT NULL DEFAULT 'not_required'
    CHECK (fx_review_status IN ('not_required', 'pending', 'approved')),
  fx_reviewed_by uuid,
  fx_reviewed_at timestamptz,
  fx_review_notes text,

  payment_method text,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}',

  accounting_journal_id uuid,

  created_by uuid,
  ready_at timestamptz,
  ready_by uuid,
  posted_by uuid,
  posted_at timestamptz,
  voided_by uuid,
  voided_at timestamptz,
  void_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CHECK (amount_allocated <= receipt_amount),
  CHECK (unallocated_amount = receipt_amount - amount_allocated)
);

CREATE INDEX IF NOT EXISTS idx_ucr_status ON public.upi_commission_receipts (status, receipt_date DESC);
CREATE INDEX IF NOT EXISTS idx_ucr_payer ON public.upi_commission_receipts (payer_type, payer_id);
CREATE INDEX IF NOT EXISTS idx_ucr_remittance ON public.upi_commission_receipts (remittance_reference);
CREATE INDEX IF NOT EXISTS idx_ucr_context_inst ON public.upi_commission_receipts (context_institution_id);

DROP TRIGGER IF EXISTS trg_ucr_updated_at ON public.upi_commission_receipts;
CREATE TRIGGER trg_ucr_updated_at
  BEFORE UPDATE ON public.upi_commission_receipts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.block_commission_receipt_edit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status IN ('posted', 'voided') THEN
    RAISE EXCEPTION 'Receipt is % — edit not allowed; void and recreate', OLD.status;
  END IF;
  IF OLD.status = 'ready' AND NEW.status = OLD.status THEN
    RAISE EXCEPTION 'Receipt is ready — reopen to draft before editing';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_receipt_edit ON public.upi_commission_receipts;
CREATE TRIGGER trg_block_receipt_edit
  BEFORE UPDATE ON public.upi_commission_receipts
  FOR EACH ROW EXECUTE FUNCTION public.block_commission_receipt_edit();

-- ---------------------------------------------------------------------------
-- Invoice allocations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.upi_commission_receipt_invoice_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES public.upi_commission_receipts(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.upi_commission_invoices(id) ON DELETE RESTRICT,
  amount_allocated numeric(14,2) NOT NULL CHECK (amount_allocated > 0),
  currency text NOT NULL DEFAULT 'CAD',
  allocated_at timestamptz NOT NULL DEFAULT now(),
  allocated_by uuid,
  UNIQUE (receipt_id, invoice_id)
);

CREATE INDEX IF NOT EXISTS idx_ucria_invoice ON public.upi_commission_receipt_invoice_allocations (invoice_id);
CREATE INDEX IF NOT EXISTS idx_ucria_receipt ON public.upi_commission_receipt_invoice_allocations (receipt_id);

-- ---------------------------------------------------------------------------
-- Student allocations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.upi_commission_receipt_student_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES public.upi_commission_receipts(id) ON DELETE CASCADE,
  invoice_allocation_id uuid NOT NULL
    REFERENCES public.upi_commission_receipt_invoice_allocations(id) ON DELETE CASCADE,
  student_commission_id uuid NOT NULL
    REFERENCES public.upi_commission_students(id) ON DELETE RESTRICT,
  invoice_line_item_id uuid REFERENCES public.upi_invoice_line_items(id) ON DELETE SET NULL,
  snapshot_id uuid REFERENCES public.upi_commission_snapshots(id) ON DELETE SET NULL,
  amount_allocated numeric(14,2) NOT NULL CHECK (amount_allocated > 0),
  currency text NOT NULL DEFAULT 'CAD',
  allocation_method text NOT NULL DEFAULT 'manual'
    CHECK (allocation_method IN ('manual', 'pro_rata', 'fifo', 'full_line')),
  allocated_at timestamptz NOT NULL DEFAULT now(),
  allocated_by uuid
);

CREATE INDEX IF NOT EXISTS idx_ucrsa_student ON public.upi_commission_receipt_student_allocations (student_commission_id);
CREATE INDEX IF NOT EXISTS idx_ucrsa_receipt ON public.upi_commission_receipt_student_allocations (receipt_id);

-- ---------------------------------------------------------------------------
-- Attachments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.upi_commission_receipt_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES public.upi_commission_receipts(id) ON DELETE CASCADE,
  attachment_type text NOT NULL
    CHECK (attachment_type IN ('payment_advice', 'remittance', 'wire_confirmation', 'supporting')),
  file_name text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  file_size_bytes bigint,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ucra_receipt ON public.upi_commission_receipt_attachments (receipt_id);

-- ---------------------------------------------------------------------------
-- Extend invoices / students / line items
-- ---------------------------------------------------------------------------
ALTER TABLE public.upi_commission_invoices
  ADD COLUMN IF NOT EXISTS amount_received numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_outstanding numeric(14,2),
  ADD COLUMN IF NOT EXISTS last_receipt_id uuid REFERENCES public.upi_commission_receipts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS short_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS invoice_currency text DEFAULT 'CAD';

UPDATE public.upi_commission_invoices
SET amount_outstanding = GREATEST(total_amount - COALESCE(amount_received, 0), 0)
WHERE amount_outstanding IS NULL;

ALTER TABLE public.upi_commission_students
  ADD COLUMN IF NOT EXISTS amount_received numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_outstanding numeric(14,2),
  ADD COLUMN IF NOT EXISTS last_receipt_id uuid REFERENCES public.upi_commission_receipts(id) ON DELETE SET NULL;

-- Phase 1 lifecycle columns (may be missing if 20260723120100 not applied yet)
ALTER TABLE public.upi_commission_students
  ADD COLUMN IF NOT EXISTS expected_amount numeric(14,2),
  ADD COLUMN IF NOT EXISTS amended_expected_amount numeric(14,2);

UPDATE public.upi_commission_students
SET amount_outstanding = GREATEST(
  COALESCE(amended_expected_amount, expected_amount, commission_amount, 0) - COALESCE(amount_received, 0),
  0
)
WHERE amount_outstanding IS NULL;

ALTER TABLE public.upi_invoice_line_items
  ADD COLUMN IF NOT EXISTS amount_received numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_outstanding numeric(14,2);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_student_commission_expected(p_student_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    amended_expected_amount,
    expected_amount,
    commission_amount,
    0
  )
  FROM public.upi_commission_students
  WHERE id = p_student_id;
$$;

CREATE OR REPLACE FUNCTION public.fn_refresh_receipt_allocation_totals(p_receipt_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_sum numeric;
  v_amount numeric;
BEGIN
  SELECT COALESCE(SUM(amount_allocated), 0) INTO v_sum
  FROM public.upi_commission_receipt_invoice_allocations
  WHERE receipt_id = p_receipt_id;

  SELECT receipt_amount INTO v_amount FROM public.upi_commission_receipts WHERE id = p_receipt_id;

  UPDATE public.upi_commission_receipts
  SET amount_allocated = v_sum,
      unallocated_amount = v_amount - v_sum
  WHERE id = p_receipt_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_refresh_receipt_fx_review(p_receipt_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_receipt_currency text;
  v_cross boolean;
BEGIN
  SELECT receipt_currency INTO v_receipt_currency
  FROM public.upi_commission_receipts WHERE id = p_receipt_id;

  SELECT EXISTS (
    SELECT 1
    FROM public.upi_commission_receipt_invoice_allocations ia
    JOIN public.upi_commission_invoices inv ON inv.id = ia.invoice_id
    WHERE ia.receipt_id = p_receipt_id
      AND COALESCE(inv.invoice_currency, inv.currency, 'CAD') <> v_receipt_currency
  ) INTO v_cross;

  UPDATE public.upi_commission_receipts
  SET fx_review_status = CASE
    WHEN v_cross THEN
      CASE WHEN fx_review_status = 'approved' THEN 'approved' ELSE 'pending' END
    ELSE 'not_required'
  END
  WHERE id = p_receipt_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_commission_receipt_open_items AS
SELECT
  inv.id AS invoice_id,
  inv.institution_id,
  inv.invoice_number,
  inv.total_amount,
  inv.amount_received,
  COALESCE(inv.amount_outstanding, inv.total_amount - COALESCE(inv.amount_received, 0)) AS amount_outstanding,
  inv.status,
  inv.currency
FROM public.upi_commission_invoices inv
WHERE COALESCE(inv.amount_outstanding, inv.total_amount - COALESCE(inv.amount_received, 0)) > 0;

CREATE OR REPLACE VIEW public.v_commission_student_receipt_ledger AS
SELECT
  ucs.id AS student_commission_id,
  ucs.institution_id,
  ucs.student_name,
  public.fn_student_commission_expected(ucs.id) AS expected_amount,
  ucs.amount_received,
  COALESCE(
    ucs.amount_outstanding,
    public.fn_student_commission_expected(ucs.id) - COALESCE(ucs.amount_received, 0)
  ) AS amount_outstanding,
  ucs.payment_status,
  ucs.eligibility_status,
  ucs.claim_status
FROM public.upi_commission_students ucs;

CREATE OR REPLACE VIEW public.v_commission_receipts_in_progress AS
SELECT *
FROM public.upi_commission_receipts
WHERE status IN ('draft', 'ready');

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.upi_commission_remittance_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upi_commission_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upi_commission_receipt_invoice_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upi_commission_receipt_student_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upi_commission_receipt_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ucr_batches_confidential ON public.upi_commission_remittance_batches;
CREATE POLICY ucr_batches_confidential ON public.upi_commission_remittance_batches
  FOR ALL TO authenticated
  USING (public.can_view_upi_confidential(auth.uid()))
  WITH CHECK (public.can_view_upi_confidential(auth.uid()));

DROP POLICY IF EXISTS ucr_receipts_confidential ON public.upi_commission_receipts;
CREATE POLICY ucr_receipts_confidential ON public.upi_commission_receipts
  FOR ALL TO authenticated
  USING (public.can_view_upi_confidential(auth.uid()))
  WITH CHECK (public.can_view_upi_confidential(auth.uid()));

DROP POLICY IF EXISTS ucr_invoice_alloc_confidential ON public.upi_commission_receipt_invoice_allocations;
CREATE POLICY ucr_invoice_alloc_confidential ON public.upi_commission_receipt_invoice_allocations
  FOR ALL TO authenticated
  USING (public.can_view_upi_confidential(auth.uid()))
  WITH CHECK (public.can_view_upi_confidential(auth.uid()));

DROP POLICY IF EXISTS ucr_student_alloc_confidential ON public.upi_commission_receipt_student_allocations;
CREATE POLICY ucr_student_alloc_confidential ON public.upi_commission_receipt_student_allocations
  FOR ALL TO authenticated
  USING (public.can_view_upi_confidential(auth.uid()))
  WITH CHECK (public.can_view_upi_confidential(auth.uid()));

DROP POLICY IF EXISTS ucr_attachments_confidential ON public.upi_commission_receipt_attachments;
CREATE POLICY ucr_attachments_confidential ON public.upi_commission_receipt_attachments
  FOR ALL TO authenticated
  USING (public.can_view_upi_confidential(auth.uid()))
  WITH CHECK (public.can_view_upi_confidential(auth.uid()));

GRANT SELECT ON public.v_commission_receipt_open_items TO authenticated;
GRANT SELECT ON public.v_commission_student_receipt_ledger TO authenticated;
GRANT SELECT ON public.v_commission_receipts_in_progress TO authenticated;

-- ===== FILE: 20260801120100_commission_receipt_rpcs.sql =====
-- Phase 2A: Commission receipt RPCs (lifecycle, allocation, post, void)

CREATE OR REPLACE FUNCTION public.fn_assert_commission_receipt_actor()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.can_view_upi_confidential(auth.uid())
    OR public.is_accounting_user(auth.uid())
    OR public.is_commission_admin(auth.uid())
  ) THEN
    RAISE EXCEPTION 'not authorized for commission receipts';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_validate_receipt_allocations(p_receipt_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  r public.upi_commission_receipts%ROWTYPE;
  inv_rec record;
  v_student_sum numeric;
BEGIN
  SELECT * INTO r FROM public.upi_commission_receipts WHERE id = p_receipt_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'receipt not found'; END IF;

  IF r.amount_allocated <> r.receipt_amount THEN
    RAISE EXCEPTION 'receipt cash must be fully allocated (unallocated %)', r.unallocated_amount;
  END IF;

  IF r.fx_review_status = 'pending' THEN
    RAISE EXCEPTION 'FX review pending — approve before ready/post';
  END IF;

  FOR inv_rec IN
    SELECT ia.id, ia.amount_allocated, ia.invoice_id
    FROM public.upi_commission_receipt_invoice_allocations ia
    WHERE ia.receipt_id = p_receipt_id
  LOOP
    SELECT COALESCE(SUM(sa.amount_allocated), 0) INTO v_student_sum
    FROM public.upi_commission_receipt_student_allocations sa
    WHERE sa.invoice_allocation_id = inv_rec.id;

    IF v_student_sum <> inv_rec.amount_allocated THEN
      RAISE EXCEPTION 'student allocations must equal invoice slice for invoice %', inv_rec.invoice_id;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_create_commission_receipt(
  p_payer_type text,
  p_payer_id uuid,
  p_receipt_amount numeric,
  p_receipt_currency text DEFAULT 'CAD',
  p_exchange_rate numeric DEFAULT 1,
  p_receipt_date date DEFAULT CURRENT_DATE,
  p_remittance_reference text DEFAULT NULL,
  p_bank_reference text DEFAULT NULL,
  p_payment_method text DEFAULT NULL,
  p_context_institution_id uuid DEFAULT NULL,
  p_remittance_batch_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_name text;
  v_num text;
BEGIN
  PERFORM public.fn_assert_commission_receipt_actor();

  IF p_payer_type = 'institution' THEN
    SELECT name INTO v_name FROM public.upi_institutions WHERE id = p_payer_id;
  ELSE
    SELECT name INTO v_name FROM public.upi_aggregators WHERE id = p_payer_id;
  END IF;
  IF v_name IS NULL THEN RAISE EXCEPTION 'payer not found'; END IF;

  v_num := 'CR-' || to_char(now(), 'YYYY') || '-' || lpad((floor(random() * 99999))::text, 5, '0');

  INSERT INTO public.upi_commission_receipts (
    receipt_number, status,
    payer_type, payer_id, payer_name_snapshot,
    institution_id, aggregator_id, context_institution_id,
    remittance_batch_id,
    remittance_reference, bank_reference, receipt_date,
    receipt_currency, receipt_amount, exchange_rate, base_currency,
    amount_allocated, unallocated_amount,
    fx_review_status, payment_method, notes, metadata, created_by
  ) VALUES (
    v_num, 'draft',
    p_payer_type, p_payer_id, v_name,
    CASE WHEN p_payer_type = 'institution' THEN p_payer_id ELSE NULL END,
    CASE WHEN p_payer_type = 'aggregator' THEN p_payer_id ELSE NULL END,
    p_context_institution_id,
    p_remittance_batch_id,
    p_remittance_reference, p_bank_reference, p_receipt_date,
    p_receipt_currency, p_receipt_amount, p_exchange_rate, 'CAD',
    0, p_receipt_amount,
    'not_required', p_payment_method, p_notes, COALESCE(p_metadata, '{}'), auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_update_commission_receipt(
  p_receipt_id uuid,
  p_receipt_amount numeric DEFAULT NULL,
  p_receipt_currency text DEFAULT NULL,
  p_exchange_rate numeric DEFAULT NULL,
  p_receipt_date date DEFAULT NULL,
  p_remittance_reference text DEFAULT NULL,
  p_bank_reference text DEFAULT NULL,
  p_payment_method text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.upi_commission_receipts%ROWTYPE;
BEGIN
  PERFORM public.fn_assert_commission_receipt_actor();
  SELECT * INTO r FROM public.upi_commission_receipts WHERE id = p_receipt_id FOR UPDATE;
  IF r.status <> 'draft' THEN RAISE EXCEPTION 'only draft receipts can be updated'; END IF;

  UPDATE public.upi_commission_receipts SET
    receipt_amount = COALESCE(p_receipt_amount, receipt_amount),
    receipt_currency = COALESCE(p_receipt_currency, receipt_currency),
    exchange_rate = COALESCE(p_exchange_rate, exchange_rate),
    receipt_date = COALESCE(p_receipt_date, receipt_date),
    remittance_reference = COALESCE(p_remittance_reference, remittance_reference),
    bank_reference = COALESCE(p_bank_reference, bank_reference),
    payment_method = COALESCE(p_payment_method, payment_method),
    notes = COALESCE(p_notes, notes),
    metadata = COALESCE(p_metadata, metadata)
  WHERE id = p_receipt_id;

  PERFORM public.fn_refresh_receipt_allocation_totals(p_receipt_id);
  PERFORM public.fn_refresh_receipt_fx_review(p_receipt_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_upsert_receipt_invoice_allocations(
  p_receipt_id uuid,
  p_allocations jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.upi_commission_receipts%ROWTYPE;
  item jsonb;
  v_invoice_id uuid;
  v_amount numeric;
BEGIN
  PERFORM public.fn_assert_commission_receipt_actor();
  SELECT * INTO r FROM public.upi_commission_receipts WHERE id = p_receipt_id FOR UPDATE;
  IF r.status <> 'draft' THEN RAISE EXCEPTION 'only draft receipts can allocate'; END IF;

  DELETE FROM public.upi_commission_receipt_invoice_allocations WHERE receipt_id = p_receipt_id;

  FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(p_allocations, '[]'::jsonb))
  LOOP
    v_invoice_id := (item->>'invoice_id')::uuid;
    v_amount := (item->>'amount_allocated')::numeric;
    IF v_amount IS NULL OR v_amount <= 0 THEN CONTINUE; END IF;

    INSERT INTO public.upi_commission_receipt_invoice_allocations (
      receipt_id, invoice_id, amount_allocated, currency, allocated_by
    ) VALUES (
      p_receipt_id, v_invoice_id, v_amount, r.receipt_currency, auth.uid()
    );
  END LOOP;

  DELETE FROM public.upi_commission_receipt_student_allocations WHERE receipt_id = p_receipt_id;

  PERFORM public.fn_refresh_receipt_allocation_totals(p_receipt_id);
  PERFORM public.fn_refresh_receipt_fx_review(p_receipt_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_upsert_receipt_student_allocations(
  p_receipt_id uuid,
  p_allocations jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.upi_commission_receipts%ROWTYPE;
  item jsonb;
  v_ia_id uuid;
  v_student_id uuid;
  v_amount numeric;
  v_line_id uuid;
  v_snapshot_id uuid;
  v_method text;
  v_expected numeric;
BEGIN
  PERFORM public.fn_assert_commission_receipt_actor();
  SELECT * INTO r FROM public.upi_commission_receipts WHERE id = p_receipt_id FOR UPDATE;
  IF r.status <> 'draft' THEN RAISE EXCEPTION 'only draft receipts can allocate'; END IF;

  DELETE FROM public.upi_commission_receipt_student_allocations WHERE receipt_id = p_receipt_id;

  FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(p_allocations, '[]'::jsonb))
  LOOP
    v_ia_id := (item->>'invoice_allocation_id')::uuid;
    v_student_id := (item->>'student_commission_id')::uuid;
    v_amount := (item->>'amount_allocated')::numeric;
    v_line_id := NULLIF(item->>'invoice_line_item_id', '')::uuid;
    v_snapshot_id := NULLIF(item->>'snapshot_id', '')::uuid;
    v_method := COALESCE(item->>'allocation_method', 'manual');

    IF v_amount IS NULL OR v_amount <= 0 THEN CONTINUE; END IF;

    v_expected := public.fn_student_commission_expected(v_student_id);
    IF v_amount > v_expected THEN
      RAISE EXCEPTION 'allocation % exceeds student expected %', v_amount, v_expected;
    END IF;

    INSERT INTO public.upi_commission_receipt_student_allocations (
      receipt_id, invoice_allocation_id, student_commission_id,
      invoice_line_item_id, snapshot_id, amount_allocated, currency,
      allocation_method, allocated_by
    ) VALUES (
      p_receipt_id, v_ia_id, v_student_id,
      v_line_id, v_snapshot_id, v_amount, r.receipt_currency,
      v_method, auth.uid()
    );
  END LOOP;

  PERFORM public.fn_refresh_receipt_fx_review(p_receipt_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_approve_receipt_fx_review(
  p_receipt_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.fn_assert_commission_receipt_actor();
  UPDATE public.upi_commission_receipts
  SET fx_review_status = 'approved',
      fx_reviewed_by = auth.uid(),
      fx_reviewed_at = now(),
      fx_review_notes = p_notes
  WHERE id = p_receipt_id AND fx_review_status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'receipt not found or FX review not pending'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_mark_receipt_ready(p_receipt_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.fn_assert_commission_receipt_actor();
  PERFORM public.fn_validate_receipt_allocations(p_receipt_id);

  UPDATE public.upi_commission_receipts
  SET status = 'ready', ready_at = now(), ready_by = auth.uid()
  WHERE id = p_receipt_id AND status = 'draft';

  IF NOT FOUND THEN RAISE EXCEPTION 'receipt not found or not draft'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_reopen_receipt(p_receipt_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.fn_assert_commission_receipt_actor();
  UPDATE public.upi_commission_receipts
  SET status = 'draft', ready_at = NULL, ready_by = NULL
  WHERE id = p_receipt_id AND status = 'ready';
  IF NOT FOUND THEN RAISE EXCEPTION 'receipt not found or not ready'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_sync_invoice_from_receipts(p_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_total numeric;
  v_inv public.upi_commission_invoices%ROWTYPE;
BEGIN
  SELECT COALESCE(SUM(ia.amount_allocated), 0) INTO v_total
  FROM public.upi_commission_receipt_invoice_allocations ia
  JOIN public.upi_commission_receipts r ON r.id = ia.receipt_id
  WHERE ia.invoice_id = p_invoice_id AND r.status = 'posted';

  SELECT * INTO v_inv FROM public.upi_commission_invoices WHERE id = p_invoice_id FOR UPDATE;

  UPDATE public.upi_commission_invoices SET
    amount_received = v_total,
    amount_outstanding = GREATEST(v_inv.total_amount - v_total, 0),
    short_paid = (v_total > 0 AND v_total < v_inv.total_amount),
    status = CASE
      WHEN v_total >= v_inv.total_amount THEN 'paid'
      WHEN v_total > 0 THEN 'partially_paid'
      ELSE v_inv.status
    END,
    payment_received_amount = v_total,
    payment_received_date = CASE WHEN v_total > 0 THEN CURRENT_DATE ELSE payment_received_date END,
    paid_date = CASE WHEN v_total >= v_inv.total_amount THEN CURRENT_DATE ELSE paid_date END
  WHERE id = p_invoice_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_sync_student_from_receipts(p_student_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_total numeric;
  v_expected numeric;
  v_remittance text;
BEGIN
  SELECT COALESCE(SUM(sa.amount_allocated), 0) INTO v_total
  FROM public.upi_commission_receipt_student_allocations sa
  JOIN public.upi_commission_receipts r ON r.id = sa.receipt_id
  WHERE sa.student_commission_id = p_student_id AND r.status = 'posted';

  v_expected := public.fn_student_commission_expected(p_student_id);

  SELECT r.remittance_reference INTO v_remittance
  FROM public.upi_commission_receipt_student_allocations sa
  JOIN public.upi_commission_receipts r ON r.id = sa.receipt_id
  WHERE sa.student_commission_id = p_student_id AND r.status = 'posted'
  ORDER BY r.posted_at DESC NULLS LAST
  LIMIT 1;

  UPDATE public.upi_commission_students SET
    amount_received = v_total,
    amount_outstanding = GREATEST(v_expected - v_total, 0),
    payment_status = CASE
      WHEN v_total >= v_expected AND v_expected > 0 THEN 'paid'
      WHEN v_total > 0 THEN 'partially_paid'
      ELSE 'unpaid'
    END,
    remittance_reference_number = CASE
      WHEN v_total >= v_expected AND v_expected > 0 THEN v_remittance
      ELSE remittance_reference_number
    END,
    commission_paid_date = CASE
      WHEN v_total >= v_expected AND v_expected > 0 THEN CURRENT_DATE
      ELSE commission_paid_date
    END
  WHERE id = p_student_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_post_commission_receipt(p_receipt_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.upi_commission_receipts%ROWTYPE;
  sa record;
  v_snap uuid;
  v_inv record;
  v_st record;
BEGIN
  PERFORM public.fn_assert_commission_receipt_actor();
  SELECT * INTO r FROM public.upi_commission_receipts WHERE id = p_receipt_id FOR UPDATE;

  IF r.status = 'ready' THEN
    NULL;
  ELSIF r.status = 'draft' THEN
    PERFORM public.fn_mark_receipt_ready(p_receipt_id);
    SELECT * INTO r FROM public.upi_commission_receipts WHERE id = p_receipt_id;
  ELSE
    RAISE EXCEPTION 'receipt must be draft or ready to post';
  END IF;

  FOR sa IN
    SELECT * FROM public.upi_commission_receipt_student_allocations WHERE receipt_id = p_receipt_id
  LOOP
    IF sa.snapshot_id IS NOT NULL THEN
      SELECT commission_snapshot_id INTO v_snap
      FROM public.upi_commission_students WHERE id = sa.student_commission_id;
      IF v_snap IS DISTINCT FROM sa.snapshot_id THEN
        RAISE EXCEPTION 'snapshot mismatch for student %', sa.student_commission_id;
      END IF;
    END IF;
  END LOOP;

  UPDATE public.upi_commission_receipts SET
    status = 'posted',
    posted_at = now(),
    posted_by = auth.uid(),
    posting_date = COALESCE(posting_date, receipt_date)
  WHERE id = p_receipt_id;

  FOR v_inv IN
    SELECT DISTINCT ia.invoice_id AS invoice_id
    FROM public.upi_commission_receipt_invoice_allocations ia
    WHERE ia.receipt_id = p_receipt_id
  LOOP
    PERFORM public.fn_sync_invoice_from_receipts(v_inv.invoice_id);
    UPDATE public.upi_commission_invoices SET last_receipt_id = p_receipt_id WHERE id = v_inv.invoice_id;
  END LOOP;

  FOR v_st IN
    SELECT DISTINCT sa.student_commission_id AS student_commission_id
    FROM public.upi_commission_receipt_student_allocations sa
    WHERE sa.receipt_id = p_receipt_id
  LOOP
    PERFORM public.fn_sync_student_from_receipts(v_st.student_commission_id);
    UPDATE public.upi_commission_students SET last_receipt_id = p_receipt_id WHERE id = v_st.student_commission_id;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_void_commission_receipt(
  p_receipt_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.upi_commission_receipts%ROWTYPE;
  v_inv uuid;
  v_st uuid;
BEGIN
  PERFORM public.fn_assert_commission_receipt_actor();
  SELECT * INTO r FROM public.upi_commission_receipts WHERE id = p_receipt_id FOR UPDATE;

  IF r.status = 'draft' THEN
    UPDATE public.upi_commission_receipts
    SET status = 'voided', voided_at = now(), voided_by = auth.uid(), void_reason = p_reason
    WHERE id = p_receipt_id;
    RETURN;
  END IF;

  IF r.status <> 'posted' THEN
    RAISE EXCEPTION 'only posted or draft receipts can be voided';
  END IF;

  UPDATE public.upi_commission_receipts
  SET status = 'voided', voided_at = now(), voided_by = auth.uid(), void_reason = p_reason
  WHERE id = p_receipt_id;

  FOR v_inv IN
    SELECT DISTINCT invoice_id FROM public.upi_commission_receipt_invoice_allocations WHERE receipt_id = p_receipt_id
  LOOP
    PERFORM public.fn_sync_invoice_from_receipts(v_inv);
  END LOOP;

  FOR v_st IN
    SELECT DISTINCT student_commission_id FROM public.upi_commission_receipt_student_allocations WHERE receipt_id = p_receipt_id
  LOOP
    PERFORM public.fn_sync_student_from_receipts(v_st);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_receipt_summary(p_receipt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.upi_commission_receipts%ROWTYPE;
  v_invoices jsonb;
  v_students jsonb;
BEGIN
  SELECT * INTO r FROM public.upi_commission_receipts WHERE id = p_receipt_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', ia.id, 'invoice_id', ia.invoice_id, 'amount_allocated', ia.amount_allocated
  )), '[]'::jsonb) INTO v_invoices
  FROM public.upi_commission_receipt_invoice_allocations ia WHERE ia.receipt_id = p_receipt_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', sa.id, 'student_commission_id', sa.student_commission_id,
    'amount_allocated', sa.amount_allocated, 'invoice_allocation_id', sa.invoice_allocation_id
  )), '[]'::jsonb) INTO v_students
  FROM public.upi_commission_receipt_student_allocations sa WHERE sa.receipt_id = p_receipt_id;

  RETURN jsonb_build_object(
    'receipt', to_jsonb(r),
    'invoice_allocations', v_invoices,
    'student_allocations', v_students
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_create_commission_receipt(text, uuid, numeric, text, numeric, date, text, text, text, uuid, uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_update_commission_receipt(uuid, numeric, text, numeric, date, text, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_upsert_receipt_invoice_allocations(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_upsert_receipt_student_allocations(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_approve_receipt_fx_review(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_mark_receipt_ready(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_reopen_receipt(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_post_commission_receipt(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_void_commission_receipt(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_receipt_summary(uuid) TO authenticated;

-- ===== FILE: 20260801120200_commission_receipt_attachments_storage.sql =====
-- Phase 2A: Storage bucket for receipt attachments + helper to register attachment rows

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'upi-commission-receipts',
  'upi-commission-receipts',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS ucr_storage_select ON storage.objects;
DROP POLICY IF EXISTS ucr_storage_insert ON storage.objects;
DROP POLICY IF EXISTS ucr_storage_delete ON storage.objects;

CREATE POLICY ucr_storage_select ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'upi-commission-receipts'
    AND (
      public.can_view_upi_confidential(auth.uid())
      OR public.is_accounting_user(auth.uid())
      OR public.is_commission_admin(auth.uid())
    )
  );

CREATE POLICY ucr_storage_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'upi-commission-receipts'
    AND (
      public.can_view_upi_confidential(auth.uid())
      OR public.is_accounting_user(auth.uid())
      OR public.is_commission_admin(auth.uid())
    )
  );

CREATE POLICY ucr_storage_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'upi-commission-receipts'
    AND (
      public.can_view_upi_confidential(auth.uid())
      OR public.is_accounting_admin(auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION public.fn_register_receipt_attachment(
  p_receipt_id uuid,
  p_attachment_type text,
  p_file_name text,
  p_storage_path text,
  p_mime_type text DEFAULT NULL,
  p_file_size_bytes bigint DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_status text;
BEGIN
  PERFORM public.fn_assert_commission_receipt_actor();

  SELECT status INTO v_status FROM public.upi_commission_receipts WHERE id = p_receipt_id;
  IF v_status IS NULL THEN RAISE EXCEPTION 'receipt not found'; END IF;
  IF v_status IN ('posted', 'voided') THEN
    RAISE EXCEPTION 'cannot attach files to % receipt', v_status;
  END IF;

  IF p_attachment_type NOT IN ('payment_advice', 'remittance', 'wire_confirmation', 'supporting') THEN
    RAISE EXCEPTION 'invalid attachment type';
  END IF;

  INSERT INTO public.upi_commission_receipt_attachments (
    receipt_id, attachment_type, file_name, storage_path, mime_type, file_size_bytes, uploaded_by
  ) VALUES (
    p_receipt_id, p_attachment_type, p_file_name, p_storage_path, p_mime_type, p_file_size_bytes, auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_register_receipt_attachment(uuid, text, text, text, text, bigint) TO authenticated;

COMMENT ON TABLE public.upi_commission_receipts IS
  'Phase 2A commission receipts. Posted rows immutable — void and recreate. No accounting_journal_id in 2A.';

-- ===== FILE: 20260801120300_commission_receipts_expected_amount_hotfix.sql =====
-- Hotfix: prepare invoice/student receipt columns before backfill.
-- Safe when 20260801120000 rolled back (no amount_outstanding yet) or Phase 1 columns missing.

-- Phase 1 lifecycle columns (20260723120100 may not have run)
ALTER TABLE public.upi_commission_students
  ADD COLUMN IF NOT EXISTS expected_amount numeric(14,2),
  ADD COLUMN IF NOT EXISTS amended_expected_amount numeric(14,2);

-- Receipt ledger columns on students (no FK here — receipts table may not exist yet)
ALTER TABLE public.upi_commission_students
  ADD COLUMN IF NOT EXISTS amount_received numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_outstanding numeric(14,2);

-- Invoice extensions (no last_receipt_id FK here — receipts table may not exist yet)
ALTER TABLE public.upi_commission_invoices
  ADD COLUMN IF NOT EXISTS amount_received numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_outstanding numeric(14,2),
  ADD COLUMN IF NOT EXISTS short_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS invoice_currency text DEFAULT 'CAD';

UPDATE public.upi_commission_invoices
SET amount_outstanding = GREATEST(total_amount - COALESCE(amount_received, 0), 0)
WHERE amount_outstanding IS NULL;

UPDATE public.upi_commission_students
SET amount_outstanding = GREATEST(
  COALESCE(amended_expected_amount, expected_amount, commission_amount, 0) - COALESCE(amount_received, 0),
  0
)
WHERE amount_outstanding IS NULL;

-- Add last_receipt_id FK only after receipts table exists (20000 creates it)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'upi_commission_receipts'
  ) THEN
    ALTER TABLE public.upi_commission_invoices
      ADD COLUMN IF NOT EXISTS last_receipt_id uuid
        REFERENCES public.upi_commission_receipts(id) ON DELETE SET NULL;
    ALTER TABLE public.upi_commission_students
      ADD COLUMN IF NOT EXISTS last_receipt_id uuid
        REFERENCES public.upi_commission_receipts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ===== FILE: 20260815120000_commission_aggregator_invoices.sql =====
-- Phase 2B: Aggregator consolidated invoices + institution invoice links

ALTER TABLE public.upi_aggregators
  ADD COLUMN IF NOT EXISTS default_billing_profile_id uuid
    REFERENCES public.upi_billing_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS remittance_format text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.upi_commission_aggregator_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregator_invoice_number text NOT NULL UNIQUE,
  aggregator_id uuid NOT NULL REFERENCES public.upi_aggregators(id) ON DELETE RESTRICT,
  aggregator_reference_number text,
  commission_period_code text REFERENCES public.upi_commission_periods(code) ON DELETE SET NULL,
  claim_cycle_id uuid REFERENCES public.upi_claim_cycles(id) ON DELETE SET NULL,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  currency text NOT NULL DEFAULT 'CAD',
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  amount_invoiced numeric(14,2) NOT NULL DEFAULT 0,
  amount_received numeric(14,2) NOT NULL DEFAULT 0,
  amount_outstanding numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'approved', 'partially_paid', 'paid', 'disputed', 'cancelled')),
  billing_profile_id uuid REFERENCES public.upi_billing_profiles(id) ON DELETE SET NULL,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ucai_agg ON public.upi_commission_aggregator_invoices (aggregator_id, invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_ucai_period ON public.upi_commission_aggregator_invoices (aggregator_id, commission_period_code);

DROP TRIGGER IF EXISTS trg_ucai_updated_at ON public.upi_commission_aggregator_invoices;
CREATE TRIGGER trg_ucai_updated_at
  BEFORE UPDATE ON public.upi_commission_aggregator_invoices
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.upi_commission_aggregator_invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregator_invoice_id uuid NOT NULL
    REFERENCES public.upi_commission_aggregator_invoices(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL REFERENCES public.upi_institutions(id) ON DELETE RESTRICT,
  institution_invoice_id uuid NOT NULL REFERENCES public.upi_commission_invoices(id) ON DELETE RESTRICT,
  line_amount numeric(14,2) NOT NULL CHECK (line_amount > 0),
  amount_received numeric(14,2) NOT NULL DEFAULT 0,
  amount_outstanding numeric(14,2) NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  UNIQUE (aggregator_invoice_id, institution_invoice_id)
);

CREATE INDEX IF NOT EXISTS idx_ucail_inst ON public.upi_commission_aggregator_invoice_lines (institution_id);
CREATE INDEX IF NOT EXISTS idx_ucail_inst_inv ON public.upi_commission_aggregator_invoice_lines (institution_invoice_id);

ALTER TABLE public.upi_commission_invoices
  ADD COLUMN IF NOT EXISTS aggregator_id uuid REFERENCES public.upi_aggregators(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS aggregator_invoice_id uuid
    REFERENCES public.upi_commission_aggregator_invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_uci_aggregator ON public.upi_commission_invoices (aggregator_id);
CREATE INDEX IF NOT EXISTS idx_uci_agg_inv ON public.upi_commission_invoices (aggregator_invoice_id);

ALTER TABLE public.upi_commission_aggregator_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upi_commission_aggregator_invoice_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ucai_confidential ON public.upi_commission_aggregator_invoices;
CREATE POLICY ucai_confidential ON public.upi_commission_aggregator_invoices
  FOR ALL TO authenticated
  USING (public.can_view_upi_confidential(auth.uid()))
  WITH CHECK (public.can_view_upi_confidential(auth.uid()));

DROP POLICY IF EXISTS ucail_confidential ON public.upi_commission_aggregator_invoice_lines;
CREATE POLICY ucail_confidential ON public.upi_commission_aggregator_invoice_lines
  FOR ALL TO authenticated
  USING (public.can_view_upi_confidential(auth.uid()))
  WITH CHECK (public.can_view_upi_confidential(auth.uid()));

-- ===== FILE: 20260815120100_commission_remittance_batch_first_class.sql =====
-- Phase 2B: Remittance batch first-class + dispute tracking + statement placeholder

ALTER TABLE public.upi_commission_remittance_batches
  ADD COLUMN IF NOT EXISTS aggregator_reference_number text,
  ADD COLUMN IF NOT EXISTS commission_period_code text
    REFERENCES public.upi_commission_periods(code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS amount_expected numeric(14,2),
  ADD COLUMN IF NOT EXISTS amount_received numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_outstanding numeric(14,2),
  ADD COLUMN IF NOT EXISTS receipt_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reconciled_at timestamptz,
  ADD COLUMN IF NOT EXISTS reconciled_by uuid,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS dispute_reason text,
  ADD COLUMN IF NOT EXISTS dispute_notes text,
  ADD COLUMN IF NOT EXISTS dispute_opened_date date,
  ADD COLUMN IF NOT EXISTS dispute_resolved_date date;

-- Extend status check (drop/recreate if needed)
ALTER TABLE public.upi_commission_remittance_batches
  DROP CONSTRAINT IF EXISTS upi_commission_remittance_batches_status_check;

ALTER TABLE public.upi_commission_remittance_batches
  ADD CONSTRAINT upi_commission_remittance_batches_status_check
  CHECK (status IN ('open', 'partially_reconciled', 'reconciled', 'disputed', 'closed'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_ucrb_agg_ref
  ON public.upi_commission_remittance_batches (aggregator_id, aggregator_reference_number)
  WHERE aggregator_reference_number IS NOT NULL AND status <> 'disputed';

CREATE INDEX IF NOT EXISTS idx_ucrb_agg_ref_search
  ON public.upi_commission_remittance_batches (aggregator_reference_number);

ALTER TABLE public.upi_commission_receipts
  ADD COLUMN IF NOT EXISTS aggregator_reference_number text;

CREATE INDEX IF NOT EXISTS idx_ucr_agg_ref ON public.upi_commission_receipts (aggregator_reference_number);

-- Aggregator statement placeholder (upload + batch link)
CREATE TABLE IF NOT EXISTS public.upi_commission_remittance_batch_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.upi_commission_remittance_batches(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  file_size_bytes bigint,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ucrbs_batch ON public.upi_commission_remittance_batch_statements (batch_id);

ALTER TABLE public.upi_commission_remittance_batch_statements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ucrbs_confidential ON public.upi_commission_remittance_batch_statements;
CREATE POLICY ucrbs_confidential ON public.upi_commission_remittance_batch_statements
  FOR ALL TO authenticated
  USING (public.can_view_upi_confidential(auth.uid()))
  WITH CHECK (public.can_view_upi_confidential(auth.uid()));

CREATE OR REPLACE FUNCTION public.fn_refresh_remittance_batch_totals(p_batch_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_received numeric;
  v_expected numeric;
  v_count int;
  v_outstanding numeric;
  v_status text;
BEGIN
  SELECT COALESCE(SUM(r.receipt_amount), 0), COUNT(*)
  INTO v_received, v_count
  FROM public.upi_commission_receipts r
  WHERE r.remittance_batch_id = p_batch_id AND r.status = 'posted';

  SELECT amount_expected INTO v_expected
  FROM public.upi_commission_remittance_batches WHERE id = p_batch_id FOR UPDATE;

  v_outstanding := GREATEST(COALESCE(v_expected, 0) - v_received, 0);

  IF v_expected IS NULL OR v_expected = 0 THEN
    v_status := CASE WHEN v_count > 0 THEN 'partially_reconciled' ELSE 'open' END;
  ELSIF v_received = 0 THEN
    v_status := 'open';
  ELSIF v_received >= v_expected THEN
    v_status := 'reconciled';
  ELSE
    v_status := 'partially_reconciled';
  END IF;

  UPDATE public.upi_commission_remittance_batches SET
    amount_received = v_received,
    amount_outstanding = v_outstanding,
    receipt_count = v_count,
    status = CASE WHEN status = 'disputed' THEN 'disputed' ELSE v_status END,
    reconciled_at = CASE WHEN v_status = 'reconciled' AND status <> 'disputed' THEN now() ELSE reconciled_at END,
    reconciled_by = CASE WHEN v_status = 'reconciled' AND status <> 'disputed' THEN auth.uid() ELSE reconciled_by END
  WHERE id = p_batch_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_refresh_aggregator_invoice_totals(p_agg_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_received numeric;
  v_total numeric;
BEGIN
  UPDATE public.upi_commission_aggregator_invoice_lines ail SET
    amount_received = COALESCE(inv.amount_received, 0),
    amount_outstanding = GREATEST(ail.line_amount - COALESCE(inv.amount_received, 0), 0)
  FROM public.upi_commission_invoices inv
  WHERE ail.institution_invoice_id = inv.id AND ail.aggregator_invoice_id = p_agg_invoice_id;

  SELECT COALESCE(SUM(line_amount), 0), COALESCE(SUM(amount_received), 0)
  INTO v_total, v_received
  FROM public.upi_commission_aggregator_invoice_lines
  WHERE aggregator_invoice_id = p_agg_invoice_id;

  UPDATE public.upi_commission_aggregator_invoices SET
    subtotal = v_total,
    total_amount = v_total,
    amount_invoiced = v_total,
    amount_received = v_received,
    amount_outstanding = GREATEST(v_total - v_received, 0),
    status = CASE
      WHEN v_received >= v_total AND v_total > 0 THEN 'paid'
      WHEN v_received > 0 THEN 'partially_paid'
      ELSE status
    END
  WHERE id = p_agg_invoice_id;
END;
$$;

-- ===== FILE: 20260815120200_commission_aggregator_metrics_views.sql =====
-- Phase 2B: Aggregator metrics views + student workbench row

CREATE OR REPLACE VIEW public.v_commission_aggregator_student_rows AS
SELECT
  ucs.id AS student_commission_id,
  ucs.aggregator_id,
  ucs.institution_id,
  i.name AS institution_name,
  ucs.student_name,
  ucs.program_name,
  ucs.intake_term,
  ucs.intake_year,
  ucs.eligibility_status,
  ucs.claim_status,
  ucs.payment_status,
  ucs.hold_status,
  ucs.hold_reason,
  ucs.commission_status,
  ucs.commission_period_code,
  ucs.invoice_id,
  public.fn_student_commission_expected(ucs.id) AS expected_amount,
  COALESCE(ucs.amount_received, 0) AS amount_received,
  COALESCE(
    ucs.amount_outstanding,
    public.fn_student_commission_expected(ucs.id) - COALESCE(ucs.amount_received, 0)
  ) AS amount_outstanding,
  EXISTS (
    SELECT 1 FROM public.upi_commission_transfer_events te
    WHERE te.source_student_commission_id = ucs.id AND te.event_status = 'open'
  ) AS has_open_transfer,
  (
    ucs.hold_reason = 'transfer_under_review'
    OR EXISTS (
      SELECT 1 FROM public.upi_commission_transfer_events te
      WHERE te.source_student_commission_id = ucs.id AND te.event_status = 'open'
    )
  ) AS transfer_flag
FROM public.upi_commission_students ucs
LEFT JOIN public.upi_institutions i ON i.id = ucs.institution_id
WHERE ucs.aggregator_id IS NOT NULL;

CREATE OR REPLACE VIEW public.v_commission_institution_metrics_agg AS
SELECT
  ucs.aggregator_id,
  ucs.institution_id,
  i.name AS institution_name,
  ucs.commission_period_code,
  SUM(public.fn_student_commission_expected(ucs.id)) AS amount_expected,
  SUM(CASE WHEN ucs.invoice_id IS NOT NULL THEN public.fn_student_commission_expected(ucs.id) ELSE 0 END) AS amount_invoiced,
  SUM(COALESCE(ucs.amount_received, 0)) AS amount_received,
  SUM(GREATEST(
    public.fn_student_commission_expected(ucs.id) - COALESCE(ucs.amount_received, 0),
    0
  )) AS amount_outstanding,
  SUM(CASE WHEN ucs.hold_status = 'active' THEN public.fn_student_commission_expected(ucs.id) ELSE 0 END) AS amount_held
FROM public.upi_commission_students ucs
LEFT JOIN public.upi_institutions i ON i.id = ucs.institution_id
WHERE ucs.aggregator_id IS NOT NULL
GROUP BY ucs.aggregator_id, ucs.institution_id, i.name, ucs.commission_period_code;

CREATE OR REPLACE VIEW public.v_commission_aggregator_metrics AS
SELECT
  aggregator_id,
  commission_period_code,
  SUM(amount_expected) AS amount_expected,
  SUM(amount_invoiced) AS amount_invoiced,
  SUM(amount_received) AS amount_received,
  SUM(amount_outstanding) AS amount_outstanding,
  SUM(amount_held) AS amount_held
FROM public.v_commission_institution_metrics_agg
GROUP BY aggregator_id, commission_period_code;

CREATE OR REPLACE VIEW public.v_commission_batch_reconciliation AS
SELECT
  b.id AS batch_id,
  b.batch_reference,
  b.aggregator_reference_number,
  b.aggregator_id,
  b.commission_period_code,
  b.amount_expected,
  b.amount_received,
  COALESCE(b.amount_outstanding, GREATEST(COALESCE(b.amount_expected, 0) - b.amount_received, 0)) AS amount_outstanding,
  b.receipt_count,
  b.status,
  b.dispute_reason,
  b.dispute_opened_date,
  b.dispute_resolved_date,
  b.received_date,
  (SELECT COUNT(*) FROM public.upi_commission_remittance_batch_statements s WHERE s.batch_id = b.id) AS statement_count
FROM public.upi_commission_remittance_batches b
WHERE b.payer_type = 'aggregator';

GRANT SELECT ON public.v_commission_aggregator_student_rows TO authenticated;
GRANT SELECT ON public.v_commission_institution_metrics_agg TO authenticated;
GRANT SELECT ON public.v_commission_aggregator_metrics TO authenticated;
GRANT SELECT ON public.v_commission_batch_reconciliation TO authenticated;

-- ===== FILE: 20260815120300_commission_aggregator_rpcs.sql =====
-- Phase 2B: Aggregator + batch RPCs; extend 2A receipt validation

CREATE OR REPLACE FUNCTION public.fn_assert_commission_aggregator_actor()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  PERFORM public.fn_assert_commission_receipt_actor();
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_validate_receipt_allocations(p_receipt_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  r public.upi_commission_receipts%ROWTYPE;
  inv_rec record;
  v_student_sum numeric;
BEGIN
  SELECT * INTO r FROM public.upi_commission_receipts WHERE id = p_receipt_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'receipt not found'; END IF;

  IF r.payer_type = 'aggregator' AND r.remittance_batch_id IS NULL THEN
    RAISE EXCEPTION 'aggregator receipt requires remittance batch';
  END IF;

  IF r.amount_allocated <> r.receipt_amount THEN
    RAISE EXCEPTION 'receipt cash must be fully allocated (unallocated %)', r.unallocated_amount;
  END IF;

  IF r.fx_review_status = 'pending' THEN
    RAISE EXCEPTION 'FX review pending — approve before ready/post';
  END IF;

  FOR inv_rec IN
    SELECT ia.id, ia.amount_allocated, ia.invoice_id
    FROM public.upi_commission_receipt_invoice_allocations ia
    WHERE ia.receipt_id = p_receipt_id
  LOOP
    SELECT COALESCE(SUM(sa.amount_allocated), 0) INTO v_student_sum
    FROM public.upi_commission_receipt_student_allocations sa
    WHERE sa.invoice_allocation_id = inv_rec.id;

    IF v_student_sum <> inv_rec.amount_allocated THEN
      RAISE EXCEPTION 'student allocations must equal invoice slice for invoice %', inv_rec.invoice_id;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_create_remittance_batch(
  p_aggregator_id uuid,
  p_batch_reference text,
  p_aggregator_reference_number text DEFAULT NULL,
  p_amount_expected numeric DEFAULT NULL,
  p_currency text DEFAULT 'CAD',
  p_received_date date DEFAULT CURRENT_DATE,
  p_commission_period_code text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  PERFORM public.fn_assert_commission_aggregator_actor();

  INSERT INTO public.upi_commission_remittance_batches (
    batch_reference, payer_type, aggregator_id,
    aggregator_reference_number, commission_period_code,
    total_amount, amount_expected, amount_outstanding, currency,
    received_date, status, notes, created_by
  ) VALUES (
    p_batch_reference, 'aggregator', p_aggregator_id,
    p_aggregator_reference_number, p_commission_period_code,
    p_amount_expected, p_amount_expected,
    COALESCE(p_amount_expected, 0), p_currency,
    p_received_date, 'open', p_notes, auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_dispute_remittance_batch(
  p_batch_id uuid,
  p_dispute_reason text,
  p_dispute_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.fn_assert_commission_aggregator_actor();
  UPDATE public.upi_commission_remittance_batches SET
    status = 'disputed',
    dispute_reason = p_dispute_reason,
    dispute_notes = p_dispute_notes,
    dispute_opened_date = CURRENT_DATE,
    dispute_resolved_date = NULL
  WHERE id = p_batch_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'batch not found'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_resolve_batch_dispute(p_batch_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.fn_assert_commission_aggregator_actor();
  UPDATE public.upi_commission_remittance_batches SET
    dispute_resolved_date = CURRENT_DATE,
    status = 'open'
  WHERE id = p_batch_id AND status = 'disputed';
  PERFORM public.fn_refresh_remittance_batch_totals(p_batch_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_register_batch_statement(
  p_batch_id uuid,
  p_file_name text,
  p_storage_path text,
  p_mime_type text DEFAULT NULL,
  p_file_size_bytes bigint DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  PERFORM public.fn_assert_commission_aggregator_actor();
  INSERT INTO public.upi_commission_remittance_batch_statements (
    batch_id, file_name, storage_path, mime_type, file_size_bytes, uploaded_by
  ) VALUES (
    p_batch_id, p_file_name, p_storage_path, p_mime_type, p_file_size_bytes, auth.uid()
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_create_aggregator_invoice(
  p_aggregator_id uuid,
  p_invoice_number text,
  p_commission_period_code text DEFAULT NULL,
  p_invoice_date date DEFAULT CURRENT_DATE,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  PERFORM public.fn_assert_commission_aggregator_actor();
  INSERT INTO public.upi_commission_aggregator_invoices (
    aggregator_invoice_number, aggregator_id, commission_period_code,
    invoice_date, notes, created_by
  ) VALUES (
    p_invoice_number, p_aggregator_id, p_commission_period_code,
    p_invoice_date, p_notes, auth.uid()
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_add_invoices_to_aggregator_invoice(
  p_aggregator_invoice_id uuid,
  p_institution_invoice_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv uuid;
  v_inst uuid;
  v_amount numeric;
  v_agg uuid;
  v_status text;
BEGIN
  PERFORM public.fn_assert_commission_aggregator_actor();

  SELECT aggregator_id, status INTO v_agg, v_status
  FROM public.upi_commission_aggregator_invoices WHERE id = p_aggregator_invoice_id;
  IF v_status <> 'draft' THEN RAISE EXCEPTION 'only draft aggregator invoices can be edited'; END IF;

  FOREACH v_inv IN ARRAY p_institution_invoice_ids
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.upi_commission_invoices ci
      JOIN public.upi_commission_aggregator_invoices ai ON ai.id = ci.aggregator_invoice_id
      WHERE ci.id = v_inv AND ai.status NOT IN ('cancelled') AND ai.id <> p_aggregator_invoice_id
    ) THEN
      RAISE EXCEPTION 'institution invoice % already linked to another aggregator invoice', v_inv;
    END IF;

    SELECT institution_id, total_amount INTO v_inst, v_amount
    FROM public.upi_commission_invoices WHERE id = v_inv;

    INSERT INTO public.upi_commission_aggregator_invoice_lines (
      aggregator_invoice_id, institution_id, institution_invoice_id, line_amount, amount_outstanding
    ) VALUES (
      p_aggregator_invoice_id, v_inst, v_inv, v_amount, v_amount
    )
    ON CONFLICT (aggregator_invoice_id, institution_invoice_id) DO UPDATE SET
      line_amount = EXCLUDED.line_amount;

    UPDATE public.upi_commission_invoices SET
      aggregator_id = v_agg,
      aggregator_invoice_id = p_aggregator_invoice_id
    WHERE id = v_inv;
  END LOOP;

  PERFORM public.fn_refresh_aggregator_invoice_totals(p_aggregator_invoice_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_submit_aggregator_invoice(p_aggregator_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.fn_assert_commission_aggregator_actor();
  UPDATE public.upi_commission_aggregator_invoices
  SET status = 'submitted'
  WHERE id = p_aggregator_invoice_id AND status = 'draft';
  IF NOT FOUND THEN RAISE EXCEPTION 'aggregator invoice not found or not draft'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_aggregator_workbench_summary(
  p_aggregator_id uuid,
  p_commission_period_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
BEGIN
  SELECT
    COALESCE(SUM(amount_expected), 0) AS expected,
    COALESCE(SUM(amount_invoiced), 0) AS invoiced,
    COALESCE(SUM(amount_received), 0) AS received,
    COALESCE(SUM(amount_outstanding), 0) AS outstanding,
    COALESCE(SUM(amount_held), 0) AS held
  INTO v_row
  FROM public.v_commission_institution_metrics_agg m
  WHERE m.aggregator_id = p_aggregator_id
    AND (p_commission_period_code IS NULL OR m.commission_period_code = p_commission_period_code);

  RETURN jsonb_build_object(
    'expected', v_row.expected,
    'invoiced', v_row.invoiced,
    'received', v_row.received,
    'outstanding', v_row.outstanding,
    'held', v_row.held
  );
END;
$$;

-- Extend post/void to refresh batch + aggregator invoice totals
CREATE OR REPLACE FUNCTION public.fn_post_commission_receipt(p_receipt_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.upi_commission_receipts%ROWTYPE;
  sa record;
  v_snap uuid;
  v_inv record;
  v_st record;
  v_ai uuid;
BEGIN
  PERFORM public.fn_assert_commission_receipt_actor();
  SELECT * INTO r FROM public.upi_commission_receipts WHERE id = p_receipt_id FOR UPDATE;

  IF r.status = 'ready' THEN NULL;
  ELSIF r.status = 'draft' THEN
    PERFORM public.fn_mark_receipt_ready(p_receipt_id);
    SELECT * INTO r FROM public.upi_commission_receipts WHERE id = p_receipt_id;
  ELSE
    RAISE EXCEPTION 'receipt must be draft or ready to post';
  END IF;

  FOR sa IN SELECT * FROM public.upi_commission_receipt_student_allocations WHERE receipt_id = p_receipt_id
  LOOP
    IF sa.snapshot_id IS NOT NULL THEN
      SELECT commission_snapshot_id INTO v_snap FROM public.upi_commission_students WHERE id = sa.student_commission_id;
      IF v_snap IS DISTINCT FROM sa.snapshot_id THEN
        RAISE EXCEPTION 'snapshot mismatch for student %', sa.student_commission_id;
      END IF;
    END IF;
  END LOOP;

  UPDATE public.upi_commission_receipts SET
    status = 'posted', posted_at = now(), posted_by = auth.uid(),
    posting_date = COALESCE(posting_date, receipt_date)
  WHERE id = p_receipt_id;

  FOR v_inv IN
    SELECT DISTINCT ia.invoice_id AS invoice_id FROM public.upi_commission_receipt_invoice_allocations ia
    WHERE ia.receipt_id = p_receipt_id
  LOOP
    PERFORM public.fn_sync_invoice_from_receipts(v_inv.invoice_id);
    UPDATE public.upi_commission_invoices SET last_receipt_id = p_receipt_id WHERE id = v_inv.invoice_id;
    SELECT aggregator_invoice_id INTO v_ai FROM public.upi_commission_invoices WHERE id = v_inv.invoice_id;
    IF v_ai IS NOT NULL THEN PERFORM public.fn_refresh_aggregator_invoice_totals(v_ai); END IF;
  END LOOP;

  FOR v_st IN
    SELECT DISTINCT sa.student_commission_id AS student_commission_id
    FROM public.upi_commission_receipt_student_allocations sa WHERE sa.receipt_id = p_receipt_id
  LOOP
    PERFORM public.fn_sync_student_from_receipts(v_st.student_commission_id);
    UPDATE public.upi_commission_students SET last_receipt_id = p_receipt_id WHERE id = v_st.student_commission_id;
  END LOOP;

  IF r.remittance_batch_id IS NOT NULL THEN
    PERFORM public.fn_refresh_remittance_batch_totals(r.remittance_batch_id);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_void_commission_receipt(
  p_receipt_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.upi_commission_receipts%ROWTYPE;
  v_inv uuid;
  v_st uuid;
  v_ai uuid;
BEGIN
  PERFORM public.fn_assert_commission_receipt_actor();
  SELECT * INTO r FROM public.upi_commission_receipts WHERE id = p_receipt_id FOR UPDATE;

  IF r.status = 'draft' THEN
    UPDATE public.upi_commission_receipts
    SET status = 'voided', voided_at = now(), voided_by = auth.uid(), void_reason = p_reason
    WHERE id = p_receipt_id;
    RETURN;
  END IF;

  IF r.status <> 'posted' THEN
    RAISE EXCEPTION 'only posted or draft receipts can be voided';
  END IF;

  UPDATE public.upi_commission_receipts
  SET status = 'voided', voided_at = now(), voided_by = auth.uid(), void_reason = p_reason
  WHERE id = p_receipt_id;

  FOR v_inv IN
    SELECT DISTINCT invoice_id FROM public.upi_commission_receipt_invoice_allocations WHERE receipt_id = p_receipt_id
  LOOP
    PERFORM public.fn_sync_invoice_from_receipts(v_inv);
    SELECT aggregator_invoice_id INTO v_ai FROM public.upi_commission_invoices WHERE id = v_inv;
    IF v_ai IS NOT NULL THEN PERFORM public.fn_refresh_aggregator_invoice_totals(v_ai); END IF;
  END LOOP;

  FOR v_st IN
    SELECT DISTINCT student_commission_id FROM public.upi_commission_receipt_student_allocations WHERE receipt_id = p_receipt_id
  LOOP
    PERFORM public.fn_sync_student_from_receipts(v_st);
  END LOOP;

  IF r.remittance_batch_id IS NOT NULL THEN
    PERFORM public.fn_refresh_remittance_batch_totals(r.remittance_batch_id);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_create_remittance_batch(uuid, text, text, numeric, text, date, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_dispute_remittance_batch(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_resolve_batch_dispute(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_register_batch_statement(uuid, text, text, text, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_create_aggregator_invoice(uuid, text, text, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_add_invoices_to_aggregator_invoice(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_submit_aggregator_invoice(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_aggregator_workbench_summary(uuid, text) TO authenticated;

-- ===== FILE: 20260815120400_commission_claim_cycles_aggregator_scope.sql =====
-- Phase 2B: Aggregator-scoped claim cycles

ALTER TABLE public.upi_claim_cycles
  ADD COLUMN IF NOT EXISTS aggregator_scope boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cycle_label text;

UPDATE public.upi_claim_cycles SET cycle_label = period_label
WHERE cycle_label IS NULL AND period_label IS NOT NULL;

-- ===== FILE: 20260815120500_commission_aggregator_statement_storage.sql =====
-- Phase 2B: Storage for aggregator remittance statements

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'upi-commission-aggregator-statements',
  'upi-commission-aggregator-statements',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS ucas_storage_select ON storage.objects;
DROP POLICY IF EXISTS ucas_storage_insert ON storage.objects;
DROP POLICY IF EXISTS ucas_storage_delete ON storage.objects;

CREATE POLICY ucas_storage_select ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'upi-commission-aggregator-statements'
    AND (
      public.can_view_upi_confidential(auth.uid())
      OR public.is_accounting_user(auth.uid())
      OR public.is_commission_admin(auth.uid())
    )
  );

CREATE POLICY ucas_storage_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'upi-commission-aggregator-statements'
    AND (
      public.can_view_upi_confidential(auth.uid())
      OR public.is_accounting_user(auth.uid())
      OR public.is_commission_admin(auth.uid())
    )
  );

CREATE POLICY ucas_storage_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'upi-commission-aggregator-statements'
    AND (
      public.can_view_upi_confidential(auth.uid())
      OR public.is_accounting_admin(auth.uid())
    )
  );

-- ===== FILE: 20260753120000_commercial_agreement_engine.sql =====
-- Commercial Agreement Engine — customer ownership protection (constitutional)
--
-- Prerequisites (idempotent): FOE business events + platform_config may not exist yet
-- if earlier platform migrations were not published in Lovable.

CREATE TABLE IF NOT EXISTS public.foe_business_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL,
  event_type text NOT NULL,
  entity_id uuid NULL,
  branch_id uuid NULL,
  source_module text NOT NULL,
  source_record_id text NOT NULL,
  created_by uuid NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_foe_business_events_source
  ON public.foe_business_events (source_module, source_record_id);

CREATE TABLE IF NOT EXISTS public.platform_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text NOT NULL UNIQUE,
  config_json jsonb NOT NULL,
  domain text NOT NULL DEFAULT 'platform',
  version int NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── Immutable eligibility audit ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cae_eligibility_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  settlement_type text NOT NULL,
  source_module text NOT NULL,
  source_record_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('eligible','not_eligible','override_pending','override_approved')),
  reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  ownership_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  business_event_id uuid NULL REFERENCES public.foe_business_events(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cae_eligibility_client
  ON public.cae_eligibility_decisions (client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cae_eligibility_blocked
  ON public.cae_eligibility_decisions (status)
  WHERE status = 'not_eligible';

-- Append-only guard
CREATE OR REPLACE FUNCTION public.trg_cae_decisions_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'CAE eligibility decisions are immutable';
END;
$$;

DROP TRIGGER IF EXISTS trg_cae_decisions_no_update ON public.cae_eligibility_decisions;
CREATE TRIGGER trg_cae_decisions_no_update
  BEFORE UPDATE OR DELETE ON public.cae_eligibility_decisions
  FOR EACH ROW EXECUTE FUNCTION public.trg_cae_decisions_immutable();

-- ── Override requests ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cae_override_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  settlement_type text NOT NULL,
  source_module text NOT NULL,
  source_record_id text NOT NULL,
  agreement_id uuid NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','released')),
  business_reason text NOT NULL,
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  approved_by uuid NULL REFERENCES auth.users(id),
  rejected_by uuid NULL REFERENCES auth.users(id),
  approved_at timestamptz NULL,
  rejected_at timestamptz NULL,
  business_event_id uuid NULL REFERENCES public.foe_business_events(id),
  workflow_instance_id uuid NULL,
  ownership_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  supporting_document_paths jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cae_override_pending
  ON public.cae_override_requests (status)
  WHERE status = 'pending';

-- ── Platform config seed ────────────────────────────────────────────────────
INSERT INTO public.platform_config (config_key, config_json, domain)
VALUES (
  'commercial_agreement_config',
  jsonb_build_object(
    'overrideAuthority', jsonb_build_object(
      'roles', jsonb_build_array('super_admin'),
      'allowFinanceAdmin', false
    ),
    'protectedSettlementTypes', jsonb_build_array(
      'incentive_counselor','incentive_line_item','referral_bonus','referral_points',
      'commission_partner','acquisition_bonus','revenue_share','partner_fee'
    ),
    'enabledOwnershipRules', jsonb_build_array(
      'existing_customer_prior_payment','continuing_relationship',
      'active_commercial_agreement','referral_existing_client',
      'duplicate_referral','ownership_conflict'
    )
  ),
  'commercial_agreement'
)
ON CONFLICT (config_key) DO UPDATE
  SET config_json = EXCLUDED.config_json,
      domain = EXCLUDED.domain,
      updated_at = now();

-- ── CAE eligibility RPC (Settlement Engine entry point) ─────────────────────
CREATE OR REPLACE FUNCTION public.fn_cae_evaluate_settlement_eligibility(
  p_settlement_type text,
  p_client_id uuid,
  p_source_module text,
  p_source_record_id text,
  p_as_of timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prior boolean := false;
  v_prior_before boolean := false;
  v_comm_agreement boolean := false;
  v_override_status text := null;
  v_reasons jsonb := '[]'::jsonb;
  v_eligible boolean := true;
  v_status text := 'eligible';
  v_decision_id uuid;
  v_event_id uuid;
BEGIN
  -- Approved override for this exact settlement source
  SELECT status INTO v_override_status
    FROM public.cae_override_requests
   WHERE client_id = p_client_id
     AND settlement_type = p_settlement_type
     AND source_module = p_source_module
     AND source_record_id = p_source_record_id
     AND status IN ('approved','released')
   ORDER BY created_at DESC
   LIMIT 1;

  IF v_override_status IS NOT NULL THEN
    RETURN jsonb_build_object(
      'eligible', true,
      'status', 'override_approved',
      'reasons', '[]'::jsonb
    );
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.client_invoice_payments p
     WHERE p.client_id = p_client_id
       AND COALESCE(p.is_refund, false) = false
       AND p.archived_at IS NULL
       AND (p.payment_status = 'verified' OR p.payment_proof_status = 'verified')
  ) INTO v_prior;

  SELECT EXISTS (
    SELECT 1 FROM public.client_invoice_payments p
     WHERE p.client_id = p_client_id
       AND COALESCE(p.is_refund, false) = false
       AND p.archived_at IS NULL
       AND p.paid_at < p_as_of
       AND (p.payment_status = 'verified' OR p.payment_proof_status = 'verified')
  ) INTO v_prior_before;

  SELECT EXISTS (
    SELECT 1 FROM public.upi_commission_students u
     WHERE u.client_id = p_client_id
       AND u.agreement_id IS NOT NULL
  ) INTO v_comm_agreement;

  IF v_prior THEN
    v_reasons := v_reasons || jsonb_build_array('existing_customer_prior_payment');
  END IF;
  IF v_prior_before THEN
    v_reasons := v_reasons || jsonb_build_array('continuing_relationship');
  END IF;
  IF v_comm_agreement THEN
    v_reasons := v_reasons || jsonb_build_array('active_commercial_agreement');
  END IF;

  IF jsonb_array_length(v_reasons) > 0 THEN
    v_eligible := false;
    v_status := 'not_eligible';
  END IF;

  INSERT INTO public.foe_business_events (
    domain, event_type, source_module, source_record_id, metadata
  ) VALUES (
    'generic',
    CASE WHEN v_eligible THEN 'cae_settlement_eligible' ELSE 'cae_settlement_blocked' END,
    p_source_module,
    p_source_record_id,
    jsonb_build_object(
      'client_id', p_client_id,
      'settlement_type', p_settlement_type,
      'reasons', v_reasons
    )
  )
  RETURNING id INTO v_event_id;

  INSERT INTO public.cae_eligibility_decisions (
    client_id, settlement_type, source_module, source_record_id,
    status, reasons, ownership_snapshot, business_event_id
  ) VALUES (
    p_client_id, p_settlement_type, p_source_module, p_source_record_id,
    v_status, v_reasons,
    jsonb_build_object(
      'hasPriorVerifiedPayment', v_prior,
      'hasPriorVerifiedPaymentBeforeEvent', v_prior_before,
      'hasActiveCommissionAgreement', v_comm_agreement
    ),
    v_event_id
  )
  RETURNING id INTO v_decision_id;

  RETURN jsonb_build_object(
    'eligible', v_eligible,
    'status', v_status,
    'reasons', v_reasons,
    'decision_id', v_decision_id,
    'business_event_id', v_event_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_cae_evaluate_settlement_eligibility(text, uuid, text, text, timestamptz)
  TO authenticated, service_role;

ALTER TABLE public.cae_eligibility_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cae_override_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cae_decisions_select ON public.cae_eligibility_decisions;
CREATE POLICY cae_decisions_select ON public.cae_eligibility_decisions FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_accounting_admin(auth.uid())
    OR public.is_accounting_user(auth.uid())
  );

DROP POLICY IF EXISTS cae_override_select ON public.cae_override_requests;
CREATE POLICY cae_override_select ON public.cae_override_requests FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_accounting_admin(auth.uid())
    OR requested_by = auth.uid()
  );

DROP POLICY IF EXISTS cae_override_insert ON public.cae_override_requests;
CREATE POLICY cae_override_insert ON public.cae_override_requests FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_accounting_admin(auth.uid())
  );

DROP POLICY IF EXISTS cae_override_update ON public.cae_override_requests;
CREATE POLICY cae_override_update ON public.cae_override_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_accounting_admin(auth.uid()));

COMMENT ON FUNCTION public.fn_cae_evaluate_settlement_eligibility IS
  'Commercial Agreement Engine — ownership gate before any settlement. Default: existing FL customers NOT ELIGIBLE.';

