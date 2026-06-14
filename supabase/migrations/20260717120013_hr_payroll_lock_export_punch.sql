-- =====================================================================
-- HR Payroll — Lock snapshots, register export, punch guards
-- Run after 20260717120012_hr_payroll_policy_engine_approvals.sql
-- =====================================================================

ALTER TABLE payroll_lines
  ADD COLUMN IF NOT EXISTS input_snapshot jsonb;

-- True when work_date falls inside a locked payroll cycle for the org
CREATE OR REPLACE FUNCTION fn_attendance_cycle_locked(p_org uuid, p_work_date date)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM payroll_cycles pc
    WHERE pc.org_id = p_org
      AND pc.status = 'Locked'
      AND p_work_date BETWEEN pc.start_date AND pc.end_date
  );
$$;

CREATE OR REPLACE FUNCTION trg_attendance_locked_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF fn_attendance_cycle_locked(COALESCE(NEW.org_id, OLD.org_id), COALESCE(NEW.work_date, OLD.work_date)) THEN
    RAISE EXCEPTION 'Attendance frozen — payroll cycle is locked for %', COALESCE(NEW.work_date, OLD.work_date);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS attendance_locked_guard ON attendance;
CREATE TRIGGER attendance_locked_guard
  BEFORE INSERT OR UPDATE OR DELETE ON attendance
  FOR EACH ROW EXECUTE FUNCTION trg_attendance_locked_guard();

-- Rebuild all lines, snapshot rollup inputs, then lock cycle
CREATE OR REPLACE FUNCTION fn_lock_payroll_cycle(p_cycle uuid)
RETURNS payroll_cycles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c payroll_cycles;
  e record;
  v_missing int;
BEGIN
  SELECT * INTO c FROM payroll_cycles WHERE id = p_cycle FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Cycle not found'; END IF;
  IF c.status <> 'Draft' THEN RAISE EXCEPTION 'Cycle already %', c.status; END IF;
  IF NOT has_perm(c.org_id, 'approve') THEN RAISE EXCEPTION 'Approve permission required'; END IF;

  SELECT COUNT(*) INTO v_missing
  FROM employees emp
  WHERE emp.org_id = c.org_id
    AND emp.status NOT IN ('Terminated', 'Resigned')
    AND NOT EXISTS (
      SELECT 1 FROM payroll_lines pl
      WHERE pl.cycle_id = p_cycle AND pl.employee_id = emp.id
    );

  FOR e IN
    SELECT id FROM employees
    WHERE org_id = c.org_id AND status NOT IN ('Terminated', 'Resigned')
  LOOP
    PERFORM fn_build_payroll_line(e.id, p_cycle);
    UPDATE payroll_lines
    SET input_snapshot = fn_rollup_inputs(e.id, p_cycle)
    WHERE cycle_id = p_cycle AND employee_id = e.id;
  END LOOP;

  UPDATE payroll_cycles
  SET status = 'Locked', approved_at = now()
  WHERE id = p_cycle
  RETURNING * INTO c;

  INSERT INTO audit_log (org_id, actor_label, action, target, new_value)
  VALUES (
    c.org_id, 'HR', 'Payroll Locked', c.label,
    c.status || ' · ' || (SELECT COUNT(*)::text FROM payroll_lines WHERE cycle_id = p_cycle) || ' lines'
  );

  RETURN c;
END;
$$;

CREATE OR REPLACE FUNCTION fn_reopen_payroll_cycle(p_cycle uuid, p_reason text DEFAULT NULL)
RETURNS payroll_cycles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c payroll_cycles;
BEGIN
  SELECT * INTO c FROM payroll_cycles WHERE id = p_cycle FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Cycle not found'; END IF;
  IF c.status <> 'Locked' THEN RAISE EXCEPTION 'Only locked cycles can be reopened'; END IF;
  IF NOT (has_perm(c.org_id, 'configure') OR has_perm(c.org_id, 'approve')) THEN
    RAISE EXCEPTION 'Configure or approve permission required';
  END IF;

  UPDATE payroll_cycles SET status = 'Draft', approved_at = NULL
  WHERE id = p_cycle RETURNING * INTO c;

  INSERT INTO audit_log (org_id, actor_label, action, target, prev_value, new_value)
  VALUES (
    c.org_id, 'HR', 'Payroll Reopened', c.label,
    'Locked', COALESCE(NULLIF(trim(p_reason), ''), 'No reason given')
  );

  RETURN c;
END;
$$;

-- Server-side register export (matches v_payroll_preview)
CREATE OR REPLACE FUNCTION fn_export_payroll_register(p_cycle uuid, p_branch text DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'emp_code', v.emp_code,
        'full_name', v.full_name,
        'designation', v.designation,
        'department', v.department,
        'company_name', v.company_name,
        'branch_name', v.branch_name,
        'cycle_label', v.cycle_label,
        'cycle_status', v.cycle_status,
        'mispunch_count', v.mispunch_count,
        'late_count', v.late_count,
        'leaves_taken', v.leaves_taken,
        'paid_leaves', v.paid_leaves,
        'comp_off', v.comp_off,
        'ul_count', v.ul_count,
        'sandwich_count', v.sandwich_count,
        'unpaid_training', v.unpaid_training,
        'late_deduction', v.late_deduction,
        'mispunch_deduction', v.mispunch_deduction,
        'payable_days', v.payable_days,
        'daily_rate', v.daily_rate,
        'gross_earned', v.gross_earned,
        'incentive', v.incentive,
        'bonus', v.bonus,
        'pf_employee', v.pf_employee,
        'esic_employee', v.esic_employee,
        'net_salary', v.net_salary,
        'is_overridden', v.is_overridden
      )
      ORDER BY v.full_name
    ),
    '[]'::jsonb
  )
  FROM v_payroll_preview v
  WHERE v.cycle_id = p_cycle
    AND (
      p_branch IS NULL OR p_branch = '' OR p_branch = 'All'
      OR v.branch_name = p_branch
    );
$$;

-- Start attendance day (upsert today row, duplicate-safe)
CREATE OR REPLACE FUNCTION fn_start_attendance_day(
  p_employee uuid,
  p_check_in time DEFAULT NULL
) RETURNS attendance LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  e employees;
  v_date date := current_date;
  v_time time := COALESCE(p_check_in, current_time);
  row attendance;
BEGIN
  SELECT * INTO e FROM employees WHERE id = p_employee;
  IF e.id IS NULL THEN RAISE EXCEPTION 'Employee not found'; END IF;

  IF fn_attendance_cycle_locked(e.org_id, v_date) THEN
    RAISE EXCEPTION 'Attendance frozen — payroll cycle is locked for %', v_date;
  END IF;

  INSERT INTO attendance (org_id, employee_id, work_date, check_in, status, is_mispunch, source)
  VALUES (e.org_id, p_employee, v_date, v_time, 'Present', false, 'self')
  ON CONFLICT (employee_id, work_date) DO UPDATE SET
    check_in = COALESCE(attendance.check_in, EXCLUDED.check_in),
    source = 'self'
  RETURNING * INTO row;

  RETURN row;
END;
$$;

-- Record a punch field with locked-cycle guard
CREATE OR REPLACE FUNCTION fn_record_punch(
  p_attendance uuid,
  p_field text,
  p_time time DEFAULT NULL
) RETURNS attendance LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  a attendance;
  v_time time := COALESCE(p_time, current_time);
  sh record;
BEGIN
  IF p_field NOT IN ('check_in', 'check_out', 'break_start', 'break_end') THEN
    RAISE EXCEPTION 'Invalid punch field %', p_field;
  END IF;

  SELECT * INTO a FROM attendance WHERE id = p_attendance FOR UPDATE;
  IF a.id IS NULL THEN RAISE EXCEPTION 'Attendance row not found'; END IF;

  IF fn_attendance_cycle_locked(a.org_id, a.work_date) THEN
    RAISE EXCEPTION 'Attendance frozen — payroll cycle is locked for %', a.work_date;
  END IF;

  SELECT s.* INTO sh FROM shifts s JOIN employees e ON e.shift_id = s.id WHERE e.id = a.employee_id;

  IF p_field = 'check_in' AND sh.id IS NOT NULL THEN
    IF v_time < (sh.login_time - make_interval(mins => LEAST(COALESCE(sh.grace_min, 5) + 120, 180))) THEN
      RAISE EXCEPTION 'Check-in too early for shift (login %)', sh.login_time;
    END IF;
  END IF;

  IF p_field = 'check_out' AND sh.id IS NOT NULL AND sh.logout_time IS NOT NULL THEN
    IF v_time > (sh.logout_time + interval '2 hours') THEN
      RAISE EXCEPTION 'Check-out too late for shift (logout %)', sh.logout_time;
    END IF;
  END IF;

  IF p_field = 'check_in' THEN
    UPDATE attendance SET check_in = v_time, source = 'self' WHERE id = p_attendance RETURNING * INTO a;
  ELSIF p_field = 'check_out' THEN
    UPDATE attendance SET check_out = v_time, source = 'self' WHERE id = p_attendance RETURNING * INTO a;
  ELSIF p_field = 'break_start' THEN
    UPDATE attendance SET break_start = v_time, source = 'self' WHERE id = p_attendance RETURNING * INTO a;
  ELSIF p_field = 'break_end' THEN
    UPDATE attendance SET break_end = v_time, source = 'self' WHERE id = p_attendance RETURNING * INTO a;
  END IF;

  RETURN a;
END;
$$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig FROM pg_proc p
    WHERE p.proname IN (
      'fn_attendance_cycle_locked',
      'fn_lock_payroll_cycle',
      'fn_reopen_payroll_cycle',
      'fn_export_payroll_register',
      'fn_start_attendance_day',
      'fn_record_punch'
    )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END $$;
