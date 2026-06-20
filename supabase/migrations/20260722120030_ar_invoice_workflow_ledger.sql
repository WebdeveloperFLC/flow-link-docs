-- AR invoice workflow + service-level ledger balances
ALTER TABLE public.client_invoices
  ADD COLUMN IF NOT EXISTS invoice_context_json JSONB;

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

  -- Service-level balances (by service_id on invoice lines)
  SELECT coalesce(jsonb_agg(svc_row ORDER BY svc_row->>'service_name'), '[]'::jsonb)
    INTO v_services
    FROM (
      SELECT jsonb_build_object(
        'service_id', agg.service_id,
        'service_code', agg.service_code,
        'service_name', agg.service_name,
        'collection_category_id', agg.collection_category_id,
        'category_name', cat.name,
        'invoiced', agg.invoiced,
        'collected', coalesce(coll.collected, 0),
        'outstanding', GREATEST(agg.invoiced - coalesce(coll.collected, 0), 0),
        'trust_held', coalesce(ta.balance, 0),
        'collection_status', CASE
          WHEN agg.invoiced <= 0 AND agg.has_draft THEN 'DRAFT'
          WHEN agg.invoiced <= 0 THEN 'NOT_INVOICED'
          WHEN coalesce(coll.collected, 0) <= 0 THEN 'OUTSTANDING'
          WHEN coalesce(coll.collected, 0) < agg.invoiced - 0.01 THEN 'PARTIAL'
          WHEN coalesce(ta.balance, 0) > 0.01 THEN 'TRUST_HELD'
          ELSE 'COLLECTED'
        END,
        'currency', coalesce(agg.currency, 'INR')
      ) AS svc_row
      FROM (
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
      ) agg
      LEFT JOIN public.accounting_collection_categories cat ON cat.id = agg.collection_category_id
      LEFT JOIN LATERAL (
        SELECT sum(a.amount_allocated) AS collected
          FROM public.client_invoice_payment_allocations a
          JOIN public.client_invoice_payments p ON p.id = a.payment_id
         WHERE a.service_id = agg.service_id
           AND p.payment_status = 'verified'
           AND coalesce(p.is_refund, FALSE) = FALSE
      ) coll ON TRUE
      LEFT JOIN public.accounting_trust_accounts ta
        ON ta.collection_category_id = agg.collection_category_id
       AND ta.client_id = p_client_id
      WHERE agg.service_id IS NOT NULL
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
