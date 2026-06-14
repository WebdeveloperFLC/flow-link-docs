-- =====================================================================
-- HR Payroll — UAT bootstrap: link Isha (FL-1042) to free CRM admin
-- Run after 20260717120020_hr_payroll_canada_engine.sql
-- Idempotent: safe to re-run on staging after CRM staff imports (FL-1048+).
-- =====================================================================

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
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM employees WHERE id = v_isha AND staff_id IS NOT NULL) THEN
    RETURN;
  END IF;

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
    RETURN;
  END IF;

  UPDATE employees
  SET staff_id = v_staff, updated_at = now()
  WHERE id = v_isha;

  INSERT INTO role_assignments (org_id, staff_id, role)
  VALUES (v_org, v_staff, 'Employee'::hr_role)
  ON CONFLICT (org_id, staff_id) DO NOTHING;
END $$;
