-- =====================================================================
-- HR Payroll — Sync payroll companies with Accounting entities (COMPANY only)
-- Removes wrong "Academic Services"; adds all IN/CA legal entities.
-- =====================================================================

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'IN',
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

DO $$
DECLARE
  v_org uuid := '00000000-0000-0000-0000-0000000000f1'::uuid;
  v_flae uuid;
BEGIN
  -- Ensure Academic Excellence exists before re-pointing employees
  INSERT INTO companies (org_id, name, legal_name, currency, country, is_active)
  SELECT v_org, 'Future Link Academic Excellence Pvt Ltd', 'Future Link Academic Excellence Pvt Ltd', 'INR', 'IN', true
  WHERE NOT EXISTS (
    SELECT 1 FROM companies WHERE org_id = v_org AND legal_name = 'Future Link Academic Excellence Pvt Ltd'
  );

  SELECT id INTO v_flae FROM companies
  WHERE org_id = v_org AND legal_name = 'Future Link Academic Excellence Pvt Ltd'
  LIMIT 1;

  UPDATE employees SET company_id = v_flae
  WHERE company_id IN (
    SELECT id FROM companies WHERE org_id = v_org AND (
      name IN ('FL Academic', 'Future Link Academic Services Private Limited')
      OR legal_name ILIKE '%Academic Services%'
    )
  );

  DELETE FROM companies WHERE org_id = v_org AND (
    name IN ('FL Academic')
    OR legal_name ILIKE '%Academic Services%'
  );

  UPDATE companies SET
    name = 'Future Link Consultants Pvt Ltd',
    legal_name = 'Future Link Consultants Pvt Ltd',
    currency = 'INR',
    country = 'IN',
    is_active = true
  WHERE org_id = v_org AND (
    name IN ('FL Pvt. Ltd.', 'Future Link Consultants Private Limited')
    OR legal_name ILIKE '%Consultants Private Limited%'
  );

  INSERT INTO companies (org_id, name, legal_name, currency, country, is_active)
  SELECT v_org, v.n, v.l, 'INR', 'IN', true
  FROM (VALUES
    ('Future Link Visa Consultants Pvt Ltd', 'Future Link Visa Consultants Pvt Ltd'),
    ('Future Link Academic Excellence Pvt Ltd', 'Future Link Academic Excellence Pvt Ltd'),
    ('Future Link System Inc', 'Future Link System Inc'),
    ('Future Way Abroad', 'Future Way Abroad')
  ) AS v(n, l)
  WHERE NOT EXISTS (
    SELECT 1 FROM companies c WHERE c.org_id = v_org AND c.legal_name = v.l
  );

  UPDATE companies SET
    name = 'Future Link Consultants Inc',
    legal_name = 'Future Link Consultants Inc',
    currency = 'CAD',
    country = 'CA',
    is_active = true
  WHERE org_id = v_org AND currency = 'CAD' AND (
    name ILIKE '%canada%' OR legal_name ILIKE '%Canada Inc%'
  );

  INSERT INTO companies (org_id, name, legal_name, currency, country, is_active)
  SELECT v_org, v.n, v.l, 'CAD', 'CA', true
  FROM (VALUES
    ('Futureway Consultants Inc', 'Futureway Consultants Inc'),
    ('Ontario Inc 2709223', 'Ontario Inc 2709223'),
    ('Future Link Consultants Inc', 'Future Link Consultants Inc')
  ) AS v(n, l)
  WHERE NOT EXISTS (
    SELECT 1 FROM companies c WHERE c.org_id = v_org AND c.legal_name = v.l
  );

  UPDATE companies SET is_active = false
  WHERE org_id = v_org
    AND legal_name NOT IN (
      'Future Link Visa Consultants Pvt Ltd',
      'Future Link Consultants Pvt Ltd',
      'Future Link Academic Excellence Pvt Ltd',
      'Future Link System Inc',
      'Future Way Abroad',
      'Futureway Consultants Inc',
      'Ontario Inc 2709223',
      'Future Link Consultants Inc'
    );
END $$;
