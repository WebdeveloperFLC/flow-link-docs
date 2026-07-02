-- ========== 20260722120010_accounting_collection_categories_seed.sql ==========
INSERT INTO public.accounting_coa
  (code, name, group_code, type_code, currency, normal_balance, entity_id, is_active, description)
SELECT v.code, v.name, v.grp, v.typ, v.cur, v.nb, NULL, TRUE, v.descr
FROM (VALUES
  ('2408', 'Client Funds — Insurance', 'LIABILITY', 'AP', 'INR', 'CREDIT', 'Insurance pass-through'),
  ('2409', 'Client Funds — Test Fees', 'LIABILITY', 'AP', 'INR', 'CREDIT', 'Test fee pass-through parent'),
  ('2410', 'Client Funds — IELTS', 'LIABILITY', 'AP', 'INR', 'CREDIT', 'IELTS fee held'),
  ('2411', 'Client Funds — Credential Assessment', 'LIABILITY', 'AP', 'INR', 'CREDIT', 'WES/IQAS/ICAS/CES'),
  ('2412', 'Client Funds — Courier', 'LIABILITY', 'AP', 'INR', 'CREDIT', 'Courier fees held'),
  ('2413', 'Client Funds — Translation', 'LIABILITY', 'AP', 'INR', 'CREDIT', 'Translation fees held'),
  ('2414', 'Client Funds — Air Ticket', 'LIABILITY', 'AP', 'INR', 'CREDIT', 'Air ticket held'),
  ('2415', 'Client Funds — University Deposit', 'LIABILITY', 'AP', 'INR', 'CREDIT', 'University deposit held'),
  ('2416', 'Client Funds — VFS Fee', 'LIABILITY', 'AP', 'INR', 'CREDIT', 'VFS fee held'),
  ('2417', 'Client Funds — SEVIS Fee', 'LIABILITY', 'AP', 'INR', 'CREDIT', 'SEVIS fee held'),
  ('2418', 'Client Funds — Accommodation Deposit', 'LIABILITY', 'AP', 'INR', 'CREDIT', 'Accommodation deposit'),
  ('2419', 'Client Funds — Airport Pickup', 'LIABILITY', 'AP', 'INR', 'CREDIT', 'Airport pickup held'),
  ('2421', 'Institution Collection Clearing', 'LIABILITY', 'AP', 'INR', 'CREDIT', 'Institution-related collections'),
  ('2422', 'Student Recoverable — On Behalf', 'ASSET', 'AR', 'INR', 'DEBIT', 'Student recoverables (card/employee)')
) AS v(code, name, grp, typ, cur, nb, descr)
WHERE NOT EXISTS (
  SELECT 1 FROM public.accounting_coa c WHERE c.code = v.code AND c.entity_id IS NULL
);

INSERT INTO public.accounting_account_roles (role_key, entity_id, account_code, description) VALUES
  ('TRUST_CAT_INSURANCE', NULL, '2408', 'Trust — Insurance'),
  ('TRUST_CAT_TEST_FEE', NULL, '2409', 'Trust — Test fees (group)'),
  ('TRUST_CAT_IELTS', NULL, '2410', 'Trust — IELTS'),
  ('TRUST_CAT_CREDENTIAL', NULL, '2411', 'Trust — Credential assessment'),
  ('TRUST_CAT_COURIER', NULL, '2412', 'Trust — Courier'),
  ('TRUST_CAT_TRANSLATION', NULL, '2413', 'Trust — Translation'),
  ('TRUST_CAT_AIR_TICKET', NULL, '2414', 'Trust — Air ticket'),
  ('TRUST_CAT_UNIV_DEPOSIT', NULL, '2415', 'Trust — University deposit'),
  ('TRUST_CAT_VFS', NULL, '2416', 'Trust — VFS'),
  ('TRUST_CAT_SEVIS', NULL, '2417', 'Trust — SEVIS'),
  ('TRUST_CAT_ACCOMMODATION', NULL, '2418', 'Trust — Accommodation deposit'),
  ('TRUST_CAT_AIRPORT_PICKUP', NULL, '2419', 'Trust — Airport pickup'),
  ('INST_CAT_TUITION', NULL, '2421', 'Institution-related tuition collection'),
  ('REC_CAT_DEFAULT', NULL, '2422', 'Student recoverable default')
ON CONFLICT (role_key, entity_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public._r1_seed_category(
  p_code TEXT, p_name TEXT, p_parent_id UUID, p_is_group BOOLEAN, p_treatment TEXT,
  p_trust BOOLEAN, p_disburse BOOLEAN, p_role TEXT, p_liability TEXT,
  p_revenue TEXT DEFAULT NULL, p_payee_type TEXT DEFAULT NULL,
  p_expected_payee TEXT DEFAULT NULL, p_order INT DEFAULT 0
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
  v_id UUID; v_path TEXT; v_depth INT;
BEGIN
  v_depth := CASE WHEN p_parent_id IS NULL THEN 0 ELSE (
    SELECT depth + 1 FROM public.accounting_collection_categories WHERE id = p_parent_id
  ) END;
  v_path := CASE WHEN p_parent_id IS NULL THEN p_code ELSE (
    SELECT path || '.' || p_code FROM public.accounting_collection_categories WHERE id = p_parent_id
  ) END;
  INSERT INTO public.accounting_collection_categories (
    code, name, parent_id, path, depth, is_posting_group, lifecycle_status, is_system,
    display_order, accounting_treatment, requires_trust, requires_disbursement,
    default_trust_role_key, default_revenue_role_key, default_payee_type, expected_payee_name,
    default_tax_mode, default_collection_currency
  ) VALUES (
    p_code, p_name, p_parent_id, v_path, COALESCE(v_depth, 0), p_is_group, 'ACTIVE', TRUE,
    p_order, p_treatment, p_trust, p_disburse,
    CASE WHEN p_trust THEN p_role ELSE NULL END, p_revenue,
    p_payee_type, p_expected_payee,
    CASE WHEN p_treatment = 'REVENUE' THEN 'EXCLUSIVE' ELSE 'EXEMPT' END, 'INR'
  )
  ON CONFLICT (code, entity_id) DO UPDATE SET
    name = EXCLUDED.name, path = EXCLUDED.path, depth = EXCLUDED.depth, updated_at = now()
  RETURNING id INTO v_id;
  IF p_liability IS NOT NULL OR p_revenue IS NOT NULL THEN
    INSERT INTO public.accounting_collection_category_coa (
      category_id, entity_id, liability_account_code, revenue_account_code, role_key
    ) VALUES (
      v_id, NULL, p_liability, p_revenue, COALESCE(p_role, p_revenue, 'REV_CAT_' || p_code)
    )
    ON CONFLICT (category_id, entity_id) DO UPDATE SET
      liability_account_code = EXCLUDED.liability_account_code,
      revenue_account_code = EXCLUDED.revenue_account_code,
      role_key = EXCLUDED.role_key, updated_at = now();
  END IF;
  RETURN v_id;
END;
$$;

DO $$
DECLARE v_rev UUID; v_tp UUID; v_test UUID; v_cred UUID;
BEGIN
  v_rev := public._r1_seed_category('FUTURE_LINK_REVENUE', 'Future Link Revenue', NULL, TRUE, 'REVENUE', FALSE, FALSE, NULL, NULL, NULL, NULL, NULL, 10);
  PERFORM public._r1_seed_category('SERVICE_FEE', 'Future Link Service Fee', v_rev, FALSE, 'REVENUE', FALSE, FALSE, 'REV_CAT_SERVICE_FEE', NULL, '4201', NULL, 'Future Link', 11);
  PERFORM public._r1_seed_category('COACHING_FEE', 'Coaching Fee', v_rev, FALSE, 'REVENUE', FALSE, FALSE, 'REV_CAT_COACHING', NULL, '4201', NULL, 'Future Link', 12);
  v_tp := public._r1_seed_category('THIRD_PARTY', 'Third Party Collections', NULL, TRUE, 'THIRD_PARTY', FALSE, FALSE, NULL, NULL, NULL, NULL, NULL, 20);
  PERFORM public._r1_seed_category('TUITION', 'Tuition', v_tp, FALSE, 'INSTITUTION_RELATED', TRUE, TRUE, 'INST_CAT_TUITION', '2421', NULL, 'INSTITUTION', NULL, 21);
  PERFORM public._r1_seed_category('APPLICATION_FEE', 'Application Fee', v_tp, FALSE, 'THIRD_PARTY', TRUE, TRUE, 'TRUST_CAT_APPLICATION', '2403', NULL, 'INSTITUTION', NULL, 22);
  v_test := public._r1_seed_category('TEST_FEE', 'Test Fee', v_tp, TRUE, 'THIRD_PARTY', FALSE, FALSE, 'TRUST_CAT_TEST_FEE', '2409', NULL, NULL, NULL, 30);
  PERFORM public._r1_seed_category('IELTS', 'IELTS', v_test, FALSE, 'THIRD_PARTY', TRUE, TRUE, 'TRUST_CAT_IELTS', '2410', NULL, 'VENDOR', 'IDP / British Council', 31);
  PERFORM public._r1_seed_category('PTE', 'PTE', v_test, FALSE, 'THIRD_PARTY', TRUE, TRUE, 'TRUST_CAT_TEST_FEE', '2409', NULL, 'VENDOR', 'Pearson', 32);
  PERFORM public._r1_seed_category('TOEFL', 'TOEFL', v_test, FALSE, 'THIRD_PARTY', TRUE, TRUE, 'TRUST_CAT_TEST_FEE', '2409', NULL, 'VENDOR', 'ETS', 33);
  PERFORM public._r1_seed_category('INSURANCE', 'Insurance', v_tp, FALSE, 'THIRD_PARTY', TRUE, TRUE, 'TRUST_CAT_INSURANCE', '2408', NULL, 'INSURER', 'GuardMe', 40);
  PERFORM public._r1_seed_category('VISA_FEE', 'Visa Fee', v_tp, FALSE, 'THIRD_PARTY', TRUE, TRUE, 'TRUST_EMBASSY', '2402', NULL, 'GOVERNMENT', 'IRCC', 41);
  PERFORM public._r1_seed_category('BIOMETRIC_FEE', 'Biometric Fee', v_tp, FALSE, 'THIRD_PARTY', TRUE, TRUE, 'TRUST_CAT_BIOMETRICS', '2406', NULL, 'VENDOR', 'VFS Global', 42);
  PERFORM public._r1_seed_category('VFS_FEE', 'VFS Fee', v_tp, FALSE, 'THIRD_PARTY', TRUE, TRUE, 'TRUST_CAT_VFS', '2416', NULL, 'VENDOR', 'VFS Global', 43);
  PERFORM public._r1_seed_category('SEVIS_FEE', 'SEVIS Fee', v_tp, FALSE, 'THIRD_PARTY', TRUE, TRUE, 'TRUST_CAT_SEVIS', '2417', NULL, 'GOVERNMENT', 'US Government', 44);
  PERFORM public._r1_seed_category('MEDICAL', 'Medical', v_tp, FALSE, 'THIRD_PARTY', TRUE, TRUE, 'TRUST_CAT_MEDICAL', '2407', NULL, 'VENDOR', NULL, 45);
  PERFORM public._r1_seed_category('COURIER', 'Courier', v_tp, FALSE, 'THIRD_PARTY', TRUE, TRUE, 'TRUST_CAT_COURIER', '2412', NULL, 'VENDOR', NULL, 46);
  PERFORM public._r1_seed_category('TRANSLATION', 'Translation', v_tp, FALSE, 'THIRD_PARTY', TRUE, TRUE, 'TRUST_CAT_TRANSLATION', '2413', NULL, 'VENDOR', NULL, 47);
  v_cred := public._r1_seed_category('CREDENTIAL_ASSESSMENT', 'Credential Assessment', v_tp, TRUE, 'THIRD_PARTY', FALSE, FALSE, 'TRUST_CAT_CREDENTIAL', '2411', NULL, NULL, NULL, 50);
  PERFORM public._r1_seed_category('WES', 'WES', v_cred, FALSE, 'THIRD_PARTY', TRUE, TRUE, 'TRUST_CAT_CREDENTIAL', '2411', NULL, 'VENDOR', 'WES', 51);
  PERFORM public._r1_seed_category('IQAS', 'IQAS', v_cred, FALSE, 'THIRD_PARTY', TRUE, TRUE, 'TRUST_CAT_CREDENTIAL', '2411', NULL, 'VENDOR', 'IQAS', 52);
  PERFORM public._r1_seed_category('GIC', 'GIC', v_tp, FALSE, 'THIRD_PARTY', TRUE, TRUE, 'TRUST_CAT_GIC', '2404', NULL, 'INSTITUTION', NULL, 55);
  PERFORM public._r1_seed_category('ACCOMMODATION_DEPOSIT', 'Accommodation Deposit', v_tp, FALSE, 'THIRD_PARTY', TRUE, TRUE, 'TRUST_CAT_ACCOMMODATION', '2418', NULL, 'VENDOR', NULL, 56);
  PERFORM public._r1_seed_category('AIRPORT_PICKUP', 'Airport Pickup', v_tp, FALSE, 'THIRD_PARTY', TRUE, TRUE, 'TRUST_CAT_AIRPORT_PICKUP', '2419', NULL, 'VENDOR', NULL, 57);
  PERFORM public._r1_seed_category('AIR_TICKET', 'Air Ticket', v_tp, FALSE, 'THIRD_PARTY', TRUE, TRUE, 'TRUST_CAT_AIR_TICKET', '2414', NULL, 'VENDOR', NULL, 58);
  PERFORM public._r1_seed_category('EMBASSY_FEE', 'Embassy Fee', v_tp, FALSE, 'THIRD_PARTY', TRUE, TRUE, 'TRUST_EMBASSY', '2402', NULL, 'GOVERNMENT', NULL, 59);
  PERFORM public._r1_seed_category('DOCUMENT_ATTESTATION', 'Document Attestation', v_tp, FALSE, 'THIRD_PARTY', TRUE, TRUE, 'TRUST_CAT_OTHER', '2405', NULL, 'VENDOR', NULL, 60);
  PERFORM public._r1_seed_category('POLICE_CLEARANCE', 'Police Clearance', v_tp, FALSE, 'THIRD_PARTY', TRUE, TRUE, 'TRUST_CAT_MEDICAL', '2407', NULL, 'GOVERNMENT', NULL, 61);
  PERFORM public._r1_seed_category('UNIVERSITY_DEPOSIT', 'University Deposit', v_tp, FALSE, 'THIRD_PARTY', TRUE, TRUE, 'TRUST_CAT_UNIV_DEPOSIT', '2415', NULL, 'INSTITUTION', NULL, 62);
  PERFORM public._r1_seed_category('OTHER', 'Other', v_tp, FALSE, 'THIRD_PARTY', TRUE, TRUE, 'TRUST_CAT_OTHER', '2405', NULL, 'OTHER', NULL, 99);
  UPDATE public.accounting_collection_categories SET default_trust_role_key = 'TRUST_TUITION' WHERE code = 'TUITION' AND default_trust_role_key IS NULL;
END;
$$;

UPDATE public.accounting_collection_categories c SET default_trust_role_key = m.role
FROM (VALUES
  ('APPLICATION_FEE', 'TRUST_APPLICATION'), ('VISA_FEE', 'TRUST_EMBASSY'),
  ('EMBASSY_FEE', 'TRUST_EMBASSY'), ('BIOMETRIC_FEE', 'TRUST_BIOMETRICS'),
  ('GIC', 'TRUST_GIC'), ('MEDICAL', 'TRUST_MEDICAL'),
  ('POLICE_CLEARANCE', 'TRUST_MEDICAL'), ('DOCUMENT_ATTESTATION', 'TRUST_OTHER'),
  ('OTHER', 'TRUST_OTHER')
) AS m(code, role) WHERE c.code = m.code;

UPDATE public.accounting_collection_category_coa co
SET role_key = c.default_trust_role_key
FROM public.accounting_collection_categories c
WHERE co.category_id = c.id AND c.default_trust_role_key LIKE 'TRUST_%';

DROP FUNCTION IF EXISTS public._r1_seed_category(TEXT, TEXT, UUID, BOOLEAN, TEXT, BOOLEAN, BOOLEAN, TEXT, TEXT, TEXT, TEXT, TEXT, INT);

-- ========== 20260722120020_accounting_collection_categories_backfill.sql ==========
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
WHERE td.client_id = ta.client_id AND td.role_key = ta.role_key
  AND td.entity_id = ta.entity_id AND td.currency = ta.currency
  AND td.collection_category_id IS NULL AND ta.collection_category_id IS NOT NULL;

CREATE OR REPLACE VIEW public.vw_accounting_payment_purpose AS
SELECT
  p.id AS payment_id, p.invoice_id, p.client_id,
  p.amount AS payment_amount, p.currency AS payment_currency,
  p.paid_at, p.payment_status, p.method AS payment_method,
  inv.firm_entity_id AS entity_id, inv.branch_id,
  lc.collection_category_id, c.code AS category_code, c.name AS category_name,
  c.path AS category_path, parent.code AS parent_category_code, parent.name AS parent_category_name,
  c.accounting_treatment, c.expected_payee_name,
  lc.line_label AS payment_purpose, lc.net_amount AS line_net, lc.gross_amount AS line_gross,
  lc.classification, lc.role_key,
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

CREATE OR REPLACE VIEW public.vw_accounting_trust_by_category AS
SELECT
  ta.client_id, ta.entity_id, ta.branch_id, ta.currency, ta.collection_category_id,
  c.code AS category_code, c.name AS category_name, c.path AS category_path,
  parent.name AS parent_category_name, c.accounting_treatment, c.expected_payee_name,
  ta.balance AS trust_held, ta.role_key, ta.updated_at
FROM public.accounting_trust_accounts ta
LEFT JOIN public.accounting_collection_categories c ON c.id = ta.collection_category_id
LEFT JOIN public.accounting_collection_categories parent ON parent.id = c.parent_id
WHERE ta.balance <> 0;

GRANT SELECT ON public.vw_accounting_trust_by_category TO authenticated;

CREATE OR REPLACE VIEW public.vw_accounting_collections_by_category AS
SELECT
  c.id AS category_id, c.code, c.name, c.path,
  c.accounting_treatment, c.lifecycle_status, parent.name AS parent_name,
  coalesce(sum(ta.balance), 0) AS trust_held,
  count(DISTINCT ta.client_id) FILTER (WHERE ta.balance > 0) AS students_with_balance
FROM public.accounting_collection_categories c
LEFT JOIN public.accounting_collection_categories parent ON parent.id = c.parent_id
LEFT JOIN public.accounting_trust_accounts ta ON ta.collection_category_id = c.id
WHERE c.is_posting_group = FALSE
GROUP BY c.id, c.code, c.name, c.path, c.accounting_treatment, c.lifecycle_status, parent.name;

GRANT SELECT ON public.vw_accounting_collections_by_category TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_student_financial_summary(p_client_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_result JSONB; v_outstanding NUMERIC(15,2) := 0; v_collected NUMERIC(15,2) := 0;
  v_trust_held NUMERIC(15,2) := 0; v_disbursed NUMERIC(15,2) := 0; v_refunded NUMERIC(15,2) := 0;
  v_categories JSONB;
BEGIN
  SELECT coalesce(sum(GREATEST(inv.amount - coalesce(inv.amount_paid, 0), 0)), 0) INTO v_outstanding
    FROM public.client_invoices inv WHERE inv.client_id = p_client_id AND inv.status NOT IN ('cancelled', 'void');
  SELECT coalesce(sum(p.amount), 0) INTO v_collected FROM public.client_invoice_payments p
    WHERE p.client_id = p_client_id AND p.payment_status = 'verified' AND coalesce(p.is_refund, FALSE) = FALSE AND p.archived_at IS NULL;
  SELECT coalesce(sum(ta.balance), 0) INTO v_trust_held FROM public.accounting_trust_accounts ta WHERE ta.client_id = p_client_id;
  SELECT coalesce(sum(abs(te.amount)), 0) INTO v_disbursed
    FROM public.accounting_trust_entries te JOIN public.accounting_trust_accounts ta ON ta.id = te.trust_account_id
    WHERE ta.client_id = p_client_id AND te.entry_type IN ('DISBURSEMENT', 'REFUND') AND te.amount < 0;
  SELECT coalesce(sum(abs(p.amount)), 0) INTO v_refunded FROM public.client_invoice_payments p
    WHERE p.client_id = p_client_id AND coalesce(p.is_refund, FALSE) = TRUE AND p.payment_status = 'verified';
  SELECT coalesce(jsonb_agg(row ORDER BY row->>'category_path'), '[]'::jsonb) INTO v_categories FROM (
    SELECT jsonb_build_object(
      'category_id', c.id, 'category_code', c.code, 'category_name', c.name, 'category_path', c.path,
      'parent_name', parent.name, 'accounting_treatment', c.accounting_treatment, 'expected_payee_name', c.expected_payee_name,
      'invoiced', coalesce(inv_lines.invoiced, 0), 'collected', coalesce(paid.allocated, 0),
      'trust_held', coalesce(ta.balance, 0), 'disbursed', coalesce(disb.disbursed, 0),
      'currency', coalesce(ta.currency, inv_lines.currency, 'INR')
    ) AS row
    FROM public.accounting_collection_categories c
    LEFT JOIN public.accounting_collection_categories parent ON parent.id = c.parent_id
    LEFT JOIN public.accounting_trust_accounts ta ON ta.collection_category_id = c.id AND ta.client_id = p_client_id
    LEFT JOIN LATERAL (
      SELECT sum((li->>'total')::numeric) AS invoiced, max(inv.currency) AS currency
        FROM public.client_invoices inv, jsonb_array_elements(coalesce(inv.line_items, '[]'::jsonb)) li
       WHERE inv.client_id = p_client_id AND (li->>'collection_category_id')::uuid = c.id
    ) inv_lines ON TRUE
    LEFT JOIN LATERAL (
      SELECT sum(v.allocated_amount) AS allocated FROM public.vw_accounting_payment_purpose v
       WHERE v.client_id = p_client_id AND v.collection_category_id = c.id AND v.payment_status = 'verified'
    ) paid ON TRUE
    LEFT JOIN LATERAL (
      SELECT sum(abs(te.amount)) AS disbursed
        FROM public.accounting_trust_entries te JOIN public.accounting_trust_accounts t2 ON t2.id = te.trust_account_id
       WHERE t2.client_id = p_client_id AND t2.collection_category_id = c.id AND te.amount < 0
    ) disb ON TRUE
    WHERE c.is_posting_group = FALSE AND c.lifecycle_status = 'ACTIVE'
      AND (coalesce(ta.balance, 0) <> 0 OR coalesce(inv_lines.invoiced, 0) <> 0
           OR coalesce(paid.allocated, 0) <> 0 OR coalesce(disb.disbursed, 0) <> 0)
  ) sub;
  v_result := jsonb_build_object(
    'client_id', p_client_id, 'outstanding', v_outstanding, 'collected', v_collected,
    'trust_held', v_trust_held, 'disbursed', v_disbursed, 'refunded', v_refunded,
    'recoverable', 0, 'reimbursable', 0, 'categories', coalesce(v_categories, '[]'::jsonb)
  );
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_student_financial_summary(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_trust_available_balance_by_category(
  p_client_id UUID, p_category_id UUID, p_entity_id TEXT, p_currency TEXT
) RETURNS NUMERIC LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT coalesce(ta.balance, 0) FROM public.accounting_trust_accounts ta
   WHERE ta.client_id = p_client_id AND ta.collection_category_id = p_category_id
     AND ta.entity_id = p_entity_id AND ta.currency = p_currency LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.fn_trust_available_balance_by_category(UUID, UUID, TEXT, TEXT) TO authenticated;

-- ========== 20260722120030_ar_invoice_workflow_ledger.sql ==========
ALTER TABLE public.client_invoices ADD COLUMN IF NOT EXISTS invoice_context_json JSONB;

CREATE OR REPLACE FUNCTION public.fn_student_financial_summary(p_client_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_result JSONB; v_outstanding NUMERIC(15,2) := 0; v_collected NUMERIC(15,2) := 0;
  v_trust_held NUMERIC(15,2) := 0; v_disbursed NUMERIC(15,2) := 0; v_refunded NUMERIC(15,2) := 0;
  v_categories JSONB; v_services JSONB;
BEGIN
  SELECT coalesce(sum(GREATEST(inv.amount - coalesce(inv.amount_paid, 0), 0)), 0) INTO v_outstanding
    FROM public.client_invoices inv WHERE inv.client_id = p_client_id AND inv.status NOT IN ('cancelled', 'void');
  SELECT coalesce(sum(p.amount), 0) INTO v_collected FROM public.client_invoice_payments p
    WHERE p.client_id = p_client_id AND p.payment_status = 'verified' AND coalesce(p.is_refund, FALSE) = FALSE AND p.archived_at IS NULL;
  SELECT coalesce(sum(ta.balance), 0) INTO v_trust_held FROM public.accounting_trust_accounts ta WHERE ta.client_id = p_client_id;
  SELECT coalesce(sum(abs(te.amount)), 0) INTO v_disbursed
    FROM public.accounting_trust_entries te JOIN public.accounting_trust_accounts ta ON ta.id = te.trust_account_id
    WHERE ta.client_id = p_client_id AND te.entry_type IN ('DISBURSEMENT', 'REFUND') AND te.amount < 0;
  SELECT coalesce(sum(abs(p.amount)), 0) INTO v_refunded FROM public.client_invoice_payments p
    WHERE p.client_id = p_client_id AND coalesce(p.is_refund, FALSE) = TRUE AND p.payment_status = 'verified';
  SELECT coalesce(jsonb_agg(row ORDER BY row->>'category_path'), '[]'::jsonb) INTO v_categories FROM (
    SELECT jsonb_build_object(
      'category_id', c.id, 'category_code', c.code, 'category_name', c.name, 'category_path', c.path,
      'parent_name', parent.name, 'accounting_treatment', c.accounting_treatment, 'expected_payee_name', c.expected_payee_name,
      'invoiced', coalesce(inv_lines.invoiced, 0), 'collected', coalesce(paid.allocated, 0),
      'trust_held', coalesce(ta.balance, 0), 'disbursed', coalesce(disb.disbursed, 0),
      'currency', coalesce(ta.currency, inv_lines.currency, 'INR')
    ) AS row
    FROM public.accounting_collection_categories c
    LEFT JOIN public.accounting_collection_categories parent ON parent.id = c.parent_id
    LEFT JOIN public.accounting_trust_accounts ta ON ta.collection_category_id = c.id AND ta.client_id = p_client_id
    LEFT JOIN LATERAL (
      SELECT sum((li->>'total')::numeric) AS invoiced, max(inv.currency) AS currency
        FROM public.client_invoices inv, jsonb_array_elements(coalesce(inv.line_items, '[]'::jsonb)) li
       WHERE inv.client_id = p_client_id AND inv.status NOT IN ('cancelled', 'void') AND (li->>'collection_category_id')::uuid = c.id
    ) inv_lines ON TRUE
    LEFT JOIN LATERAL (
      SELECT sum(v.allocated_amount) AS allocated FROM public.vw_accounting_payment_purpose v
       WHERE v.client_id = p_client_id AND v.collection_category_id = c.id AND v.payment_status = 'verified'
    ) paid ON TRUE
    LEFT JOIN LATERAL (
      SELECT sum(abs(te.amount)) AS disbursed
        FROM public.accounting_trust_entries te JOIN public.accounting_trust_accounts t2 ON t2.id = te.trust_account_id
       WHERE t2.client_id = p_client_id AND t2.collection_category_id = c.id AND te.amount < 0
    ) disb ON TRUE
    WHERE c.is_posting_group = FALSE AND c.lifecycle_status = 'ACTIVE'
      AND (coalesce(ta.balance, 0) <> 0 OR coalesce(inv_lines.invoiced, 0) <> 0
           OR coalesce(paid.allocated, 0) <> 0 OR coalesce(disb.disbursed, 0) <> 0)
  ) sub;
  SELECT coalesce(jsonb_agg(svc_row ORDER BY svc_row->>'service_name'), '[]'::jsonb) INTO v_services FROM (
    SELECT jsonb_build_object(
      'service_id', agg.service_id, 'service_code', agg.service_code, 'service_name', agg.service_name,
      'collection_category_id', agg.collection_category_id, 'category_name', cat.name,
      'invoiced', agg.invoiced, 'collected', coalesce(coll.collected, 0),
      'outstanding', GREATEST(agg.invoiced - coalesce(coll.collected, 0), 0),
      'trust_held', coalesce(ta.balance, 0),
      'collection_status', CASE
        WHEN agg.invoiced <= 0 AND agg.has_draft THEN 'DRAFT'
        WHEN agg.invoiced <= 0 THEN 'NOT_INVOICED'
        WHEN coalesce(coll.collected, 0) <= 0 THEN 'OUTSTANDING'
        WHEN coalesce(coll.collected, 0) < agg.invoiced - 0.01 THEN 'PARTIAL'
        WHEN coalesce(ta.balance, 0) > 0.01 THEN 'TRUST_HELD'
        ELSE 'COLLECTED' END,
      'currency', coalesce(agg.currency, 'INR')
    ) AS svc_row
    FROM (
      SELECT coalesce(li->>'service_id', li->>'service_code') AS service_id,
        max(li->>'service_code') AS service_code,
        max(coalesce(li->>'service_name', li->>'description')) AS service_name,
        max((li->>'collection_category_id')::text)::uuid AS collection_category_id,
        sum(coalesce((li->>'total')::numeric, 0)) AS invoiced,
        bool_or(inv.status = 'draft') AS has_draft,
        max(inv.currency) AS currency
      FROM public.client_invoices inv, jsonb_array_elements(coalesce(inv.line_items, '[]'::jsonb)) li
      WHERE inv.client_id = p_client_id AND inv.status NOT IN ('cancelled', 'void')
        AND coalesce(li->>'service_id', '') NOT IN ('', '__checkout_discount__')
        AND coalesce(li->>'service_code', '') <> '__checkout_discount__'
      GROUP BY coalesce(li->>'service_id', li->>'service_code')
    ) agg
    LEFT JOIN public.accounting_collection_categories cat ON cat.id = agg.collection_category_id
    LEFT JOIN LATERAL (
      SELECT sum(a.amount_allocated) AS collected FROM public.client_invoice_payment_allocations a
        JOIN public.client_invoice_payments p ON p.id = a.payment_id
       WHERE a.service_id = agg.service_id AND p.payment_status = 'verified' AND coalesce(p.is_refund, FALSE) = FALSE
    ) coll ON TRUE
    LEFT JOIN public.accounting_trust_accounts ta ON ta.collection_category_id = agg.collection_category_id AND ta.client_id = p_client_id
    WHERE agg.service_id IS NOT NULL
  ) svc_sub;
  v_result := jsonb_build_object(
    'client_id', p_client_id, 'outstanding', v_outstanding, 'collected', v_collected,
    'trust_held', v_trust_held, 'disbursed', v_disbursed, 'refunded', v_refunded,
    'recoverable', 0, 'reimbursable', 0,
    'categories', coalesce(v_categories, '[]'::jsonb), 'services', coalesce(v_services, '[]'::jsonb)
  );
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_student_financial_summary(UUID) TO authenticated;

-- ========== 20260722120040_installment_billing_controls.sql ==========
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

ALTER TABLE public.client_service_cases DROP CONSTRAINT IF EXISTS client_service_cases_billing_trigger_check;
ALTER TABLE public.client_service_cases
  ADD CONSTRAINT client_service_cases_billing_trigger_check
  CHECK (billing_trigger IS NULL OR billing_trigger IN (
    'DEPOSIT', 'POST_OFFER', 'POST_VISA', 'POST_ENROLLMENT', 'PRE_DEPARTURE', 'ON_ADMISSION', 'OTHER'
  ));

CREATE TABLE IF NOT EXISTS public.client_service_billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.client_service_cases(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'REQUESTED_SET', 'INSTITUTION_DEPOSIT_SET', 'CAP_OVERRIDE', 'TOP_UP_APPROVED', 'BILLING_TRIGGER_SET'
  )),
  amount numeric(15,2), currency text, actor_id uuid REFERENCES auth.users(id),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_service_billing_events TO authenticated;
GRANT ALL ON public.client_service_billing_events TO service_role;

CREATE INDEX IF NOT EXISTS idx_csbe_case ON public.client_service_billing_events (case_id, created_at DESC);
ALTER TABLE public.client_service_billing_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS csbe_view ON public.client_service_billing_events;
CREATE POLICY csbe_view ON public.client_service_billing_events FOR SELECT TO authenticated
  USING (public.can_view_client(auth.uid(), client_id));
DROP POLICY IF EXISTS csbe_insert ON public.client_service_billing_events;
CREATE POLICY csbe_insert ON public.client_service_billing_events FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_client(auth.uid(), client_id));

CREATE OR REPLACE FUNCTION public.fn_case_invoiced_amount(
  p_case_id uuid, p_exclude_invoice_id uuid DEFAULT NULL
) RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_client_id uuid; v_service_code text; v_sum numeric(15,2) := 0;
BEGIN
  SELECT client_id, service_code INTO v_client_id, v_service_code
    FROM public.client_service_cases WHERE id = p_case_id;
  IF v_client_id IS NULL THEN RETURN 0; END IF;
  SELECT coalesce(sum(coalesce((li->>'total')::numeric, 0)), 0) INTO v_sum
    FROM public.client_invoices inv, jsonb_array_elements(coalesce(inv.line_items, '[]'::jsonb)) li
   WHERE inv.client_id = v_client_id AND inv.status NOT IN ('cancelled', 'void')
     AND (p_exclude_invoice_id IS NULL OR inv.id IS DISTINCT FROM p_exclude_invoice_id)
     AND coalesce(li->>'service_id', '') NOT IN ('', '__checkout_discount__')
     AND coalesce(li->>'service_code', '') <> '__checkout_discount__'
     AND (
       (li ? 'case_id' AND (li->>'case_id')::uuid = p_case_id)
       OR (NOT (li ? 'case_id') OR coalesce(li->>'case_id', '') = '')
       AND coalesce(li->>'service_code', li->>'service_id', '') = v_service_code
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
  p_case_id uuid, p_exclude_invoice_id uuid DEFAULT NULL,
  p_proposed_lines jsonb DEFAULT '[]'::jsonb, p_allow_override boolean DEFAULT FALSE
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_requested numeric(15,2); v_currency text; v_invoiced numeric(15,2);
  v_proposed numeric(15,2) := 0; v_remaining numeric(15,2); v_li jsonb;
BEGIN
  SELECT requested_amount, requested_currency INTO v_requested, v_currency
    FROM public.client_service_cases WHERE id = p_case_id;
  IF v_requested IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'uncapped', true, 'requested', null,
      'invoiced', public.fn_case_invoiced_amount(p_case_id, p_exclude_invoice_id),
      'remaining_billable', null);
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
    RETURN jsonb_build_object('ok', false, 'uncapped', false,
      'requested', v_requested, 'requested_currency', v_currency,
      'invoiced', v_invoiced, 'proposed', v_proposed,
      'remaining_billable', GREATEST(v_requested - v_invoiced, 0),
      'errors', jsonb_build_array(format('Exceeds remaining billable (%s %s). Increase requested amount or Finance override.',
        GREATEST(v_requested - v_invoiced, 0), coalesce(v_currency, ''))));
  END IF;
  RETURN jsonb_build_object('ok', true, 'uncapped', false,
    'requested', v_requested, 'requested_currency', v_currency,
    'invoiced', v_invoiced, 'proposed', v_proposed, 'remaining_billable', v_remaining);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_validate_service_billing_cap(uuid, uuid, jsonb, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_student_financial_summary(p_client_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_result JSONB; v_outstanding NUMERIC(15,2) := 0; v_collected NUMERIC(15,2) := 0;
  v_trust_held NUMERIC(15,2) := 0; v_disbursed NUMERIC(15,2) := 0; v_refunded NUMERIC(15,2) := 0;
  v_categories JSONB; v_services JSONB;
BEGIN
  SELECT coalesce(sum(GREATEST(inv.amount - coalesce(inv.amount_paid, 0), 0)), 0) INTO v_outstanding
    FROM public.client_invoices inv WHERE inv.client_id = p_client_id AND inv.status NOT IN ('cancelled', 'void');
  SELECT coalesce(sum(p.amount), 0) INTO v_collected FROM public.client_invoice_payments p
    WHERE p.client_id = p_client_id AND p.payment_status = 'verified' AND coalesce(p.is_refund, FALSE) = FALSE AND p.archived_at IS NULL;
  SELECT coalesce(sum(ta.balance), 0) INTO v_trust_held FROM public.accounting_trust_accounts ta WHERE ta.client_id = p_client_id;
  SELECT coalesce(sum(abs(te.amount)), 0) INTO v_disbursed
    FROM public.accounting_trust_entries te JOIN public.accounting_trust_accounts ta ON ta.id = te.trust_account_id
    WHERE ta.client_id = p_client_id AND te.entry_type IN ('DISBURSEMENT', 'REFUND') AND te.amount < 0;
  SELECT coalesce(sum(abs(p.amount)), 0) INTO v_refunded FROM public.client_invoice_payments p
    WHERE p.client_id = p_client_id AND coalesce(p.is_refund, FALSE) = TRUE AND p.payment_status = 'verified';
  SELECT coalesce(jsonb_agg(row ORDER BY row->>'category_path'), '[]'::jsonb) INTO v_categories FROM (
    SELECT jsonb_build_object(
      'category_id', c.id, 'category_code', c.code, 'category_name', c.name, 'category_path', c.path,
      'parent_name', parent.name, 'accounting_treatment', c.accounting_treatment, 'expected_payee_name', c.expected_payee_name,
      'invoiced', coalesce(inv_lines.invoiced, 0), 'collected', coalesce(paid.allocated, 0),
      'trust_held', coalesce(ta.balance, 0), 'disbursed', coalesce(disb.disbursed, 0),
      'currency', coalesce(ta.currency, inv_lines.currency, 'INR')
    ) AS row
    FROM public.accounting_collection_categories c
    LEFT JOIN public.accounting_collection_categories parent ON parent.id = c.parent_id
    LEFT JOIN public.accounting_trust_accounts ta ON ta.collection_category_id = c.id AND ta.client_id = p_client_id
    LEFT JOIN LATERAL (
      SELECT sum((li->>'total')::numeric) AS invoiced, max(inv.currency) AS currency
        FROM public.client_invoices inv, jsonb_array_elements(coalesce(inv.line_items, '[]'::jsonb)) li
       WHERE inv.client_id = p_client_id AND inv.status NOT IN ('cancelled', 'void') AND (li->>'collection_category_id')::uuid = c.id
    ) inv_lines ON TRUE
    LEFT JOIN LATERAL (
      SELECT sum(v.allocated_amount) AS allocated FROM public.vw_accounting_payment_purpose v
       WHERE v.client_id = p_client_id AND v.collection_category_id = c.id AND v.payment_status = 'verified'
    ) paid ON TRUE
    LEFT JOIN LATERAL (
      SELECT sum(abs(te.amount)) AS disbursed
        FROM public.accounting_trust_entries te JOIN public.accounting_trust_accounts t2 ON t2.id = te.trust_account_id
       WHERE t2.client_id = p_client_id AND t2.collection_category_id = c.id AND te.amount < 0
    ) disb ON TRUE
    WHERE c.is_posting_group = FALSE AND c.lifecycle_status = 'ACTIVE'
      AND (coalesce(ta.balance, 0) <> 0 OR coalesce(inv_lines.invoiced, 0) <> 0
           OR coalesce(paid.allocated, 0) <> 0 OR coalesce(disb.disbursed, 0) <> 0)
  ) sub;
  SELECT coalesce(jsonb_agg(svc_row ORDER BY svc_row->>'service_name'), '[]'::jsonb) INTO v_services FROM (
    SELECT jsonb_build_object(
      'case_id', cs.id, 'service_id', agg.service_id, 'service_code', agg.service_code, 'service_name', agg.service_name,
      'collection_category_id', agg.collection_category_id, 'category_name', cat.name,
      'requested', cs.requested_amount, 'requested_currency', cs.requested_currency,
      'institution_required_deposit', cs.institution_required_deposit,
      'billing_trigger', cs.billing_trigger, 'institution_deposit_reference', cs.institution_deposit_reference,
      'invoiced', coalesce(case_inv.invoiced, agg.invoiced),
      'collected', coalesce(coll.collected, 0),
      'outstanding', GREATEST(coalesce(case_inv.invoiced, agg.invoiced) - coalesce(coll.collected, 0), 0),
      'remaining_billable', CASE WHEN cs.requested_amount IS NULL THEN NULL
        ELSE GREATEST(cs.requested_amount - coalesce(case_inv.invoiced, agg.invoiced), 0) END,
      'trust_held', coalesce(ta.balance, 0),
      'collection_status', CASE
        WHEN coalesce(case_inv.invoiced, agg.invoiced) <= 0 AND agg.has_draft THEN 'DRAFT'
        WHEN coalesce(case_inv.invoiced, agg.invoiced) <= 0 THEN 'NOT_INVOICED'
        WHEN coalesce(coll.collected, 0) <= 0 THEN 'OUTSTANDING'
        WHEN coalesce(coll.collected, 0) < coalesce(case_inv.invoiced, agg.invoiced) - 0.01 THEN 'PARTIAL'
        WHEN coalesce(ta.balance, 0) > 0.01 THEN 'TRUST_HELD'
        ELSE 'COLLECTED' END,
      'currency', coalesce(cs.requested_currency, agg.currency, 'INR'),
      'invoices_by_stage', coalesce(stages.rows, '[]'::jsonb)
    ) AS svc_row
    FROM public.client_service_cases cs
    JOIN (
      SELECT coalesce(li->>'service_id', li->>'service_code') AS service_id,
        max(li->>'service_code') AS service_code,
        max(coalesce(li->>'service_name', li->>'description')) AS service_name,
        max((li->>'collection_category_id')::text)::uuid AS collection_category_id,
        sum(coalesce((li->>'total')::numeric, 0)) AS invoiced,
        bool_or(inv.status = 'draft') AS has_draft, max(inv.currency) AS currency
      FROM public.client_invoices inv, jsonb_array_elements(coalesce(inv.line_items, '[]'::jsonb)) li
      WHERE inv.client_id = p_client_id AND inv.status NOT IN ('cancelled', 'void')
        AND coalesce(li->>'service_id', '') NOT IN ('', '__checkout_discount__')
        AND coalesce(li->>'service_code', '') <> '__checkout_discount__'
      GROUP BY coalesce(li->>'service_id', li->>'service_code')
    ) agg ON agg.service_code = cs.service_code OR agg.service_id = cs.service_code
    LEFT JOIN LATERAL (SELECT public.fn_case_invoiced_amount(cs.id, NULL) AS invoiced) case_inv ON TRUE
    LEFT JOIN public.accounting_collection_categories cat ON cat.id = agg.collection_category_id
    LEFT JOIN LATERAL (
      SELECT sum(a.amount_allocated) AS collected FROM public.client_invoice_payment_allocations a
        JOIN public.client_invoice_payments p ON p.id = a.payment_id
       WHERE a.service_id = agg.service_id AND p.client_id = p_client_id
         AND p.payment_status = 'verified' AND coalesce(p.is_refund, FALSE) = FALSE
    ) coll ON TRUE
    LEFT JOIN public.accounting_trust_accounts ta ON ta.collection_category_id = agg.collection_category_id AND ta.client_id = p_client_id
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(jsonb_build_object(
        'invoice_id', inv.id, 'invoice_number', inv.invoice_number,
        'billing_stage', coalesce(li->>'billing_stage', 'INSTALLMENT'),
        'amount', coalesce((li->>'total')::numeric, 0),
        'collected', coalesce(line_coll.collected, 0),
        'outstanding', GREATEST(coalesce((li->>'total')::numeric, 0) - coalesce(line_coll.collected, 0), 0),
        'status', inv.status
      ) ORDER BY inv.created_at) AS rows
      FROM public.client_invoices inv, jsonb_array_elements(coalesce(inv.line_items, '[]'::jsonb)) li
      LEFT JOIN LATERAL (
        SELECT sum(a.amount_allocated) AS collected FROM public.client_invoice_payment_allocations a
          JOIN public.client_invoice_payments p ON p.id = a.payment_id
         WHERE a.invoice_id = inv.id AND (a.line_item_key = concat('svc:', li->>'service_id') OR a.service_id = (li->>'service_id')::text)
           AND p.payment_status = 'verified' AND coalesce(p.is_refund, FALSE) = FALSE
      ) line_coll ON TRUE
      WHERE inv.client_id = p_client_id AND inv.status NOT IN ('cancelled', 'void')
        AND ((li ? 'case_id' AND (li->>'case_id')::uuid = cs.id)
             OR ((NOT (li ? 'case_id') OR coalesce(li->>'case_id', '') = '')
                 AND coalesce(li->>'service_code', li->>'service_id', '') = cs.service_code))
        AND coalesce(li->>'service_id', '') NOT IN ('', '__checkout_discount__')
    ) stages ON TRUE
    WHERE cs.client_id = p_client_id AND cs.status = 'open'
      AND (coalesce(case_inv.invoiced, 0) <> 0 OR cs.requested_amount IS NOT NULL OR coalesce(coll.collected, 0) <> 0)
  ) svc_sub;
  v_result := jsonb_build_object(
    'client_id', p_client_id, 'outstanding', v_outstanding, 'collected', v_collected,
    'trust_held', v_trust_held, 'disbursed', v_disbursed, 'refunded', v_refunded,
    'recoverable', 0, 'reimbursable', 0,
    'categories', coalesce(v_categories, '[]'::jsonb), 'services', coalesce(v_services, '[]'::jsonb)
  );
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_student_financial_summary(UUID) TO authenticated;

-- ========== 20260722120100_hr_payroll_attendance_dynamic_shift_thresholds.sql ==========
CREATE OR REPLACE FUNCTION fn_shift_scheduled_work_minutes(
  p_login time, p_logout time, p_shift_break_min int DEFAULT 0
) RETURNS numeric LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE lg numeric; lo numeric; lo_eff numeric;
BEGIN
  lg := extract(epoch FROM COALESCE(p_login, '10:00'::time)) / 60;
  lo := extract(epoch FROM COALESCE(p_logout, '19:00'::time)) / 60;
  lo_eff := fn_shift_logout_effective(lg, lo);
  RETURN greatest(0, (lo_eff - lg) - COALESCE(p_shift_break_min, 0));
END;
$$;

DROP FUNCTION IF EXISTS fn_derive_status(time, time, att_status, numeric, boolean, int, time, time);

CREATE OR REPLACE FUNCTION fn_derive_status(
  p_in time, p_out time, p_status att_status,
  p_login time DEFAULT '10:00'::time, p_logout time DEFAULT '19:00'::time,
  p_shift_break_min int DEFAULT 45, p_is_mispunch boolean DEFAULT false,
  p_actual_break_min int DEFAULT NULL,
  p_break_start time DEFAULT NULL, p_break_end time DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE mp boolean; st att_status; v_net numeric; v_full_min numeric; v_half_min numeric;
BEGIN
  IF p_status IN ('Leave', 'Sick Leave', 'Week Off', 'Holiday', 'Unauthorized Leave') THEN
    RETURN jsonb_build_object('status', p_status, 'is_mispunch', p_is_mispunch);
  END IF;
  IF p_in IS NULL AND p_out IS NULL THEN
    RETURN jsonb_build_object('status', 'Absent', 'is_mispunch', false);
  END IF;
  IF p_in IS NOT NULL AND p_out IS NULL THEN
    RETURN jsonb_build_object('status', 'Present', 'is_mispunch', false);
  END IF;
  IF p_in IS NULL AND p_out IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'Present', 'is_mispunch', true);
  END IF;
  v_full_min := fn_shift_scheduled_work_minutes(p_login, p_logout, p_shift_break_min);
  v_half_min := v_full_min / 2;
  v_net := fn_attendance_net_work_minutes(p_in, p_out, p_actual_break_min, p_break_start, p_break_end);
  mp := false; st := 'Absent';
  IF v_net IS NOT NULL AND v_full_min > 0 THEN
    IF v_net >= v_full_min THEN st := 'Present';
    ELSIF v_net >= v_half_min THEN st := 'Half Day';
    ELSE st := 'Absent';
    END IF;
  ELSIF v_net IS NOT NULL AND v_full_min <= 0 THEN
    st := 'Present';
  END IF;
  RETURN jsonb_build_object('status', st, 'is_mispunch', mp);
END;
$$;

CREATE OR REPLACE FUNCTION trg_attendance_derive() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE sh record; d jsonb; split jsonb; v_shift_id uuid; v_actual_break int;
BEGIN
  v_shift_id := fn_employee_shift_at(NEW.employee_id, NEW.work_date);
  SELECT s.* INTO sh FROM shifts s WHERE s.id = v_shift_id;
  IF sh.id IS NULL THEN
    SELECT s.* INTO sh FROM shifts s JOIN employees e ON e.shift_id = s.id WHERE e.id = NEW.employee_id;
  END IF;
  v_actual_break := fn_attendance_break_minutes(NEW.break_min, NEW.break_start, NEW.break_end);
  IF NEW.break_min IS NULL AND v_actual_break > 0 THEN NEW.break_min := v_actual_break; END IF;
  split := fn_calc_shift_hour_split(NEW.check_in, NEW.check_out, COALESCE(v_actual_break, 0)::int,
    COALESCE(sh.login_time, '10:00'::time), COALESCE(sh.logout_time, '19:00'::time));
  NEW.shift_work_min := COALESCE((split->>'shift_work_min')::int, 0);
  NEW.off_shift_min := COALESCE((split->>'off_shift_min')::int, 0);
  d := fn_derive_status(NEW.check_in, NEW.check_out, NEW.status,
    COALESCE(sh.login_time, '10:00'::time), COALESCE(sh.logout_time, '19:00'::time),
    COALESCE(sh.break_min, 0), NEW.is_mispunch, v_actual_break, NEW.break_start, NEW.break_end);
  IF NEW.status NOT IN ('Leave', 'Sick Leave', 'Week Off', 'Holiday', 'Unauthorized Leave') THEN
    NEW.status := (d->>'status')::att_status;
    NEW.is_mispunch := (d->>'is_mispunch')::boolean;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT p.oid::regprocedure AS sig FROM pg_proc p
    WHERE p.proname IN ('fn_shift_scheduled_work_minutes', 'fn_derive_status')
  LOOP EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END $$;

-- ========== 20260722120200_hr_payroll_weekly_off_automation.sql ==========
CREATE OR REPLACE FUNCTION fn_weekly_off_policy_config(p_org uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT p.config FROM policies p
      WHERE p.org_id = p_org AND p.domain = 'weekly_off' AND p.effective_from <= current_date
      ORDER BY p.effective_from DESC, p.version DESC LIMIT 1),
    '{"five_day_off_dow":[6,0],"six_day_off_dow":[0]}'::jsonb
  );
$$;

CREATE OR REPLACE FUNCTION fn_weekly_off_dow_for_work_week(p_org uuid, p_work_week text)
RETURNS int[] LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE cfg jsonb; arr jsonb; out int[] := ARRAY[]::int[]; elem jsonb;
BEGIN
  cfg := fn_weekly_off_policy_config(p_org);
  IF lower(trim(p_work_week)) = '5-day' THEN
    arr := COALESCE(cfg->'five_day_off_dow', '[6,0]'::jsonb);
  ELSE
    arr := COALESCE(cfg->'six_day_off_dow', '[0]'::jsonb);
  END IF;
  FOR elem IN SELECT * FROM jsonb_array_elements(arr) LOOP
    out := array_append(out, (elem #>> '{}')::int);
  END LOOP;
  RETURN out;
END;
$$;

CREATE OR REPLACE FUNCTION fn_employee_work_week_at(p_employee uuid, p_date date)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_shift_id uuid; v_wdpw int; v_emp_ww text;
BEGIN
  SELECT work_week::text INTO v_emp_ww FROM employees WHERE id = p_employee;
  v_shift_id := fn_employee_shift_at(p_employee, p_date);
  IF v_shift_id IS NOT NULL THEN
    SELECT working_days_per_week INTO v_wdpw FROM shifts WHERE id = v_shift_id;
    IF v_wdpw IS NOT NULL THEN
      IF v_wdpw >= 6 THEN RETURN '6-Day'; END IF;
      RETURN '5-Day';
    END IF;
  END IF;
  RETURN COALESCE(v_emp_ww, '6-Day');
END;
$$;

CREATE OR REPLACE FUNCTION fn_is_weekly_off_day(p_org uuid, p_employee uuid, p_date date)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_dow int; v_ww text; v_off int[];
BEGIN
  v_dow := EXTRACT(DOW FROM p_date)::int;
  v_ww := fn_employee_work_week_at(p_employee, p_date);
  v_off := fn_weekly_off_dow_for_work_week(p_org, v_ww);
  RETURN v_dow = ANY(v_off);
END;
$$;

CREATE OR REPLACE FUNCTION fn_employee_attendance_eligible(p_employee uuid, p_date date)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM employees e
    WHERE e.id = p_employee AND e.status NOT IN ('Terminated', 'Resigned')
      AND (e.date_of_joining IS NULL OR p_date >= e.date_of_joining)
      AND (e.exit_date IS NULL OR p_date <= e.exit_date));
$$;

CREATE OR REPLACE FUNCTION _fn_stamp_weekly_off(p_org uuid, p_employee uuid, p_date date)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_existing att_status;
BEGIN
  IF NOT fn_employee_attendance_eligible(p_employee, p_date) THEN RETURN false; END IF;
  IF NOT fn_is_weekly_off_day(p_org, p_employee, p_date) THEN RETURN false; END IF;
  SELECT status INTO v_existing FROM attendance WHERE employee_id = p_employee AND work_date = p_date;
  IF v_existing = 'Holiday' THEN RETURN false; END IF;
  IF v_existing IN ('Present', 'Half Day', 'Leave', 'Sick Leave', 'Unauthorized Leave') THEN RETURN false; END IF;
  INSERT INTO attendance (org_id, employee_id, work_date, status, is_mispunch, source)
  VALUES (p_org, p_employee, p_date, 'Week Off', false, 'system')
  ON CONFLICT (employee_id, work_date) DO UPDATE SET
    status = 'Week Off', is_mispunch = false, source = 'system'
  WHERE attendance.status NOT IN ('Holiday', 'Present', 'Half Day', 'Leave', 'Sick Leave', 'Unauthorized Leave');
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION fn_apply_weekly_offs_for_date(
  p_org uuid, p_date date, p_internal boolean DEFAULT false
) RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e record; n int := 0;
BEGIN
  IF NOT p_internal AND NOT has_perm(p_org, 'configure') AND NOT has_perm(p_org, 'manage_emp') THEN
    RAISE EXCEPTION 'Configure or manage_emp permission required';
  END IF;
  FOR e IN SELECT id FROM employees WHERE org_id = p_org AND status NOT IN ('Terminated', 'Resigned')
  LOOP IF _fn_stamp_weekly_off(p_org, e.id, p_date) THEN n := n + 1; END IF;
  END LOOP;
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION fn_apply_weekly_offs_for_range(
  p_org uuid, p_from date, p_to date,
  p_employee uuid DEFAULT NULL, p_internal boolean DEFAULT false
) RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d date; e record; n int := 0;
BEGIN
  IF p_from IS NULL OR p_to IS NULL OR p_to < p_from THEN RAISE EXCEPTION 'Invalid date range'; END IF;
  IF NOT p_internal THEN
    IF p_employee IS NOT NULL THEN
      IF current_employee_id(p_org) IS DISTINCT FROM p_employee
         AND NOT has_perm(p_org, 'configure') AND NOT has_perm(p_org, 'manage_emp') THEN
        RAISE EXCEPTION 'Not allowed to sync weekly offs for this employee';
      END IF;
    ELSIF NOT has_perm(p_org, 'configure') AND NOT has_perm(p_org, 'manage_emp') THEN
      RAISE EXCEPTION 'Configure or manage_emp permission required';
    END IF;
  END IF;
  d := p_from;
  WHILE d <= p_to LOOP
    IF p_employee IS NOT NULL THEN
      IF _fn_stamp_weekly_off(p_org, p_employee, d) THEN n := n + 1; END IF;
    ELSE
      FOR e IN SELECT id FROM employees WHERE org_id = p_org AND status NOT IN ('Terminated', 'Resigned')
      LOOP IF _fn_stamp_weekly_off(p_org, e.id, d) THEN n := n + 1; END IF;
      END LOOP;
    END IF;
    d := d + 1;
  END LOOP;
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION fn_apply_weekly_offs_for_cycle(p_org uuid, p_cycle uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record;
BEGIN
  SELECT * INTO c FROM payroll_cycles WHERE id = p_cycle;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Cycle not found'; END IF;
  IF c.org_id IS DISTINCT FROM p_org THEN RAISE EXCEPTION 'Cycle org mismatch'; END IF;
  RETURN fn_apply_weekly_offs_for_range(p_org, c.start_date, c.end_date, NULL, true);
END;
$$;

CREATE OR REPLACE FUNCTION fn_rebuild_cycle_lines(p_cycle uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c payroll_cycles; e record; v_count int := 0;
BEGIN
  SELECT * INTO c FROM payroll_cycles WHERE id = p_cycle FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Cycle not found'; END IF;
  IF c.status NOT IN ('Draft', 'Processed', 'Approved') THEN
    RAISE EXCEPTION 'Cycle % is %; cannot rebuild', c.label, c.status;
  END IF;
  PERFORM fn_apply_weekly_offs_for_cycle(c.org_id, p_cycle);
  FOR e IN SELECT id FROM employees WHERE org_id = c.org_id AND status NOT IN ('Terminated', 'Resigned')
  LOOP PERFORM fn_build_payroll_line(e.id, p_cycle); v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

INSERT INTO policies (org_id, domain, effective_from, version, config)
SELECT '00000000-0000-0000-0000-0000000000f1'::uuid, 'weekly_off', '2026-01-01'::date, 1,
  '{"five_day_off_dow":[6,0],"six_day_off_dow":[0],"note":"6=Saturday,0=Sunday"}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM policies WHERE org_id = '00000000-0000-0000-0000-0000000000f1'::uuid AND domain = 'weekly_off'
);

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT p.oid::regprocedure AS sig FROM pg_proc p
    WHERE p.proname IN (
      'fn_weekly_off_policy_config', 'fn_weekly_off_dow_for_work_week',
      'fn_employee_work_week_at', 'fn_is_weekly_off_day',
      'fn_employee_attendance_eligible', 'fn_apply_weekly_offs_for_date',
      'fn_apply_weekly_offs_for_range', 'fn_apply_weekly_offs_for_cycle',
      'fn_rebuild_cycle_lines'
    )
  LOOP EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END $$;