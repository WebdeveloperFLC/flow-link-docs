-- Phase 1.1: Installment / deposit billing controls (Future Link)
-- Requested amount cap, billing stage (line-level), institution deposit fields.

ALTER TABLE public.client_service_cases
  ADD COLUMN IF NOT EXISTS requested_amount numeric(15,2),
  ADD COLUMN IF NOT EXISTS requested_currency text,
  ADD COLUMN IF NOT EXISTS requested_set_at timestamptz,
  ADD COLUMN IF NOT EXISTS requested_set_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS requested_source text,
  ADD COLUMN IF NOT EXISTS institution_required_deposit numeric(15,2),
  ADD COLUMN IF NOT EXISTS billing_trigger text,
  ADD COLUMN IF NOT EXISTS institution_deposit_reference text,
  ADD COLUMN IF NOT EXISTS billing_cap_override_reason text;

ALTER TABLE public.client_service_cases
  DROP CONSTRAINT IF EXISTS client_service_cases_billing_trigger_check;

ALTER TABLE public.client_service_cases
  ADD CONSTRAINT client_service_cases_billing_trigger_check
  CHECK (
    billing_trigger IS NULL
    OR billing_trigger IN (
      'DEPOSIT', 'POST_OFFER', 'POST_VISA', 'POST_ENROLLMENT',
      'PRE_DEPARTURE', 'ON_ADMISSION', 'OTHER'
    )
  );

COMMENT ON COLUMN public.client_service_cases.requested_amount IS
  'Billing cap for this service case (installment/deposit model).';
COMMENT ON COLUMN public.client_service_cases.institution_required_deposit IS
  'Institution-mandated deposit amount (reference for deposit invoices).';
COMMENT ON COLUMN public.client_service_cases.billing_trigger IS
  'When billing is expected: DEPOSIT, POST_OFFER, POST_VISA, etc.';
COMMENT ON COLUMN public.client_service_cases.institution_deposit_reference IS
  'Institution deposit ref / offer letter ref / seat confirmation ID.';

CREATE TABLE IF NOT EXISTS public.client_service_billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.client_service_cases(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'REQUESTED_SET', 'INSTITUTION_DEPOSIT_SET', 'CAP_OVERRIDE', 'TOP_UP_APPROVED', 'BILLING_TRIGGER_SET'
  )),
  amount numeric(15,2),
  currency text,
  actor_id uuid REFERENCES auth.users(id),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_csbe_case ON public.client_service_billing_events (case_id, created_at DESC);

ALTER TABLE public.client_service_billing_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS csbe_view ON public.client_service_billing_events;
CREATE POLICY csbe_view ON public.client_service_billing_events FOR SELECT TO authenticated
  USING (public.can_view_client(auth.uid(), client_id));

DROP POLICY IF EXISTS csbe_insert ON public.client_service_billing_events;
CREATE POLICY csbe_insert ON public.client_service_billing_events FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_client(auth.uid(), client_id));

-- Sum invoiced line totals for a case (draft + sent; excludes void/cancelled).
CREATE OR REPLACE FUNCTION public.fn_case_invoiced_amount(
  p_case_id uuid,
  p_exclude_invoice_id uuid DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_client_id uuid;
  v_service_code text;
  v_sum numeric(15,2) := 0;
BEGIN
  SELECT client_id, service_code INTO v_client_id, v_service_code
    FROM public.client_service_cases WHERE id = p_case_id;
  IF v_client_id IS NULL THEN RETURN 0; END IF;

  SELECT coalesce(sum(coalesce((li->>'total')::numeric, 0)), 0)
    INTO v_sum
    FROM public.client_invoices inv,
         jsonb_array_elements(coalesce(inv.line_items, '[]'::jsonb)) li
   WHERE inv.client_id = v_client_id
     AND inv.status NOT IN ('cancelled', 'void')
     AND (p_exclude_invoice_id IS NULL OR inv.id IS DISTINCT FROM p_exclude_invoice_id)
     AND coalesce(li->>'service_id', '') NOT IN ('', '__checkout_discount__')
     AND coalesce(li->>'service_code', '') <> '__checkout_discount__'
     AND (
       (li ? 'case_id' AND (li->>'case_id')::uuid = p_case_id)
       OR (
         NOT (li ? 'case_id') OR coalesce(li->>'case_id', '') = ''
       ) AND coalesce(li->>'service_code', li->>'service_id', '') = v_service_code
       AND NOT EXISTS (
         SELECT 1 FROM jsonb_array_elements(coalesce(inv.line_items, '[]'::jsonb)) li2
         WHERE (li2->>'case_id')::uuid IS NOT NULL
           AND (li2->>'case_id')::uuid <> p_case_id
           AND coalesce(li2->>'service_code', li2->>'service_id', '') = v_service_code
       )
     );

  RETURN coalesce(v_sum, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_case_invoiced_amount(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_validate_service_billing_cap(
  p_case_id uuid,
  p_exclude_invoice_id uuid DEFAULT NULL,
  p_proposed_lines jsonb DEFAULT '[]'::jsonb,
  p_allow_override boolean DEFAULT FALSE
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_requested numeric(15,2);
  v_currency text;
  v_invoiced numeric(15,2);
  v_proposed numeric(15,2) := 0;
  v_remaining numeric(15,2);
  v_li jsonb;
BEGIN
  SELECT requested_amount, requested_currency
    INTO v_requested, v_currency
    FROM public.client_service_cases
   WHERE id = p_case_id;

  IF v_requested IS NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'uncapped', true,
      'requested', null,
      'invoiced', public.fn_case_invoiced_amount(p_case_id, p_exclude_invoice_id),
      'remaining_billable', null
    );
  END IF;

  v_invoiced := public.fn_case_invoiced_amount(p_case_id, p_exclude_invoice_id);

  FOR v_li IN SELECT * FROM jsonb_array_elements(coalesce(p_proposed_lines, '[]'::jsonb)) LOOP
    IF coalesce(v_li->>'service_id', '') IN ('', '__checkout_discount__') THEN CONTINUE; END IF;
    IF coalesce(v_li->>'service_code', '') = '__checkout_discount__' THEN CONTINUE; END IF;
    IF (v_li ? 'case_id') AND (v_li->>'case_id')::uuid IS DISTINCT FROM p_case_id THEN CONTINUE; END IF;
    v_proposed := v_proposed + coalesce((v_li->>'total')::numeric, 0);
  END LOOP;

  v_remaining := GREATEST(v_requested - v_invoiced - v_proposed, 0);

  IF v_invoiced + v_proposed > v_requested + 0.01 AND NOT p_allow_override THEN
    RETURN jsonb_build_object(
      'ok', false,
      'uncapped', false,
      'requested', v_requested,
      'requested_currency', v_currency,
      'invoiced', v_invoiced,
      'proposed', v_proposed,
      'remaining_billable', GREATEST(v_requested - v_invoiced, 0),
      'errors', jsonb_build_array(
        format('Exceeds remaining billable (%s %s). Increase requested amount or Finance override.',
          GREATEST(v_requested - v_invoiced, 0), coalesce(v_currency, ''))
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'uncapped', false,
    'requested', v_requested,
    'requested_currency', v_currency,
    'invoiced', v_invoiced,
    'proposed', v_proposed,
    'remaining_billable', v_remaining
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_validate_service_billing_cap(uuid, uuid, jsonb, boolean) TO authenticated;

-- Extend student financial summary with requested / remaining billable / invoice stages.
CREATE OR REPLACE FUNCTION public.fn_student_financial_summary(p_client_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_result JSONB;
  v_outstanding NUMERIC(15,2) := 0;
  v_collected NUMERIC(15,2) := 0;
  v_trust_held NUMERIC(15,2) := 0;
  v_disbursed NUMERIC(15,2) := 0;
  v_refunded NUMERIC(15,2) := 0;
  v_categories JSONB;
  v_services JSONB;
BEGIN
  SELECT coalesce(sum(GREATEST(inv.amount - coalesce(inv.amount_paid, 0), 0)), 0)
    INTO v_outstanding
    FROM public.client_invoices inv
   WHERE inv.client_id = p_client_id
     AND inv.status NOT IN ('cancelled', 'void');

  SELECT coalesce(sum(p.amount), 0)
    INTO v_collected
    FROM public.client_invoice_payments p
   WHERE p.client_id = p_client_id
     AND p.payment_status = 'verified'
     AND coalesce(p.is_refund, FALSE) = FALSE
     AND p.archived_at IS NULL;

  SELECT coalesce(sum(ta.balance), 0)
    INTO v_trust_held
    FROM public.accounting_trust_accounts ta
   WHERE ta.client_id = p_client_id;

  SELECT coalesce(sum(abs(te.amount)), 0)
    INTO v_disbursed
    FROM public.accounting_trust_entries te
    JOIN public.accounting_trust_accounts ta ON ta.id = te.trust_account_id
   WHERE ta.client_id = p_client_id
     AND te.entry_type IN ('DISBURSEMENT', 'REFUND')
     AND te.amount < 0;

  SELECT coalesce(sum(abs(p.amount)), 0)
    INTO v_refunded
    FROM public.client_invoice_payments p
   WHERE p.client_id = p_client_id
     AND coalesce(p.is_refund, FALSE) = TRUE
     AND p.payment_status = 'verified';

  SELECT coalesce(jsonb_agg(row ORDER BY row->>'category_path'), '[]'::jsonb)
    INTO v_categories
    FROM (
      SELECT jsonb_build_object(
        'category_id', c.id,
        'category_code', c.code,
        'category_name', c.name,
        'category_path', c.path,
        'parent_name', parent.name,
        'accounting_treatment', c.accounting_treatment,
        'expected_payee_name', c.expected_payee_name,
        'invoiced', coalesce(inv_lines.invoiced, 0),
        'collected', coalesce(paid.allocated, 0),
        'trust_held', coalesce(ta.balance, 0),
        'disbursed', coalesce(disb.disbursed, 0),
        'currency', coalesce(ta.currency, inv_lines.currency, 'INR')
      ) AS row
      FROM public.accounting_collection_categories c
      LEFT JOIN public.accounting_collection_categories parent ON parent.id = c.parent_id
      LEFT JOIN public.accounting_trust_accounts ta
        ON ta.collection_category_id = c.id AND ta.client_id = p_client_id
      LEFT JOIN LATERAL (
        SELECT sum((li->>'total')::numeric) AS invoiced, max(inv.currency) AS currency
          FROM public.client_invoices inv,
               jsonb_array_elements(coalesce(inv.line_items, '[]'::jsonb)) li
         WHERE inv.client_id = p_client_id
           AND inv.status NOT IN ('cancelled', 'void')
           AND (li->>'collection_category_id')::uuid = c.id
      ) inv_lines ON TRUE
      LEFT JOIN LATERAL (
        SELECT sum(v.allocated_amount) AS allocated
          FROM public.vw_accounting_payment_purpose v
         WHERE v.client_id = p_client_id
           AND v.collection_category_id = c.id
           AND v.payment_status = 'verified'
      ) paid ON TRUE
      LEFT JOIN LATERAL (
        SELECT sum(abs(te.amount)) AS disbursed
          FROM public.accounting_trust_entries te
          JOIN public.accounting_trust_accounts t2 ON t2.id = te.trust_account_id
         WHERE t2.client_id = p_client_id
           AND t2.collection_category_id = c.id
           AND te.amount < 0
      ) disb ON TRUE
      WHERE c.is_posting_group = FALSE
        AND c.lifecycle_status = 'ACTIVE'
        AND (
          coalesce(ta.balance, 0) <> 0
          OR coalesce(inv_lines.invoiced, 0) <> 0
          OR coalesce(paid.allocated, 0) <> 0
          OR coalesce(disb.disbursed, 0) <> 0
        )
    ) sub;

  SELECT coalesce(jsonb_agg(svc_row ORDER BY svc_row->>'service_name'), '[]'::jsonb)
    INTO v_services
    FROM (
      SELECT jsonb_build_object(
        'case_id', cs.id,
        'service_id', agg.service_id,
        'service_code', agg.service_code,
        'service_name', agg.service_name,
        'collection_category_id', agg.collection_category_id,
        'category_name', cat.name,
        'requested', cs.requested_amount,
        'requested_currency', cs.requested_currency,
        'institution_required_deposit', cs.institution_required_deposit,
        'billing_trigger', cs.billing_trigger,
        'institution_deposit_reference', cs.institution_deposit_reference,
        'invoiced', coalesce(case_inv.invoiced, agg.invoiced),
        'collected', coalesce(coll.collected, 0),
        'outstanding', GREATEST(coalesce(case_inv.invoiced, agg.invoiced) - coalesce(coll.collected, 0), 0),
        'remaining_billable', CASE
          WHEN cs.requested_amount IS NULL THEN NULL
          ELSE GREATEST(cs.requested_amount - coalesce(case_inv.invoiced, agg.invoiced), 0)
        END,
        'trust_held', coalesce(ta.balance, 0),
        'collection_status', CASE
          WHEN coalesce(case_inv.invoiced, agg.invoiced) <= 0 AND agg.has_draft THEN 'DRAFT'
          WHEN coalesce(case_inv.invoiced, agg.invoiced) <= 0 THEN 'NOT_INVOICED'
          WHEN coalesce(coll.collected, 0) <= 0 THEN 'OUTSTANDING'
          WHEN coalesce(coll.collected, 0) < coalesce(case_inv.invoiced, agg.invoiced) - 0.01 THEN 'PARTIAL'
          WHEN coalesce(ta.balance, 0) > 0.01 THEN 'TRUST_HELD'
          ELSE 'COLLECTED'
        END,
        'currency', coalesce(cs.requested_currency, agg.currency, 'INR'),
        'invoices_by_stage', coalesce(stages.rows, '[]'::jsonb)
      ) AS svc_row
      FROM public.client_service_cases cs
      JOIN (
        SELECT
          coalesce(li->>'service_id', li->>'service_code') AS service_id,
          max(li->>'service_code') AS service_code,
          max(coalesce(li->>'service_name', li->>'description')) AS service_name,
          max((li->>'collection_category_id')::text)::uuid AS collection_category_id,
          sum(coalesce((li->>'total')::numeric, 0)) AS invoiced,
          bool_or(inv.status = 'draft') AS has_draft,
          max(inv.currency) AS currency
        FROM public.client_invoices inv,
             jsonb_array_elements(coalesce(inv.line_items, '[]'::jsonb)) li
        WHERE inv.client_id = p_client_id
          AND inv.status NOT IN ('cancelled', 'void')
          AND coalesce(li->>'service_id', '') NOT IN ('', '__checkout_discount__')
          AND coalesce(li->>'service_code', '') <> '__checkout_discount__'
        GROUP BY coalesce(li->>'service_id', li->>'service_code')
      ) agg ON agg.service_code = cs.service_code OR agg.service_id = cs.service_code
      LEFT JOIN LATERAL (
        SELECT public.fn_case_invoiced_amount(cs.id, NULL) AS invoiced
      ) case_inv ON TRUE
      LEFT JOIN public.accounting_collection_categories cat ON cat.id = agg.collection_category_id
      LEFT JOIN LATERAL (
        SELECT sum(a.amount_allocated) AS collected
          FROM public.client_invoice_payment_allocations a
          JOIN public.client_invoice_payments p ON p.id = a.payment_id
         WHERE a.service_id = agg.service_id
           AND p.client_id = p_client_id
           AND p.payment_status = 'verified'
           AND coalesce(p.is_refund, FALSE) = FALSE
      ) coll ON TRUE
      LEFT JOIN public.accounting_trust_accounts ta
        ON ta.collection_category_id = agg.collection_category_id
       AND ta.client_id = p_client_id
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(jsonb_build_object(
          'invoice_id', inv.id,
          'invoice_number', inv.invoice_number,
          'billing_stage', coalesce(li->>'billing_stage', 'INSTALLMENT'),
          'amount', coalesce((li->>'total')::numeric, 0),
          'collected', coalesce(line_coll.collected, 0),
          'outstanding', GREATEST(coalesce((li->>'total')::numeric, 0) - coalesce(line_coll.collected, 0), 0),
          'status', inv.status
        ) ORDER BY inv.created_at) AS rows
          FROM public.client_invoices inv,
               jsonb_array_elements(coalesce(inv.line_items, '[]'::jsonb)) li
          LEFT JOIN LATERAL (
            SELECT sum(a.amount_allocated) AS collected
              FROM public.client_invoice_payment_allocations a
              JOIN public.client_invoice_payments p ON p.id = a.payment_id
             WHERE a.invoice_id = inv.id
               AND (
                 a.line_item_key = concat('svc:', li->>'service_id')
                 OR a.service_id = (li->>'service_id')::text
               )
               AND p.payment_status = 'verified'
               AND coalesce(p.is_refund, FALSE) = FALSE
          ) line_coll ON TRUE
         WHERE inv.client_id = p_client_id
           AND inv.status NOT IN ('cancelled', 'void')
           AND (
             (li ? 'case_id' AND (li->>'case_id')::uuid = cs.id)
             OR (
               (NOT (li ? 'case_id') OR coalesce(li->>'case_id', '') = '')
               AND coalesce(li->>'service_code', li->>'service_id', '') = cs.service_code
             )
           )
           AND coalesce(li->>'service_id', '') NOT IN ('', '__checkout_discount__')
      ) stages ON TRUE
      WHERE cs.client_id = p_client_id
        AND cs.status = 'open'
        AND (
          coalesce(case_inv.invoiced, 0) <> 0
          OR cs.requested_amount IS NOT NULL
          OR coalesce(coll.collected, 0) <> 0
        )
    ) svc_sub;

  v_result := jsonb_build_object(
    'client_id', p_client_id,
    'outstanding', v_outstanding,
    'collected', v_collected,
    'trust_held', v_trust_held,
    'disbursed', v_disbursed,
    'refunded', v_refunded,
    'recoverable', 0,
    'reimbursable', 0,
    'categories', coalesce(v_categories, '[]'::jsonb),
    'services', coalesce(v_services, '[]'::jsonb)
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_student_financial_summary(UUID) TO authenticated;
