
CREATE OR REPLACE FUNCTION public.is_accounting_user(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.accounting_users
    WHERE auth_user_id = _uid AND status = 'ACTIVE'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_commission_admin(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_uid, 'commission_admin'::app_role)
      OR public.is_accounting_admin(_uid)
$$;

CREATE OR REPLACE FUNCTION public.user_has_module(_uid uuid, _module text, _level text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    CASE
      WHEN _module = 'accounting'  THEN public.is_accounting_user(_uid)
      WHEN _module = 'commissions' THEN
        public.is_commission_admin(_uid)
        OR EXISTS (
          SELECT 1 FROM public.user_module_permissions p
          WHERE p.user_id = _uid AND p.module = 'commissions'
            AND CASE _level
                  WHEN 'view'   THEN p.can_view
                  WHEN 'edit'   THEN p.can_edit
                  WHEN 'delete' THEN p.can_delete
                  ELSE false
                END
        )
      ELSE
        public.has_role(_uid, 'admin'::app_role)
        OR EXISTS (
          SELECT 1 FROM public.user_module_permissions p
          WHERE p.user_id = _uid AND p.module = _module
            AND CASE _level
                  WHEN 'view'   THEN p.can_view
                  WHEN 'edit'   THEN p.can_edit
                  WHEN 'delete' THEN p.can_delete
                  ELSE false
                END
        )
    END
$$;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'upi_agreements','upi_agreement_versions',
    'upi_ai_suggestions','upi_extraction_results','upi_uploaded_documents',
    'upi_commissions','upi_commission_rules','upi_commission_students',
    'upi_claim_cycles','upi_commission_invoices','upi_invoices','upi_invoice_line_items'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS auth_insert_%I ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS auth_update_%I ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS auth_delete_%I ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS auth_all_%I ON public.%I', t, t);

    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_commission_admin(auth.uid()))',
                   'commission_admin_insert_' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.is_commission_admin(auth.uid())) WITH CHECK (public.is_commission_admin(auth.uid()))',
                   'commission_admin_update_' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.is_commission_admin(auth.uid()))',
                   'commission_admin_delete_' || t, t);
  END LOOP;
END $$;

-- Known short policy names that the loop's IDENT-quoting won't match
DROP POLICY IF EXISTS auth_all_ucs ON public.upi_commission_students;
DROP POLICY IF EXISTS auth_all_uci ON public.upi_commission_invoices;
DROP POLICY IF EXISTS auth_all_invoices ON public.upi_invoices;
DROP POLICY IF EXISTS auth_all_uili ON public.upi_invoice_line_items;
DROP POLICY IF EXISTS auth_all_claim_cycles ON public.upi_claim_cycles;
