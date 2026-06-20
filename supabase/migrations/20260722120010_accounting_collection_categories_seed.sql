-- =====================================================================
-- R1 — Seed collection category tree + COA roles (master records, not code)
-- =====================================================================

-- Additional COA for new categories
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

-- Helper: insert category and return id
CREATE OR REPLACE FUNCTION public._r1_seed_category(
  p_code TEXT,
  p_name TEXT,
  p_parent_id UUID,
  p_is_group BOOLEAN,
  p_treatment TEXT,
  p_trust BOOLEAN,
  p_disburse BOOLEAN,
  p_role TEXT,
  p_liability TEXT,
  p_revenue TEXT DEFAULT NULL,
  p_payee_type TEXT DEFAULT NULL,
  p_expected_payee TEXT DEFAULT NULL,
  p_order INT DEFAULT 0
) RETURNS UUID
LANGUAGE plpgsql AS $$
DECLARE
  v_id UUID;
  v_path TEXT;
  v_depth INT;
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
    CASE WHEN p_trust THEN p_role ELSE NULL END,
    p_revenue,
    p_payee_type, p_expected_payee,
    CASE WHEN p_treatment = 'REVENUE' THEN 'EXCLUSIVE' ELSE 'EXEMPT' END,
    'INR'
  )
  ON CONFLICT (code, entity_id) DO UPDATE SET
    name = EXCLUDED.name,
    path = EXCLUDED.path,
    depth = EXCLUDED.depth,
    updated_at = now()
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
      role_key = EXCLUDED.role_key,
      updated_at = now();
  END IF;

  RETURN v_id;
END;
$$;

DO $$
DECLARE
  v_rev UUID;
  v_tp UUID;
  v_test UUID;
  v_cred UUID;
BEGIN
  -- Revenue group
  v_rev := public._r1_seed_category(
    'FUTURE_LINK_REVENUE', 'Future Link Revenue', NULL, TRUE,
    'REVENUE', FALSE, FALSE, NULL, NULL, NULL, NULL, NULL, 10
  );
  PERFORM public._r1_seed_category(
    'SERVICE_FEE', 'Future Link Service Fee', v_rev, FALSE,
    'REVENUE', FALSE, FALSE, 'REV_CAT_SERVICE_FEE', NULL, '4201', NULL, 'Future Link', 11
  );
  PERFORM public._r1_seed_category(
    'COACHING_FEE', 'Coaching Fee', v_rev, FALSE,
    'REVENUE', FALSE, FALSE, 'REV_CAT_COACHING', NULL, '4201', NULL, 'Future Link', 12
  );

  -- Third party group
  v_tp := public._r1_seed_category(
    'THIRD_PARTY', 'Third Party Collections', NULL, TRUE,
    'THIRD_PARTY', FALSE, FALSE, NULL, NULL, NULL, NULL, NULL, 20
  );

  PERFORM public._r1_seed_category(
    'TUITION', 'Tuition', v_tp, FALSE,
    'INSTITUTION_RELATED', TRUE, TRUE, 'INST_CAT_TUITION', '2421', NULL, 'INSTITUTION', NULL, 21
  );
  PERFORM public._r1_seed_category(
    'APPLICATION_FEE', 'Application Fee', v_tp, FALSE,
    'THIRD_PARTY', TRUE, TRUE, 'TRUST_CAT_APPLICATION', '2403', NULL, 'INSTITUTION', NULL, 22
  );

  v_test := public._r1_seed_category(
    'TEST_FEE', 'Test Fee', v_tp, TRUE,
    'THIRD_PARTY', FALSE, FALSE, 'TRUST_CAT_TEST_FEE', '2409', NULL, NULL, NULL, 30
  );
  PERFORM public._r1_seed_category(
    'IELTS', 'IELTS', v_test, FALSE,
    'THIRD_PARTY', TRUE, TRUE, 'TRUST_CAT_IELTS', '2410', NULL, 'VENDOR', 'IDP / British Council', 31
  );
  PERFORM public._r1_seed_category(
    'PTE', 'PTE', v_test, FALSE,
    'THIRD_PARTY', TRUE, TRUE, 'TRUST_CAT_TEST_FEE', '2409', NULL, 'VENDOR', 'Pearson', 32
  );
  PERFORM public._r1_seed_category(
    'TOEFL', 'TOEFL', v_test, FALSE,
    'THIRD_PARTY', TRUE, TRUE, 'TRUST_CAT_TEST_FEE', '2409', NULL, 'VENDOR', 'ETS', 33
  );

  PERFORM public._r1_seed_category(
    'INSURANCE', 'Insurance', v_tp, FALSE,
    'THIRD_PARTY', TRUE, TRUE, 'TRUST_CAT_INSURANCE', '2408', NULL, 'INSURER', 'GuardMe', 40
  );
  PERFORM public._r1_seed_category(
    'VISA_FEE', 'Visa Fee', v_tp, FALSE,
    'THIRD_PARTY', TRUE, TRUE, 'TRUST_EMBASSY', '2402', NULL, 'GOVERNMENT', 'IRCC', 41
  );
  PERFORM public._r1_seed_category(
    'BIOMETRIC_FEE', 'Biometric Fee', v_tp, FALSE,
    'THIRD_PARTY', TRUE, TRUE, 'TRUST_CAT_BIOMETRICS', '2406', NULL, 'VENDOR', 'VFS Global', 42
  );
  PERFORM public._r1_seed_category(
    'VFS_FEE', 'VFS Fee', v_tp, FALSE,
    'THIRD_PARTY', TRUE, TRUE, 'TRUST_CAT_VFS', '2416', NULL, 'VENDOR', 'VFS Global', 43
  );
  PERFORM public._r1_seed_category(
    'SEVIS_FEE', 'SEVIS Fee', v_tp, FALSE,
    'THIRD_PARTY', TRUE, TRUE, 'TRUST_CAT_SEVIS', '2417', NULL, 'GOVERNMENT', 'US Government', 44
  );
  PERFORM public._r1_seed_category(
    'MEDICAL', 'Medical', v_tp, FALSE,
    'THIRD_PARTY', TRUE, TRUE, 'TRUST_CAT_MEDICAL', '2407', NULL, 'VENDOR', NULL, 45
  );
  PERFORM public._r1_seed_category(
    'COURIER', 'Courier', v_tp, FALSE,
    'THIRD_PARTY', TRUE, TRUE, 'TRUST_CAT_COURIER', '2412', NULL, 'VENDOR', NULL, 46
  );
  PERFORM public._r1_seed_category(
    'TRANSLATION', 'Translation', v_tp, FALSE,
    'THIRD_PARTY', TRUE, TRUE, 'TRUST_CAT_TRANSLATION', '2413', NULL, 'VENDOR', NULL, 47
  );

  v_cred := public._r1_seed_category(
    'CREDENTIAL_ASSESSMENT', 'Credential Assessment', v_tp, TRUE,
    'THIRD_PARTY', FALSE, FALSE, 'TRUST_CAT_CREDENTIAL', '2411', NULL, NULL, NULL, 50
  );
  PERFORM public._r1_seed_category(
    'WES', 'WES', v_cred, FALSE,
    'THIRD_PARTY', TRUE, TRUE, 'TRUST_CAT_CREDENTIAL', '2411', NULL, 'VENDOR', 'WES', 51
  );
  PERFORM public._r1_seed_category(
    'IQAS', 'IQAS', v_cred, FALSE,
    'THIRD_PARTY', TRUE, TRUE, 'TRUST_CAT_CREDENTIAL', '2411', NULL, 'VENDOR', 'IQAS', 52
  );

  PERFORM public._r1_seed_category(
    'GIC', 'GIC', v_tp, FALSE,
    'THIRD_PARTY', TRUE, TRUE, 'TRUST_CAT_GIC', '2404', NULL, 'INSTITUTION', NULL, 55
  );
  PERFORM public._r1_seed_category(
    'ACCOMMODATION_DEPOSIT', 'Accommodation Deposit', v_tp, FALSE,
    'THIRD_PARTY', TRUE, TRUE, 'TRUST_CAT_ACCOMMODATION', '2418', NULL, 'VENDOR', NULL, 56
  );
  PERFORM public._r1_seed_category(
    'AIRPORT_PICKUP', 'Airport Pickup', v_tp, FALSE,
    'THIRD_PARTY', TRUE, TRUE, 'TRUST_CAT_AIRPORT_PICKUP', '2419', NULL, 'VENDOR', NULL, 57
  );
  PERFORM public._r1_seed_category(
    'AIR_TICKET', 'Air Ticket', v_tp, FALSE,
    'THIRD_PARTY', TRUE, TRUE, 'TRUST_CAT_AIR_TICKET', '2414', NULL, 'VENDOR', NULL, 58
  );
  PERFORM public._r1_seed_category(
    'EMBASSY_FEE', 'Embassy Fee', v_tp, FALSE,
    'THIRD_PARTY', TRUE, TRUE, 'TRUST_EMBASSY', '2402', NULL, 'GOVERNMENT', NULL, 59
  );
  PERFORM public._r1_seed_category(
    'DOCUMENT_ATTESTATION', 'Document Attestation', v_tp, FALSE,
    'THIRD_PARTY', TRUE, TRUE, 'TRUST_CAT_OTHER', '2405', NULL, 'VENDOR', NULL, 60
  );
  PERFORM public._r1_seed_category(
    'POLICE_CLEARANCE', 'Police Clearance', v_tp, FALSE,
    'THIRD_PARTY', TRUE, TRUE, 'TRUST_CAT_MEDICAL', '2407', NULL, 'GOVERNMENT', NULL, 61
  );
  PERFORM public._r1_seed_category(
    'UNIVERSITY_DEPOSIT', 'University Deposit', v_tp, FALSE,
    'THIRD_PARTY', TRUE, TRUE, 'TRUST_CAT_UNIV_DEPOSIT', '2415', NULL, 'INSTITUTION', NULL, 62
  );
  PERFORM public._r1_seed_category(
    'OTHER', 'Other', v_tp, FALSE,
    'THIRD_PARTY', TRUE, TRUE, 'TRUST_CAT_OTHER', '2405', NULL, 'OTHER', NULL, 99
  );

  -- Map legacy role keys on existing categories
  UPDATE public.accounting_collection_categories SET default_trust_role_key = 'TRUST_TUITION'
    WHERE code = 'TUITION' AND default_trust_role_key IS NULL;
END;
$$;

-- Legacy role aliases → category (for backfill)
UPDATE public.accounting_collection_categories c SET default_trust_role_key = m.role
FROM (VALUES
  ('APPLICATION_FEE', 'TRUST_APPLICATION'),
  ('VISA_FEE', 'TRUST_EMBASSY'),
  ('EMBASSY_FEE', 'TRUST_EMBASSY'),
  ('BIOMETRIC_FEE', 'TRUST_BIOMETRICS'),
  ('GIC', 'TRUST_GIC'),
  ('MEDICAL', 'TRUST_MEDICAL'),
  ('POLICE_CLEARANCE', 'TRUST_MEDICAL'),
  ('DOCUMENT_ATTESTATION', 'TRUST_OTHER'),
  ('OTHER', 'TRUST_OTHER')
) AS m(code, role)
WHERE c.code = m.code;

-- Sync legacy TRUST_* roles on categories that use TRUST_CAT_* in seed
UPDATE public.accounting_collection_category_coa co
SET role_key = c.default_trust_role_key
FROM public.accounting_collection_categories c
WHERE co.category_id = c.id AND c.default_trust_role_key LIKE 'TRUST_%';

DROP FUNCTION IF EXISTS public._r1_seed_category(TEXT, TEXT, UUID, BOOLEAN, TEXT, BOOLEAN, BOOLEAN, TEXT, TEXT, TEXT, TEXT, TEXT, INT);
