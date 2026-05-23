
CREATE POLICY "Commission admins read upi_invoice_line_items"
ON public.upi_invoice_line_items FOR SELECT
TO authenticated
USING (public.is_commission_admin(auth.uid()));

CREATE POLICY "Admins read upi_document_pipeline_events"
ON public.upi_document_pipeline_events FOR SELECT
TO authenticated
USING (public.is_commission_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins read upi_renewal_alerts"
ON public.upi_renewal_alerts FOR SELECT
TO authenticated
USING (public.is_commission_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete telephony_provider_settings"
ON public.telephony_provider_settings FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
