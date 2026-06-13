-- =====================================================================
-- HR Payroll — Phase 8: CRM Team & Roles integration
-- Pull model: list CRM staff, assign HR roles, link/import employees.
-- Run after 20260717120008_hr_payroll_demo_rls_bootstrap.sql
-- =====================================================================

-- List CRM staff with HR assignment + employee link (SECURITY DEFINER reads profiles)
CREATE OR REPLACE FUNCTION fn_list_crm_staff(p_org uuid)
RETURNS TABLE (
  staff_id          uuid,
  email             text,
  full_name         text,
  profile_status    text,
  crm_roles         text[],
  hr_role           hr_role,
  hr_assignment_id  uuid,
  scope_branch_id   uuid,
  profile_branch_id uuid,
  branch_name       text,
  employee_id       uuid,
  emp_code          text,
  employee_name     text
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (
    is_hr(p_org)
    OR has_perm(p_org, 'configure')
    OR has_perm(p_org, 'manage_emp')
  ) THEN
    RAISE EXCEPTION 'Not authorized to list CRM staff for HR';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.email,
    COALESCE(NULLIF(trim(p.full_name), ''), p.email, p.id::text),
    COALESCE(p.status, 'active'),
    COALESCE(
      array_agg(DISTINCT ur.role::text) FILTER (WHERE ur.role IS NOT NULL),
      ARRAY[]::text[]
    ),
    ra.role,
    ra.id,
    ra.scope_branch_id,
    p.branch_id,
    b.name,
    e.id,
    e.emp_code,
    e.full_name
  FROM profiles p
  LEFT JOIN user_roles ur ON ur.user_id = p.id
  LEFT JOIN role_assignments ra ON ra.staff_id = p.id AND ra.org_id = p_org
  LEFT JOIN employees e ON e.staff_id = p.id AND e.org_id = p_org
  LEFT JOIN branches b ON b.id = p.branch_id
  WHERE COALESCE(p.deleted_at, p.status) IS DISTINCT FROM 'deleted'
    AND (
      NOT EXISTS (SELECT 1 FROM user_roles ur0 WHERE ur0.user_id = p.id)
      OR EXISTS (
        SELECT 1 FROM user_roles ur0
        WHERE ur0.user_id = p.id AND ur0.role <> 'client'::app_role
      )
    )
  GROUP BY
    p.id, p.email, p.full_name, p.status, p.branch_id, b.name,
    ra.role, ra.id, ra.scope_branch_id, e.id, e.emp_code, e.full_name
  ORDER BY 3, 2;
END;
$$;

CREATE OR REPLACE FUNCTION fn_assign_hr_role(
  p_org             uuid,
  p_staff_id        uuid,
  p_role            hr_role,
  p_scope_branch_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
  v_label text;
BEGIN
  IF NOT has_perm(p_org, 'configure') THEN
    RAISE EXCEPTION 'Configure permission required to assign HR roles';
  END IF;

  INSERT INTO role_assignments (org_id, staff_id, role, scope_branch_id)
  VALUES (p_org, p_staff_id, p_role, p_scope_branch_id)
  ON CONFLICT (org_id, staff_id) DO UPDATE SET
    role = EXCLUDED.role,
    scope_branch_id = EXCLUDED.scope_branch_id
  RETURNING id INTO v_id;

  SELECT COALESCE(full_name, email, p_staff_id::text) INTO v_label
  FROM profiles WHERE id = p_staff_id;

  INSERT INTO audit_log (org_id, actor_label, action, target, new_value)
  VALUES (p_org, 'HR Admin', 'HR Role Assigned', v_label, p_role::text);

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION fn_remove_hr_role(p_org uuid, p_staff_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_label text;
BEGIN
  IF NOT has_perm(p_org, 'configure') THEN
    RAISE EXCEPTION 'Configure permission required';
  END IF;

  SELECT COALESCE(full_name, email) INTO v_label FROM profiles WHERE id = p_staff_id;

  DELETE FROM role_assignments WHERE org_id = p_org AND staff_id = p_staff_id;

  INSERT INTO audit_log (org_id, actor_label, action, target, new_value)
  VALUES (p_org, 'HR Admin', 'HR Role Removed', COALESCE(v_label, p_staff_id::text), '—');
END;
$$;

CREATE OR REPLACE FUNCTION fn_link_employee_staff(
  p_employee_id uuid,
  p_staff_id    uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org uuid;
  v_label text;
BEGIN
  SELECT org_id INTO v_org FROM employees WHERE id = p_employee_id;
  IF v_org IS NULL THEN RAISE EXCEPTION 'Employee not found'; END IF;

  IF NOT has_perm(v_org, 'manage_emp') THEN
    RAISE EXCEPTION 'Manage Emp permission required';
  END IF;

  IF p_staff_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM employees
    WHERE staff_id = p_staff_id AND org_id = v_org AND id <> p_employee_id
  ) THEN
    RAISE EXCEPTION 'This CRM login is already linked to another employee';
  END IF;

  UPDATE employees SET staff_id = p_staff_id, updated_at = now()
  WHERE id = p_employee_id;

  SELECT emp_code || ' · ' || full_name INTO v_label FROM employees WHERE id = p_employee_id;

  INSERT INTO audit_log (org_id, actor_label, action, target, new_value)
  VALUES (
    v_org, 'HR Admin', 'CRM Login Linked', v_label,
    COALESCE((SELECT email FROM profiles WHERE id = p_staff_id), 'unlinked')
  );
END;
$$;

CREATE OR REPLACE FUNCTION fn_import_crm_staff_as_employee(p_org uuid, p_staff_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  pr record;
  v_shift uuid;
  v_co uuid;
  v_code text;
  v_num int;
  v_emp uuid;
BEGIN
  IF NOT has_perm(p_org, 'manage_emp') THEN
    RAISE EXCEPTION 'Manage Emp permission required';
  END IF;

  IF EXISTS (SELECT 1 FROM employees WHERE staff_id = p_staff_id AND org_id = p_org) THEN
    RAISE EXCEPTION 'An employee record already exists for this CRM login';
  END IF;

  SELECT * INTO pr FROM profiles WHERE id = p_staff_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'CRM profile not found'; END IF;

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
    'Full-Time', '6-Day', 'On Probation',
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

CREATE OR REPLACE FUNCTION fn_sync_crm_staff_status(p_org uuid, p_staff_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  pr record;
BEGIN
  IF NOT has_perm(p_org, 'manage_emp') THEN
    RAISE EXCEPTION 'Manage Emp permission required';
  END IF;

  SELECT status, suspended_at, deleted_at INTO pr FROM profiles WHERE id = p_staff_id;
  IF NOT FOUND THEN RETURN; END IF;

  IF pr.deleted_at IS NOT NULL OR pr.status IN ('deleted', 'terminated') THEN
    UPDATE employees SET status = 'Terminated', updated_at = now()
    WHERE org_id = p_org AND staff_id = p_staff_id AND status NOT IN ('Terminated', 'Resigned');
  ELSIF pr.status = 'suspended' OR pr.suspended_at IS NOT NULL THEN
    UPDATE employees SET status = 'On Notice', updated_at = now()
    WHERE org_id = p_org AND staff_id = p_staff_id AND status = 'Confirmed';
  END IF;
END;
$$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig FROM pg_proc p
    WHERE p.proname IN (
      'fn_list_crm_staff',
      'fn_assign_hr_role',
      'fn_remove_hr_role',
      'fn_link_employee_staff',
      'fn_import_crm_staff_as_employee',
      'fn_sync_crm_staff_status'
    )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END $$;
