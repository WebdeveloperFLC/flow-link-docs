-- Platform Baseline sync (D22): table GRANTs required by Lovable Data API.
-- Source migrations created RLS policies but omitted authenticated table grants.

DO $$
BEGIN
  IF to_regclass('public.upi_commission_config') IS NOT NULL THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.upi_commission_config TO authenticated;
    GRANT ALL ON public.upi_commission_config TO service_role;
  END IF;

  IF to_regclass('public.upi_commission_aggregator_invoices') IS NOT NULL THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.upi_commission_aggregator_invoices TO authenticated;
    GRANT ALL ON public.upi_commission_aggregator_invoices TO service_role;
  END IF;

  IF to_regclass('public.upi_commission_aggregator_invoice_lines') IS NOT NULL THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.upi_commission_aggregator_invoice_lines TO authenticated;
    GRANT ALL ON public.upi_commission_aggregator_invoice_lines TO service_role;
  END IF;
END $$;
