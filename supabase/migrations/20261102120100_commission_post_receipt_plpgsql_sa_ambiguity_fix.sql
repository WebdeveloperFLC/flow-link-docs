-- Fix fn_post_commission_receipt: PL/pgSQL record variable "sa" conflicted with SQL alias "sa"
-- in the student sync loop (error: column reference "sa.student_commission_id" is ambiguous).

CREATE OR REPLACE FUNCTION public.fn_post_commission_receipt(p_receipt_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.upi_commission_receipts%ROWTYPE;
  v_stu_alloc record;
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

  FOR v_stu_alloc IN
    SELECT * FROM public.upi_commission_receipt_student_allocations WHERE receipt_id = p_receipt_id
  LOOP
    IF v_stu_alloc.snapshot_id IS NOT NULL THEN
      SELECT commission_snapshot_id INTO v_snap
      FROM public.upi_commission_students WHERE id = v_stu_alloc.student_commission_id;
      IF v_snap IS DISTINCT FROM v_stu_alloc.snapshot_id THEN
        RAISE EXCEPTION 'snapshot mismatch for student %', v_stu_alloc.student_commission_id;
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
    SELECT DISTINCT rsa.student_commission_id AS student_commission_id
    FROM public.upi_commission_receipt_student_allocations rsa
    WHERE rsa.receipt_id = p_receipt_id
  LOOP
    PERFORM public.fn_sync_student_from_receipts(v_st.student_commission_id);
    UPDATE public.upi_commission_students SET last_receipt_id = p_receipt_id WHERE id = v_st.student_commission_id;
  END LOOP;

  IF r.remittance_batch_id IS NOT NULL THEN
    PERFORM public.fn_refresh_remittance_batch_totals(r.remittance_batch_id);
  END IF;
END;
$$;
