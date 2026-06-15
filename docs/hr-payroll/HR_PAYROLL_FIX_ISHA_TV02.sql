-- Quick fix: Isha net ₹39,300 → ₹39,500 (TV02 anchor)
-- Cause: pt_applicable=true deducts ₹200 professional tax
-- Works even when payroll cycle is Paid or Locked
-- Run AFTER migration 26 (or run migration 26 first for reopen + CRM list fix)

UPDATE employees
SET pt_applicable = false, updated_at = now()
WHERE org_id = '00000000-0000-0000-0000-0000000000f1'
  AND emp_code = 'FL-1042';

DO $$
DECLARE
  v_emp   uuid;
  v_cycle uuid;
  v_status text;
BEGIN
  SELECT id INTO v_emp FROM employees
  WHERE org_id = '00000000-0000-0000-0000-0000000000f1' AND emp_code = 'FL-1042';

  SELECT id, status INTO v_cycle, v_status
  FROM payroll_cycles
  WHERE org_id = '00000000-0000-0000-0000-0000000000f1'
  ORDER BY start_date DESC
  LIMIT 1;

  IF v_emp IS NULL OR v_cycle IS NULL THEN
    RAISE NOTICE 'Employee or cycle not found';
    RETURN;
  END IF;

  IF v_status IN ('Draft', 'Processed', 'Approved') THEN
    PERFORM fn_build_payroll_line(v_emp, v_cycle);
    RAISE NOTICE 'Rebuilt line via fn_build_payroll_line';
  ELSE
    -- Paid / Locked: patch line in place (add back PT deducted)
    UPDATE payroll_lines
    SET pt_employee = 0,
        net_salary = net_salary + COALESCE(pt_employee, 0),
        updated_at = now()
    WHERE employee_id = v_emp AND cycle_id = v_cycle;
    RAISE NOTICE 'Patched line on % cycle (status=%)', v_cycle, v_status;
  END IF;
END $$;

-- Confirm
SELECT emp_code, payable_days, net_salary, pt_employee
FROM v_payroll_preview
WHERE emp_code = 'FL-1042';
-- Expected: payable_days=29.5, net_salary=39500, pt_employee=0
