-- Quick fix: Team & CRM tab "list unavailable"
-- Cause: fn_list_crm_staff missing EXECUTE grant after migration 24
-- Run migration 25 OR this script in Supabase SQL Editor

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig FROM pg_proc p
    WHERE p.proname IN (
      'fn_list_crm_staff',
      'fn_link_employee_staff',
      'fn_hr_can_access_crm',
      'fn_get_crm_profile'
    )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END $$;

-- Smoke test (should return rows, not permission error)
SELECT staff_id, email, full_name, emp_code
FROM fn_list_crm_staff('00000000-0000-0000-0000-0000000000f1')
LIMIT 5;
