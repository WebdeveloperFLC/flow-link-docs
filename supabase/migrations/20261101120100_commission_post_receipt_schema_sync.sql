-- Post-receipt schema sync: ensure Phase 2B aggregator columns exist and post/void RPCs
-- resolve aggregator invoices via the authoritative line table (not a missing denormalized column).

-- ---------------------------------------------------------------------------
-- 1) Idempotent Phase 2B schema catch-up (20260815120000 may not have run)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.upi_commission_aggregator_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregator_invoice_number text NOT NULL UNIQUE,
  aggregator_id uuid NOT NULL REFERENCES public.upi_aggregators(id) ON DELETE RESTRICT,
  aggregator_reference_number text,
  commission_period_code text REFERENCES public.upi_commission_periods(code) ON DELETE SET NULL,
  claim_cycle_id uuid REFERENCES public.upi_claim_cycles(id) ON DELETE SET NULL,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  currency text NOT NULL DEFAULT 'CAD',
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  amount_invoiced numeric(14,2) NOT NULL DEFAULT 0,
  amount_received numeric(14,2) NOT NULL DEFAULT 0,
  amount_outstanding numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'approved', 'partially_paid', 'paid', 'disputed', 'cancelled')),
  billing_profile_id uuid REFERENCES public.upi_billing_profiles(id) ON DELETE SET NULL,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.upi_commission_aggregator_invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregator_invoice_id uuid NOT NULL
    REFERENCES public.upi_commission_aggregator_invoices(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL REFERENCES public.upi_institutions(id) ON DELETE RESTRICT,
  institution_invoice_id uuid NOT NULL REFERENCES public.upi_commission_invoices(id) ON DELETE RESTRICT,
  line_amount numeric(14,2) NOT NULL CHECK (line_amount > 0),
  amount_received numeric(14,2) NOT NULL DEFAULT 0,
  amount_outstanding numeric(14,2) NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  UNIQUE (aggregator_invoice_id, institution_invoice_id)
);

ALTER TABLE public.upi_commission_invoices
  ADD COLUMN IF NOT EXISTS aggregator_id uuid,
  ADD COLUMN IF NOT EXISTS aggregator_invoice_id uuid;

DO $$
BEGIN
  IF to_regclass('public.upi_aggregators') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conname = 'upi_commission_invoices_aggregator_id_fkey'
     ) THEN
    ALTER TABLE public.upi_commission_invoices
      ADD CONSTRAINT upi_commission_invoices_aggregator_id_fkey
      FOREIGN KEY (aggregator_id) REFERENCES public.upi_aggregators(id) ON DELETE SET NULL;
  END IF;

  IF to_regclass('public.upi_commission_aggregator_invoices') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conname = 'upi_commission_invoices_aggregator_invoice_id_fkey'
     ) THEN
    ALTER TABLE public.upi_commission_invoices
      ADD CONSTRAINT upi_commission_invoices_aggregator_invoice_id_fkey
      FOREIGN KEY (aggregator_invoice_id)
      REFERENCES public.upi_commission_aggregator_invoices(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_uci_aggregator ON public.upi_commission_invoices (aggregator_id);
CREATE INDEX IF NOT EXISTS idx_uci_agg_inv ON public.upi_commission_invoices (aggregator_invoice_id);
CREATE INDEX IF NOT EXISTS idx_ucail_inst_inv ON public.upi_commission_aggregator_invoice_lines (institution_invoice_id);

-- Backfill denormalized FK from line table when column was missing at link time.
DO $$
BEGIN
  IF to_regclass('public.upi_commission_aggregator_invoice_lines') IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.upi_commission_invoices inv
  SET
    aggregator_invoice_id = ail.aggregator_invoice_id,
    aggregator_id = COALESCE(inv.aggregator_id, ai.aggregator_id)
  FROM public.upi_commission_aggregator_invoice_lines ail
  JOIN public.upi_commission_aggregator_invoices ai ON ai.id = ail.aggregator_invoice_id
  WHERE ail.institution_invoice_id = inv.id
    AND inv.aggregator_invoice_id IS DISTINCT FROM ail.aggregator_invoice_id;
END $$;

-- ---------------------------------------------------------------------------
-- 2) Authoritative resolver — line table first, denormalized column second
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_resolve_aggregator_invoice_for_institution_invoice(
  p_invoice_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_ai uuid;
BEGIN
  IF p_invoice_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF to_regclass('public.upi_commission_aggregator_invoice_lines') IS NOT NULL THEN
    SELECT ail.aggregator_invoice_id
    INTO v_ai
    FROM public.upi_commission_aggregator_invoice_lines ail
    WHERE ail.institution_invoice_id = p_invoice_id
    ORDER BY ail.sort_order, ail.id
    LIMIT 1;

    IF v_ai IS NOT NULL THEN
      RETURN v_ai;
    END IF;
  END IF;

  SELECT inv.aggregator_invoice_id
  INTO v_ai
  FROM public.upi_commission_invoices inv
  WHERE inv.id = p_invoice_id;

  RETURN v_ai;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3) Aggregator invoice maintenance — use line table for duplicate detection
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_add_invoices_to_aggregator_invoice(
  p_aggregator_invoice_id uuid,
  p_institution_invoice_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv uuid;
  v_inst uuid;
  v_amount numeric;
  v_agg uuid;
  v_status text;
BEGIN
  PERFORM public.fn_assert_commission_aggregator_actor();

  SELECT aggregator_id, status INTO v_agg, v_status
  FROM public.upi_commission_aggregator_invoices WHERE id = p_aggregator_invoice_id;
  IF v_status <> 'draft' THEN RAISE EXCEPTION 'only draft aggregator invoices can be edited'; END IF;

  FOREACH v_inv IN ARRAY p_institution_invoice_ids
  LOOP
    IF EXISTS (
      SELECT 1
      FROM public.upi_commission_aggregator_invoice_lines ail
      JOIN public.upi_commission_aggregator_invoices ai ON ai.id = ail.aggregator_invoice_id
      WHERE ail.institution_invoice_id = v_inv
        AND ai.status NOT IN ('cancelled')
        AND ai.id <> p_aggregator_invoice_id
    ) THEN
      RAISE EXCEPTION 'institution invoice % already linked to another aggregator invoice', v_inv;
    END IF;

    SELECT institution_id, total_amount INTO v_inst, v_amount
    FROM public.upi_commission_invoices WHERE id = v_inv;

    INSERT INTO public.upi_commission_aggregator_invoice_lines (
      aggregator_invoice_id, institution_id, institution_invoice_id, line_amount, amount_outstanding
    ) VALUES (
      p_aggregator_invoice_id, v_inst, v_inv, v_amount, v_amount
    )
    ON CONFLICT (aggregator_invoice_id, institution_invoice_id) DO UPDATE SET
      line_amount = EXCLUDED.line_amount;

    UPDATE public.upi_commission_invoices SET
      aggregator_id = v_agg,
      aggregator_invoice_id = p_aggregator_invoice_id
    WHERE id = v_inv;
  END LOOP;

  PERFORM public.fn_refresh_aggregator_invoice_totals(p_aggregator_invoice_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- 4) Post / void — resolve aggregator invoice safely (direct partner receipts skip)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_post_commission_receipt(p_receipt_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.upi_commission_receipts%ROWTYPE;
  sa record;
  v_snap uuid;
  v_inv record;
  v_st record;
  v_ai uuid;
BEGIN
  PERFORM public.fn_assert_commission_receipt_actor();
  SELECT * INTO r FROM public.upi_commission_receipts WHERE id = p_receipt_id FOR UPDATE;

  IF r.status = 'ready' THEN
    NULL;
  ELSIF r.status = 'draft' THEN
    PERFORM public.fn_mark_receipt_ready(p_receipt_id);
    SELECT * INTO r FROM public.upi_commission_receipts WHERE id = p_receipt_id;
  ELSE
    RAISE EXCEPTION 'receipt must be draft or ready to post';
  END IF;

  FOR sa IN
    SELECT * FROM public.upi_commission_receipt_student_allocations WHERE receipt_id = p_receipt_id
  LOOP
    IF sa.snapshot_id IS NOT NULL THEN
      SELECT commission_snapshot_id INTO v_snap
      FROM public.upi_commission_students WHERE id = sa.student_commission_id;
      IF v_snap IS DISTINCT FROM sa.snapshot_id THEN
        RAISE EXCEPTION 'snapshot mismatch for student %', sa.student_commission_id;
      END IF;
    END IF;
  END LOOP;

  UPDATE public.upi_commission_receipts SET
    status = 'posted',
    posted_at = now(),
    posted_by = auth.uid(),
    posting_date = COALESCE(posting_date, receipt_date)
  WHERE id = p_receipt_id;

  FOR v_inv IN
    SELECT DISTINCT ia.invoice_id AS invoice_id
    FROM public.upi_commission_receipt_invoice_allocations ia
    WHERE ia.receipt_id = p_receipt_id
  LOOP
    PERFORM public.fn_sync_invoice_from_receipts(v_inv.invoice_id);
    UPDATE public.upi_commission_invoices SET last_receipt_id = p_receipt_id WHERE id = v_inv.invoice_id;

    v_ai := public.fn_resolve_aggregator_invoice_for_institution_invoice(v_inv.invoice_id);
    IF v_ai IS NOT NULL THEN
      PERFORM public.fn_refresh_aggregator_invoice_totals(v_ai);
    END IF;
  END LOOP;

  FOR v_st IN
    SELECT DISTINCT sa.student_commission_id AS student_commission_id
    FROM public.upi_commission_receipt_student_allocations sa
    WHERE sa.receipt_id = p_receipt_id
  LOOP
    PERFORM public.fn_sync_student_from_receipts(v_st.student_commission_id);
    UPDATE public.upi_commission_students SET last_receipt_id = p_receipt_id WHERE id = v_st.student_commission_id;
  END LOOP;

  IF r.remittance_batch_id IS NOT NULL THEN
    PERFORM public.fn_refresh_remittance_batch_totals(r.remittance_batch_id);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_void_commission_receipt(
  p_receipt_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.upi_commission_receipts%ROWTYPE;
  v_inv uuid;
  v_st uuid;
  v_ai uuid;
BEGIN
  PERFORM public.fn_assert_commission_receipt_actor();
  SELECT * INTO r FROM public.upi_commission_receipts WHERE id = p_receipt_id FOR UPDATE;

  IF r.status = 'draft' THEN
    UPDATE public.upi_commission_receipts
    SET status = 'voided', voided_at = now(), voided_by = auth.uid(), void_reason = p_reason
    WHERE id = p_receipt_id;
    RETURN;
  END IF;

  IF r.status <> 'posted' THEN
    RAISE EXCEPTION 'only posted or draft receipts can be voided';
  END IF;

  UPDATE public.upi_commission_receipts
  SET status = 'voided', voided_at = now(), voided_by = auth.uid(), void_reason = p_reason
  WHERE id = p_receipt_id;

  FOR v_inv IN
    SELECT DISTINCT invoice_id
    FROM public.upi_commission_receipt_invoice_allocations
    WHERE receipt_id = p_receipt_id
  LOOP
    PERFORM public.fn_sync_invoice_from_receipts(v_inv);
    v_ai := public.fn_resolve_aggregator_invoice_for_institution_invoice(v_inv);
    IF v_ai IS NOT NULL THEN
      PERFORM public.fn_refresh_aggregator_invoice_totals(v_ai);
    END IF;
  END LOOP;

  FOR v_st IN
    SELECT DISTINCT student_commission_id
    FROM public.upi_commission_receipt_student_allocations
    WHERE receipt_id = p_receipt_id
  LOOP
    PERFORM public.fn_sync_student_from_receipts(v_st);
  END LOOP;

  IF r.remittance_batch_id IS NOT NULL THEN
    PERFORM public.fn_refresh_remittance_batch_totals(r.remittance_batch_id);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_resolve_aggregator_invoice_for_institution_invoice(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5) Verification guard (raises on publish if schema still incomplete)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'upi_commission_invoices'
      AND column_name = 'aggregator_invoice_id'
  ) THEN
    RAISE EXCEPTION 'commission post-receipt schema sync failed: upi_commission_invoices.aggregator_invoice_id missing';
  END IF;

  IF to_regprocedure('public.fn_resolve_aggregator_invoice_for_institution_invoice(uuid)') IS NULL THEN
    RAISE EXCEPTION 'commission post-receipt schema sync failed: fn_resolve_aggregator_invoice_for_institution_invoice missing';
  END IF;
END $$;
