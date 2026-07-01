-- File 5: 20260735120000 WTM v1.0 Smoke Test — P1 defect fixes
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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_shift_history TO authenticated;
GRANT ALL ON public.employee_shift_history TO service_role;
CREATE INDEX IF NOT EXISTS idx_employee_shift_history_emp_dates ON employee_shift_history (employee_id, effective_from DESC);
ALTER TABLE employee_shift_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS read_employee_shift_history ON employee_shift_history;
CREATE POLICY read_employee_shift_history ON employee_shift_history FOR SELECT USING (current_hr_role(org_id) IS NOT NULL OR current_employee_id(org_id) IS NOT NULL);
DROP POLICY IF EXISTS write_employee_shift_history ON employee_shift_history;
CREATE POLICY write_employee_shift_history ON employee_shift_history FOR ALL USING (has_perm(org_id, 'configure') OR has_perm(org_id, 'manage_emp')) WITH CHECK (has_perm(org_id, 'configure') OR has_perm(org_id, 'manage_emp'));

CREATE OR REPLACE FUNCTION fn_employee_shift_at(p_employee uuid, p_date date)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT h.shift_id FROM employee_shift_history h
      WHERE h.employee_id = p_employee AND p_date >= h.effective_from
        AND (h.effective_to IS NULL OR p_date <= h.effective_to)
      ORDER BY h.effective_from DESC LIMIT 1),
    (SELECT shift_id FROM employees WHERE id = p_employee));
$$;

INSERT INTO employee_shift_history (org_id, employee_id, shift_id, effective_from, change_reason)
SELECT e.org_id, e.id, e.shift_id, COALESCE(e.date_of_joining, e.created_at::date, current_date), 'P1 catchup seed'
FROM employees e
WHERE e.shift_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM employee_shift_history h WHERE h.employee_id = e.id);

CREATE OR REPLACE FUNCTION trg_employee_shift_history()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.shift_id IS DISTINCT FROM OLD.shift_id THEN
    UPDATE employee_shift_history SET effective_to = GREATEST(current_date - 1, effective_from)
      WHERE employee_id = NEW.id AND effective_to IS NULL AND effective_from <= current_date;
    IF NEW.shift_id IS NOT NULL THEN
      INSERT INTO employee_shift_history (org_id, employee_id, shift_id, effective_from, changed_by, change_reason)
      VALUES (NEW.org_id, NEW.id, NEW.shift_id, current_date, auth.uid(),
        COALESCE(current_setting('hr.shift_change_reason', true), 'Shift updated'));
    END IF;
  ELSIF TG_OP = 'INSERT' AND NEW.shift_id IS NOT NULL THEN
    INSERT INTO employee_shift_history (org_id, employee_id, shift_id, effective_from, changed_by, change_reason)
    VALUES (NEW.org_id, NEW.id, NEW.shift_id, COALESCE(NEW.date_of_joining, current_date), auth.uid(), 'Initial assignment');
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS employee_shift_history_trg ON employees;
CREATE TRIGGER employee_shift_history_trg AFTER INSERT OR UPDATE OF shift_id ON employees FOR EACH ROW EXECUTE FUNCTION trg_employee_shift_history();

CREATE OR REPLACE FUNCTION fn_hr_can_access_crm(p_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT is_hr(p_org) OR has_perm(p_org, 'configure') OR has_perm(p_org, 'manage_emp');
$$;

CREATE OR REPLACE FUNCTION fn_list_crm_staff(p_org uuid)
RETURNS TABLE (staff_id uuid, email text, full_name text, profile_status text, crm_roles text[],
  hr_role hr_role, hr_assignment_id uuid, scope_branch_id uuid, profile_branch_id uuid, branch_name text,
  employee_id uuid, emp_code text, employee_name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT fn_hr_can_access_crm(p_org) THEN RAISE EXCEPTION 'Not authorized to list CRM staff for HR'; END IF;
  RETURN QUERY
  SELECT p.id, p.email, COALESCE(NULLIF(trim(p.full_name), ''), p.email, p.id::text),
    COALESCE(p.status, 'active'),
    COALESCE(array_agg(DISTINCT ur.role::text) FILTER (WHERE ur.role IS NOT NULL), ARRAY[]::text[]),
    ra.role, ra.id, ra.scope_branch_id, p.branch_id, b.name, e.id, e.emp_code, e.full_name
  FROM profiles p
  LEFT JOIN user_roles ur ON ur.user_id = p.id
  LEFT JOIN role_assignments ra ON ra.staff_id = p.id AND ra.org_id = p_org
  LEFT JOIN employees e ON e.staff_id = p.id AND e.org_id = p_org
  LEFT JOIN branches b ON b.id = p.branch_id
  WHERE p.deleted_at IS NULL AND COALESCE(p.status, 'active') IS DISTINCT FROM 'deleted'
    AND (NOT EXISTS (SELECT 1 FROM user_roles ur0 WHERE ur0.user_id = p.id)
      OR EXISTS (SELECT 1 FROM user_roles ur0 WHERE ur0.user_id = p.id AND ur0.role <> 'client'::app_role))
  GROUP BY p.id, p.email, p.full_name, p.status, p.branch_id, b.name,
    ra.role, ra.id, ra.scope_branch_id, e.id, e.emp_code, e.full_name
  ORDER BY 3, 2;
END; $$;

CREATE UNIQUE INDEX IF NOT EXISTS role_assignments_org_id_staff_id_key ON public.role_assignments (org_id, staff_id);

CREATE OR REPLACE FUNCTION fn_import_crm_staff_as_employee(p_org uuid, p_staff_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pr record; v_emp uuid; v_co uuid; v_shift uuid; v_code text; v_num int;
  v_dept uuid; v_desig uuid; v_cat uuid; v_dept_name text; v_desig_name text;
BEGIN
  IF NOT has_perm(p_org, 'manage_emp') THEN RAISE EXCEPTION 'Manage Emp permission required'; END IF;
  SELECT * INTO pr FROM profiles WHERE id = p_staff_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'CRM profile not found'; END IF;
  SELECT id INTO v_emp FROM employees WHERE staff_id = p_staff_id AND org_id = p_org;
  IF v_emp IS NOT NULL THEN RETURN v_emp; END IF;
  v_dept := pr.department_id;
  v_desig := pr.designation_id;
  IF v_desig IS NULL AND pr.designation IS NOT NULL AND trim(pr.designation) <> '' THEN
    SELECT id INTO v_desig FROM designations WHERE lower(trim(name)) = lower(trim(pr.designation));
  END IF;
  SELECT id INTO v_cat FROM hr_employee_categories WHERE org_id = p_org AND code = 'probation' LIMIT 1;
  IF v_cat IS NULL THEN SELECT id INTO v_cat FROM hr_employee_categories WHERE org_id = p_org AND code = 'permanent' LIMIT 1; END IF;
  v_dept_name := COALESCE((SELECT name FROM departments WHERE id = v_dept), 'General');
  v_desig_name := COALESCE((SELECT name FROM designations WHERE id = v_desig), NULLIF(trim(pr.designation), ''), 'Staff');
  SELECT id INTO v_co FROM companies WHERE org_id = p_org ORDER BY created_at LIMIT 1;
  SELECT id INTO v_shift FROM shifts WHERE org_id = p_org ORDER BY created_at LIMIT 1;
  SELECT emp_code INTO v_code FROM employees WHERE org_id = p_org ORDER BY emp_code DESC LIMIT 1;
  v_num := COALESCE(NULLIF(regexp_replace(v_code, '\D', '', 'g'), '')::int, 1047) + 1;
  v_code := 'FL-' || v_num;
  INSERT INTO employees (org_id, staff_id, emp_code, full_name, email, mobile, branch_id,
    designation, designation_id, department, department_id, company_id, shift_id, employee_category_id,
    employment_type, work_week, status, monthly_gross, basic, hra, conveyance, special_allow, pf_applicable)
  VALUES (p_org, p_staff_id, v_code,
    COALESCE(NULLIF(trim(pr.full_name), ''), split_part(pr.email, '@', 1), 'New Employee'),
    pr.email, pr.phone, pr.branch_id, v_desig_name, v_desig, v_dept_name, v_dept,
    v_co, v_shift, v_cat, 'Full time - Permanent', '6-Day', 'On Probation',
    0, 0, 0, 1600, 0, true) RETURNING id INTO v_emp;
  INSERT INTO role_assignments (org_id, staff_id, role) VALUES (p_org, p_staff_id, 'Employee'::hr_role)
  ON CONFLICT (org_id, staff_id) DO NOTHING;
  INSERT INTO audit_log (org_id, actor_label, action, target, new_value)
  VALUES (p_org, 'HR Admin', 'Imported from CRM', v_code, COALESCE(pr.email, pr.full_name));
  RETURN v_emp;
END; $$;

CREATE UNIQUE INDEX IF NOT EXISTS attendance_employee_id_work_date_key ON public.attendance (employee_id, work_date);

CREATE OR REPLACE FUNCTION fn_start_attendance_day(
  p_employee uuid, p_check_in time DEFAULT NULL, p_work_date date DEFAULT NULL
) RETURNS attendance LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e employees; v_date date := COALESCE(p_work_date, current_date);
  v_time time := COALESCE(p_check_in, current_time); row attendance;
BEGIN
  SELECT * INTO e FROM employees WHERE id = p_employee;
  IF e.id IS NULL THEN RAISE EXCEPTION 'Employee not found'; END IF;
  IF e.id <> current_employee_id(e.org_id) AND NOT manages_employee(e.org_id, p_employee)
     AND NOT has_perm(e.org_id, 'manage_emp') THEN
    RAISE EXCEPTION 'Not authorized to start attendance for this employee';
  END IF;
  INSERT INTO attendance (org_id, employee_id, work_date, check_in, status, is_mispunch, source)
  VALUES (e.org_id, p_employee, v_date, v_time, 'Present', false, 'self')
  ON CONFLICT (employee_id, work_date) DO UPDATE SET
    check_in = CASE WHEN attendance.check_out IS NOT NULL THEN EXCLUDED.check_in ELSE COALESCE(attendance.check_in, EXCLUDED.check_in) END,
    check_out = CASE WHEN attendance.check_out IS NOT NULL THEN NULL ELSE attendance.check_out END,
    break_start = CASE WHEN attendance.check_out IS NOT NULL THEN NULL ELSE attendance.break_start END,
    break_end = CASE WHEN attendance.check_out IS NOT NULL THEN NULL ELSE attendance.break_end END,
    break_min = CASE WHEN attendance.check_out IS NOT NULL THEN NULL ELSE attendance.break_min END,
    ess_unavailable = CASE WHEN attendance.check_out IS NOT NULL THEN false ELSE attendance.ess_unavailable END,
    status = CASE WHEN attendance.status IN ('Week Off', 'Holiday', 'Leave', 'Sick Leave') THEN attendance.status ELSE 'Present' END,
    is_mispunch = false, source = 'self'
  RETURNING * INTO row;
  RETURN row;
END; $$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT p.oid::regprocedure AS sig FROM pg_proc p
    WHERE p.proname IN ('fn_employee_shift_at','fn_hr_can_access_crm','fn_list_crm_staff',
      'fn_get_crm_profile','fn_assign_hr_role','fn_remove_hr_role','fn_link_employee_staff',
      'fn_import_crm_staff_as_employee','fn_sync_crm_staff_status','fn_start_attendance_day',
      'fn_wtm_clock_in','fn_wtm_clock_out','fn_wtm_get_session','fn_wre_evaluate_session')
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS public.designations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  is_active     boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.designations TO authenticated;
GRANT ALL ON public.designations TO service_role;
CREATE UNIQUE INDEX IF NOT EXISTS designations_name_key ON public.designations (name);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS designation_id uuid REFERENCES public.designations(id) ON DELETE SET NULL;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS designation_id uuid REFERENCES public.designations(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'designation_id') THEN
    UPDATE public.employees e SET designation_id = d.id FROM public.designations d
    WHERE e.designation_id IS NULL AND e.designation IS NOT NULL AND trim(e.designation) <> ''
      AND lower(trim(d.name)) = lower(trim(e.designation));
  END IF;
END $$;

-- File 6: 20260736120000 HR Core Stabilization
ALTER TABLE training_records ADD COLUMN IF NOT EXISTS remarks text;
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS branch_ids uuid[];
UPDATE holidays SET branch_ids = ARRAY[branch_id] WHERE branch_id IS NOT NULL AND (branch_ids IS NULL OR branch_ids = '{}');
COMMENT ON COLUMN holidays.branch_ids IS 'Optional multi-branch applicability. NULL/empty = all branches (or legacy branch_id when set).';

CREATE OR REPLACE FUNCTION fn_can_approve_stage(p_org uuid, p_employee_id uuid, p_stage approval_stage)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_mgr uuid;
BEGIN
  IF p_stage = 'Manager' THEN
    IF manages_employee(p_org, p_employee_id) OR has_perm(p_org, 'manage_emp') THEN RETURN true; END IF;
    IF has_perm(p_org, 'approve') THEN
      SELECT reporting_mgr_id INTO v_mgr FROM employees WHERE id = p_employee_id;
      IF v_mgr IS NULL THEN RETURN true; END IF;
    END IF;
    RETURN false;
  ELSIF p_stage IN ('HR', 'Final') THEN RETURN has_perm(p_org, 'approve');
  END IF;
  RETURN false;
END; $$;

-- File 7: 20260737120000 Pay basis
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS pay_basis text NOT NULL DEFAULT 'Monthly';
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_pay_basis_check;
ALTER TABLE public.employees ADD CONSTRAINT employees_pay_basis_check CHECK (pay_basis IN ('Monthly', 'Daily', 'Hourly'));
COMMENT ON COLUMN public.employees.pay_basis IS 'Salary pay basis from Employee Master: Monthly | Daily | Hourly. Drives estimated payroll validation.';

-- File 8: 20260738120000 Payroll cycle UAT reset
ALTER TABLE payroll_cycles ADD COLUMN IF NOT EXISTS is_production boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN payroll_cycles.is_production IS 'When true, cycle is treated as finalized production payroll and cannot be UAT-reset.';

CREATE OR REPLACE FUNCTION fn_hr_actor_label()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT COALESCE(NULLIF(trim(p.full_name), ''), NULLIF(trim(p.email), ''))
    FROM profiles p WHERE p.id = auth.uid()), 'HR User');
$$;

CREATE OR REPLACE FUNCTION fn_can_reset_payroll_cycle_uat(p_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (has_perm(p_org, 'configure') AND current_hr_role(p_org) IN ('Admin'::hr_role, 'Super Admin'::hr_role))
    OR (has_perm(p_org, 'approve') AND current_hr_role(p_org) = 'HR Manager'::hr_role);
$$;

CREATE OR REPLACE FUNCTION fn_reset_payroll_cycle_uat(p_cycle uuid)
RETURNS payroll_cycles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c payroll_cycles; v_prev text; v_actor text;
  v_slips int := 0; v_line_snaps int := 0; v_cycle_snaps int := 0; v_payouts int := 0; v_lines int := 0;
BEGIN
  SELECT * INTO c FROM payroll_cycles WHERE id = p_cycle FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Cycle not found'; END IF;
  IF COALESCE(c.is_production, false) THEN RAISE EXCEPTION 'Production payroll cycles cannot be UAT-reset'; END IF;
  IF c.status NOT IN ('Processed', 'Approved', 'Locked', 'Paid') THEN
    RAISE EXCEPTION 'Only Processed/Approved/Locked/Paid cycles can be UAT-reset (current: %)', c.status;
  END IF;
  IF NOT fn_can_reset_payroll_cycle_uat(c.org_id) THEN RAISE EXCEPTION 'HR Admin or Payroll Admin permission required'; END IF;
  v_prev := c.status::text; v_actor := fn_hr_actor_label();
  DELETE FROM salary_slips WHERE cycle_id = p_cycle; GET DIAGNOSTICS v_slips = ROW_COUNT;
  DELETE FROM payroll_line_snapshots WHERE cycle_id = p_cycle; GET DIAGNOSTICS v_line_snaps = ROW_COUNT;
  DELETE FROM payroll_cycle_snapshots WHERE cycle_id = p_cycle; GET DIAGNOSTICS v_cycle_snaps = ROW_COUNT;
  DELETE FROM accounting_payouts WHERE cycle_id = p_cycle; GET DIAGNOSTICS v_payouts = ROW_COUNT;
  DELETE FROM payroll_lines WHERE cycle_id = p_cycle; GET DIAGNOSTICS v_lines = ROW_COUNT;
  UPDATE payroll_cycles SET status = 'Draft', approved_at = NULL, approved_by = NULL,
    processed_at = NULL, processed_by = NULL, paid_at = NULL, paid_by = NULL
    WHERE id = p_cycle RETURNING * INTO c;
  INSERT INTO audit_log (org_id, actor_id, actor_label, action, target, prev_value, new_value)
  VALUES (c.org_id, auth.uid(), v_actor, 'Payroll UAT Reset', c.label, v_prev,
    format('Payroll cycle reset for UAT by %s. Removed %s lines, %s line snapshots, %s cycle snapshots, %s slips, %s payouts.',
      v_actor, v_lines, v_line_snaps, v_cycle_snaps, v_slips, v_payouts));
  RETURN c;
END; $$;

GRANT EXECUTE ON FUNCTION fn_hr_actor_label() TO authenticated;
GRANT EXECUTE ON FUNCTION fn_can_reset_payroll_cycle_uat(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_reset_payroll_cycle_uat(uuid) TO authenticated;

-- File 9: 20260739120000 Employee contact information
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS alternate_personal_mobile text,
  ADD COLUMN IF NOT EXISTS home_telephone text,
  ADD COLUMN IF NOT EXISTS company_email text,
  ADD COLUMN IF NOT EXISTS company_mobile text,
  ADD COLUMN IF NOT EXISTS extension_number text,
  ADD COLUMN IF NOT EXISTS direct_office_number text,
  ADD COLUMN IF NOT EXISTS company_emergency_contact_person text,
  ADD COLUMN IF NOT EXISTS company_emergency_contact_number text,
  ADD COLUMN IF NOT EXISTS company_emergency_contact_email text;

COMMENT ON COLUMN employees.email IS 'Personal email address (employee-owned SSOT).';
COMMENT ON COLUMN employees.mobile IS 'Personal mobile number (employee-owned SSOT).';
COMMENT ON COLUMN employees.emergency_contacts IS 'JSON array; index 0 = personal emergency contact {name, phone, relation, email}.';
COMMENT ON COLUMN employees.company_email IS 'Official company email (organization-owned).';

CREATE OR REPLACE FUNCTION fn_update_ess_personal_contact(
  p_org uuid, p_email text, p_mobile text,
  p_alternate_mobile text DEFAULT NULL,
  p_emergency_name text DEFAULT NULL, p_emergency_relation text DEFAULT NULL,
  p_emergency_phone text DEFAULT NULL, p_emergency_email text DEFAULT NULL
) RETURNS employees LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e employees; v_contact jsonb;
BEGIN
  SELECT * INTO e FROM employees WHERE org_id = p_org AND staff_id = auth.uid() FOR UPDATE;
  IF e.id IS NULL THEN RAISE EXCEPTION 'Employee profile not found for current user'; END IF;
  IF NULLIF(trim(p_email), '') IS NULL THEN RAISE EXCEPTION 'Personal email is required'; END IF;
  IF NULLIF(trim(p_mobile), '') IS NULL THEN RAISE EXCEPTION 'Personal mobile is required'; END IF;
  IF NULLIF(trim(p_emergency_name), '') IS NULL OR NULLIF(trim(p_emergency_relation), '') IS NULL
     OR NULLIF(trim(p_emergency_phone), '') IS NULL THEN
    RAISE EXCEPTION 'Personal emergency contact person, relationship, and number are required';
  END IF;
  v_contact := jsonb_build_array(jsonb_build_object(
    'name', trim(p_emergency_name), 'phone', trim(p_emergency_phone),
    'relation', trim(p_emergency_relation),
    'email', NULLIF(trim(COALESCE(p_emergency_email, '')), '')));
  UPDATE employees SET email = trim(p_email), mobile = trim(p_mobile),
    alternate_personal_mobile = NULLIF(trim(COALESCE(p_alternate_mobile, '')), ''),
    emergency_contacts = v_contact, emergency = trim(p_emergency_phone)
    WHERE id = e.id RETURNING * INTO e;
  INSERT INTO audit_log (org_id, actor_id, actor_label, action, target, new_value)
  VALUES (e.org_id, auth.uid(), fn_hr_actor_label(), 'ESS Personal Contact Updated', e.full_name, e.email);
  RETURN e;
END; $$;
GRANT EXECUTE ON FUNCTION fn_update_ess_personal_contact(uuid, text, text, text, text, text, text, text) TO authenticated;

-- File 10: 20260740120000 UAT defect triage — WRE safe policy resolution (redefine fn_wre_evaluate_session)
CREATE OR REPLACE FUNCTION fn_wre_evaluate_session(
  p_session_id uuid, p_trigger wre_eval_trigger DEFAULT 'clock_out',
  p_trigger_ref uuid DEFAULT NULL, p_actor_id uuid DEFAULT NULL, p_actor_label text DEFAULT NULL
) RETURNS wre_evaluations LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s wtm_attendance_sessions; sh shifts; v_shift_id uuid;
  v_policy jsonb; v_hol_policy jsonb; v_bundle uuid;
  v_bundle_row wpms_policy_bundles; v_att_policy wpms_policies; v_hol_policy_row wpms_policies;
  v_eval wre_evaluations; v_version int;
  v_eff_in time; v_eff_out time;
  v_grace int; v_late int := 0; v_early int := 0; v_ot int := 0;
  v_scheduled_min numeric; v_payroll wtm_payroll_status := 'Absent';
  v_operational wtm_session_status := 'Completed';
  v_mispunch boolean := false; v_derived jsonb;
  v_month_late int := 0; v_monthly_grace int := 30; v_remaining_grace int := 0;
  v_is_holiday boolean := false; v_is_wo boolean := false;
  v_ex attendance_exceptions;
  v_min_present_min numeric; v_min_half_min numeric; v_max_late int;
  v_att_policy_id uuid; v_hol_policy_id uuid;
  v_bundle_version int; v_att_policy_version int; v_hol_policy_version int;
BEGIN
  SELECT * INTO s FROM wtm_attendance_sessions WHERE id = p_session_id FOR UPDATE;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Session not found'; END IF;
  IF s.session_status = 'Locked' THEN RAISE EXCEPTION 'Session is locked — cannot re-evaluate'; END IF;
  v_policy := fn_wpms_policy_config_at(s.employee_id, 'attendance', s.work_date);
  v_hol_policy := fn_wpms_policy_config_at(s.employee_id, 'holiday_calendar', s.work_date);
  v_bundle := fn_wpms_employee_bundle_at(s.employee_id, s.work_date);
  IF v_bundle IS NOT NULL THEN
    SELECT * INTO v_bundle_row FROM wpms_policy_bundles WHERE id = v_bundle;
    IF FOUND THEN
      v_bundle_version := v_bundle_row.version;
      IF v_bundle_row.attendance_policy_id IS NOT NULL THEN
        SELECT * INTO v_att_policy FROM wpms_policies WHERE id = v_bundle_row.attendance_policy_id;
        IF FOUND THEN
          v_att_policy_id := v_att_policy.id; v_att_policy_version := v_att_policy.version;
          v_policy := COALESCE(v_att_policy.config, v_policy);
        END IF;
      END IF;
      IF v_bundle_row.holiday_calendar_id IS NOT NULL THEN
        SELECT * INTO v_hol_policy_row FROM wpms_policies WHERE id = v_bundle_row.holiday_calendar_id;
        IF FOUND THEN
          v_hol_policy_id := v_hol_policy_row.id; v_hol_policy_version := v_hol_policy_row.version;
          v_hol_policy := COALESCE(v_hol_policy_row.config, v_hol_policy);
        END IF;
      END IF;
    END IF;
  END IF;
  v_shift_id := COALESCE(s.shift_id, fn_employee_shift_at(s.employee_id, s.work_date));
  SELECT * INTO sh FROM shifts WHERE id = v_shift_id;
  IF sh.id IS NULL THEN
    SELECT s2.* INTO sh FROM shifts s2 JOIN employees e ON e.shift_id = s2.id WHERE e.id = s.employee_id;
  END IF;
  v_eff_in := s.clock_in; v_eff_out := s.clock_out;
  SELECT * INTO v_ex FROM attendance_exceptions
  WHERE employee_id = s.employee_id AND work_date = s.work_date AND status = 'Approved'
  ORDER BY resolved_at DESC NULLS LAST LIMIT 1;
  IF v_ex.id IS NOT NULL THEN
    v_eff_in := COALESCE(v_ex.approved_clock_in, v_ex.requested_clock_in, v_eff_in);
    v_eff_out := COALESCE(v_ex.approved_clock_out, v_ex.requested_clock_out, v_eff_out);
    v_operational := 'Exception';
  END IF;
  SELECT EXISTS (SELECT 1 FROM holidays h WHERE h.org_id = s.org_id AND h.holiday_date = s.work_date) INTO v_is_holiday;
  v_is_wo := fn_is_weekly_off_day(s.org_id, s.employee_id, s.work_date);
  IF v_is_holiday THEN v_payroll := 'Holiday'; v_operational := 'Holiday';
  ELSIF v_is_wo AND v_eff_in IS NULL THEN v_payroll := 'Weekly Off'; v_operational := 'Weekly Off';
  ELSIF v_eff_in IS NULL AND v_eff_out IS NULL THEN v_payroll := 'Absent'; v_operational := COALESCE(v_operational, 'Completed');
  ELSE
    v_grace := COALESCE((v_policy->>'grace_minutes')::int, sh.grace_min, 0);
    v_monthly_grace := COALESCE((v_policy->>'monthly_grace_minutes')::int, (v_policy->>'monthly_late_minutes_cap')::int, 30);
    v_max_late := COALESCE((v_policy->>'maximum_late_minutes')::int, 9999);
    v_min_present_min := COALESCE((v_policy->>'minimum_present_hours')::numeric, (v_policy->>'working_hours')::numeric, 9) * 60;
    v_min_half_min := COALESCE((v_policy->>'minimum_half_day_hours')::numeric, 4) * 60;
    IF v_eff_in IS NOT NULL AND sh.login_time IS NOT NULL THEN
      v_late := GREATEST(0, (EXTRACT(EPOCH FROM v_eff_in) - EXTRACT(EPOCH FROM sh.login_time)) / 60 - v_grace)::int;
    END IF;
    IF v_eff_out IS NOT NULL AND sh.logout_time IS NOT NULL THEN
      v_early := GREATEST(0, (EXTRACT(EPOCH FROM sh.logout_time) - EXTRACT(EPOCH FROM v_eff_out)) / 60)::int;
    END IF;
    v_scheduled_min := fn_shift_scheduled_work_minutes(sh.login_time, sh.logout_time, COALESCE(sh.break_min, 0));
    IF s.working_duration_min > 0 THEN v_ot := GREATEST(0, s.working_duration_min - v_scheduled_min::int); END IF;
    SELECT COALESCE(SUM(late_minutes), 0) INTO v_month_late FROM wtm_attendance_snapshots
    WHERE employee_id = s.employee_id AND date_trunc('month', work_date) = date_trunc('month', s.work_date) AND session_id != s.id;
    v_remaining_grace := GREATEST(0, v_monthly_grace - v_month_late - v_late);
    v_derived := fn_derive_status(v_eff_in, v_eff_out, 'Absent'::att_status,
      COALESCE(sh.login_time, '10:00'::time), COALESCE(sh.logout_time, '19:00'::time),
      COALESCE(sh.break_min, 0), false, s.break_duration_min, NULL, NULL);
    v_payroll := CASE (v_derived->>'status')
      WHEN 'Present' THEN 'Present'::wtm_payroll_status WHEN 'Half Day' THEN 'Half Day'::wtm_payroll_status
      WHEN 'Absent' THEN 'Absent'::wtm_payroll_status WHEN 'Holiday' THEN 'Holiday'::wtm_payroll_status
      WHEN 'Week Off' THEN 'Weekly Off'::wtm_payroll_status ELSE 'Absent'::wtm_payroll_status END;
    IF v_late > v_max_late AND v_payroll = 'Present' THEN v_payroll := 'Half Day'; END IF;
    IF s.working_duration_min > 0 AND s.working_duration_min < v_min_half_min::int THEN v_payroll := 'Absent';
    ELSIF s.working_duration_min >= v_min_half_min::int AND s.working_duration_min < v_min_present_min::int THEN v_payroll := 'Half Day';
    ELSIF s.working_duration_min >= v_min_present_min::int THEN v_payroll := 'Present';
    END IF;
    v_mispunch := COALESCE((v_derived->>'is_mispunch')::boolean, false);
    IF v_eff_in IS NOT NULL AND v_eff_out IS NULL AND s.session_status = 'Completed' THEN v_mispunch := true; END IF;
    v_operational := COALESCE(v_operational, 'Completed');
  END IF;
  INSERT INTO wre_evaluations (org_id, employee_id, session_id, work_date, trigger, trigger_ref_id,
    bundle_id, attendance_policy_id, holiday_policy_id, shift_id,
    bundle_version, attendance_policy_version, holiday_policy_version,
    policy_config, shift_snapshot, input_snapshot, result,
    payroll_status, operational_status, is_mispunch,
    late_minutes, early_exit_minutes, overtime_minutes,
    monthly_late_minutes, remaining_grace_minutes, evaluated_by, evaluated_by_label)
  VALUES (s.org_id, s.employee_id, s.id, s.work_date, p_trigger, p_trigger_ref,
    v_bundle, v_att_policy_id, v_hol_policy_id, sh.id,
    v_bundle_version, v_att_policy_version, v_hol_policy_version, v_policy,
    jsonb_build_object('login', sh.login_time, 'logout', sh.logout_time, 'grace_min', sh.grace_min, 'break_min', sh.break_min),
    jsonb_build_object('clock_in', s.clock_in, 'clock_out', s.clock_out,
      'working_min', s.working_duration_min, 'break_min', s.break_duration_min,
      'effective_in', v_eff_in, 'effective_out', v_eff_out, 'exception_id', v_ex.id),
    jsonb_build_object('is_holiday', v_is_holiday, 'is_weekly_off', v_is_wo,
      'monthly_grace', v_monthly_grace, 'derived', v_derived),
    v_payroll, v_operational, v_mispunch, v_late, v_early, v_ot,
    v_month_late + v_late, v_remaining_grace, p_actor_id, COALESCE(p_actor_label, 'System')) RETURNING * INTO v_eval;
  SELECT COALESCE(MAX(version), 0) + 1 INTO v_version FROM wtm_attendance_snapshots WHERE session_id = s.id;
  INSERT INTO wtm_attendance_snapshots (org_id, session_id, employee_id, work_date, evaluation_id, version,
    shift_id, clock_in, clock_out, working_duration_min, break_duration_min,
    late_minutes, early_exit_minutes, overtime_minutes, monthly_late_minutes, remaining_grace_minutes,
    payroll_status, operational_status, is_mispunch, bundle_version, attendance_policy_version, holiday_policy_version)
  VALUES (s.org_id, s.id, s.employee_id, s.work_date, v_eval.id, v_version,
    sh.id, s.clock_in, s.clock_out, s.working_duration_min, s.break_duration_min,
    v_late, v_early, v_ot, v_month_late + v_late, v_remaining_grace,
    v_payroll, v_operational, v_mispunch, v_bundle_version, v_att_policy_version, v_hol_policy_version);
  UPDATE wtm_attendance_sessions SET payroll_status = v_payroll,
    attendance_status = CASE v_payroll
      WHEN 'Weekly Off' THEN 'Weekly Off'::wtm_attendance_status
      WHEN 'Holiday' THEN 'Holiday'::wtm_attendance_status
      WHEN 'Half Day' THEN 'Half Day'::wtm_attendance_status
      WHEN 'Absent' THEN 'Absent'::wtm_attendance_status
      ELSE 'Present'::wtm_attendance_status END,
    session_status = CASE WHEN v_operational IN ('Holiday', 'Weekly Off', 'Exception') THEN v_operational ELSE session_status END,
    is_mispunch = v_mispunch, latest_evaluation_id = v_eval.id
    WHERE id = s.id;
  INSERT INTO audit_log (org_id, actor_id, actor_label, action, target, new_value)
  VALUES (s.org_id, p_actor_id, COALESCE(p_actor_label, 'System'),
    CASE WHEN p_trigger = 'manual_reeval' THEN 'Rule Re-Evaluation' ELSE 'Rule Evaluation' END,
    s.work_date::text || ' · ' || s.employee_id::text,
    v_payroll::text || ' · late ' || v_late || 'm');
  PERFORM fn_wtm_log_event(s.org_id, s.employee_id,
    CASE WHEN p_trigger IN ('manual_reeval', 'policy_change', 'calendar_change') THEN 'Rule Re-Evaluated' ELSE 'Rule Evaluated' END,
    s.id, NULL,
    jsonb_build_object('evaluation_id', v_eval.id, 'payroll_status', v_payroll,
      'late_minutes', v_late, 'remaining_grace', v_remaining_grace, 'policy_version', v_att_policy_version),
    p_actor_id, p_actor_label);
  PERFORM fn_wtm_sync_attendance_rollup(s.id);
  RETURN v_eval;
END; $$;
GRANT EXECUTE ON FUNCTION fn_wre_evaluate_session TO authenticated;

-- File 11: 20260741120000 Employee contact enhancements
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS official_communication_email text,
  ADD COLUMN IF NOT EXISTS preferred_contact_method text;
COMMENT ON COLUMN employees.emergency_contacts IS 'JSON array; index 0 = personal emergency {name, phone, relation, email, alternate_mobile, address}.';
COMMENT ON COLUMN employees.official_communication_email IS 'Official communication email — salary slips, HR notices, department mailbox, future notification routing.';
COMMENT ON COLUMN employees.preferred_contact_method IS 'Preferred contact channel: Personal Mobile, Company Mobile, Personal Email, Company Email, WhatsApp.';

DROP FUNCTION IF EXISTS fn_update_ess_personal_contact(uuid, text, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION fn_update_ess_personal_contact(
  p_org uuid, p_email text, p_mobile text,
  p_alternate_mobile text DEFAULT NULL,
  p_emergency_name text DEFAULT NULL, p_emergency_relation text DEFAULT NULL,
  p_emergency_phone text DEFAULT NULL, p_emergency_email text DEFAULT NULL,
  p_emergency_alternate_mobile text DEFAULT NULL, p_emergency_address text DEFAULT NULL
) RETURNS employees LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e employees; v_contact jsonb;
BEGIN
  SELECT * INTO e FROM employees WHERE org_id = p_org AND staff_id = auth.uid() FOR UPDATE;
  IF e.id IS NULL THEN RAISE EXCEPTION 'Employee profile not found for current user'; END IF;
  IF NULLIF(trim(p_email), '') IS NULL THEN RAISE EXCEPTION 'Personal email is required'; END IF;
  IF NULLIF(trim(p_mobile), '') IS NULL THEN RAISE EXCEPTION 'Personal mobile is required'; END IF;
  IF NULLIF(trim(p_emergency_name), '') IS NULL OR NULLIF(trim(p_emergency_relation), '') IS NULL
     OR NULLIF(trim(p_emergency_phone), '') IS NULL THEN
    RAISE EXCEPTION 'Personal emergency contact person, relationship, and number are required';
  END IF;
  v_contact := jsonb_build_array(jsonb_build_object(
    'name', trim(p_emergency_name), 'phone', trim(p_emergency_phone),
    'relation', trim(p_emergency_relation),
    'email', NULLIF(trim(COALESCE(p_emergency_email, '')), ''),
    'alternate_mobile', NULLIF(trim(COALESCE(p_emergency_alternate_mobile, '')), ''),
    'address', NULLIF(trim(COALESCE(p_emergency_address, '')), '')));
  UPDATE employees SET email = trim(p_email), mobile = trim(p_mobile),
    alternate_personal_mobile = NULLIF(trim(COALESCE(p_alternate_mobile, '')), ''),
    emergency_contacts = v_contact, emergency = trim(p_emergency_phone)
    WHERE id = e.id RETURNING * INTO e;
  INSERT INTO audit_log (org_id, actor_id, actor_label, action, target, new_value)
  VALUES (e.org_id, auth.uid(), fn_hr_actor_label(), 'ESS Personal Contact Updated', e.full_name, e.email);
  RETURN e;
END; $$;
GRANT EXECUTE ON FUNCTION fn_update_ess_personal_contact(uuid, text, text, text, text, text, text, text, text, text) TO authenticated;

-- File 12: 20260742120000 Approval clarify workflow
DO $$ BEGIN ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'Clarification Required'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'Pending Employee Response'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION fn_request_clarification(p_entity_type text, p_entity_id uuid, p_comment text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org uuid; v_emp uuid; v_status request_status; v_label text;
BEGIN
  IF NULLIF(trim(COALESCE(p_comment, '')), '') IS NULL THEN RAISE EXCEPTION 'Clarification comment is required'; END IF;
  IF p_entity_type = 'leave' THEN SELECT org_id, employee_id, status INTO v_org, v_emp, v_status FROM leave_requests WHERE id = p_entity_id FOR UPDATE;
  ELSIF p_entity_type = 'compoff' THEN SELECT org_id, employee_id, status INTO v_org, v_emp, v_status FROM compoff_requests WHERE id = p_entity_id FOR UPDATE;
  ELSIF p_entity_type = 'late' THEN SELECT org_id, employee_id, status INTO v_org, v_emp, v_status FROM late_exemptions WHERE id = p_entity_id FOR UPDATE;
  ELSIF p_entity_type = 'mispunch' THEN SELECT org_id, employee_id, status INTO v_org, v_emp, v_status FROM mispunch_requests WHERE id = p_entity_id FOR UPDATE;
  ELSE RAISE EXCEPTION 'Clarification not supported for entity type %', p_entity_type;
  END IF;
  IF v_org IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF v_status NOT IN ('Pending', 'Clarification Required', 'Pending Employee Response') THEN
    RAISE EXCEPTION 'Cannot request clarification for status %', v_status;
  END IF;
  IF NOT has_perm(v_org, 'approve') THEN RAISE EXCEPTION 'Not authorized to request clarification'; END IF;
  SELECT COALESCE(p.full_name, p.email, 'HR User') INTO v_label FROM profiles p WHERE p.id = auth.uid();
  UPDATE approvals SET comment = trim(p_comment) WHERE entity_type = p_entity_type AND entity_id = p_entity_id AND decision = 'Pending';
  IF p_entity_type = 'leave' THEN UPDATE leave_requests SET status = 'Clarification Required' WHERE id = p_entity_id;
  ELSIF p_entity_type = 'compoff' THEN UPDATE compoff_requests SET status = 'Clarification Required' WHERE id = p_entity_id;
  ELSIF p_entity_type = 'late' THEN UPDATE late_exemptions SET status = 'Clarification Required' WHERE id = p_entity_id;
  ELSIF p_entity_type = 'mispunch' THEN UPDATE mispunch_requests SET status = 'Clarification Required' WHERE id = p_entity_id;
  END IF;
  INSERT INTO audit_log (org_id, actor_id, actor_label, action, target, new_value)
  VALUES (v_org, auth.uid(), v_label, 'Clarification Requested', p_entity_id::text, trim(p_comment));
  RETURN jsonb_build_object('entity_type', p_entity_type, 'entity_id', p_entity_id, 'status', 'Clarification Required');
END; $$;

CREATE OR REPLACE FUNCTION fn_resubmit_after_clarification(p_entity_type text, p_entity_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org uuid; v_emp uuid; v_status request_status; v_actor uuid;
BEGIN
  IF p_entity_type = 'leave' THEN SELECT org_id, employee_id, status INTO v_org, v_emp, v_status FROM leave_requests WHERE id = p_entity_id FOR UPDATE;
  ELSIF p_entity_type = 'compoff' THEN SELECT org_id, employee_id, status INTO v_org, v_emp, v_status FROM compoff_requests WHERE id = p_entity_id FOR UPDATE;
  ELSIF p_entity_type = 'late' THEN SELECT org_id, employee_id, status INTO v_org, v_emp, v_status FROM late_exemptions WHERE id = p_entity_id FOR UPDATE;
  ELSIF p_entity_type = 'mispunch' THEN SELECT org_id, employee_id, status INTO v_org, v_emp, v_status FROM mispunch_requests WHERE id = p_entity_id FOR UPDATE;
  ELSE RAISE EXCEPTION 'Resubmit not supported for entity type %', p_entity_type;
  END IF;
  IF v_org IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF v_status NOT IN ('Clarification Required', 'Pending Employee Response') THEN
    RAISE EXCEPTION 'Request is not awaiting employee clarification';
  END IF;
  v_actor := current_employee_id(v_org);
  IF v_actor IS NULL OR v_actor <> v_emp THEN
    IF NOT (has_perm(v_org, 'approve') OR has_perm(v_org, 'apply')) THEN RAISE EXCEPTION 'Not authorized to resubmit this request'; END IF;
    IF NOT has_perm(v_org, 'approve') AND v_actor <> v_emp THEN RAISE EXCEPTION 'Only the employee may resubmit after clarification'; END IF;
  END IF;
  IF p_entity_type = 'leave' THEN UPDATE leave_requests SET status = 'Pending' WHERE id = p_entity_id;
  ELSIF p_entity_type = 'compoff' THEN UPDATE compoff_requests SET status = 'Pending' WHERE id = p_entity_id;
  ELSIF p_entity_type = 'late' THEN UPDATE late_exemptions SET status = 'Pending' WHERE id = p_entity_id;
  ELSIF p_entity_type = 'mispunch' THEN UPDATE mispunch_requests SET status = 'Pending' WHERE id = p_entity_id;
  END IF;
  INSERT INTO audit_log (org_id, actor_id, actor_label, action, target, new_value)
  VALUES (v_org, auth.uid(), fn_hr_actor_label(), 'Clarification Resubmitted', p_entity_id::text, 'Pending');
  RETURN jsonb_build_object('entity_type', p_entity_type, 'entity_id', p_entity_id, 'status', 'Pending');
END; $$;

CREATE OR REPLACE FUNCTION trg_leave_resubmit_on_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('Clarification Required', 'Pending Employee Response') AND NEW.status = OLD.status
     AND (NEW.reason IS DISTINCT FROM OLD.reason OR NEW.from_date IS DISTINCT FROM OLD.from_date
       OR NEW.to_date IS DISTINCT FROM OLD.to_date OR NEW.document_id IS DISTINCT FROM OLD.document_id) THEN
    NEW.status := 'Pending';
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION trg_compoff_resubmit_on_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('Clarification Required', 'Pending Employee Response') AND NEW.status = OLD.status
     AND (NEW.reason IS DISTINCT FROM OLD.reason OR NEW.worked_date IS DISTINCT FROM OLD.worked_date
       OR NEW.occasion IS DISTINCT FROM OLD.occasion) THEN
    NEW.status := 'Pending';
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION trg_late_resubmit_on_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('Clarification Required', 'Pending Employee Response') AND NEW.status = OLD.status
     AND (NEW.reason IS DISTINCT FROM OLD.reason OR NEW.delay_min IS DISTINCT FROM OLD.delay_min
       OR NEW.late_date IS DISTINCT FROM OLD.late_date) THEN
    NEW.status := 'Pending';
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION trg_mispunch_resubmit_on_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('Clarification Required', 'Pending Employee Response') AND NEW.status = OLD.status
     AND (NEW.issue IS DISTINCT FROM OLD.issue OR NEW.evidence IS DISTINCT FROM OLD.evidence
       OR NEW.punch_date IS DISTINCT FROM OLD.punch_date) THEN
    NEW.status := 'Pending';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_leave_resubmit_clarify ON leave_requests;
CREATE TRIGGER trg_leave_resubmit_clarify BEFORE UPDATE ON leave_requests FOR EACH ROW EXECUTE FUNCTION trg_leave_resubmit_on_update();
DROP TRIGGER IF EXISTS trg_compoff_resubmit_clarify ON compoff_requests;
CREATE TRIGGER trg_compoff_resubmit_clarify BEFORE UPDATE ON compoff_requests FOR EACH ROW EXECUTE FUNCTION trg_compoff_resubmit_on_update();
DROP TRIGGER IF EXISTS trg_late_resubmit_clarify ON late_exemptions;
CREATE TRIGGER trg_late_resubmit_clarify BEFORE UPDATE ON late_exemptions FOR EACH ROW EXECUTE FUNCTION trg_late_resubmit_on_update();
DROP TRIGGER IF EXISTS trg_mispunch_resubmit_clarify ON mispunch_requests;
CREATE TRIGGER trg_mispunch_resubmit_clarify BEFORE UPDATE ON mispunch_requests FOR EACH ROW EXECUTE FUNCTION trg_mispunch_resubmit_on_update();

GRANT EXECUTE ON FUNCTION fn_request_clarification(text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_resubmit_after_clarification(text, uuid) TO authenticated;

-- File 13: 20260742220000 Training extension enhancements
ALTER TABLE training_records
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS original_end_date date,
  ADD COLUMN IF NOT EXISTS extended_end_date date,
  ADD COLUMN IF NOT EXISTS extension_reason text,
  ADD COLUMN IF NOT EXISTS extension_remarks text,
  ADD COLUMN IF NOT EXISTS extended_by_id uuid,
  ADD COLUMN IF NOT EXISTS extended_by_label text,
  ADD COLUMN IF NOT EXISTS extended_at timestamptz,
  ADD COLUMN IF NOT EXISTS completion_reason text,
  ADD COLUMN IF NOT EXISTS completion_date date,
  ADD COLUMN IF NOT EXISTS completion_requested_by_id uuid,
  ADD COLUMN IF NOT EXISTS completion_requested_by_label text,
  ADD COLUMN IF NOT EXISTS completion_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS manager_approved_by_label text,
  ADD COLUMN IF NOT EXISTS manager_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS hr_approved_by_label text,
  ADD COLUMN IF NOT EXISTS hr_approved_at timestamptz;

CREATE TABLE IF NOT EXISTS training_extension_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  training_id uuid NOT NULL REFERENCES training_records(id) ON DELETE CASCADE,
  original_end_date date,
  extended_end_date date NOT NULL,
  extension_reason text NOT NULL,
  extension_remarks text,
  extended_by_id uuid,
  extended_by_label text,
  extended_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_extension_history TO authenticated;
GRANT ALL ON public.training_extension_history TO service_role;
ALTER TABLE training_extension_history ADD COLUMN IF NOT EXISTS extension_remarks text;
CREATE INDEX IF NOT EXISTS idx_training_extension_history_training ON training_extension_history (training_id, extended_at DESC);
ALTER TABLE training_extension_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS train_ext_hist_select ON training_extension_history;
CREATE POLICY train_ext_hist_select ON training_extension_history FOR SELECT USING (
  is_hr(org_id) OR EXISTS (SELECT 1 FROM training_records tr
    WHERE tr.id = training_extension_history.training_id
      AND (manages_employee(tr.org_id, tr.employee_id) OR tr.employee_id = current_employee_id(tr.org_id))));
DROP POLICY IF EXISTS train_ext_hist_write ON training_extension_history;
CREATE POLICY train_ext_hist_write ON training_extension_history FOR ALL USING (has_perm(org_id, 'approve')) WITH CHECK (has_perm(org_id, 'approve'));

CREATE OR REPLACE FUNCTION fn_extend_training(
  p_training_id uuid, p_extended_until date, p_reason text,
  p_remarks text DEFAULT NULL, p_type_override text DEFAULT NULL
) RETURNS training_records LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r training_records; v_actor uuid; v_label text; v_prev_end date;
BEGIN
  IF trim(COALESCE(p_reason, '')) = '' THEN RAISE EXCEPTION 'Extension reason is required'; END IF;
  IF p_extended_until IS NULL THEN RAISE EXCEPTION 'Extended until date is required'; END IF;
  SELECT * INTO r FROM training_records WHERE id = p_training_id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Training record not found'; END IF;
  IF NOT has_perm(r.org_id, 'approve') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF r.status IN ('Completed', 'Cancelled', 'Rejected', 'Pending Manager Approval', 'Pending HR Approval') THEN
    RAISE EXCEPTION 'Cannot extend training in status %', r.status;
  END IF;
  v_actor := current_employee_id(r.org_id);
  SELECT COALESCE(p.full_name, p.email, 'HR User') INTO v_label FROM profiles p WHERE p.id = auth.uid();
  v_prev_end := COALESCE(r.extended_end_date, r.end_date, r.start_date);
  IF v_prev_end IS NOT NULL AND p_extended_until < v_prev_end THEN
    RAISE EXCEPTION 'Extended until date must be on or after current end date';
  END IF;
  UPDATE training_records SET
    original_end_date = COALESCE(original_end_date, end_date),
    extended_end_date = p_extended_until,
    extension_reason = trim(p_reason),
    extension_remarks = NULLIF(trim(COALESCE(p_remarks, '')), ''),
    type = CASE WHEN NULLIF(trim(COALESCE(p_type_override, '')), '') IS NOT NULL THEN trim(p_type_override) ELSE type END,
    extended_by_id = v_actor, extended_by_label = v_label,
    extended_at = now(), status = 'Extended'
    WHERE id = p_training_id RETURNING * INTO r;
  INSERT INTO training_extension_history (
    org_id, training_id, original_end_date, extended_end_date,
    extension_reason, extension_remarks, extended_by_id, extended_by_label
  ) VALUES (r.org_id, r.id, COALESCE(r.original_end_date, r.end_date), p_extended_until, trim(p_reason),
    NULLIF(trim(COALESCE(p_remarks, '')), ''), v_actor, v_label);
  RETURN r;
END; $$;

CREATE OR REPLACE FUNCTION fn_finalize_training_on_approve(p_training_id uuid)
RETURNS training_records LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r training_records; v_label text;
BEGIN
  SELECT * INTO r FROM training_records WHERE id = p_training_id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Training record not found'; END IF;
  SELECT COALESCE(p.full_name, p.email, 'HR User') INTO v_label FROM profiles p WHERE p.id = auth.uid();
  UPDATE training_records SET status = 'Completed',
    completion_date = COALESCE(completion_date, CURRENT_DATE),
    hr_approved_by_label = v_label, hr_approved_at = now()
    WHERE id = p_training_id RETURNING * INTO r;
  RETURN r;
END; $$;

GRANT EXECUTE ON FUNCTION fn_extend_training(uuid, date, text, text, text) TO authenticated;