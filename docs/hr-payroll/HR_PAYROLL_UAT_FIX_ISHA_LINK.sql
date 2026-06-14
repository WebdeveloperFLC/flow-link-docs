-- HR Payroll UAT — link Isha (FL-1042) to a CRM admin for ESS / punch tests
-- Run once in Supabase SQL Editor when HR_PAYROLL_UAT_VERIFY roster shows crm_linked=false for FL-1042
-- Safe: skips if Isha already linked; picks first admin not linked to another employee in demo org

DO $$
DECLARE
  v_org   uuid := '00000000-0000-0000-0000-0000000000f1';
  v_isha  uuid;
  v_staff uuid;
BEGIN
  SELECT id INTO v_isha
  FROM employees
  WHERE org_id = v_org AND emp_code = 'FL-1042';

  IF v_isha IS NULL THEN
    RAISE NOTICE 'FL-1042 not found — apply demo seed migrations first';
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM employees WHERE id = v_isha AND staff_id IS NOT NULL) THEN
    RAISE NOTICE 'FL-1042 already linked — no change';
    RETURN;
  END IF;

  -- Prefer CRM admin not already tied to another employee in this org
  SELECT ur.user_id INTO v_staff
  FROM public.user_roles ur
  WHERE ur.role = 'admin'::public.app_role
    AND NOT EXISTS (
      SELECT 1 FROM employees e
      WHERE e.org_id = v_org
        AND e.staff_id = ur.user_id
        AND e.id <> v_isha
    )
  ORDER BY ur.user_id
  LIMIT 1;

  IF v_staff IS NULL THEN
    RAISE NOTICE 'No free admin login — link manually: /hr/employees → Isha → CRM login';
    RETURN;
  END IF;

  UPDATE employees
  SET staff_id = v_staff, updated_at = now()
  WHERE id = v_isha;

  INSERT INTO role_assignments (org_id, staff_id, role)
  VALUES (v_org, v_staff, 'Employee'::hr_role)
  ON CONFLICT (org_id, staff_id) DO NOTHING;

  RAISE NOTICE 'Linked FL-1042 to staff_id %', v_staff;
END $$;

-- Confirm
SELECT emp_code, full_name, staff_id IS NOT NULL AS crm_linked,
       (SELECT email FROM profiles WHERE id = employees.staff_id) AS linked_login
FROM employees
WHERE org_id = '00000000-0000-0000-0000-0000000000f1'
  AND emp_code IN ('FL-1042', 'FL-1048', 'FL-1049')
ORDER BY emp_code;
