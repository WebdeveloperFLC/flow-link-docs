-- Quick fix: Isha net ₹39,300 → ₹39,500 (TV02 anchor)
-- Cause: pt_applicable=true deducts ₹200 professional tax
-- Run in Supabase SQL Editor, then refresh Payroll Verify

UPDATE employees
SET pt_applicable = false, updated_at = now()
WHERE org_id = '00000000-0000-0000-0000-0000000000f1'
  AND emp_code = 'FL-1042';

SELECT fn_build_payroll_line(
  (SELECT id FROM employees WHERE emp_code = 'FL-1042' AND org_id = '00000000-0000-0000-0000-0000000000f1'),
  (SELECT id FROM payroll_cycles WHERE org_id = '00000000-0000-0000-0000-0000000000f1' ORDER BY start_date DESC LIMIT 1)
);

-- Confirm
SELECT emp_code, payable_days, net_salary, pt_employee
FROM v_payroll_preview
WHERE emp_code = 'FL-1042';
-- Expected: payable_days=29.5, net_salary=39500, pt_employee=0
