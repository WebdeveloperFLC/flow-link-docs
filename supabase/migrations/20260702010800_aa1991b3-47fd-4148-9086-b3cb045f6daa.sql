DO $$
BEGIN
  IF to_regclass('public.upi_commission_aggregator_invoice_lines') IS NOT NULL THEN
    DROP POLICY IF EXISTS ucail_confidential ON public.upi_commission_aggregator_invoice_lines;
    DROP POLICY IF EXISTS uc_fin_upi_commission_aggregator_invoice_lines_select ON public.upi_commission_aggregator_invoice_lines;
    DROP POLICY IF EXISTS uc_fin_upi_commission_aggregator_invoice_lines_insert ON public.upi_commission_aggregator_invoice_lines;
    DROP POLICY IF EXISTS uc_fin_upi_commission_aggregator_invoice_lines_update ON public.upi_commission_aggregator_invoice_lines;
    DROP POLICY IF EXISTS uc_fin_upi_commission_aggregator_invoice_lines_delete ON public.upi_commission_aggregator_invoice_lines;
    CREATE POLICY uc_fin_upi_commission_aggregator_invoice_lines_select ON public.upi_commission_aggregator_invoice_lines FOR SELECT TO authenticated USING (public.can_view_commission_financial(auth.uid(), institution_id));
    CREATE POLICY uc_fin_upi_commission_aggregator_invoice_lines_insert ON public.upi_commission_aggregator_invoice_lines FOR INSERT TO authenticated WITH CHECK (public.can_manage_commission_financial(auth.uid(), institution_id));
    CREATE POLICY uc_fin_upi_commission_aggregator_invoice_lines_update ON public.upi_commission_aggregator_invoice_lines FOR UPDATE TO authenticated USING (public.can_manage_commission_financial(auth.uid(), institution_id)) WITH CHECK (public.can_manage_commission_financial(auth.uid(), institution_id));
    CREATE POLICY uc_fin_upi_commission_aggregator_invoice_lines_delete ON public.upi_commission_aggregator_invoice_lines FOR DELETE TO authenticated USING (public.can_manage_commission_financial(auth.uid(), institution_id));
  END IF;

  IF to_regclass('public.upi_commission_aggregator_invoices') IS NOT NULL THEN
    DROP POLICY IF EXISTS ucai_confidential ON public.upi_commission_aggregator_invoices;
    DROP POLICY IF EXISTS uc_fin_ucai_select ON public.upi_commission_aggregator_invoices;
    DROP POLICY IF EXISTS uc_fin_ucai_insert ON public.upi_commission_aggregator_invoices;
    DROP POLICY IF EXISTS uc_fin_ucai_update ON public.upi_commission_aggregator_invoices;
    DROP POLICY IF EXISTS uc_fin_ucai_delete ON public.upi_commission_aggregator_invoices;

    IF to_regclass('public.upi_commission_aggregator_invoice_lines') IS NOT NULL THEN
      CREATE POLICY uc_fin_ucai_select ON public.upi_commission_aggregator_invoices FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role) OR public.is_commission_admin(auth.uid()) OR public.is_accounting_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.upi_commission_aggregator_invoice_lines l WHERE l.aggregator_invoice_id = upi_commission_aggregator_invoices.id AND public.can_view_commission_financial(auth.uid(), l.institution_id)));
    ELSE
      CREATE POLICY uc_fin_ucai_select ON public.upi_commission_aggregator_invoices FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role) OR public.is_commission_admin(auth.uid()) OR public.is_accounting_admin(auth.uid()) OR public.user_has_module(auth.uid(),'commissions','view') OR public.user_has_module(auth.uid(),'commissions','edit'));
    END IF;

    CREATE POLICY uc_fin_ucai_insert ON public.upi_commission_aggregator_invoices FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.is_commission_admin(auth.uid()) OR public.is_accounting_admin(auth.uid()) OR public.user_has_module(auth.uid(),'commissions','edit'));
    CREATE POLICY uc_fin_ucai_update ON public.upi_commission_aggregator_invoices FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role) OR public.is_commission_admin(auth.uid()) OR public.is_accounting_admin(auth.uid()) OR public.user_has_module(auth.uid(),'commissions','edit')) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.is_commission_admin(auth.uid()) OR public.is_accounting_admin(auth.uid()) OR public.user_has_module(auth.uid(),'commissions','edit'));
    CREATE POLICY uc_fin_ucai_delete ON public.upi_commission_aggregator_invoices FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role) OR public.is_commission_admin(auth.uid()));
  END IF;
END $$;