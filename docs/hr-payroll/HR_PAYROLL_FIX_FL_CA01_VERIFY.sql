-- Quick fix: FL-CA01 not visible on Payroll Verify
-- Cause: employee exists but no payroll_lines row for the current cycle.
-- Run in Supabase SQL Editor (cycle must be Draft, Processed, or Approved).

SELECT fn_rebuild_cycle_lines(
  (SELECT id FROM payroll_cycles
   WHERE org_id = '00000000-0000-0000-0000-0000000000f1'
   ORDER BY start_date DESC LIMIT 1)
);

-- Or FL-CA01 only:
-- SELECT fn_build_payroll_line(
--   (SELECT id FROM employees WHERE emp_code = 'FL-CA01' AND org_id = '00000000-0000-0000-0000-0000000000f1'),
--   (SELECT id FROM payroll_cycles WHERE org_id = '00000000-0000-0000-0000-0000000000f1' ORDER BY start_date DESC LIMIT 1)
-- );

SELECT emp_code, net_salary, payable_days
FROM v_payroll_preview
WHERE emp_code = 'FL-CA01';
