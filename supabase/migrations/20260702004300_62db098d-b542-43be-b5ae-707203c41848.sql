ALTER TABLE public.client_service_cases
  DROP CONSTRAINT IF EXISTS client_service_cases_lifecycle_status_check;

UPDATE public.client_service_cases
SET lifecycle_status = 'withdrawn'
WHERE lifecycle_status = 'closed' AND outcome = 'withdrawn';

UPDATE public.client_service_cases
SET lifecycle_status = 'completed'
WHERE lifecycle_status = 'closed';

UPDATE public.client_service_cases
SET lifecycle_status = 'completed'
WHERE lifecycle_status = 'active' AND status = 'closed' AND outcome IS DISTINCT FROM 'withdrawn';

UPDATE public.client_service_cases
SET lifecycle_status = 'withdrawn'
WHERE lifecycle_status = 'active' AND status = 'closed' AND outcome = 'withdrawn';

ALTER TABLE public.client_service_cases
  ADD CONSTRAINT client_service_cases_lifecycle_status_check
  CHECK (lifecycle_status IN ('active','completed','cancelled','withdrawn','transferred','archived'));

COMMENT ON COLUMN public.client_service_cases.lifecycle_status IS
  'Service lifecycle — never hard-deleted. archived = removed from active client view.';

ALTER TABLE public.client_service_audit_log
  DROP CONSTRAINT IF EXISTS client_service_audit_log_action_check;

ALTER TABLE public.client_service_audit_log
  ADD CONSTRAINT client_service_audit_log_action_check
  CHECK (action IN (
    'added','modified','reassigned','cancelled','removed','payment_reassigned','transfer_requested','removal_blocked'
  )) NOT VALID;

CREATE OR REPLACE FUNCTION public.fn_invoice_line_matches_service_keys(
  p_line_items jsonb,
  p_match_keys text[]
) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM jsonb_array_elements(COALESCE(p_line_items, '[]'::jsonb)) AS li
    WHERE (li->>'service_id') = ANY (p_match_keys)
       OR (li->>'service_code') = ANY (p_match_keys)
  );
$$;

CREATE OR REPLACE FUNCTION public.fn_assess_service_financial_dependencies(
  p_client_id uuid,
  p_service_code text,
  p_match_keys text[] DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_keys text[];
  v_terminal_invoice text[] := ARRAY['void', 'cancelled', 'written_off'];
  v_open_case_ids uuid[];
  v_invoice_ids uuid[];
  v_financial jsonb;
  v_non_financial jsonb;
  v_has_financial boolean := false;
  v_invoices_count int := 0;
  v_payments_count int := 0;
  v_allocations_count int := 0;
  v_allocations_amount numeric := 0;
  v_receipts_count int := 0;
  v_refunds_count int := 0;
  v_adjustments_count int := 0;
  v_discounts_count int := 0;
  v_wallet_count int := 0;
  v_journals_count int := 0;
  v_trust_count int := 0;
  v_documents_count int := 0;
  v_tasks_count int := 0;
  v_forms_count int := 0;
  v_notes_count int := 0;
BEGIN
  v_keys := COALESCE(NULLIF(p_match_keys, ARRAY[]::text[]), ARRAY[p_service_code]);

  SELECT COALESCE(array_agg(c.id), ARRAY[]::uuid[]) INTO v_open_case_ids
  FROM public.client_service_cases c
  WHERE c.client_id = p_client_id AND c.status = 'open'
    AND (c.service_code = ANY (v_keys) OR split_part(c.service_code, '::', 1) = ANY (v_keys));

  SELECT COALESCE(array_agg(i.id), ARRAY[]::uuid[]) INTO v_invoice_ids
  FROM public.client_invoices i
  WHERE i.client_id = p_client_id
    AND NOT (i.status = ANY (v_terminal_invoice))
    AND public.fn_invoice_line_matches_service_keys(i.line_items, v_keys);

  v_invoices_count := COALESCE(array_length(v_invoice_ids, 1), 0);

  IF v_invoices_count > 0 THEN
    SELECT COUNT(*)::int INTO v_payments_count FROM public.client_invoice_payments p
      WHERE p.invoice_id = ANY (v_invoice_ids) AND p.archived_at IS NULL;
    SELECT COUNT(*)::int, COALESCE(SUM(a.amount_allocated), 0) INTO v_allocations_count, v_allocations_amount
      FROM public.client_invoice_payment_allocations a
      WHERE a.invoice_id = ANY (v_invoice_ids)
        AND (a.service_id::text = ANY (v_keys) OR a.amount_allocated > 0);
    SELECT COUNT(*)::int INTO v_receipts_count FROM public.client_invoice_receipts r
      WHERE r.invoice_id = ANY (v_invoice_ids) AND r.archived_at IS NULL AND COALESCE(r.receipt_voided, false) = false;
    SELECT COUNT(*)::int INTO v_refunds_count FROM public.client_invoice_refund_requests rr
      WHERE rr.invoice_id = ANY (v_invoice_ids) AND rr.archived_at IS NULL;
    SELECT COUNT(*)::int INTO v_adjustments_count FROM public.client_invoice_adjustments adj
      WHERE adj.invoice_id = ANY (v_invoice_ids) AND adj.archived_at IS NULL;
    SELECT COUNT(*)::int INTO v_discounts_count FROM (
      SELECT i.id FROM public.client_invoices i
      WHERE i.id = ANY (v_invoice_ids) AND (
        COALESCE(i.offer_discount_amount, 0) > 0
        OR EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(i.line_items, '[]'::jsonb)) AS li
                   WHERE COALESCE((li->>'discount')::numeric, 0) > 0
                      OR COALESCE((li->>'checkout_discount_applied')::numeric, 0) > 0))
      UNION
      SELECT wa.invoice_id FROM public.wallet_allocations wa
      WHERE wa.client_id = p_client_id AND wa.invoice_id = ANY (v_invoice_ids) AND wa.status = 'applied'
      UNION
      SELECT wa2.invoice_id FROM public.discount_approval_requests dar
      JOIN public.wallet_allocations wa2 ON wa2.id = dar.allocation_id
      WHERE dar.client_id = p_client_id AND wa2.invoice_id = ANY (v_invoice_ids)
    ) disc;
    SELECT COUNT(*)::int INTO v_wallet_count FROM public.wallet_allocations wa
      WHERE wa.client_id = p_client_id AND wa.invoice_id = ANY (v_invoice_ids) AND wa.status = 'applied';
    SELECT COUNT(DISTINCT b.journal_id)::int INTO v_journals_count FROM public.accounting_crm_invoice_bridge b
      WHERE b.invoice_id = ANY (v_invoice_ids) AND b.journal_id IS NOT NULL;
    SELECT COUNT(*)::int INTO v_trust_count FROM public.accounting_trust_entries te
      JOIN public.accounting_trust_accounts ta ON ta.id = te.trust_account_id WHERE ta.client_id = p_client_id;
  END IF;

  IF v_payments_count = 0 THEN
    SELECT COUNT(DISTINCT p.id)::int INTO v_payments_count
    FROM public.client_invoice_payments p
    JOIN public.client_invoices i ON i.id = p.invoice_id
    JOIN public.client_invoice_payment_allocations a ON a.payment_id = p.id
    WHERE i.client_id = p_client_id AND NOT (i.status = ANY (v_terminal_invoice))
      AND p.archived_at IS NULL AND a.service_id::text = ANY (v_keys) AND a.amount_allocated > 0;
    IF v_payments_count > 0 THEN v_has_financial := true; END IF;
  END IF;

  v_has_financial := v_has_financial OR v_invoices_count > 0 OR v_payments_count > 0
    OR v_allocations_count > 0 OR v_receipts_count > 0 OR v_refunds_count > 0
    OR v_adjustments_count > 0 OR v_discounts_count > 0 OR v_wallet_count > 0
    OR v_journals_count > 0 OR (v_trust_count > 0 AND v_invoices_count > 0);

  IF COALESCE(array_length(v_open_case_ids, 1), 0) > 0 THEN
    SELECT COUNT(*)::int INTO v_documents_count FROM public.client_documents d
      WHERE d.client_id = p_client_id AND d.deleted_at IS NULL AND d.case_id = ANY (v_open_case_ids);
    SELECT COUNT(*)::int INTO v_forms_count FROM public.client_documents d
      WHERE d.client_id = p_client_id AND d.deleted_at IS NULL AND d.case_id = ANY (v_open_case_ids)
        AND (COALESCE(d.document_type, '') ILIKE '%form%' OR COALESCE(d.custom_type, '') ILIKE '%form%');
  END IF;

  SELECT COUNT(*)::int INTO v_tasks_count FROM public.client_tasks t
    WHERE t.client_id = p_client_id AND t.status IN ('open', 'in_progress');
  SELECT COUNT(*)::int INTO v_notes_count FROM public.client_timeline tl WHERE tl.client_id = p_client_id;

  v_financial := jsonb_build_object(
    'has_data', v_has_financial,
    'invoices', jsonb_build_object('count', v_invoices_count, 'invoice_ids', to_jsonb(v_invoice_ids)),
    'payments', jsonb_build_object('count', v_payments_count),
    'allocations', jsonb_build_object('count', v_allocations_count, 'amount_total', v_allocations_amount),
    'receipts', jsonb_build_object('count', v_receipts_count),
    'refunds', jsonb_build_object('count', v_refunds_count),
    'adjustments', jsonb_build_object('count', v_adjustments_count),
    'discounts', jsonb_build_object('count', v_discounts_count),
    'wallet_usage', jsonb_build_object('count', v_wallet_count),
    'accounting_journals', jsonb_build_object('count', v_journals_count),
    'trust_entries', jsonb_build_object('count', v_trust_count)
  );

  v_non_financial := jsonb_build_object(
    'documents', jsonb_build_object('count', v_documents_count),
    'tasks', jsonb_build_object('count', v_tasks_count),
    'forms', jsonb_build_object('count', v_forms_count),
    'notes', jsonb_build_object('count', v_notes_count)
  );

  RETURN jsonb_build_object(
    'service_code', p_service_code,
    'match_keys', to_jsonb(v_keys),
    'has_financial_data', v_has_financial,
    'can_archive_directly', NOT v_has_financial,
    'block_removal', v_has_financial,
    'financial', v_financial,
    'non_financial', v_non_financial
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_assess_service_financial_dependencies(uuid, text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_invoice_line_matches_service_keys(jsonb, text[]) TO authenticated;

COMMENT ON FUNCTION public.fn_assess_service_financial_dependencies IS
  'Phase A1 — assess financial + non-financial dependencies before archiving a service.';