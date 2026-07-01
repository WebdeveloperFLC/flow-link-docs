-- Fix receipt student allocation validation: align open balance with UI and guard stale FK ids.

CREATE OR REPLACE FUNCTION public.fn_student_commission_expected(p_student_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    ucs.amended_expected_amount,
    ucs.expected_amount,
    ucs.commission_amount,
    CASE
      WHEN ucs.amount_outstanding IS NOT NULL
        THEN ucs.amount_outstanding + COALESCE(ucs.amount_received, 0)
    END,
    0
  )
  FROM public.upi_commission_students ucs
  WHERE ucs.id = p_student_id;
$$;

CREATE OR REPLACE FUNCTION public.fn_student_commission_open_balance(
  p_student_id uuid,
  p_exclude_receipt_id uuid DEFAULT NULL
)
RETURNS numeric
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT GREATEST(
    COALESCE(
      (
        SELECT ucs.amount_outstanding
        FROM public.upi_commission_students ucs
        WHERE ucs.id = p_student_id
      ),
      public.fn_student_commission_expected(p_student_id)
      - COALESCE(
        (
          SELECT SUM(sa.amount_allocated)
          FROM public.upi_commission_receipt_student_allocations sa
          INNER JOIN public.upi_commission_receipts r ON r.id = sa.receipt_id
          WHERE sa.student_commission_id = p_student_id
            AND r.status = 'posted'
        ),
        0
      )
      - COALESCE(
        (
          SELECT SUM(sa.amount_allocated)
          FROM public.upi_commission_receipt_student_allocations sa
          INNER JOIN public.upi_commission_receipts r ON r.id = sa.receipt_id
          WHERE sa.student_commission_id = p_student_id
            AND r.status IN ('draft', 'ready')
            AND (p_exclude_receipt_id IS NULL OR sa.receipt_id <> p_exclude_receipt_id)
        ),
        0
      )
    ),
    0
  );
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
  v_invoice_id uuid;
  v_student_id uuid;
  v_amount numeric;
  v_line_id uuid;
  v_snapshot_id uuid;
  v_method text;
  v_open numeric;
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

    SELECT ia.invoice_id
    INTO v_invoice_id
    FROM public.upi_commission_receipt_invoice_allocations ia
    WHERE ia.id = v_ia_id
      AND ia.receipt_id = p_receipt_id;

    IF v_invoice_id IS NULL THEN
      RAISE EXCEPTION
        'invoice allocation % not found on receipt % (stale id — re-save invoice step)',
        v_ia_id, p_receipt_id;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.upi_commission_students ucs
      WHERE ucs.id = v_student_id
        AND ucs.invoice_id = v_invoice_id
    ) THEN
      RAISE EXCEPTION
        'student % is not on invoice % for allocation %',
        v_student_id, v_invoice_id, v_ia_id;
    END IF;

    v_open := public.fn_student_commission_open_balance(v_student_id, p_receipt_id);

    IF v_amount > v_open + 0.001 THEN
      RAISE EXCEPTION
        'allocation % exceeds student open balance % (student %, invoice %, invoice_alloc %, receipt %)',
        v_amount, v_open, v_student_id, v_invoice_id, v_ia_id, p_receipt_id;
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

GRANT EXECUTE ON FUNCTION public.fn_student_commission_open_balance(uuid, uuid) TO authenticated;
