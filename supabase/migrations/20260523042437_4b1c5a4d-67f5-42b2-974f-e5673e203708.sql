-- Tighten SELECT on UPI tables: remove broad USING(true) policies and
-- replace with admin / commission_admin only access.

DROP POLICY IF EXISTS "auth_select_upi_agreements" ON public.upi_agreements;
CREATE POLICY "admin_select_upi_agreements"
  ON public.upi_agreements FOR SELECT
  TO authenticated
  USING (public.is_commission_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "auth_select_upi_agreement_versions" ON public.upi_agreement_versions;
CREATE POLICY "admin_select_upi_agreement_versions"
  ON public.upi_agreement_versions FOR SELECT
  TO authenticated
  USING (public.is_commission_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "auth_select_upi_commissions" ON public.upi_commissions;
CREATE POLICY "admin_select_upi_commissions"
  ON public.upi_commissions FOR SELECT
  TO authenticated
  USING (public.is_commission_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "auth_select_upi_commission_rules" ON public.upi_commission_rules;
CREATE POLICY "admin_select_upi_commission_rules"
  ON public.upi_commission_rules FOR SELECT
  TO authenticated
  USING (public.is_commission_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "auth_select_upi_uploaded_documents" ON public.upi_uploaded_documents;
-- existing "upi_uploaded_documents admin read" policy already restricts to commission_admin

DROP POLICY IF EXISTS "auth_select_upi_ai_suggestions" ON public.upi_ai_suggestions;
-- existing "upi_ai_suggestions admin read" policy already restricts to commission_admin

DROP POLICY IF EXISTS "auth_select_upi_sync_jobs" ON public.upi_sync_jobs;
-- existing "upi_sync_jobs admin read" policy already restricts to commission_admin

DROP POLICY IF EXISTS "auth_select_upi_sync_logs" ON public.upi_sync_logs;
-- existing "upi_sync_logs admin read" policy already restricts to commission_admin
