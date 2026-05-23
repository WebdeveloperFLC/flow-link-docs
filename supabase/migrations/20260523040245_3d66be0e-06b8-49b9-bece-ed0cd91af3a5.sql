-- 1. Remove overly-permissive chat reactions read policy
DROP POLICY IF EXISTS "reactions read all" ON public.chat_message_reactions;

-- 2. Restrict upi_audit_logs SELECT to admins / commission admins
DROP POLICY IF EXISTS auth_select_upi_audit_logs ON public.upi_audit_logs;
CREATE POLICY admin_select_upi_audit_logs ON public.upi_audit_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_commission_admin(auth.uid()));

-- 3. Restrict upi_courses_staging SELECT
DROP POLICY IF EXISTS auth_select_upi_courses_staging ON public.upi_courses_staging;
CREATE POLICY admin_select_upi_courses_staging ON public.upi_courses_staging
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_commission_admin(auth.uid()));

-- 4. Restrict upi_extraction_results SELECT
DROP POLICY IF EXISTS auth_select_upi_extraction_results ON public.upi_extraction_results;
CREATE POLICY admin_select_upi_extraction_results ON public.upi_extraction_results
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_commission_admin(auth.uid()));