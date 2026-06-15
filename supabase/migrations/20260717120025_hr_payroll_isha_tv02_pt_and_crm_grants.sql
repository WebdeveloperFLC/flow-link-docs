-- HR Payroll — TV02 anchor fix + CRM team list grants
-- 1) Migration 17 defaulted pt_applicable=true → Isha net ₹39,300 not ₹39,500 (₹200 PT)
-- 2) Migration 24 replaced fn_list_crm_staff but omitted GRANT → Team & CRM tab fails

-- ---- Isha TV02: PT off for golden anchor ----
UPDATE employees
SET pt_applicable = false, updated_at = now()
WHERE org_id = '00000000-0000-0000-0000-0000000000f1'
  AND emp_code = 'FL-1042';

DO $$
DECLARE
  v_emp uuid;
  v_cycle uuid;
  v_status text;
BEGIN
  SELECT id INTO v_emp FROM employees
  WHERE org_id = '00000000-0000-0000-0000-0000000000f1' AND emp_code = 'FL-1042';
  SELECT id, status INTO v_cycle, v_status
  FROM payroll_cycles
  WHERE org_id = '00000000-0000-0000-0000-0000000000f1'
  ORDER BY start_date DESC LIMIT 1;

  IF v_emp IS NOT NULL AND v_cycle IS NOT NULL
     AND v_status IN ('Draft', 'Processed', 'Approved', 'Locked', 'Paid') THEN
    PERFORM fn_build_payroll_line(v_emp, v_cycle);
    RAISE NOTICE 'Rebuilt FL-1042 payroll line — expect net 39500';
  END IF;
END $$;

-- ---- Re-grant CRM RPCs (migration 24 gap) ----
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig FROM pg_proc p
    WHERE p.proname IN (
      'fn_list_crm_staff',
      'fn_link_employee_staff',
      'fn_hr_can_access_crm',
      'fn_get_crm_profile',
      'fn_assign_hr_role',
      'fn_remove_hr_role',
      'fn_import_crm_staff_as_employee',
      'fn_sync_crm_staff_status'
    )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END $$;
