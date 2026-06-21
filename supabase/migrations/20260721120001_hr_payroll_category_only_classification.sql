-- =====================================================================
-- HR Payroll — Employee Category as sole classification (remove employment_type usage)
-- Run after 20260721120000_hr_payroll_crm_masters_foundation.sql
-- =====================================================================

-- Legacy column retained for backward compatibility; no longer required in app/forms.
ALTER TABLE employees ALTER COLUMN employment_type DROP NOT NULL;
ALTER TABLE employees ALTER COLUMN employment_type DROP DEFAULT;

-- Idempotent backfill: map legacy employment_type → category where still unassigned.
UPDATE employees e SET employee_category_id = ec.id
FROM hr_employee_categories ec
WHERE e.employee_category_id IS NULL AND e.org_id = ec.org_id AND ec.code = 'intern'
  AND e.employment_type IN ('Interns', 'Intern', 'Internship');

UPDATE employees e SET employee_category_id = ec.id
FROM hr_employee_categories ec
WHERE e.employee_category_id IS NULL AND e.org_id = ec.org_id AND ec.code = 'contract'
  AND e.employment_type = 'Contract';

UPDATE employees e SET employee_category_id = ec.id
FROM hr_employee_categories ec
WHERE e.employee_category_id IS NULL AND e.org_id = ec.org_id AND ec.code = 'part_time'
  AND e.employment_type IN ('Part time - Permanent', 'Part time - Temporary', 'Part-Time', 'Temporary');

UPDATE employees e SET employee_category_id = ec.id
FROM hr_employee_categories ec
WHERE e.employee_category_id IS NULL AND e.org_id = ec.org_id AND ec.code = 'permanent'
  AND e.employment_type IN ('Full time - Permanent', 'Full-Time');

UPDATE employees e SET employee_category_id = ec.id
FROM hr_employee_categories ec
WHERE e.employee_category_id IS NULL AND e.org_id = ec.org_id AND ec.code = 'probation'
  AND e.status = 'On Probation';

-- Leave eligibility driven by category flags (Phase 4 prep); probation/status gates unchanged.
CREATE OR REPLACE FUNCTION fn_is_leave_eligible(p_employee uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  e employees;
  c hr_employee_categories;
  v_probation_end date;
BEGIN
  SELECT * INTO e FROM employees WHERE id = p_employee;
  IF e.id IS NULL THEN RETURN false; END IF;

  SELECT * INTO c FROM hr_employee_categories WHERE id = e.employee_category_id;
  IF c.id IS NULL OR NOT c.leave_eligible THEN
    RETURN false;
  END IF;

  IF COALESCE(e.work_hours, 9) < 8 THEN
    RETURN false;
  END IF;

  v_probation_end := COALESCE(
    e.probation_end_date,
    CASE WHEN e.date_of_joining IS NOT NULL THEN e.date_of_joining + interval '3 months' ELSE NULL END
  )::date;

  IF e.status = 'On Probation' OR c.code = 'probation'
     OR (v_probation_end IS NOT NULL AND current_date <= v_probation_end) THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- Holiday applicability: work-week tags + employee category codes (replaces employment_type tags).
CREATE OR REPLACE FUNCTION fn_apply_holidays_for_date(p_org uuid, p_date date)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  h record;
  e record;
  n int := 0;
  v_tags jsonb;
  v_cat text;
  v_has_cat_tags boolean;
BEGIN
  IF NOT has_perm(p_org, 'configure') AND NOT has_perm(p_org, 'manage_emp') THEN
    RAISE EXCEPTION 'Configure or manage_emp permission required';
  END IF;

  FOR h IN
    SELECT * FROM holidays
    WHERE org_id = p_org AND holiday_date = p_date
  LOOP
    v_tags := COALESCE(to_jsonb(h.applicable_tags), '[]'::jsonb);
    v_has_cat_tags := EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(v_tags) AS t(tag)
      WHERE t.tag IN (
        'permanent', 'probation', 'contract', 'consultant', 'intern',
        'part_time', 'india_staff', 'canada_staff'
      )
    );

    FOR e IN
      SELECT emp.*, ec.code AS category_code
      FROM employees emp
      LEFT JOIN hr_employee_categories ec ON ec.id = emp.employee_category_id
      WHERE emp.org_id = p_org
        AND emp.status NOT IN ('Terminated', 'Resigned')
        AND (h.branch_id IS NULL OR emp.branch_id = h.branch_id)
    LOOP
      v_cat := COALESCE(e.category_code, '');

      IF v_has_cat_tags THEN
        IF v_cat = '' OR NOT EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(v_tags) AS t(tag) WHERE t.tag = v_cat
        ) THEN
          CONTINUE;
        END IF;
      ELSE
        -- Legacy holidays without category tags: permanent-class staff only.
        IF v_cat NOT IN ('permanent', 'probation', 'india_staff', 'canada_staff') THEN
          -- Backward compat for rows not yet categorized.
          IF e.employment_type IS DISTINCT FROM 'Full time - Permanent' THEN
            CONTINUE;
          END IF;
        END IF;
      END IF;

      IF v_tags <> '[]'::jsonb THEN
        IF e.work_week = '5-Day' AND NOT EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(v_tags) AS t(tag) WHERE t.tag = '5-Day'
        ) THEN CONTINUE; END IF;
        IF e.work_week <> '5-Day' AND NOT EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(v_tags) AS t(tag) WHERE t.tag IN ('6-Day', 'Day')
        ) THEN CONTINUE; END IF;
      END IF;

      INSERT INTO attendance (org_id, employee_id, work_date, status, source)
      VALUES (p_org, e.id, p_date, 'Holiday', 'system')
      ON CONFLICT (employee_id, work_date) DO UPDATE SET
        status = 'Holiday',
        source = 'system';
      n := n + 1;
    END LOOP;
  END LOOP;

  RETURN n;
END;
$$;

-- Migrate legacy holiday tags to category codes where applicable.
UPDATE holidays h SET applicable_tags = (
  SELECT COALESCE(jsonb_agg(
    CASE elem #>> '{}'
      WHEN 'Full time - Permanent' THEN 'permanent'
      WHEN 'Full-Time' THEN 'permanent'
      WHEN 'Part time - Permanent' THEN 'part_time'
      WHEN 'Part-Time' THEN 'part_time'
      ELSE elem #>> '{}'
    END
  ), '[]'::jsonb)
  FROM jsonb_array_elements(COALESCE(h.applicable_tags, '[]'::jsonb)) AS elem
)
WHERE applicable_tags IS NOT NULL
  AND applicable_tags::text LIKE ANY (ARRAY[
    '%Full time - Permanent%',
    '%Full-Time%',
    '%Part time - Permanent%',
    '%Part-Time%'
  ]);

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
  v_cat uuid;
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

  SELECT id INTO v_cat FROM hr_employee_categories
  WHERE org_id = p_org AND code = 'probation' LIMIT 1;
  IF v_cat IS NULL THEN
    SELECT id INTO v_cat FROM hr_employee_categories
    WHERE org_id = p_org AND code = 'permanent' LIMIT 1;
  END IF;

  SELECT emp_code INTO v_code FROM employees
  WHERE org_id = p_org ORDER BY emp_code DESC LIMIT 1;
  v_num := COALESCE(NULLIF(regexp_replace(v_code, '\D', '', 'g'), '')::int, 1047) + 1;
  v_code := 'FL-' || v_num;

  INSERT INTO employees (
    org_id, staff_id, emp_code, full_name, email, mobile, branch_id,
    designation, department, company_id, shift_id, employee_category_id,
    work_week, status,
    monthly_gross, basic, hra, conveyance, special_allow, pf_applicable
  ) VALUES (
    p_org, v_staff, v_code,
    COALESCE(NULLIF(trim(pr.full_name), ''), split_part(pr.email, '@', 1), 'Staff'),
    pr.email, pr.phone, pr.branch_id,
    COALESCE(NULLIF(trim(pr.designation), ''), 'Staff'),
    'General',
    v_co, v_shift, v_cat,
    '6-Day', 'On Probation',
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
  v_dept uuid;
  v_desig uuid;
  v_cat uuid;
  v_dept_name text;
  v_desig_name text;
BEGIN
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
    work_week, status,
    monthly_gross, basic, hra, conveyance, special_allow, pf_applicable
  ) VALUES (
    p_org, p_staff_id, v_code,
    COALESCE(NULLIF(trim(pr.full_name), ''), split_part(pr.email, '@', 1), 'New Employee'),
    pr.email, pr.phone, pr.branch_id,
    v_desig_name, v_desig, v_dept_name, v_dept,
    v_co, v_shift, v_cat,
    '6-Day', 'On Probation',
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
