CREATE POLICY commission_admin_select_upi_commission_students
  ON public.upi_commission_students
  FOR SELECT TO authenticated
  USING (public.is_commission_admin(auth.uid()));

CREATE POLICY commission_admin_select_upi_commission_invoices
  ON public.upi_commission_invoices
  FOR SELECT TO authenticated
  USING (public.is_commission_admin(auth.uid()));