-- Phase 2B: Remittance batch first-class + dispute tracking + statement placeholder

ALTER TABLE public.upi_commission_remittance_batches
  ADD COLUMN IF NOT EXISTS aggregator_reference_number text,
  ADD COLUMN IF NOT EXISTS commission_period_code text
    REFERENCES public.upi_commission_periods(code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS amount_expected numeric(14,2),
  ADD COLUMN IF NOT EXISTS amount_received numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_outstanding numeric(14,2),
  ADD COLUMN IF NOT EXISTS receipt_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reconciled_at timestamptz,
  ADD COLUMN IF NOT EXISTS reconciled_by uuid,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS dispute_reason text,
  ADD COLUMN IF NOT EXISTS dispute_notes text,
  ADD COLUMN IF NOT EXISTS dispute_opened_date date,
  ADD COLUMN IF NOT EXISTS dispute_resolved_date date;

-- Extend status check (drop/recreate if needed)
ALTER TABLE public.upi_commission_remittance_batches
  DROP CONSTRAINT IF EXISTS upi_commission_remittance_batches_status_check;

ALTER TABLE public.upi_commission_remittance_batches
  ADD CONSTRAINT upi_commission_remittance_batches_status_check
  CHECK (status IN ('open', 'partially_reconciled', 'reconciled', 'disputed', 'closed'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_ucrb_agg_ref
  ON public.upi_commission_remittance_batches (aggregator_id, aggregator_reference_number)
  WHERE aggregator_reference_number IS NOT NULL AND status <> 'disputed';

CREATE INDEX IF NOT EXISTS idx_ucrb_agg_ref_search
  ON public.upi_commission_remittance_batches (aggregator_reference_number);

ALTER TABLE public.upi_commission_receipts
  ADD COLUMN IF NOT EXISTS aggregator_reference_number text;

CREATE INDEX IF NOT EXISTS idx_ucr_agg_ref ON public.upi_commission_receipts (aggregator_reference_number);

-- Aggregator statement placeholder (upload + batch link)
CREATE TABLE IF NOT EXISTS public.upi_commission_remittance_batch_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.upi_commission_remittance_batches(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  file_size_bytes bigint,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ucrbs_batch ON public.upi_commission_remittance_batch_statements (batch_id);

ALTER TABLE public.upi_commission_remittance_batch_statements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ucrbs_confidential ON public.upi_commission_remittance_batch_statements;
CREATE POLICY ucrbs_confidential ON public.upi_commission_remittance_batch_statements
  FOR ALL TO authenticated
  USING (public.can_view_upi_confidential(auth.uid()))
  WITH CHECK (public.can_view_upi_confidential(auth.uid()));

CREATE OR REPLACE FUNCTION public.fn_refresh_remittance_batch_totals(p_batch_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_received numeric;
  v_expected numeric;
  v_count int;
  v_outstanding numeric;
  v_status text;
BEGIN
  SELECT COALESCE(SUM(r.receipt_amount), 0), COUNT(*)
  INTO v_received, v_count
  FROM public.upi_commission_receipts r
  WHERE r.remittance_batch_id = p_batch_id AND r.status = 'posted';

  SELECT amount_expected INTO v_expected
  FROM public.upi_commission_remittance_batches WHERE id = p_batch_id FOR UPDATE;

  v_outstanding := GREATEST(COALESCE(v_expected, 0) - v_received, 0);

  IF v_expected IS NULL OR v_expected = 0 THEN
    v_status := CASE WHEN v_count > 0 THEN 'partially_reconciled' ELSE 'open' END;
  ELSIF v_received = 0 THEN
    v_status := 'open';
  ELSIF v_received >= v_expected THEN
    v_status := 'reconciled';
  ELSE
    v_status := 'partially_reconciled';
  END IF;

  UPDATE public.upi_commission_remittance_batches SET
    amount_received = v_received,
    amount_outstanding = v_outstanding,
    receipt_count = v_count,
    status = CASE WHEN status = 'disputed' THEN 'disputed' ELSE v_status END,
    reconciled_at = CASE WHEN v_status = 'reconciled' AND status <> 'disputed' THEN now() ELSE reconciled_at END,
    reconciled_by = CASE WHEN v_status = 'reconciled' AND status <> 'disputed' THEN auth.uid() ELSE reconciled_by END
  WHERE id = p_batch_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_refresh_aggregator_invoice_totals(p_agg_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_received numeric;
  v_total numeric;
BEGIN
  UPDATE public.upi_commission_aggregator_invoice_lines ail SET
    amount_received = COALESCE(inv.amount_received, 0),
    amount_outstanding = GREATEST(ail.line_amount - COALESCE(inv.amount_received, 0), 0)
  FROM public.upi_commission_invoices inv
  WHERE ail.institution_invoice_id = inv.id AND ail.aggregator_invoice_id = p_agg_invoice_id;

  SELECT COALESCE(SUM(line_amount), 0), COALESCE(SUM(amount_received), 0)
  INTO v_total, v_received
  FROM public.upi_commission_aggregator_invoice_lines
  WHERE aggregator_invoice_id = p_agg_invoice_id;

  UPDATE public.upi_commission_aggregator_invoices SET
    subtotal = v_total,
    total_amount = v_total,
    amount_invoiced = v_total,
    amount_received = v_received,
    amount_outstanding = GREATEST(v_total - v_received, 0),
    status = CASE
      WHEN v_received >= v_total AND v_total > 0 THEN 'paid'
      WHEN v_received > 0 THEN 'partially_paid'
      ELSE status
    END
  WHERE id = p_agg_invoice_id;
END;
$$;
