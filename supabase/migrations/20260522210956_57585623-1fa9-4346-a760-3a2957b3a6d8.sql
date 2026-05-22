
-- Tighten overly permissive UPI catalog policies (restrict writes to admin/commission_admin)
-- and add admin-only policies for tables with RLS but no policies.

DO $$
DECLARE
  t text;
  pol record;
  upi_tables text[] := ARRAY[
    'upi_study_areas','upi_discipline_areas','upi_taxonomy_categories','upi_tags',
    'upi_institutions','upi_institution_tags','upi_campuses','upi_institution_sources',
    'upi_sync_jobs','upi_sync_logs','upi_document_categories','upi_countries',
    'upi_program_levels','upi_courses_staging','upi_course_intakes','upi_language_requirements',
    'upi_scholarship_rules','upi_eligibility_rules','upi_promotions','upi_marketing_campaigns',
    'upi_audit_logs','upi_document_pipeline_events','upi_renewal_alerts'
  ];
BEGIN
  FOREACH t IN ARRAY upi_tables LOOP
    FOR pol IN
      SELECT p.polname
      FROM pg_policy p
      JOIN pg_class c ON c.oid = p.polrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = t
        AND p.polcmd IN ('w','d','a','*')
        AND (
          pg_get_expr(p.polqual, p.polrelid) = 'true'
          OR pg_get_expr(p.polwithcheck, p.polrelid) = 'true'
        )
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.polname, t);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),''admin''::app_role) OR public.is_commission_admin(auth.uid()))',
      t || '_admin_insert', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),''admin''::app_role) OR public.is_commission_admin(auth.uid())) WITH CHECK (public.has_role(auth.uid(),''admin''::app_role) OR public.is_commission_admin(auth.uid()))',
      t || '_admin_update', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.has_role(auth.uid(),''admin''::app_role) OR public.is_commission_admin(auth.uid()))',
      t || '_admin_delete', t
    );
  END LOOP;
END $$;

-- Admin-only policies for tables that had RLS enabled but no policies
CREATE POLICY "upi_sync_queue_admin_all" ON public.upi_sync_queue
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.is_commission_admin(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.is_commission_admin(auth.uid()));

CREATE POLICY "lead_number_sequences_admin_all" ON public.lead_number_sequences
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
