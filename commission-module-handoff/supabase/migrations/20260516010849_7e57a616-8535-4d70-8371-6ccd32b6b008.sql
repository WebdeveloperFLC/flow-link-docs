
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
