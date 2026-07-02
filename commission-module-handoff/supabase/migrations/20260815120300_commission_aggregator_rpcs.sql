-- Phase 2B: Aggregator + batch RPCs; extend 2A receipt validation

CREATE OR REPLACE FUNCTION public.fn_assert_commission_aggregator_actor()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  PERFORM public.fn_assert_commission_receipt_actor();
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_validate_receipt_allocations(p_receipt_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  r public.upi_commission_receipts%ROWTYPE;
  inv_rec record;
  v_student_sum numeric;
BEGIN
  SELECT * INTO r FROM public.upi_commission_receipts WHERE id = p_receipt_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'receipt not found'; END IF;

  IF r.payer_type = 'aggregator' AND r.remittance_batch_id IS NULL THEN
    RAISE EXCEPTION 'aggregator receipt requires remittance batch';
  END IF;

  IF r.amount_allocated <> r.receipt_amount THEN
    RAISE EXCEPTION 'receipt cash must be fully allocated (unallocated %)', r.unallocated_amount;
  END IF;

  IF r.fx_review_status = 'pending' THEN
    RAISE EXCEPTION 'FX review pending — approve before ready/post';
  END IF;

  FOR inv_rec IN
    SELECT ia.id, ia.amount_allocated, ia.invoice_id
    FROM public.upi_commission_receipt_invoice_allocations ia
    WHERE ia.receipt_id = p_receipt_id
  LOOP
    SELECT COALESCE(SUM(sa.amount_allocated), 0) INTO v_student_sum
    FROM public.upi_commission_receipt_student_allocations sa
    WHERE sa.invoice_allocation_id = inv_rec.id;

    IF v_student_sum <> inv_rec.amount_allocated THEN
      RAISE EXCEPTION 'student allocations must equal invoice slice for invoice %', inv_rec.invoice_id;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_create_remittance_batch(
  p_aggregator_id uuid,
  p_batch_reference text,
  p_aggregator_reference_number text DEFAULT NULL,
  p_amount_expected numeric DEFAULT NULL,
  p_currency text DEFAULT 'CAD',
  p_received_date date DEFAULT CURRENT_DATE,
  p_commission_period_code text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  PERFORM public.fn_assert_commission_aggregator_actor();

  INSERT INTO public.upi_commission_remittance_batches (
    batch_reference, payer_type, aggregator_id,
    aggregator_reference_number, commission_period_code,
    total_amount, amount_expected, amount_outstanding, currency,
    received_date, status, notes, created_by
  ) VALUES (
    p_batch_reference, 'aggregator', p_aggregator_id,
    p_aggregator_reference_number, p_commission_period_code,
    p_amount_expected, p_amount_expected,
    COALESCE(p_amount_expected, 0), p_currency,
    p_received_date, 'open', p_notes, auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_dispute_remittance_batch(
  p_batch_id uuid,
  p_dispute_reason text,
  p_dispute_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.fn_assert_commission_aggregator_actor();
  UPDATE public.upi_commission_remittance_batches SET
    status = 'disputed',
    dispute_reason = p_dispute_reason,
    dispute_notes = p_dispute_notes,
    dispute_opened_date = CURRENT_DATE,
    dispute_resolved_date = NULL
  WHERE id = p_batch_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'batch not found'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_resolve_batch_dispute(p_batch_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.fn_assert_commission_aggregator_actor();
  UPDATE public.upi_commission_remittance_batches SET
    dispute_resolved_date = CURRENT_DATE,
    status = 'open'
  WHERE id = p_batch_id AND status = 'disputed';
  PERFORM public.fn_refresh_remittance_batch_totals(p_batch_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_register_batch_statement(
  p_batch_id uuid,
  p_file_name text,
  p_storage_path text,
  p_mime_type text DEFAULT NULL,
  p_file_size_bytes bigint DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  PERFORM public.fn_assert_commission_aggregator_actor();
  INSERT INTO public.upi_commission_remittance_batch_statements (
    batch_id, file_name, storage_path, mime_type, file_size_bytes, uploaded_by
  ) VALUES (
    p_batch_id, p_file_name, p_storage_path, p_mime_type, p_file_size_bytes, auth.uid()
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_create_aggregator_invoice(
  p_aggregator_id uuid,
  p_invoice_number text,
  p_commission_period_code text DEFAULT NULL,
  p_invoice_date date DEFAULT CURRENT_DATE,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  PERFORM public.fn_assert_commission_aggregator_actor();
  INSERT INTO public.upi_commission_aggregator_invoices (
    aggregator_invoice_number, aggregator_id, commission_period_code,
    invoice_date, notes, created_by
  ) VALUES (
    p_invoice_number, p_aggregator_id, p_commission_period_code,
    p_invoice_date, p_notes, auth.uid()
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

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
      SELECT 1 FROM public.upi_commission_invoices ci
      JOIN public.upi_commission_aggregator_invoices ai ON ai.id = ci.aggregator_invoice_id
      WHERE ci.id = v_inv AND ai.status NOT IN ('cancelled') AND ai.id <> p_aggregator_invoice_id
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

CREATE OR REPLACE FUNCTION public.fn_submit_aggregator_invoice(p_aggregator_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.fn_assert_commission_aggregator_actor();
  UPDATE public.upi_commission_aggregator_invoices
  SET status = 'submitted'
  WHERE id = p_aggregator_invoice_id AND status = 'draft';
  IF NOT FOUND THEN RAISE EXCEPTION 'aggregator invoice not found or not draft'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_aggregator_workbench_summary(
  p_aggregator_id uuid,
  p_commission_period_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
BEGIN
  SELECT
    COALESCE(SUM(amount_expected), 0) AS expected,
    COALESCE(SUM(amount_invoiced), 0) AS invoiced,
    COALESCE(SUM(amount_received), 0) AS received,
    COALESCE(SUM(amount_outstanding), 0) AS outstanding,
    COALESCE(SUM(amount_held), 0) AS held
  INTO v_row
  FROM public.v_commission_institution_metrics_agg m
  WHERE m.aggregator_id = p_aggregator_id
    AND (p_commission_period_code IS NULL OR m.commission_period_code = p_commission_period_code);

  RETURN jsonb_build_object(
    'expected', v_row.expected,
    'invoiced', v_row.invoiced,
    'received', v_row.received,
    'outstanding', v_row.outstanding,
    'held', v_row.held
  );
END;
$$;

-- Extend post/void to refresh batch + aggregator invoice totals
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

  IF r.status = 'ready' THEN NULL;
  ELSIF r.status = 'draft' THEN
    PERFORM public.fn_mark_receipt_ready(p_receipt_id);
    SELECT * INTO r FROM public.upi_commission_receipts WHERE id = p_receipt_id;
  ELSE
    RAISE EXCEPTION 'receipt must be draft or ready to post';
  END IF;

  FOR sa IN SELECT * FROM public.upi_commission_receipt_student_allocations WHERE receipt_id = p_receipt_id
  LOOP
    IF sa.snapshot_id IS NOT NULL THEN
      SELECT commission_snapshot_id INTO v_snap FROM public.upi_commission_students WHERE id = sa.student_commission_id;
      IF v_snap IS DISTINCT FROM sa.snapshot_id THEN
        RAISE EXCEPTION 'snapshot mismatch for student %', sa.student_commission_id;
      END IF;
    END IF;
  END LOOP;

  UPDATE public.upi_commission_receipts SET
    status = 'posted', posted_at = now(), posted_by = auth.uid(),
    posting_date = COALESCE(posting_date, receipt_date)
  WHERE id = p_receipt_id;

  FOR v_inv IN
    SELECT DISTINCT ia.invoice_id AS invoice_id FROM public.upi_commission_receipt_invoice_allocations ia
    WHERE ia.receipt_id = p_receipt_id
  LOOP
    PERFORM public.fn_sync_invoice_from_receipts(v_inv.invoice_id);
    UPDATE public.upi_commission_invoices SET last_receipt_id = p_receipt_id WHERE id = v_inv.invoice_id;
    SELECT aggregator_invoice_id INTO v_ai FROM public.upi_commission_invoices WHERE id = v_inv.invoice_id;
    IF v_ai IS NOT NULL THEN PERFORM public.fn_refresh_aggregator_invoice_totals(v_ai); END IF;
  END LOOP;

  FOR v_st IN
    SELECT DISTINCT sa.student_commission_id AS student_commission_id
    FROM public.upi_commission_receipt_student_allocations sa WHERE sa.receipt_id = p_receipt_id
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
    SELECT DISTINCT invoice_id FROM public.upi_commission_receipt_invoice_allocations WHERE receipt_id = p_receipt_id
  LOOP
    PERFORM public.fn_sync_invoice_from_receipts(v_inv);
    SELECT aggregator_invoice_id INTO v_ai FROM public.upi_commission_invoices WHERE id = v_inv;
    IF v_ai IS NOT NULL THEN PERFORM public.fn_refresh_aggregator_invoice_totals(v_ai); END IF;
  END LOOP;

  FOR v_st IN
    SELECT DISTINCT student_commission_id FROM public.upi_commission_receipt_student_allocations WHERE receipt_id = p_receipt_id
  LOOP
    PERFORM public.fn_sync_student_from_receipts(v_st);
  END LOOP;

  IF r.remittance_batch_id IS NOT NULL THEN
    PERFORM public.fn_refresh_remittance_batch_totals(r.remittance_batch_id);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_create_remittance_batch(uuid, text, text, numeric, text, date, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_dispute_remittance_batch(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_resolve_batch_dispute(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_register_batch_statement(uuid, text, text, text, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_create_aggregator_invoice(uuid, text, text, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_add_invoices_to_aggregator_invoice(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_submit_aggregator_invoice(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_aggregator_workbench_summary(uuid, text) TO authenticated;
