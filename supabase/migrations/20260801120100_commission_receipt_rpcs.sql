-- Phase 2A: Commission receipt RPCs (lifecycle, allocation, post, void)

CREATE OR REPLACE FUNCTION public.fn_assert_commission_receipt_actor()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.can_view_upi_confidential(auth.uid())
    OR public.is_accounting_user(auth.uid())
    OR public.is_commission_admin(auth.uid())
  ) THEN
    RAISE EXCEPTION 'not authorized for commission receipts';
  END IF;
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

CREATE OR REPLACE FUNCTION public.fn_create_commission_receipt(
  p_payer_type text,
  p_payer_id uuid,
  p_receipt_amount numeric,
  p_receipt_currency text DEFAULT 'CAD',
  p_exchange_rate numeric DEFAULT 1,
  p_receipt_date date DEFAULT CURRENT_DATE,
  p_remittance_reference text DEFAULT NULL,
  p_bank_reference text DEFAULT NULL,
  p_payment_method text DEFAULT NULL,
  p_context_institution_id uuid DEFAULT NULL,
  p_remittance_batch_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_name text;
  v_num text;
BEGIN
  PERFORM public.fn_assert_commission_receipt_actor();

  IF p_payer_type = 'institution' THEN
    SELECT name INTO v_name FROM public.upi_institutions WHERE id = p_payer_id;
  ELSE
    SELECT name INTO v_name FROM public.upi_aggregators WHERE id = p_payer_id;
  END IF;
  IF v_name IS NULL THEN RAISE EXCEPTION 'payer not found'; END IF;

  v_num := 'CR-' || to_char(now(), 'YYYY') || '-' || lpad((floor(random() * 99999))::text, 5, '0');

  INSERT INTO public.upi_commission_receipts (
    receipt_number, status,
    payer_type, payer_id, payer_name_snapshot,
    institution_id, aggregator_id, context_institution_id,
    remittance_batch_id,
    remittance_reference, bank_reference, receipt_date,
    receipt_currency, receipt_amount, exchange_rate, base_currency,
    amount_allocated, unallocated_amount,
    fx_review_status, payment_method, notes, metadata, created_by
  ) VALUES (
    v_num, 'draft',
    p_payer_type, p_payer_id, v_name,
    CASE WHEN p_payer_type = 'institution' THEN p_payer_id ELSE NULL END,
    CASE WHEN p_payer_type = 'aggregator' THEN p_payer_id ELSE NULL END,
    p_context_institution_id,
    p_remittance_batch_id,
    p_remittance_reference, p_bank_reference, p_receipt_date,
    p_receipt_currency, p_receipt_amount, p_exchange_rate, 'CAD',
    0, p_receipt_amount,
    'not_required', p_payment_method, p_notes, COALESCE(p_metadata, '{}'), auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_update_commission_receipt(
  p_receipt_id uuid,
  p_receipt_amount numeric DEFAULT NULL,
  p_receipt_currency text DEFAULT NULL,
  p_exchange_rate numeric DEFAULT NULL,
  p_receipt_date date DEFAULT NULL,
  p_remittance_reference text DEFAULT NULL,
  p_bank_reference text DEFAULT NULL,
  p_payment_method text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.upi_commission_receipts%ROWTYPE;
BEGIN
  PERFORM public.fn_assert_commission_receipt_actor();
  SELECT * INTO r FROM public.upi_commission_receipts WHERE id = p_receipt_id FOR UPDATE;
  IF r.status <> 'draft' THEN RAISE EXCEPTION 'only draft receipts can be updated'; END IF;

  UPDATE public.upi_commission_receipts SET
    receipt_amount = COALESCE(p_receipt_amount, receipt_amount),
    receipt_currency = COALESCE(p_receipt_currency, receipt_currency),
    exchange_rate = COALESCE(p_exchange_rate, exchange_rate),
    receipt_date = COALESCE(p_receipt_date, receipt_date),
    remittance_reference = COALESCE(p_remittance_reference, remittance_reference),
    bank_reference = COALESCE(p_bank_reference, bank_reference),
    payment_method = COALESCE(p_payment_method, payment_method),
    notes = COALESCE(p_notes, notes),
    metadata = COALESCE(p_metadata, metadata)
  WHERE id = p_receipt_id;

  PERFORM public.fn_refresh_receipt_allocation_totals(p_receipt_id);
  PERFORM public.fn_refresh_receipt_fx_review(p_receipt_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_upsert_receipt_invoice_allocations(
  p_receipt_id uuid,
  p_allocations jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.upi_commission_receipts%ROWTYPE;
  item jsonb;
  v_invoice_id uuid;
  v_amount numeric;
BEGIN
  PERFORM public.fn_assert_commission_receipt_actor();
  SELECT * INTO r FROM public.upi_commission_receipts WHERE id = p_receipt_id FOR UPDATE;
  IF r.status <> 'draft' THEN RAISE EXCEPTION 'only draft receipts can allocate'; END IF;

  DELETE FROM public.upi_commission_receipt_invoice_allocations WHERE receipt_id = p_receipt_id;

  FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(p_allocations, '[]'::jsonb))
  LOOP
    v_invoice_id := (item->>'invoice_id')::uuid;
    v_amount := (item->>'amount_allocated')::numeric;
    IF v_amount IS NULL OR v_amount <= 0 THEN CONTINUE; END IF;

    INSERT INTO public.upi_commission_receipt_invoice_allocations (
      receipt_id, invoice_id, amount_allocated, currency, allocated_by
    ) VALUES (
      p_receipt_id, v_invoice_id, v_amount, r.receipt_currency, auth.uid()
    );
  END LOOP;

  DELETE FROM public.upi_commission_receipt_student_allocations WHERE receipt_id = p_receipt_id;

  PERFORM public.fn_refresh_receipt_allocation_totals(p_receipt_id);
  PERFORM public.fn_refresh_receipt_fx_review(p_receipt_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_upsert_receipt_student_allocations(
  p_receipt_id uuid,
  p_allocations jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.upi_commission_receipts%ROWTYPE;
  item jsonb;
  v_ia_id uuid;
  v_student_id uuid;
  v_amount numeric;
  v_line_id uuid;
  v_snapshot_id uuid;
  v_method text;
  v_expected numeric;
BEGIN
  PERFORM public.fn_assert_commission_receipt_actor();
  SELECT * INTO r FROM public.upi_commission_receipts WHERE id = p_receipt_id FOR UPDATE;
  IF r.status <> 'draft' THEN RAISE EXCEPTION 'only draft receipts can allocate'; END IF;

  DELETE FROM public.upi_commission_receipt_student_allocations WHERE receipt_id = p_receipt_id;

  FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(p_allocations, '[]'::jsonb))
  LOOP
    v_ia_id := (item->>'invoice_allocation_id')::uuid;
    v_student_id := (item->>'student_commission_id')::uuid;
    v_amount := (item->>'amount_allocated')::numeric;
    v_line_id := NULLIF(item->>'invoice_line_item_id', '')::uuid;
    v_snapshot_id := NULLIF(item->>'snapshot_id', '')::uuid;
    v_method := COALESCE(item->>'allocation_method', 'manual');

    IF v_amount IS NULL OR v_amount <= 0 THEN CONTINUE; END IF;

    v_expected := public.fn_student_commission_expected(v_student_id);
    IF v_amount > v_expected THEN
      RAISE EXCEPTION 'allocation % exceeds student expected %', v_amount, v_expected;
    END IF;

    INSERT INTO public.upi_commission_receipt_student_allocations (
      receipt_id, invoice_allocation_id, student_commission_id,
      invoice_line_item_id, snapshot_id, amount_allocated, currency,
      allocation_method, allocated_by
    ) VALUES (
      p_receipt_id, v_ia_id, v_student_id,
      v_line_id, v_snapshot_id, v_amount, r.receipt_currency,
      v_method, auth.uid()
    );
  END LOOP;

  PERFORM public.fn_refresh_receipt_fx_review(p_receipt_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_approve_receipt_fx_review(
  p_receipt_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.fn_assert_commission_receipt_actor();
  UPDATE public.upi_commission_receipts
  SET fx_review_status = 'approved',
      fx_reviewed_by = auth.uid(),
      fx_reviewed_at = now(),
      fx_review_notes = p_notes
  WHERE id = p_receipt_id AND fx_review_status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'receipt not found or FX review not pending'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_mark_receipt_ready(p_receipt_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.fn_assert_commission_receipt_actor();
  PERFORM public.fn_validate_receipt_allocations(p_receipt_id);

  UPDATE public.upi_commission_receipts
  SET status = 'ready', ready_at = now(), ready_by = auth.uid()
  WHERE id = p_receipt_id AND status = 'draft';

  IF NOT FOUND THEN RAISE EXCEPTION 'receipt not found or not draft'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_reopen_receipt(p_receipt_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.fn_assert_commission_receipt_actor();
  UPDATE public.upi_commission_receipts
  SET status = 'draft', ready_at = NULL, ready_by = NULL
  WHERE id = p_receipt_id AND status = 'ready';
  IF NOT FOUND THEN RAISE EXCEPTION 'receipt not found or not ready'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_sync_invoice_from_receipts(p_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_total numeric;
  v_inv public.upi_commission_invoices%ROWTYPE;
BEGIN
  SELECT COALESCE(SUM(ia.amount_allocated), 0) INTO v_total
  FROM public.upi_commission_receipt_invoice_allocations ia
  JOIN public.upi_commission_receipts r ON r.id = ia.receipt_id
  WHERE ia.invoice_id = p_invoice_id AND r.status = 'posted';

  SELECT * INTO v_inv FROM public.upi_commission_invoices WHERE id = p_invoice_id FOR UPDATE;

  UPDATE public.upi_commission_invoices SET
    amount_received = v_total,
    amount_outstanding = GREATEST(v_inv.total_amount - v_total, 0),
    short_paid = (v_total > 0 AND v_total < v_inv.total_amount),
    status = CASE
      WHEN v_total >= v_inv.total_amount THEN 'paid'
      WHEN v_total > 0 THEN 'partially_paid'
      ELSE v_inv.status
    END,
    payment_received_amount = v_total,
    payment_received_date = CASE WHEN v_total > 0 THEN CURRENT_DATE ELSE payment_received_date END,
    paid_date = CASE WHEN v_total >= v_inv.total_amount THEN CURRENT_DATE ELSE paid_date END
  WHERE id = p_invoice_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_sync_student_from_receipts(p_student_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_total numeric;
  v_expected numeric;
  v_remittance text;
BEGIN
  SELECT COALESCE(SUM(sa.amount_allocated), 0) INTO v_total
  FROM public.upi_commission_receipt_student_allocations sa
  JOIN public.upi_commission_receipts r ON r.id = sa.receipt_id
  WHERE sa.student_commission_id = p_student_id AND r.status = 'posted';

  v_expected := public.fn_student_commission_expected(p_student_id);

  SELECT r.remittance_reference INTO v_remittance
  FROM public.upi_commission_receipt_student_allocations sa
  JOIN public.upi_commission_receipts r ON r.id = sa.receipt_id
  WHERE sa.student_commission_id = p_student_id AND r.status = 'posted'
  ORDER BY r.posted_at DESC NULLS LAST
  LIMIT 1;

  UPDATE public.upi_commission_students SET
    amount_received = v_total,
    amount_outstanding = GREATEST(v_expected - v_total, 0),
    payment_status = CASE
      WHEN v_total >= v_expected AND v_expected > 0 THEN 'paid'
      WHEN v_total > 0 THEN 'partially_paid'
      ELSE 'unpaid'
    END,
    remittance_reference_number = CASE
      WHEN v_total >= v_expected AND v_expected > 0 THEN v_remittance
      ELSE remittance_reference_number
    END,
    commission_paid_date = CASE
      WHEN v_total >= v_expected AND v_expected > 0 THEN CURRENT_DATE
      ELSE commission_paid_date
    END
  WHERE id = p_student_id;
END;
$$;

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
  END LOOP;

  FOR v_st IN
    SELECT DISTINCT sa.student_commission_id AS student_commission_id
    FROM public.upi_commission_receipt_student_allocations sa
    WHERE sa.receipt_id = p_receipt_id
  LOOP
    PERFORM public.fn_sync_student_from_receipts(v_st.student_commission_id);
    UPDATE public.upi_commission_students SET last_receipt_id = p_receipt_id WHERE id = v_st.student_commission_id;
  END LOOP;
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
  END LOOP;

  FOR v_st IN
    SELECT DISTINCT student_commission_id FROM public.upi_commission_receipt_student_allocations WHERE receipt_id = p_receipt_id
  LOOP
    PERFORM public.fn_sync_student_from_receipts(v_st);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_receipt_summary(p_receipt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.upi_commission_receipts%ROWTYPE;
  v_invoices jsonb;
  v_students jsonb;
BEGIN
  SELECT * INTO r FROM public.upi_commission_receipts WHERE id = p_receipt_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', ia.id, 'invoice_id', ia.invoice_id, 'amount_allocated', ia.amount_allocated
  )), '[]'::jsonb) INTO v_invoices
  FROM public.upi_commission_receipt_invoice_allocations ia WHERE ia.receipt_id = p_receipt_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', sa.id, 'student_commission_id', sa.student_commission_id,
    'amount_allocated', sa.amount_allocated, 'invoice_allocation_id', sa.invoice_allocation_id
  )), '[]'::jsonb) INTO v_students
  FROM public.upi_commission_receipt_student_allocations sa WHERE sa.receipt_id = p_receipt_id;

  RETURN jsonb_build_object(
    'receipt', to_jsonb(r),
    'invoice_allocations', v_invoices,
    'student_allocations', v_students
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_create_commission_receipt(text, uuid, numeric, text, numeric, date, text, text, text, uuid, uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_update_commission_receipt(uuid, numeric, text, numeric, date, text, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_upsert_receipt_invoice_allocations(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_upsert_receipt_student_allocations(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_approve_receipt_fx_review(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_mark_receipt_ready(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_reopen_receipt(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_post_commission_receipt(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_void_commission_receipt(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_receipt_summary(uuid) TO authenticated;
