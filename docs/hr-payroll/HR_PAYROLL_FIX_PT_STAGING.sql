-- One-shot staging fix: add pt_employee column + view, then apply ₹200 PT for all India staff
-- Run this BEFORE HR_PAYROLL_UAT_VERIFY.sql if you see:
--   ERROR: column "pt_employee" does not exist
--
-- Safe to re-run (idempotent).

-- 1) Columns from migration 17
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS pt_applicable boolean NOT NULL DEFAULT true;

ALTER TABLE payroll_lines
  ADD COLUMN IF NOT EXISTS pt_employee numeric(12,2) NOT NULL DEFAULT 0;

-- 2) Recreate preview view with pt_employee
DROP VIEW IF EXISTS v_payroll_preview;
CREATE VIEW v_payroll_preview
WITH (security_invoker = true) AS
SELECT
  pl.id, pl.org_id, pl.cycle_id, pl.employee_id,
  e.emp_code, e.full_name, e.designation, e.department,
  co.name AS company_name, br.name AS branch_name,
  cy.label AS cycle_label, cy.start_date AS cycle_start, cy.end_date AS cycle_end, cy.status AS cycle_status,
  pl.payroll_days, pl.monthly_gross, pl.basic,
  pl.leaves_taken, pl.paid_leaves, pl.comp_off,
  pl.late_count, pl.mispunch_count, pl.ul_count, pl.sandwich_count, pl.unpaid_training,
  pl.ot_minutes, pl.ot_pay,
  pl.late_deduction, pl.mispunch_deduction,
  pl.payable_days, pl.daily_rate, pl.gross_earned,
  pl.incentive, pl.bonus, pl.pf_employee, pl.esic_employee, pl.pt_employee, pl.net_salary,
  pl.is_overridden, pl.created_at
FROM payroll_lines pl
JOIN employees e ON e.id = pl.employee_id
JOIN payroll_cycles cy ON cy.id = pl.cycle_id
LEFT JOIN companies co ON co.id = e.company_id
LEFT JOIN branches br ON br.id = e.branch_id;

GRANT SELECT ON v_payroll_preview TO authenticated;

-- 3) PT policy (default ₹200)
INSERT INTO policies (org_id, domain, effective_from, version, config)
SELECT
  '00000000-0000-0000-0000-0000000000f1'::uuid,
  'professional_tax',
  '2026-01-01'::date,
  COALESCE((SELECT max(version) FROM policies WHERE org_id = '00000000-0000-0000-0000-0000000000f1' AND domain = 'professional_tax'), 0) + 1,
  '{"default_amount":200,"mandatory_below_gross":null}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM policies
  WHERE org_id = '00000000-0000-0000-0000-0000000000f1'::uuid
    AND domain = 'professional_tax'
);

-- 4) India: PT on; Canada: PT off
UPDATE employees
SET pt_applicable = true, updated_at = now()
WHERE org_id = '00000000-0000-0000-0000-0000000000f1'
  AND COALESCE(upper(payroll_country), 'IN') <> 'CA'
  AND COALESCE(upper(salary_currency), 'INR') <> 'CAD';

UPDATE employees
SET pt_applicable = false, updated_at = now()
WHERE org_id = '00000000-0000-0000-0000-0000000000f1'
  AND (upper(payroll_country) = 'CA' OR upper(salary_currency) = 'CAD');

-- 5) Patch latest cycle lines
DO $$
DECLARE
  v_org uuid := '00000000-0000-0000-0000-0000000000f1';
  v_cycle uuid;
  v_pt numeric;
  r record;
BEGIN
  SELECT id INTO v_cycle
  FROM payroll_cycles
  WHERE org_id = v_org
  ORDER BY start_date DESC
  LIMIT 1;

  IF v_cycle IS NULL THEN RETURN; END IF;

  v_pt := COALESCE(
    (SELECT (config->>'default_amount')::numeric
     FROM policies
     WHERE org_id = v_org AND domain = 'professional_tax'
     ORDER BY version DESC
     LIMIT 1),
    200
  );

  FOR r IN
    SELECT pl.id, pl.net_salary, pl.pt_employee
    FROM payroll_lines pl
    JOIN employees e ON e.id = pl.employee_id
    WHERE pl.cycle_id = v_cycle
      AND e.org_id = v_org
      AND e.pt_applicable = true
      AND COALESCE(upper(e.payroll_country), 'IN') <> 'CA'
  LOOP
    IF COALESCE(r.pt_employee, 0) <> v_pt THEN
      UPDATE payroll_lines
      SET pt_employee = v_pt,
          net_salary = r.net_salary + COALESCE(r.pt_employee, 0) - v_pt
      WHERE id = r.id;
    END IF;
  END LOOP;
END $$;

-- 6) Confirm Isha anchor
SELECT 'TV02A_isha' AS check_name,
       concat('payable=', payable_days, ' pt=', pt_employee, ' net=', net_salary) AS actual,
       'payable=29.5 pt=200 net=39300' AS expected,
       CASE
         WHEN payable_days = 29.5 AND pt_employee = 200 AND net_salary = 39300 THEN 'PASS'
         ELSE 'FAIL'
       END AS status
FROM v_payroll_preview
WHERE emp_code = 'FL-1042';
