-- =====================================================================
-- R1 — Backfill category FKs + reporting views + student ledger RPC
-- =====================================================================

-- Map legacy role_key → collection_category_id
UPDATE public.accounting_trust_accounts ta
SET collection_category_id = c.id
FROM public.accounting_collection_categories c
WHERE ta.collection_category_id IS NULL
  AND (
    ta.role_key = c.default_trust_role_key
    OR ta.role_key = c.default_revenue_role_key
    OR (ta.role_key = 'TRUST_TUITION' AND c.code = 'TUITION')
    OR (ta.role_key = 'TRUST_APPLICATION' AND c.code = 'APPLICATION_FEE')
    OR (ta.role_key = 'TRUST_EMBASSY' AND c.code IN ('VISA_FEE', 'EMBASSY_FEE'))
    OR (ta.role_key = 'TRUST_BIOMETRICS' AND c.code = 'BIOMETRIC_FEE')
    OR (ta.role_key = 'TRUST_GIC' AND c.code = 'GIC')
    OR (ta.role_key = 'TRUST_MEDICAL' AND c.code IN ('MEDICAL', 'POLICE_CLEARANCE'))
    OR (ta.role_key = 'TRUST_OTHER' AND c.code = 'OTHER')
  );

UPDATE public.accounting_invoice_line_classifications lc
SET collection_category_id = c.id
FROM public.accounting_collection_categories c
WHERE lc.collection_category_id IS NULL
  AND (
    lc.role_key = c.default_trust_role_key
    OR lc.role_key = c.default_revenue_role_key
    OR (lc.role_key = 'TRUST_TUITION' AND c.code = 'TUITION')
    OR (lc.role_key = 'TRUST_APPLICATION' AND c.code = 'APPLICATION_FEE')
    OR (lc.role_key = 'TRUST_EMBASSY' AND c.code = 'VISA_FEE')
    OR (lc.role_key = 'TRUST_BIOMETRICS' AND c.code = 'BIOMETRIC_FEE')
    OR (lc.role_key = 'TRUST_GIC' AND c.code = 'GIC')
    OR (lc.role_key = 'TRUST_MEDICAL' AND c.code = 'MEDICAL')
    OR (lc.role_key = 'TRUST_OTHER' AND c.code = 'OTHER')
    OR (lc.role_key IN ('REVENUE_VISA', 'REVENUE_SERVICE', 'REVENUE_COACHING') AND c.code IN ('SERVICE_FEE', 'COACHING_FEE'))
  );

UPDATE public.accounting_trust_entries te
SET collection_category_id = ta.collection_category_id
FROM public.accounting_trust_accounts ta
WHERE te.trust_account_id = ta.id AND te.collection_category_id IS NULL;

UPDATE public.accounting_trust_disbursements td
SET collection_category_id = ta.collection_category_id
FROM public.accounting_trust_accounts ta
WHERE td.client_id = ta.client_id
  AND td.role_key = ta.role_key
  AND td.entity_id = ta.entity_id
  AND td.currency = ta.currency
  AND td.collection_category_id IS NULL
  AND ta.collection_category_id IS NOT NULL;

-- Payment purpose reporting view
CREATE OR REPLACE VIEW public.vw_accounting_payment_purpose AS
SELECT
  p.id AS payment_id,
  p.invoice_id,
  p.client_id,
  p.amount AS payment_amount,
  p.currency AS payment_currency,
  p.paid_at,
  p.payment_status,
  p.method AS payment_method,
  inv.firm_entity_id AS entity_id,
  inv.branch_id,
  lc.collection_category_id,
  c.code AS category_code,
  c.name AS category_name,
  c.path AS category_path,
  parent.code AS parent_category_code,
  parent.name AS parent_category_name,
  c.accounting_treatment,
  c.expected_payee_name,
  lc.line_label AS payment_purpose,
  lc.net_amount AS line_net,
  lc.gross_amount AS line_gross,
  lc.classification,
  lc.role_key,
  CASE
    WHEN bridge.total_trust + bridge.total_revenue > 0
    THEN round((p.amount * lc.net_amount / NULLIF(
      (SELECT sum(x.net_amount) FROM public.accounting_invoice_line_classifications x WHERE x.bridge_id = lc.bridge_id), 0
    ))::numeric, 2)
    ELSE lc.net_amount
  END AS allocated_amount
FROM public.client_invoice_payments p
JOIN public.client_invoices inv ON inv.id = p.invoice_id
LEFT JOIN public.accounting_crm_invoice_bridge bridge ON bridge.invoice_id = p.invoice_id
LEFT JOIN public.accounting_invoice_line_classifications lc ON lc.bridge_id = bridge.id
LEFT JOIN public.accounting_collection_categories c ON c.id = lc.collection_category_id
LEFT JOIN public.accounting_collection_categories parent ON parent.id = c.parent_id
WHERE COALESCE(p.is_refund, FALSE) = FALSE
  AND COALESCE(p.archived_at IS NULL, TRUE);

GRANT SELECT ON public.vw_accounting_payment_purpose TO authenticated;

-- Trust by category reporting view
CREATE OR REPLACE VIEW public.vw_accounting_trust_by_category AS
SELECT
  ta.client_id,
  ta.entity_id,
  ta.branch_id,
  ta.currency,
  ta.collection_category_id,
  c.code AS category_code,
  c.name AS category_name,
  c.path AS category_path,
  parent.name AS parent_category_name,
  c.accounting_treatment,
  c.expected_payee_name,
  ta.balance AS trust_held,
  ta.role_key,
  ta.updated_at
FROM public.accounting_trust_accounts ta
LEFT JOIN public.accounting_collection_categories c ON c.id = ta.collection_category_id
LEFT JOIN public.accounting_collection_categories parent ON parent.id = c.parent_id
WHERE ta.balance <> 0;

GRANT SELECT ON public.vw_accounting_trust_by_category TO authenticated;

-- Collections summary by category
CREATE OR REPLACE VIEW public.vw_accounting_collections_by_category AS
SELECT
  c.id AS category_id,
  c.code,
  c.name,
  c.path,
  c.accounting_treatment,
  c.lifecycle_status,
  parent.name AS parent_name,
  coalesce(sum(ta.balance), 0) AS trust_held,
  count(DISTINCT ta.client_id) FILTER (WHERE ta.balance > 0) AS students_with_balance
FROM public.accounting_collection_categories c
LEFT JOIN public.accounting_collection_categories parent ON parent.id = c.parent_id
LEFT JOIN public.accounting_trust_accounts ta ON ta.collection_category_id = c.id
WHERE c.is_posting_group = FALSE
GROUP BY c.id, c.code, c.name, c.path, c.accounting_treatment, c.lifecycle_status, parent.name;

GRANT SELECT ON public.vw_accounting_collections_by_category TO authenticated;

-- Student financial summary RPC
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

  v_result := jsonb_build_object(
    'client_id', p_client_id,
    'outstanding', v_outstanding,
    'collected', v_collected,
    'trust_held', v_trust_held,
    'disbursed', v_disbursed,
    'refunded', v_refunded,
    'recoverable', 0,
    'reimbursable', 0,
    'categories', coalesce(v_categories, '[]'::jsonb)
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_student_financial_summary(UUID) TO authenticated;

-- Extend trust available balance by category
CREATE OR REPLACE FUNCTION public.fn_trust_available_balance_by_category(
  p_client_id UUID,
  p_category_id UUID,
  p_entity_id TEXT,
  p_currency TEXT
) RETURNS NUMERIC
LANGUAGE sql
STABLE
SET search_path = public AS $$
  SELECT coalesce(ta.balance, 0)
    FROM public.accounting_trust_accounts ta
   WHERE ta.client_id = p_client_id
     AND ta.collection_category_id = p_category_id
     AND ta.entity_id = p_entity_id
     AND ta.currency = p_currency
   LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.fn_trust_available_balance_by_category(UUID, UUID, TEXT, TEXT) TO authenticated;
