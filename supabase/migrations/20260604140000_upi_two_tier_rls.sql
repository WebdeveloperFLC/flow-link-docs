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
