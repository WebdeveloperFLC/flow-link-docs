-- =====================================================================
-- HR Payroll — Employment type labels + full payroll company names
-- =====================================================================

ALTER TABLE employees ALTER COLUMN employment_type DROP DEFAULT;
ALTER TABLE employees
  ALTER COLUMN employment_type TYPE text USING employment_type::text;
ALTER TABLE employees
  ALTER COLUMN employment_type SET DEFAULT 'Full time - Permanent';
ALTER TABLE employees
  ALTER COLUMN employment_type SET NOT NULL;

DROP TYPE IF EXISTS employment_type;

UPDATE employees SET employment_type = CASE employment_type
  WHEN 'Full-Time' THEN 'Full time - Permanent'
  WHEN 'Part-Time' THEN 'Part time - Permanent'
  WHEN 'Temporary' THEN 'Part time - Temporary'
  WHEN 'Intern' THEN 'Interns'
  WHEN 'Contract' THEN 'Contract'
  ELSE employment_type
END;

UPDATE companies SET
  legal_name = 'Future Link Consultants Private Limited'
WHERE org_id = '00000000-0000-0000-0000-0000000000f1'::uuid
  AND name IN ('FL Pvt. Ltd.', 'Future Link Consultants Private Limited');

UPDATE companies SET
  legal_name = 'Future Link Academic Services Private Limited'
WHERE org_id = '00000000-0000-0000-0000-0000000000f1'::uuid
  AND name IN ('FL Academic', 'Future Link Academic Services Private Limited');

UPDATE companies SET
  legal_name = COALESCE(NULLIF(trim(legal_name), ''), 'Future Link Consultants Canada Inc.')
WHERE org_id = '00000000-0000-0000-0000-0000000000f1'::uuid
  AND currency = 'CAD'
  AND (legal_name IS NULL OR legal_name = name OR name ILIKE '%canada%');

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
    'Full time - Permanent', '6-Day', 'On Probation',
    0, 0, 0, 1600, 0, true
  ) RETURNING * INTO v_emp;

  INSERT INTO role_assignments (org_id, staff_id, role)
  VALUES (p_org, v_staff, 'Employee'::hr_role)
  ON CONFLICT (org_id, staff_id) DO NOTHING;

  RETURN v_emp;
END;
$$;

CREATE OR REPLACE FUNCTION fn_import_crm_staff_as_employee(p_org uuid, p_staff_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  pr record;
  v_emp uuid;
  v_co uuid;
  v_shift uuid;
  v_code text;
  v_num int;
BEGIN
  SELECT * INTO pr FROM profiles WHERE id = p_staff_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CRM profile not found';
  END IF;

  SELECT id INTO v_emp FROM employees WHERE staff_id = p_staff_id AND org_id = p_org;
  IF v_emp IS NOT NULL THEN
    RETURN v_emp;
  END IF;

  SELECT id INTO v_co FROM companies WHERE org_id = p_org ORDER BY created_at LIMIT 1;
  SELECT id INTO v_shift FROM shifts WHERE org_id = p_org ORDER BY created_at LIMIT 1;

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
    p_org, p_staff_id, v_code,
    COALESCE(NULLIF(trim(pr.full_name), ''), split_part(pr.email, '@', 1), 'New Employee'),
    pr.email, pr.phone, pr.branch_id,
    COALESCE(NULLIF(trim(pr.designation), ''), 'Staff'),
    'General',
    v_co, v_shift,
    'Full time - Permanent', '6-Day', 'On Probation',
    0, 0, 0, 1600, 0, true
  ) RETURNING id INTO v_emp;

  INSERT INTO role_assignments (org_id, staff_id, role)
  VALUES (p_org, p_staff_id, 'Employee'::hr_role)
  ON CONFLICT (org_id, staff_id) DO NOTHING;

  INSERT INTO audit_log (org_id, actor_label, action, target, new_value)
  VALUES (p_org, 'HR Admin', 'Imported from CRM', v_code, COALESCE(pr.email, pr.full_name));

  RETURN v_emp;
END;
$$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig FROM pg_proc p
    WHERE p.proname IN ('fn_ensure_my_employee_profile', 'fn_import_crm_staff_as_employee')
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END $$;
