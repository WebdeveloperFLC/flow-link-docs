-- HR Payroll — backfill FL-CA01 payroll line on active demo cycle
-- Run after 20260717120020 (Canada seed) if FL-CA01 missing from Verify register
-- Safe to re-run (fn_build_payroll_line upserts)

DO $$
DECLARE
  v_org   uuid := '00000000-0000-0000-0000-0000000000f1';
  v_emp   uuid;
  v_cycle uuid;
  v_status text;
BEGIN
  SELECT id INTO v_emp FROM employees WHERE org_id = v_org AND emp_code = 'FL-CA01';
  IF v_emp IS NULL THEN
    RAISE NOTICE 'FL-CA01 not found — run migration 20 first';
    RETURN;
  END IF;

  SELECT id, status INTO v_cycle, v_status
  FROM payroll_cycles
  WHERE org_id = v_org
  ORDER BY start_date DESC
  LIMIT 1;

  IF v_cycle IS NULL THEN
    RAISE NOTICE 'No payroll cycle for demo org';
    RETURN;
  END IF;

  IF v_status NOT IN ('Draft', 'Processed', 'Approved') THEN
    RAISE NOTICE 'Cycle is % — reopen to Draft before rebuild', v_status;
    RETURN;
  END IF;

  PERFORM fn_build_payroll_line(v_emp, v_cycle);
  RAISE NOTICE 'Built payroll line for FL-CA01 on cycle %', v_cycle;
END $$;

-- Confirm
SELECT e.emp_code, e.full_name, pl.payable_days, pl.net_salary, b.name AS branch
FROM employees e
LEFT JOIN payroll_lines pl ON pl.employee_id = e.id
  AND pl.cycle_id = (
    SELECT id FROM payroll_cycles
    WHERE org_id = '00000000-0000-0000-0000-0000000000f1'
    ORDER BY start_date DESC LIMIT 1
  )
LEFT JOIN branches b ON b.id = e.branch_id
WHERE e.org_id = '00000000-0000-0000-0000-0000000000f1'
  AND e.emp_code = 'FL-CA01';
