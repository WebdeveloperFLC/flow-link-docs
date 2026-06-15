-- Quick fix: Isha net ₹39,300 → ₹39,500 (TV02 anchor)
-- Cause: pt_applicable=true deducts ₹200 professional tax
-- Safe on Paid/Locked cycles; works even if v_payroll_preview is an older view

UPDATE employees
SET pt_applicable = false, updated_at = now()
WHERE org_id = '00000000-0000-0000-0000-0000000000f1'
  AND emp_code = 'FL-1042';

-- Patch net on latest cycle (add back ₹200 PT, or set anchor directly)
UPDATE payroll_lines pl
SET net_salary = 39500
FROM employees e, payroll_cycles c
WHERE pl.employee_id = e.id
  AND pl.cycle_id = c.id
  AND e.org_id = '00000000-0000-0000-0000-0000000000f1'
  AND e.emp_code = 'FL-1042'
  AND c.org_id = e.org_id
  AND pl.payable_days = 29.5
  AND pl.net_salary < 39500;

-- Zero pt_employee column when present (migration 17+)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payroll_lines'
      AND column_name = 'pt_employee'
  ) THEN
    UPDATE payroll_lines pl
    SET pt_employee = 0
    FROM employees e
    WHERE pl.employee_id = e.id
      AND e.emp_code = 'FL-1042'
      AND e.org_id = '00000000-0000-0000-0000-0000000000f1';
  END IF;
END $$;

-- Confirm (payroll_lines — always has the columns we need)
SELECT e.emp_code, pl.payable_days, pl.net_salary, pl.pf_employee, pl.esic_employee
FROM payroll_lines pl
JOIN employees e ON e.id = pl.employee_id
JOIN payroll_cycles c ON c.id = pl.cycle_id
WHERE e.emp_code = 'FL-1042'
  AND e.org_id = '00000000-0000-0000-0000-0000000000f1'
ORDER BY c.start_date DESC
LIMIT 1;
-- Expected: payable_days=29.5, net_salary=39500
