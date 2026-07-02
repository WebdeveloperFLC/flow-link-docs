ALTER TABLE public.client_invoices
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS cancellation_reason text;

COMMENT ON COLUMN public.client_invoices.cancellation_reason IS
  'Why invoice was cancelled (e.g. service_removed_pre_financial). Row retained for audit.';

ALTER TABLE public.client_service_audit_log
  DROP CONSTRAINT IF EXISTS client_service_audit_log_action_check;

ALTER TABLE public.client_service_audit_log
  ADD CONSTRAINT client_service_audit_log_action_check
  CHECK (action IN (
    'added','modified','reassigned','cancelled','removed','payment_reassigned','transfer_requested','removal_blocked','draft_invoice_cancelled','draft_invoice_lines_removed'
  )) NOT VALID;

CREATE OR REPLACE FUNCTION public.fn_jsonb_line_matches_service_keys(p_line jsonb, p_keys text[])
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(p_line->>'service_id', '') = ANY (p_keys)
      OR COALESCE(p_line->>'service_code', '') = ANY (p_keys);
$$;

CREATE OR REPLACE FUNCTION public.fn_jsonb_line_is_billable(p_line jsonb)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(p_line->>'service_id', '') <> ''
     AND COALESCE(p_line->>'service_id', '') <> '__checkout_discount__';
$$;

CREATE OR REPLACE FUNCTION public.fn_recalc_invoice_amount_from_lines(p_line_items jsonb)
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(SUM(
    CASE WHEN public.fn_jsonb_line_is_billable(li) THEN COALESCE((li->>'total')::numeric, 0) ELSE 0 END
  ), 0)
  FROM jsonb_array_elements(COALESCE(p_line_items, '[]'::jsonb)) AS li;
$$;

CREATE OR REPLACE FUNCTION public.fn_assess_service_financial_dependencies(
  p_client_id uuid,
  p_service_code text,
  p_match_keys text[] DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_keys text[];
  v_terminal_invoice text[] := ARRAY['void', 'cancelled', 'written_off', 'refunded'];
  v_open_case_ids uuid[];
  v_service_invoice_ids uuid[];
  v_draft_invoice_ids uuid[];
  v_issued_invoice_ids uuid[];
  v_financial jsonb;
  v_non_financial jsonb;
  v_tier text := 'pre_financial';
  v_has_financial boolean := false;
  v_draft_count int := 0;
  v_issued_count int := 0;
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

  SELECT COALESCE(array_agg(i.id), ARRAY[]::uuid[]) INTO v_service_invoice_ids
  FROM public.client_invoices i
  WHERE i.client_id = p_client_id AND i.archived_at IS NULL
    AND NOT (i.status = ANY (v_terminal_invoice))
    AND public.fn_invoice_line_matches_service_keys(i.line_items, v_keys);

  SELECT COALESCE(array_agg(i.id), ARRAY[]::uuid[]) INTO v_draft_invoice_ids
  FROM public.client_invoices i
  WHERE i.id = ANY (COALESCE(v_service_invoice_ids, ARRAY[]::uuid[])) AND i.status = 'draft';

  SELECT COALESCE(array_agg(i.id), ARRAY[]::uuid[]) INTO v_issued_invoice_ids
  FROM public.client_invoices i
  WHERE i.id = ANY (COALESCE(v_service_invoice_ids, ARRAY[]::uuid[])) AND i.status <> 'draft';

  v_draft_count := COALESCE(array_length(v_draft_invoice_ids, 1), 0);
  v_issued_count := COALESCE(array_length(v_issued_invoice_ids, 1), 0);

  IF COALESCE(array_length(v_service_invoice_ids, 1), 0) > 0 THEN
    SELECT COUNT(*)::int INTO v_payments_count FROM public.client_invoice_payments p
      WHERE p.invoice_id = ANY (v_service_invoice_ids) AND p.archived_at IS NULL;
    SELECT COUNT(*)::int, COALESCE(SUM(a.amount_allocated), 0) INTO v_allocations_count, v_allocations_amount
      FROM public.client_invoice_payment_allocations a
      WHERE a.invoice_id = ANY (v_service_invoice_ids) AND a.service_id::text = ANY (v_keys);
    SELECT COUNT(*)::int INTO v_receipts_count FROM public.client_invoice_receipts r
      WHERE r.invoice_id = ANY (v_service_invoice_ids) AND r.archived_at IS NULL AND COALESCE(r.receipt_voided, false) = false;
    SELECT COUNT(*)::int INTO v_refunds_count FROM public.client_invoice_refund_requests rr
      WHERE rr.invoice_id = ANY (v_service_invoice_ids) AND rr.archived_at IS NULL;
    SELECT COUNT(*)::int INTO v_adjustments_count FROM public.client_invoice_adjustments adj
      WHERE adj.invoice_id = ANY (v_service_invoice_ids) AND adj.archived_at IS NULL AND adj.status = 'applied';
    SELECT COUNT(*)::int INTO v_discounts_count FROM public.client_invoices i
      WHERE i.id = ANY (v_service_invoice_ids)
        AND (COALESCE(i.offer_discount_amount, 0) > 0
             OR EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(i.line_items, '[]'::jsonb)) AS li
                        WHERE COALESCE((li->>'discount')::numeric, 0) > 0
                           OR COALESCE((li->>'checkout_discount_applied')::numeric, 0) > 0));
    SELECT COUNT(*)::int INTO v_wallet_count FROM public.wallet_allocations wa
      WHERE wa.client_id = p_client_id AND wa.invoice_id = ANY (v_service_invoice_ids) AND wa.status IN ('applied', 'reserved');
    SELECT COUNT(DISTINCT b.journal_id)::int INTO v_journals_count FROM public.accounting_crm_invoice_bridge b
      WHERE b.invoice_id = ANY (v_service_invoice_ids) AND b.journal_id IS NOT NULL;
    SELECT COUNT(*)::int INTO v_trust_count FROM public.accounting_trust_entries te
      JOIN public.accounting_crm_invoice_bridge b ON b.journal_id = te.journal_id
      WHERE b.invoice_id = ANY (v_service_invoice_ids);
  END IF;

  IF v_allocations_count = 0 THEN
    SELECT COUNT(DISTINCT a.id)::int INTO v_allocations_count
    FROM public.client_invoice_payment_allocations a
    JOIN public.client_invoices i ON i.id = a.invoice_id
    WHERE i.client_id = p_client_id AND i.archived_at IS NULL
      AND NOT (i.status = ANY (v_terminal_invoice))
      AND a.service_id::text = ANY (v_keys) AND a.amount_allocated > 0;
  END IF;

  IF v_payments_count = 0 THEN
    SELECT COUNT(DISTINCT p.id)::int INTO v_payments_count
    FROM public.client_invoice_payments p
    JOIN public.client_invoices i ON i.id = p.invoice_id
    JOIN public.client_invoice_payment_allocations a ON a.payment_id = p.id
    WHERE i.client_id = p_client_id AND i.archived_at IS NULL
      AND NOT (i.status = ANY (v_terminal_invoice))
      AND p.archived_at IS NULL AND a.service_id::text = ANY (v_keys) AND a.amount_allocated > 0;
  END IF;

  v_has_financial := v_issued_count > 0 OR v_payments_count > 0 OR v_allocations_count > 0
    OR v_receipts_count > 0 OR v_refunds_count > 0 OR v_adjustments_count > 0
    OR v_wallet_count > 0 OR v_journals_count > 0 OR v_trust_count > 0;

  IF NOT v_has_financial AND COALESCE(array_length(v_service_invoice_ids, 1), 0) > 0 THEN
    SELECT EXISTS (SELECT 1 FROM public.client_invoices i
      WHERE i.id = ANY (v_service_invoice_ids) AND COALESCE(i.amount_paid, 0) > 0) INTO v_has_financial;
  END IF;

  v_tier := CASE WHEN v_has_financial THEN 'financial' ELSE 'pre_financial' END;

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
    'invoices', jsonb_build_object('count', COALESCE(array_length(v_service_invoice_ids, 1), 0), 'invoice_ids', to_jsonb(COALESCE(v_service_invoice_ids, ARRAY[]::uuid[]))),
    'draft_invoices', jsonb_build_object('count', v_draft_count, 'invoice_ids', to_jsonb(COALESCE(v_draft_invoice_ids, ARRAY[]::uuid[]))),
    'issued_invoices', jsonb_build_object('count', v_issued_count, 'invoice_ids', to_jsonb(COALESCE(v_issued_invoice_ids, ARRAY[]::uuid[]))),
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
    'tier', v_tier,
    'has_financial_data', v_has_financial,
    'can_archive_directly', NOT v_has_financial,
    'block_removal', v_has_financial,
    'can_cleanup_drafts', NOT v_has_financial AND v_draft_count > 0,
    'financial', v_financial,
    'non_financial', v_non_financial
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_cleanup_pre_financial_service_drafts(
  p_client_id uuid,
  p_service_code text,
  p_match_keys text[] DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL,
  p_reason text DEFAULT 'service_removed_pre_financial'
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_keys text[];
  v_assess jsonb;
  v_tier text;
  v_inv record;
  v_lines jsonb;
  v_new_lines jsonb := '[]'::jsonb;
  v_line jsonb;
  v_removed int;
  v_billable_remaining int;
  v_billable_matching int;
  v_billable_total int;
  v_new_amount numeric;
  v_cancelled uuid[] := ARRAY[]::uuid[];
  v_modified jsonb := '[]'::jsonb;
  v_reminders int := 0;
  v_reminders_batch int := 0;
  v_wallet_reversed int := 0;
  v_wallet_batch int := 0;
  v_now timestamptz := now();
  v_actor uuid := COALESCE(p_actor_id, auth.uid());
BEGIN
  v_keys := COALESCE(NULLIF(p_match_keys, ARRAY[]::text[]), ARRAY[p_service_code]);

  v_assess := public.fn_assess_service_financial_dependencies(p_client_id, p_service_code, v_keys);
  v_tier := v_assess->>'tier';

  IF v_tier <> 'pre_financial' THEN
    RAISE EXCEPTION 'Service is financial tier — draft cleanup not allowed';
  END IF;

  FOR v_inv IN
    SELECT i.id, i.line_items, i.invoice_number
    FROM public.client_invoices i
    WHERE i.client_id = p_client_id AND i.status = 'draft' AND i.archived_at IS NULL
      AND public.fn_invoice_line_matches_service_keys(i.line_items, v_keys)
  LOOP
    IF EXISTS (SELECT 1 FROM public.client_invoice_payments p
               WHERE p.invoice_id = v_inv.id AND p.archived_at IS NULL) THEN
      RAISE EXCEPTION 'Draft invoice % has payments — cleanup blocked', v_inv.invoice_number;
    END IF;

    IF COALESCE((SELECT amount_paid FROM public.client_invoices WHERE id = v_inv.id), 0) > 0 THEN
      RAISE EXCEPTION 'Draft invoice % has amount_paid — cleanup blocked', v_inv.invoice_number;
    END IF;

    v_lines := COALESCE(v_inv.line_items, '[]'::jsonb);
    v_new_lines := '[]'::jsonb;
    v_removed := 0;
    v_billable_remaining := 0;
    v_billable_matching := 0;
    v_billable_total := 0;

    FOR v_line IN SELECT value FROM jsonb_array_elements(v_lines) LOOP
      IF public.fn_jsonb_line_is_billable(v_line) THEN
        v_billable_total := v_billable_total + 1;
        IF public.fn_jsonb_line_matches_service_keys(v_line, v_keys) THEN
          v_billable_matching := v_billable_matching + 1;
          v_removed := v_removed + 1;
        ELSE
          v_billable_remaining := v_billable_remaining + 1;
          v_new_lines := v_new_lines || jsonb_build_array(v_line);
        END IF;
      END IF;
    END LOOP;

    IF v_billable_matching = 0 THEN CONTINUE; END IF;

    IF v_billable_remaining = 0 THEN
      UPDATE public.client_invoices
      SET status = 'cancelled', archived_at = v_now, archived_by = v_actor,
          cancelled_at = v_now, cancelled_by = v_actor, cancellation_reason = p_reason,
          amount = 0, balance_due_in_inr = 0, balance_due_in_cad = 0, balance_due_in_usd = 0
      WHERE id = v_inv.id;
      v_cancelled := array_append(v_cancelled, v_inv.id);
    ELSE
      FOR v_line IN SELECT value FROM jsonb_array_elements(v_lines) LOOP
        IF NOT public.fn_jsonb_line_is_billable(v_line) THEN
          v_new_lines := v_new_lines || jsonb_build_array(v_line);
        END IF;
      END LOOP;

      v_new_amount := public.fn_recalc_invoice_amount_from_lines(v_new_lines);

      UPDATE public.client_invoices
      SET line_items = v_new_lines, amount = v_new_amount,
          subtotal_in_inr = v_new_amount, subtotal_in_cad = v_new_amount, subtotal_in_usd = v_new_amount,
          balance_due_in_inr = v_new_amount, balance_due_in_cad = v_new_amount, balance_due_in_usd = v_new_amount,
          offer_discount_amount = 0
      WHERE id = v_inv.id;

      v_modified := v_modified || jsonb_build_array(jsonb_build_object(
        'invoice_id', v_inv.id, 'invoice_number', v_inv.invoice_number,
        'lines_removed', v_removed, 'new_amount', v_new_amount
      ));
    END IF;

    UPDATE public.client_invoice_reminders SET reminder_status = 'cancelled'
      WHERE invoice_id = v_inv.id AND reminder_status IN ('scheduled', 'sent');
    GET DIAGNOSTICS v_reminders_batch = ROW_COUNT;
    v_reminders := v_reminders + v_reminders_batch;

    UPDATE public.client_invoice_installments SET archived_at = v_now
      WHERE invoice_id = v_inv.id AND archived_at IS NULL;

    UPDATE public.wallet_allocations SET status = 'reversed'
      WHERE invoice_id = v_inv.id AND status = 'reserved';
    GET DIAGNOSTICS v_wallet_batch = ROW_COUNT;
    v_wallet_reversed := v_wallet_reversed + v_wallet_batch;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true, 'tier', v_tier, 'service_code', p_service_code,
    'cancelled_invoices', to_jsonb(v_cancelled),
    'modified_invoices', v_modified,
    'reminders_cancelled', v_reminders,
    'wallet_reservations_reversed', v_wallet_reversed,
    'cancellation_reason', p_reason
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_assess_service_financial_dependencies(uuid, text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_cleanup_pre_financial_service_drafts(uuid, text, text[], uuid, text) TO authenticated;

COMMENT ON FUNCTION public.fn_assess_service_financial_dependencies IS
  'Phase A1.5 — pre_financial vs financial tier assessment before service removal.';

COMMENT ON FUNCTION public.fn_cleanup_pre_financial_service_drafts IS
  'Phase A1.5 — cancel or line-strip draft invoices for a removed pre-financial service.';