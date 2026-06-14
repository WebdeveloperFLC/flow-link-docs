-- =====================================================================
-- HR Payroll — Self-service ESS profile (workforce admins & staff)
-- Run after 20260717120015_hr_payroll_punch_work_date.sql
-- =====================================================================

CREATE OR REPLACE FUNCTION fn_ensure_my_employee_profile(p_org uuid)
RETURNS employees LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_staff uuid := auth.uid();
  v_emp employees;
  pr record;
  v_shift uuid;
  v_co uuid;
  v_code text;
  v_num int;
BEGIN
  IF v_staff IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_emp FROM employees WHERE staff_id = v_staff AND org_id = p_org;
  IF FOUND THEN
    RETURN v_emp;
  END IF;

  SELECT * INTO pr FROM profiles WHERE id = v_staff;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CRM profile not found for your login';
  END IF;

  SELECT id INTO v_co FROM companies WHERE org_id = p_org ORDER BY created_at LIMIT 1;
  SELECT id INTO v_shift FROM shifts WHERE org_id = p_org ORDER BY created_at LIMIT 1;
  IF v_shift IS NULL THEN
    RAISE EXCEPTION 'No shift configured — apply HR migrations first';
  END IF;

  SELECT emp_code INTO v_code FROM employees
  WHERE org_id = p_org ORDER BY emp_code DESC LIMIT 1;
  v_num := COALESCE(NULLIF(regexp_replace(v_code, '\D', '', 'g'), '')::int, 1047) + 1;
  v_code := 'FL-' || v_num;

  INSERT INTO employees (
    org_id, staff_id, emp_code, full_name, email, mobile, branch_id,
    designation, department, company_id, shift_id,
    employment_type, work_week, status,
    monthly_gross, basic, hra, conveyance, special_allow, pf_applicable
  ) VALUES (
    p_org, v_staff, v_code,
    COALESCE(NULLIF(trim(pr.full_name), ''), split_part(pr.email, '@', 1), 'Staff'),
    pr.email, pr.phone, pr.branch_id,
    COALESCE(NULLIF(trim(pr.designation), ''), 'Staff'),
    'General',
    v_co, v_shift,
    'Full-Time', '6-Day', 'On Probation',
    0, 0, 0, 1600, 0, true
  ) RETURNING * INTO v_emp;

  INSERT INTO role_assignments (org_id, staff_id, role)
  VALUES (p_org, v_staff, 'Employee'::hr_role)
  ON CONFLICT (org_id, staff_id) DO NOTHING;

  INSERT INTO audit_log (org_id, actor_label, action, target, new_value)
  VALUES (
    p_org, 'ESS', 'Self profile created',
    v_code, COALESCE(pr.email, pr.full_name)
  );

  RETURN v_emp;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_ensure_my_employee_profile(uuid) TO authenticated;
