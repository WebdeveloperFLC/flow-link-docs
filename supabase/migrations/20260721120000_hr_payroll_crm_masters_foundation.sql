-- =====================================================================
-- HR Payroll — CRM master alignment (pre–Phase 1 foundation)
-- Shared: branches (existing), departments (FK), designations (new table)
-- HR-only: employee categories, shift history, payroll freeze exceptions
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Shared Designation Master (CRM + HR)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.designations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL UNIQUE,
  is_active     boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.designations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS designations_read ON public.designations;
CREATE POLICY designations_read ON public.designations
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS designations_admin ON public.designations;
CREATE POLICY designations_admin ON public.designations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS touch_designations_updated_at ON public.designations;
CREATE TRIGGER touch_designations_updated_at
  BEFORE UPDATE ON public.designations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.designations (name, display_order)
SELECT DISTINCT trim(d), row_number() OVER (ORDER BY trim(d))
FROM (
  SELECT designation AS d FROM public.profiles WHERE designation IS NOT NULL AND trim(designation) <> ''
  UNION
  SELECT designation FROM public.employees WHERE designation IS NOT NULL AND trim(designation) <> ''
) s
WHERE trim(d) <> ''
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.designations (name, display_order) VALUES
  ('Staff', 900),
  ('Senior Counselor', 10),
  ('Counselor', 20),
  ('Documentation Executive', 30),
  ('HR Manager', 40)
ON CONFLICT (name) DO NOTHING;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS designation_id uuid REFERENCES public.designations(id) ON DELETE SET NULL;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS designation_id uuid REFERENCES public.designations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS employee_category_id uuid;

UPDATE public.profiles p
SET designation_id = d.id
FROM public.designations d
WHERE p.designation_id IS NULL
  AND p.designation IS NOT NULL
  AND trim(p.designation) <> ''
  AND lower(trim(d.name)) = lower(trim(p.designation));

UPDATE public.employees e
SET designation_id = d.id
FROM public.designations d
WHERE e.designation_id IS NULL
  AND e.designation IS NOT NULL
  AND trim(e.designation) <> ''
  AND lower(trim(d.name)) = lower(trim(d.designation));

UPDATE public.employees e
SET department_id = d.id
FROM public.departments d
WHERE e.department_id IS NULL
  AND e.department IS NOT NULL
  AND trim(e.department) <> ''
  AND lower(trim(d.name)) = lower(trim(e.department));

CREATE OR REPLACE FUNCTION public.sync_designation_text_from_id()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_name text;
BEGIN
  IF NEW.designation_id IS NOT NULL THEN
    SELECT name INTO v_name FROM public.designations WHERE id = NEW.designation_id;
    IF v_name IS NOT NULL THEN
      NEW.designation := v_name;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_designation_id_from_text()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.designation IS NOT NULL AND trim(NEW.designation) <> '' THEN
    SELECT id INTO NEW.designation_id
    FROM public.designations
    WHERE lower(trim(name)) = lower(trim(NEW.designation))
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_designation_sync ON public.profiles;
CREATE TRIGGER trg_profiles_designation_sync
  BEFORE INSERT OR UPDATE OF designation_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_designation_text_from_id();

DROP TRIGGER IF EXISTS trg_profiles_designation_text_sync ON public.profiles;
CREATE TRIGGER trg_profiles_designation_text_sync
  BEFORE INSERT OR UPDATE OF designation ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_designation_id_from_text();

DROP TRIGGER IF EXISTS trg_employees_designation_sync ON public.employees;
CREATE TRIGGER trg_employees_designation_sync
  BEFORE INSERT OR UPDATE OF designation_id ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.sync_designation_text_from_id();

CREATE OR REPLACE FUNCTION public.sync_department_text_from_id()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_name text;
BEGIN
  IF NEW.department_id IS NOT NULL THEN
    SELECT name INTO v_name FROM public.departments WHERE id = NEW.department_id;
    IF v_name IS NOT NULL THEN
      NEW.department := v_name;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_employees_department_sync ON public.employees;
CREATE TRIGGER trg_employees_department_sync
  BEFORE INSERT OR UPDATE OF department_id ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.sync_department_text_from_id();

-- ---------------------------------------------------------------------
-- 2. HR Employee Category Master
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hr_employee_categories (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  uuid NOT NULL,
  code                    text NOT NULL,
  label                   text NOT NULL,
  leave_eligible          boolean NOT NULL DEFAULT false,
  leave_accrual_eligible  boolean NOT NULL DEFAULT false,
  attendance_rules_apply  boolean NOT NULL DEFAULT true,
  payroll_rules_apply     boolean NOT NULL DEFAULT true,
  is_active               boolean NOT NULL DEFAULT true,
  sort_order              int NOT NULL DEFAULT 0,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, code)
);

CREATE INDEX IF NOT EXISTS idx_hr_employee_categories_org
  ON hr_employee_categories (org_id, is_active, sort_order);

ALTER TABLE hr_employee_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ref_read_hr_employee_categories ON hr_employee_categories;
CREATE POLICY ref_read_hr_employee_categories ON hr_employee_categories FOR SELECT
  USING (current_hr_role(org_id) IS NOT NULL OR current_employee_id(org_id) IS NOT NULL);

DROP POLICY IF EXISTS ref_write_hr_employee_categories ON hr_employee_categories;
CREATE POLICY ref_write_hr_employee_categories ON hr_employee_categories FOR ALL
  USING (has_perm(org_id, 'configure') OR has_perm(org_id, 'manage_emp'))
  WITH CHECK (has_perm(org_id, 'configure') OR has_perm(org_id, 'manage_emp'));

DROP TRIGGER IF EXISTS trg_hr_employee_categories_updated ON hr_employee_categories;
CREATE TRIGGER trg_hr_employee_categories_updated
  BEFORE UPDATE ON hr_employee_categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE public.employees
  DROP CONSTRAINT IF EXISTS employees_employee_category_id_fkey;
ALTER TABLE public.employees
  ADD CONSTRAINT employees_employee_category_id_fkey
  FOREIGN KEY (employee_category_id) REFERENCES hr_employee_categories(id) ON DELETE SET NULL;

-- Per-code idempotent seed: existing rows (e.g. full_time_employee) do not block standard codes
INSERT INTO hr_employee_categories (org_id, code, label, leave_eligible, leave_accrual_eligible, attendance_rules_apply, payroll_rules_apply, sort_order)
SELECT o.org_id, c.code, c.label, c.leave_eligible, c.leave_accrual_eligible, c.attendance_rules_apply, c.payroll_rules_apply, c.sort_order
FROM (VALUES
  ('permanent',     'Permanent',     true,  true,  true,  true,  10),
  ('probation',     'Probation',     false, false, true,  true,  20),
  ('contract',      'Contract',      false, false, true,  true,  30),
  ('consultant',    'Consultant',    false, false, true,  true,  40),
  ('intern',        'Intern',        false, false, true,  false, 50),
  ('part_time',     'Part Time',     false, false, true,  true,  60),
  ('india_staff',   'India Staff',   true,  true,  true,  true,  70),
  ('canada_staff',  'Canada Staff',  true,  true,  true,  true,  80)
) AS c(code, label, leave_eligible, leave_accrual_eligible, attendance_rules_apply, payroll_rules_apply, sort_order)
CROSS JOIN (SELECT DISTINCT org_id FROM employees UNION SELECT '00000000-0000-0000-0000-0000000000f1'::uuid) o
ON CONFLICT (org_id, code) DO NOTHING;

-- Explicit employment_type / status → category mappings only (no catch-all; leave rules wired in Phase 4)
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

-- HR review list: active employees still without a category (no silent Permanent default)
CREATE OR REPLACE VIEW v_hr_employee_category_review AS
SELECT
  e.org_id,
  e.id AS employee_id,
  e.emp_code,
  e.full_name,
  e.employment_type,
  e.status,
  e.date_of_joining,
  e.department,
  b.name AS branch_name
FROM employees e
LEFT JOIN public.branches b ON b.id = e.branch_id
WHERE e.employee_category_id IS NULL
  AND e.status NOT IN ('Terminated', 'Resigned');

COMMENT ON VIEW v_hr_employee_category_review IS
  'Employees needing manual HR employee category assignment. Category flags do not affect leave until Phase 4.';

INSERT INTO audit_log (org_id, actor_label, action, target, new_value)
SELECT
  o.org_id,
  'System',
  'Employee Category Review',
  'Unmapped employees',
  COALESCE(COUNT(e.id), 0)::text || ' active employees need category — SELECT * FROM v_hr_employee_category_review'
FROM (SELECT DISTINCT org_id FROM employees UNION SELECT '00000000-0000-0000-0000-0000000000f1'::uuid) o
LEFT JOIN employees e ON e.org_id = o.org_id
  AND e.employee_category_id IS NULL
  AND e.status NOT IN ('Terminated', 'Resigned')
GROUP BY o.org_id;

-- ---------------------------------------------------------------------
-- 3. Employee Shift History
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
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
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

-- Seed initial history from current shift assignments
INSERT INTO employee_shift_history (org_id, employee_id, shift_id, effective_from, change_reason)
SELECT e.org_id, e.id, e.shift_id, COALESCE(e.date_of_joining, e.created_at::date, current_date), 'Initial migration seed'
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

-- fn_rollup_inputs unchanged (Phase 2 will use fn_employee_shift_at for per-day shift in payroll)

-- ---------------------------------------------------------------------
-- 4. Payroll Freeze Protection (exception log + block; no auto-recalc)
-- ---------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE payroll_freeze_change_type AS ENUM (
    'attendance', 'leave', 'late', 'mispunch', 'shift_assignment'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS payroll_freeze_exceptions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL,
  cycle_id        uuid REFERENCES payroll_cycles(id) ON DELETE SET NULL,
  employee_id     uuid REFERENCES employees(id) ON DELETE SET NULL,
  change_type     payroll_freeze_change_type NOT NULL,
  work_date       date,
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  status          text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'resolved', 'cancelled')),
  change_reason   text,
  requested_by    uuid,
  resolved_at     timestamptz,
  resolved_by     uuid,
  resolution_note text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payroll_freeze_exceptions_org
  ON payroll_freeze_exceptions (org_id, status, created_at DESC);

ALTER TABLE payroll_freeze_exceptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS read_payroll_freeze_exceptions ON payroll_freeze_exceptions;
CREATE POLICY read_payroll_freeze_exceptions ON payroll_freeze_exceptions FOR SELECT
  USING (
    has_perm(org_id, 'configure')
    OR has_perm(org_id, 'approve')
    OR has_perm(org_id, 'override')
  );

DROP POLICY IF EXISTS write_payroll_freeze_exceptions ON payroll_freeze_exceptions;
CREATE POLICY write_payroll_freeze_exceptions ON payroll_freeze_exceptions FOR ALL
  USING (has_perm(org_id, 'configure') OR has_perm(org_id, 'approve'))
  WITH CHECK (has_perm(org_id, 'configure') OR has_perm(org_id, 'approve'));

CREATE OR REPLACE FUNCTION fn_locked_payroll_cycle_for_date(p_org uuid, p_date date)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT pc.id
  FROM payroll_cycles pc
  WHERE pc.org_id = p_org
    AND pc.status = 'Locked'
    AND p_date BETWEEN pc.start_date AND pc.end_date
  ORDER BY pc.end_date DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION fn_log_payroll_freeze_exception(
  p_org uuid,
  p_employee uuid,
  p_date date,
  p_change_type payroll_freeze_change_type,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_reason text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cycle uuid;
  v_id uuid;
BEGIN
  v_cycle := fn_locked_payroll_cycle_for_date(p_org, p_date);
  IF v_cycle IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO payroll_freeze_exceptions (
    org_id, cycle_id, employee_id, change_type, work_date, payload, change_reason, requested_by
  ) VALUES (
    p_org, v_cycle, p_employee, p_change_type, p_date, COALESCE(p_payload, '{}'::jsonb),
    p_reason, auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION fn_raise_if_payroll_frozen(
  p_org uuid,
  p_employee uuid,
  p_date date,
  p_change_type payroll_freeze_change_type,
  p_payload jsonb DEFAULT '{}'::jsonb
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cycle uuid;
  v_label text;
  v_ex uuid;
BEGIN
  v_cycle := fn_locked_payroll_cycle_for_date(p_org, p_date);
  IF v_cycle IS NULL THEN
    RETURN;
  END IF;

  v_ex := fn_log_payroll_freeze_exception(p_org, p_employee, p_date, p_change_type, p_payload, NULL);
  SELECT label INTO v_label FROM payroll_cycles WHERE id = v_cycle;

  RAISE EXCEPTION
    'Payroll frozen for % (cycle: %). Exception % logged — reopen payroll before applying this change.',
    p_date, v_label, COALESCE(v_ex::text, 'recorded');
END;
$$;

CREATE OR REPLACE FUNCTION fn_attendance_cycle_locked(p_org uuid, p_work_date date)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT fn_locked_payroll_cycle_for_date(p_org, p_work_date) IS NOT NULL;
$$;

-- Preserve migration 43 ESS behavior: self-punch + close-only checkout bypass lock guard.
-- HR manual attendance edits remain blocked during locked payroll cycles.
CREATE OR REPLACE FUNCTION trg_attendance_locked_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(NEW.source, OLD.source, 'self') = 'self' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND fn_attendance_cycle_locked(COALESCE(NEW.org_id, OLD.org_id), COALESCE(NEW.work_date, OLD.work_date))
     AND fn_attendance_close_only_update(OLD, NEW) THEN
    RETURN NEW;
  END IF;

  IF fn_attendance_cycle_locked(COALESCE(NEW.org_id, OLD.org_id), COALESCE(NEW.work_date, OLD.work_date)) THEN
    RAISE EXCEPTION 'Attendance frozen — payroll cycle is locked for %', COALESCE(NEW.work_date, OLD.work_date);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION trg_leave_locked_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org uuid;
  v_emp uuid;
  d date;
BEGIN
  v_org := COALESCE(NEW.org_id, OLD.org_id);
  v_emp := COALESCE(NEW.employee_id, OLD.employee_id);

  FOR d IN
    SELECT generate_series(
      COALESCE(NEW.from_date, OLD.from_date),
      COALESCE(NEW.to_date, OLD.to_date),
      interval '1 day'
    )::date
  LOOP
    PERFORM fn_raise_if_payroll_frozen(
      v_org, v_emp, d, 'leave',
      jsonb_build_object('op', TG_OP, 'entity_id', COALESCE(NEW.id, OLD.id))
    );
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS leave_locked_guard ON leave_requests;
CREATE TRIGGER leave_locked_guard
  BEFORE INSERT OR UPDATE OR DELETE ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION trg_leave_locked_guard();

CREATE OR REPLACE FUNCTION trg_late_locked_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM fn_raise_if_payroll_frozen(
    COALESCE(NEW.org_id, OLD.org_id),
    COALESCE(NEW.employee_id, OLD.employee_id),
    COALESCE(NEW.late_date, OLD.late_date),
    'late',
    jsonb_build_object('op', TG_OP, 'entity_id', COALESCE(NEW.id, OLD.id))
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS late_locked_guard ON late_exemptions;
CREATE TRIGGER late_locked_guard
  BEFORE INSERT OR UPDATE OR DELETE ON late_exemptions
  FOR EACH ROW EXECUTE FUNCTION trg_late_locked_guard();

CREATE OR REPLACE FUNCTION trg_mispunch_locked_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM fn_raise_if_payroll_frozen(
    COALESCE(NEW.org_id, OLD.org_id),
    COALESCE(NEW.employee_id, OLD.employee_id),
    COALESCE(NEW.punch_date, OLD.punch_date),
    'mispunch',
    jsonb_build_object('op', TG_OP, 'entity_id', COALESCE(NEW.id, OLD.id))
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS mispunch_locked_guard ON mispunch_requests;
CREATE TRIGGER mispunch_locked_guard
  BEFORE INSERT OR UPDATE OR DELETE ON mispunch_requests
  FOR EACH ROW EXECUTE FUNCTION trg_mispunch_locked_guard();

CREATE OR REPLACE FUNCTION trg_shift_assignment_locked_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.shift_id IS NOT DISTINCT FROM OLD.shift_id THEN
    RETURN NEW;
  END IF;

  FOR r IN
    SELECT pc.start_date, pc.end_date, pc.label
    FROM payroll_cycles pc
    WHERE pc.org_id = NEW.org_id
      AND pc.status = 'Locked'
      AND EXISTS (
        SELECT 1 FROM attendance a
        WHERE a.employee_id = NEW.id
          AND a.work_date BETWEEN pc.start_date AND pc.end_date
      )
  LOOP
    PERFORM fn_raise_if_payroll_frozen(
      NEW.org_id, NEW.id, r.start_date, 'shift_assignment',
      jsonb_build_object(
        'op', TG_OP,
        'old_shift_id', OLD.shift_id,
        'new_shift_id', NEW.shift_id,
        'locked_cycle', r.label
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS shift_assignment_locked_guard ON employees;
CREATE TRIGGER shift_assignment_locked_guard
  BEFORE UPDATE OF shift_id ON employees
  FOR EACH ROW EXECUTE FUNCTION trg_shift_assignment_locked_guard();

COMMENT ON FUNCTION fn_reopen_payroll_cycle IS
  'Reopens a locked cycle to Draft. Does NOT auto-recalculate payroll lines — run fn_build_payroll_line / fn_compute_payroll manually after corrections.';

-- CRM import: sync department + designation FKs from profile
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

  SELECT id INTO v_cat
  FROM hr_employee_categories WHERE org_id = p_org AND code = 'probation' LIMIT 1;
  IF v_cat IS NULL THEN
    SELECT id INTO v_cat
    FROM hr_employee_categories WHERE org_id = p_org AND code = 'permanent' LIMIT 1;
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

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig FROM pg_proc p
    WHERE p.proname IN (
      'fn_employee_shift_at',
      'fn_attendance_cycle_locked',
      'fn_locked_payroll_cycle_for_date',
      'fn_log_payroll_freeze_exception',
      'fn_raise_if_payroll_frozen',
      'fn_import_crm_staff_as_employee'
    )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END $$;
