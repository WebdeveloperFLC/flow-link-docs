-- =====================================================================
-- WTM v1.0 Smoke Test — P1 defect fixes (no payroll / leave / WPMS changes)
-- Ensures shift resolver + CRM team RPC grants survive partial Lovable publish.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Shift resolver (required by fn_wtm_clock_in / WRE)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employee_shift_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL,
  employee_id     uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  shift_id        uuid NOT NULL REFERENCES shifts(id) ON DELETE RESTRICT,
  effective_from  date NOT NULL,
  effective_to    date,
  changed_by      uuid,
  change_reason   text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE INDEX IF NOT EXISTS idx_employee_shift_history_emp_dates
  ON employee_shift_history (employee_id, effective_from DESC);

ALTER TABLE employee_shift_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS read_employee_shift_history ON employee_shift_history;
CREATE POLICY read_employee_shift_history ON employee_shift_history FOR SELECT
  USING (current_hr_role(org_id) IS NOT NULL OR current_employee_id(org_id) IS NOT NULL);

DROP POLICY IF EXISTS write_employee_shift_history ON employee_shift_history;
CREATE POLICY write_employee_shift_history ON employee_shift_history FOR ALL
  USING (has_perm(org_id, 'configure') OR has_perm(org_id, 'manage_emp'))
  WITH CHECK (has_perm(org_id, 'configure') OR has_perm(org_id, 'manage_emp'));

CREATE OR REPLACE FUNCTION fn_employee_shift_at(p_employee uuid, p_date date)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (
      SELECT h.shift_id
      FROM employee_shift_history h
      WHERE h.employee_id = p_employee
        AND p_date >= h.effective_from
        AND (h.effective_to IS NULL OR p_date <= h.effective_to)
      ORDER BY h.effective_from DESC
      LIMIT 1
    ),
    (SELECT shift_id FROM employees WHERE id = p_employee)
  );
$$;

INSERT INTO employee_shift_history (org_id, employee_id, shift_id, effective_from, change_reason)
SELECT e.org_id, e.id, e.shift_id, COALESCE(e.date_of_joining, e.created_at::date, current_date), 'P1 catchup seed'
FROM employees e
WHERE e.shift_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM employee_shift_history h WHERE h.employee_id = e.id
  );

CREATE OR REPLACE FUNCTION trg_employee_shift_history()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.shift_id IS DISTINCT FROM OLD.shift_id THEN
    UPDATE employee_shift_history
    SET effective_to = GREATEST(current_date - 1, effective_from)
    WHERE employee_id = NEW.id
      AND effective_to IS NULL
      AND effective_from <= current_date;

    IF NEW.shift_id IS NOT NULL THEN
      INSERT INTO employee_shift_history (org_id, employee_id, shift_id, effective_from, changed_by, change_reason)
      VALUES (
        NEW.org_id,
        NEW.id,
        NEW.shift_id,
        current_date,
        auth.uid(),
        COALESCE(current_setting('hr.shift_change_reason', true), 'Shift updated')
      );
    END IF;
  ELSIF TG_OP = 'INSERT' AND NEW.shift_id IS NOT NULL THEN
    INSERT INTO employee_shift_history (org_id, employee_id, shift_id, effective_from, changed_by, change_reason)
    VALUES (
      NEW.org_id,
      NEW.id,
      NEW.shift_id,
      COALESCE(NEW.date_of_joining, current_date),
      auth.uid(),
      'Initial assignment'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS employee_shift_history_trg ON employees;
CREATE TRIGGER employee_shift_history_trg
  AFTER INSERT OR UPDATE OF shift_id ON employees
  FOR EACH ROW EXECUTE FUNCTION trg_employee_shift_history();

-- ---------------------------------------------------------------------
-- 2. CRM team RPCs — restore grants + import guard
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_hr_can_access_crm(p_org uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    is_hr(p_org)
    OR has_perm(p_org, 'configure')
    OR has_perm(p_org, 'manage_emp');
$$;

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
  IF NOT fn_hr_can_access_crm(p_org) THEN
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
  WHERE p.deleted_at IS NULL
    AND COALESCE(p.status, 'active') IS DISTINCT FROM 'deleted'
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

CREATE OR REPLACE FUNCTION fn_import_crm_staff_as_employee(p_org uuid, p_staff_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  pr record;
  v_emp uuid;
  v_co uuid;
  v_shift uuid;
  v_code text;
  v_num int;
  v_dept uuid;
  v_desig uuid;
  v_cat uuid;
  v_dept_name text;
  v_desig_name text;
BEGIN
  IF NOT has_perm(p_org, 'manage_emp') THEN
    RAISE EXCEPTION 'Manage Emp permission required';
  END IF;

  SELECT * INTO pr FROM profiles WHERE id = p_staff_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CRM profile not found';
  END IF;

  SELECT id INTO v_emp FROM employees WHERE staff_id = p_staff_id AND org_id = p_org;
  IF v_emp IS NOT NULL THEN
    RETURN v_emp;
  END IF;

  v_dept := pr.department_id;
  v_desig := pr.designation_id;
  IF v_desig IS NULL AND pr.designation IS NOT NULL AND trim(pr.designation) <> '' THEN
    SELECT id INTO v_desig FROM designations WHERE lower(trim(name)) = lower(trim(pr.designation));
  END IF;

  SELECT id INTO v_cat FROM hr_employee_categories
  WHERE org_id = p_org AND code = 'probation' LIMIT 1;
  IF v_cat IS NULL THEN
    SELECT id INTO v_cat FROM hr_employee_categories
    WHERE org_id = p_org AND code = 'permanent' LIMIT 1;
  END IF;

  v_dept_name := COALESCE((SELECT name FROM departments WHERE id = v_dept), 'General');
  v_desig_name := COALESCE((SELECT name FROM designations WHERE id = v_desig), NULLIF(trim(pr.designation), ''), 'Staff');

  SELECT id INTO v_co FROM companies WHERE org_id = p_org ORDER BY created_at LIMIT 1;
  SELECT id INTO v_shift FROM shifts WHERE org_id = p_org ORDER BY created_at LIMIT 1;

  SELECT emp_code INTO v_code FROM employees
  WHERE org_id = p_org ORDER BY emp_code DESC LIMIT 1;
  v_num := COALESCE(NULLIF(regexp_replace(v_code, '\D', '', 'g'), '')::int, 1047) + 1;
  v_code := 'FL-' || v_num;

  INSERT INTO employees (
    org_id, staff_id, emp_code, full_name, email, mobile, branch_id,
    designation, designation_id, department, department_id,
    company_id, shift_id, employee_category_id,
    employment_type, work_week, status,
    monthly_gross, basic, hra, conveyance, special_allow, pf_applicable
  ) VALUES (
    p_org, p_staff_id, v_code,
    COALESCE(NULLIF(trim(pr.full_name), ''), split_part(pr.email, '@', 1), 'New Employee'),
    pr.email, pr.phone, pr.branch_id,
    v_desig_name, v_desig, v_dept_name, v_dept,
    v_co, v_shift, v_cat,
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

-- Legacy punch: never duplicate when WTM/rollup already created today's row
CREATE OR REPLACE FUNCTION fn_start_attendance_day(
  p_employee uuid,
  p_check_in time DEFAULT NULL,
  p_work_date date DEFAULT NULL
) RETURNS attendance LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  e employees;
  v_date date := COALESCE(p_work_date, current_date);
  v_time time := COALESCE(p_check_in, current_time);
  row attendance;
BEGIN
  SELECT * INTO e FROM employees WHERE id = p_employee;
  IF e.id IS NULL THEN RAISE EXCEPTION 'Employee not found'; END IF;

  IF e.id <> current_employee_id(e.org_id)
     AND NOT manages_employee(e.org_id, p_employee)
     AND NOT has_perm(e.org_id, 'manage_emp') THEN
    RAISE EXCEPTION 'Not authorized to start attendance for this employee';
  END IF;

  INSERT INTO attendance (org_id, employee_id, work_date, check_in, status, is_mispunch, source)
  VALUES (e.org_id, p_employee, v_date, v_time, 'Present', false, 'self')
  ON CONFLICT (employee_id, work_date) DO UPDATE SET
    check_in = CASE
      WHEN attendance.check_out IS NOT NULL THEN EXCLUDED.check_in
      ELSE COALESCE(attendance.check_in, EXCLUDED.check_in)
    END,
    check_out = CASE WHEN attendance.check_out IS NOT NULL THEN NULL ELSE attendance.check_out END,
    break_start = CASE WHEN attendance.check_out IS NOT NULL THEN NULL ELSE attendance.break_start END,
    break_end = CASE WHEN attendance.check_out IS NOT NULL THEN NULL ELSE attendance.break_end END,
    break_min = CASE WHEN attendance.check_out IS NOT NULL THEN NULL ELSE attendance.break_min END,
    ess_unavailable = CASE WHEN attendance.check_out IS NOT NULL THEN false ELSE attendance.ess_unavailable END,
    status = CASE
      WHEN attendance.status IN ('Week Off', 'Holiday', 'Leave', 'Sick Leave') THEN attendance.status
      ELSE 'Present'
    END,
    is_mispunch = false,
    source = 'self'
  RETURNING * INTO row;

  RETURN row;
END;
$$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig FROM pg_proc p
    WHERE p.proname IN (
      'fn_employee_shift_at',
      'fn_hr_can_access_crm',
      'fn_list_crm_staff',
      'fn_get_crm_profile',
      'fn_assign_hr_role',
      'fn_remove_hr_role',
      'fn_link_employee_staff',
      'fn_import_crm_staff_as_employee',
      'fn_sync_crm_staff_status',
      'fn_start_attendance_day',
      'fn_wtm_clock_in',
      'fn_wtm_clock_out',
      'fn_wtm_get_session',
      'fn_wre_evaluate_session'
    )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END $$;

-- P1-5: designation_id backfill (corrects typo in 20260721120000 line 76: d.designation → e.designation)
UPDATE public.employees e
SET designation_id = d.id
FROM public.designations d
WHERE e.designation_id IS NULL
  AND e.designation IS NOT NULL
  AND trim(e.designation) <> ''
  AND lower(trim(d.name)) = lower(trim(e.designation));
