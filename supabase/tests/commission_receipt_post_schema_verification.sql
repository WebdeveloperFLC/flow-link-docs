-- Verification: commission receipt post path schema + RPC dependencies.
-- Run after migrations through 20261101120100_commission_post_receipt_schema_sync.sql

DO $$
BEGIN
  IF to_regprocedure('public.fn_post_commission_receipt(uuid)') IS NULL THEN
    RAISE EXCEPTION 'POST RECEIPT CHECK FAIL: fn_post_commission_receipt missing';
  END IF;

  IF to_regprocedure('public.fn_resolve_aggregator_invoice_for_institution_invoice(uuid)') IS NULL THEN
    RAISE EXCEPTION 'POST RECEIPT CHECK FAIL: fn_resolve_aggregator_invoice_for_institution_invoice missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'upi_commission_invoices'
      AND column_name = 'aggregator_invoice_id'
  ) THEN
    RAISE EXCEPTION 'POST RECEIPT CHECK FAIL: upi_commission_invoices.aggregator_invoice_id column missing';
  END IF;

  RAISE NOTICE 'POST RECEIPT CHECK PASS: schema + RPC dependencies present';
END $$;
