-- Document Workflow Phase 1 — schema
-- Base template (workflow_templates) + case overlay (application_document_requirements)
-- Single storage: client_documents

-- ---------------------------------------------------------------------------
-- 1. Submission section (dynamic keys — not hardcoded in app enums)
-- ---------------------------------------------------------------------------
INSERT INTO public.case_sections (key, label, sort_order, is_default)
VALUES ('submission', 'Submission', 55, true)
ON CONFLICT (key) DO UPDATE
SET label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order,
    is_archived = false;

-- ---------------------------------------------------------------------------
-- 2. client_service_cases — template ownership (clients.template_id kept for compat)
-- ---------------------------------------------------------------------------
ALTER TABLE public.client_service_cases
  ADD COLUMN IF NOT EXISTS workflow_template_id uuid
    REFERENCES public.workflow_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS template_assigned_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_client_service_cases_workflow_template
  ON public.client_service_cases (workflow_template_id)
  WHERE workflow_template_id IS NOT NULL;

-- Backfill open cases from legacy client template when unset
UPDATE public.client_service_cases csc
SET
  workflow_template_id = cl.template_id,
  template_assigned_at = COALESCE(csc.template_assigned_at, now())
FROM public.clients cl
WHERE cl.id = csc.client_id
  AND csc.workflow_template_id IS NULL
  AND cl.template_id IS NOT NULL
  AND csc.status = 'open';

-- ---------------------------------------------------------------------------
-- 3. client_documents — status workflow, expiry, version, master linkage
--    (No pending_upload — unsatisfied requirements live in ADR only)
-- ---------------------------------------------------------------------------
ALTER TABLE public.client_documents
  ADD COLUMN IF NOT EXISTS master_item_code text,
  ADD COLUMN IF NOT EXISTS issue_date date,
  ADD COLUMN IF NOT EXISTS expiry_date date,
  ADD COLUMN IF NOT EXISTS status_review_note text,
  ADD COLUMN IF NOT EXISTS is_active_version boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS portal_source boolean NOT NULL DEFAULT false;

-- Normalize legacy status values before constraint
UPDATE public.client_documents
SET status = CASE
  WHEN status IN ('processed', 'ready', 'uploaded') THEN 'uploaded'
  WHEN status = 'verified' THEN 'approved'
  WHEN status = 'needs_reissue' THEN 'need_replacement'
  WHEN status = 'rejected' THEN 'rejected'
  WHEN status = 'under_review' THEN 'under_review'
  WHEN status IN ('uploaded', 'under_review', 'approved', 'rejected', 'need_replacement') THEN status
  ELSE 'uploaded'
END;

ALTER TABLE public.client_documents
  DROP CONSTRAINT IF EXISTS client_documents_status_check;

ALTER TABLE public.client_documents
  ADD CONSTRAINT client_documents_status_check
  CHECK (status IN (
    'uploaded',
    'under_review',
    'approved',
    'rejected',
    'need_replacement'
  ));

CREATE INDEX IF NOT EXISTS idx_client_documents_case_active
  ON public.client_documents (case_id, is_active_version)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_client_documents_master_code
  ON public.client_documents (client_id, master_item_code)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_client_documents_expiry
  ON public.client_documents (expiry_date)
  WHERE expiry_date IS NOT NULL AND deleted_at IS NULL;

-- Latest version per client + match key should remain active
WITH ranked AS (
  SELECT
    d.id,
    ROW_NUMBER() OVER (
      PARTITION BY d.client_id,
        COALESCE(
          NULLIF(d.master_item_code, ''),
          NULLIF(d.custom_type, ''),
          d.document_type
        )
      ORDER BY d.version DESC, d.uploaded_at DESC
    ) AS rn
  FROM public.client_documents d
  WHERE d.deleted_at IS NULL
)
UPDATE public.client_documents d
SET is_active_version = (r.rn = 1)
FROM ranked r
WHERE d.id = r.id;

-- ---------------------------------------------------------------------------
-- 4. application_document_requirements — active case checklist overlay
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.application_document_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_service_case_id uuid NOT NULL
    REFERENCES public.client_service_cases(id) ON DELETE CASCADE,
  client_id uuid NOT NULL
    REFERENCES public.clients(id) ON DELETE CASCADE,

  source text NOT NULL
    CHECK (source IN ('template', 'manual_add', 'role_preset')),
  template_item_id text,
  workflow_template_id uuid
    REFERENCES public.workflow_templates(id) ON DELETE SET NULL,

  master_item_code text NOT NULL,
  display_name text NOT NULL,

  mandatory boolean NOT NULL DEFAULT true,
  requirement_kind text NOT NULL DEFAULT 'document'
    CHECK (requirement_kind IN ('document', 'milestone')),

  -- Dynamic sections from workflow_templates.groups (section_key + section_label)
  section_key text NOT NULL,
  section_label text NOT NULL,

  -- Financial sub-grouping UI: e.g. applicant_funds, co_applicant_funds, sponsor_funds
  display_group text,

  party_scope text NOT NULL DEFAULT 'applicant'
    CHECK (party_scope IN (
      'applicant', 'co_applicant', 'sponsor', 'dependent', 'shared', 'any'
    )),
  person_id uuid REFERENCES public.case_people(id) ON DELETE SET NULL,
  person_match_key uuid GENERATED ALWAYS AS (
    COALESCE(person_id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) STORED,

  is_suppressed boolean NOT NULL DEFAULT false,
  notes text,
  sort_order int NOT NULL DEFAULT 0,

  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT adr_unique_case_item UNIQUE (
    client_service_case_id,
    master_item_code,
    requirement_kind,
    person_match_key
  )
);

CREATE INDEX IF NOT EXISTS idx_adr_case_sort
  ON public.application_document_requirements (client_service_case_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_adr_case_active
  ON public.application_document_requirements (client_service_case_id)
  WHERE is_suppressed = false;

CREATE INDEX IF NOT EXISTS idx_adr_case_mandatory
  ON public.application_document_requirements (client_service_case_id, mandatory)
  WHERE is_suppressed = false AND requirement_kind = 'document';

CREATE INDEX IF NOT EXISTS idx_adr_section
  ON public.application_document_requirements (client_service_case_id, section_key, sort_order);

-- ---------------------------------------------------------------------------
-- 5. application_document_milestones — submission checklist (not file uploads)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.application_document_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_service_case_id uuid NOT NULL
    REFERENCES public.client_service_cases(id) ON DELETE CASCADE,
  client_id uuid NOT NULL
    REFERENCES public.clients(id) ON DELETE CASCADE,
  requirement_id uuid NOT NULL UNIQUE
    REFERENCES public.application_document_requirements(id) ON DELETE CASCADE,

  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  completed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reference_number text,
  notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_adm_case
  ON public.application_document_milestones (client_service_case_id);

-- ---------------------------------------------------------------------------
-- 6. Master metadata — conditional default + expiry tracking flags
-- ---------------------------------------------------------------------------
UPDATE public.master_items mi
SET metadata = COALESCE(mi.metadata, '{}'::jsonb) || jsonb_build_object(
  'default_inclusion', 'conditional',
  'template_may_include', true
)
WHERE mi.list_key = 'document_types'
  AND mi.code IN (
    'marriage_certificate',
    'divorce_certificate',
    'police_clearance',
    'medical_report',
    'affidavit_of_support'
  );

UPDATE public.master_items mi
SET metadata = COALESCE(mi.metadata, '{}'::jsonb) || jsonb_build_object(
  'default_inclusion', 'default',
  'template_may_include', true
)
WHERE mi.list_key = 'document_types'
  AND mi.code IN (
    'passport',
    'photograph',
    'academic_transcripts',
    'ielts_language_test',
    'financial_documents',
    'offer_letter',
    'employment_letter',
    'experience_letter',
    'tuition_fee_receipt',
    'gic_certificate',
    'visa_forms'
  );

UPDATE public.master_items mi
SET metadata = COALESCE(mi.metadata, '{}'::jsonb) || jsonb_build_object(
  'tracks_expiry', true
)
WHERE mi.list_key = 'document_types'
  AND mi.code IN (
    'passport',
    'ielts_language_test',
    'medical_report',
    'police_clearance'
  );

-- ---------------------------------------------------------------------------
-- 7. RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.application_document_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_document_milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS adr_select_scoped ON public.application_document_requirements;
CREATE POLICY adr_select_scoped ON public.application_document_requirements
  FOR SELECT TO authenticated
  USING (public.can_view_client(auth.uid(), client_id));

DROP POLICY IF EXISTS adr_insert_scoped ON public.application_document_requirements;
CREATE POLICY adr_insert_scoped ON public.application_document_requirements
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_client(auth.uid(), client_id));

DROP POLICY IF EXISTS adr_update_scoped ON public.application_document_requirements;
CREATE POLICY adr_update_scoped ON public.application_document_requirements
  FOR UPDATE TO authenticated
  USING (public.can_edit_client(auth.uid(), client_id))
  WITH CHECK (public.can_edit_client(auth.uid(), client_id));

DROP POLICY IF EXISTS adr_delete_scoped ON public.application_document_requirements;
CREATE POLICY adr_delete_scoped ON public.application_document_requirements
  FOR DELETE TO authenticated
  USING (public.can_edit_client(auth.uid(), client_id));

DROP POLICY IF EXISTS adm_select_scoped ON public.application_document_milestones;
CREATE POLICY adm_select_scoped ON public.application_document_milestones
  FOR SELECT TO authenticated
  USING (public.can_view_client(auth.uid(), client_id));

DROP POLICY IF EXISTS adm_insert_scoped ON public.application_document_milestones;
CREATE POLICY adm_insert_scoped ON public.application_document_milestones
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_client(auth.uid(), client_id));

DROP POLICY IF EXISTS adm_update_scoped ON public.application_document_milestones;
CREATE POLICY adm_update_scoped ON public.application_document_milestones
  FOR UPDATE TO authenticated
  USING (public.can_edit_client(auth.uid(), client_id))
  WITH CHECK (public.can_edit_client(auth.uid(), client_id));

DROP POLICY IF EXISTS adm_delete_scoped ON public.application_document_milestones;
CREATE POLICY adm_delete_scoped ON public.application_document_milestones
  FOR DELETE TO authenticated
  USING (public.can_edit_client(auth.uid(), client_id));

-- Portal users may read CRM documents for linked clients (Phase 1 portal bridge read path)
DROP POLICY IF EXISTS client_documents_portal_select ON public.client_documents;
CREATE POLICY client_documents_portal_select ON public.client_documents
  FOR SELECT TO authenticated
  USING (public.is_portal_user_for(auth.uid(), client_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_document_requirements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_document_milestones TO authenticated;

DROP TRIGGER IF EXISTS trg_adr_updated_at ON public.application_document_requirements;
CREATE TRIGGER trg_adr_updated_at
  BEFORE UPDATE ON public.application_document_requirements
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_adm_updated_at ON public.application_document_milestones;
CREATE TRIGGER trg_adm_updated_at
  BEFORE UPDATE ON public.application_document_milestones
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

COMMENT ON TABLE public.application_document_requirements IS
  'Active per-case document/milestone checklist. Base template materialized here; counselors add manual items without editing workflow_templates.';

COMMENT ON TABLE public.application_document_milestones IS
  'Submission workflow milestones (fee paid, biometrics, AOR, etc.) — not file uploads.';

COMMENT ON COLUMN public.application_document_requirements.section_key IS
  'From workflow_templates.groups.section_key — dynamic, not hardcoded in app.';

COMMENT ON COLUMN public.application_document_requirements.display_group IS
  'Optional UI subgroup e.g. applicant_funds, sponsor_funds within a section.';

COMMENT ON COLUMN public.application_document_requirements.person_match_key IS
  'Generated scope key for uniqueness when person_id is null (shared/applicant-level requirements).';
