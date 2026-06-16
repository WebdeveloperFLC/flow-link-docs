-- =====================================================================
-- HR Payroll — FINAL punch fix (self-service always works)
-- 1. Required attendance columns (if migration 31/42 skipped)
-- 2. ESS punches (source=self) never blocked by payroll cycle lock
-- 3. Re-check-in after checkout same day; new day start anytime
-- Shift hours / salary rules unchanged — lock only blocks HR manual edits.
-- =====================================================================

ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS shift_work_min int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS off_shift_min int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ess_unavailable boolean NOT NULL DEFAULT false;

ALTER TABLE payroll_lines
  ADD COLUMN IF NOT EXISTS off_shift_minutes int NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION fn_attendance_close_only_update(
  p_old attendance,
  p_new attendance
) RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF p_old.check_in IS NULL OR p_old.check_out IS NOT NULL THEN
    RETURN false;
  END IF;
  IF p_new.check_out IS NOT NULL
     AND p_new.check_in IS NOT DISTINCT FROM p_old.check_in
     AND p_new.break_start IS NOT DISTINCT FROM p_old.break_start
     AND p_new.break_end IS NOT DISTINCT FROM p_old.break_end
     AND p_new.work_date = p_old.work_date
     AND p_new.employee_id = p_old.employee_id THEN
    RETURN true;
  END IF;
  IF p_old.break_start IS NOT NULL AND p_old.break_end IS NULL
     AND p_new.break_end IS NOT NULL
     AND p_new.check_in IS NOT DISTINCT FROM p_old.check_in
     AND p_new.check_out IS NOT DISTINCT FROM p_old.check_out
     AND p_new.break_start IS NOT DISTINCT FROM p_old.break_start THEN
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION trg_attendance_locked_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Employee self punches always allowed (24h / off-shift); payroll lock is for HR edits only.
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
  RETURN NEW;
END;
$$;

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

CREATE OR REPLACE FUNCTION fn_record_punch(
  p_attendance uuid,
  p_field text,
  p_time time DEFAULT NULL
) RETURNS attendance LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  a attendance;
  v_time time := COALESCE(p_time, current_time);
BEGIN
  IF p_field NOT IN ('check_in', 'check_out', 'break_start', 'break_end') THEN
    RAISE EXCEPTION 'Invalid punch field %', p_field;
  END IF;

  SELECT * INTO a FROM attendance WHERE id = p_attendance FOR UPDATE;
  IF a.id IS NULL THEN RAISE EXCEPTION 'Attendance row not found'; END IF;

  IF a.employee_id <> current_employee_id(a.org_id)
     AND NOT manages_employee(a.org_id, a.employee_id)
     AND NOT has_perm(a.org_id, 'manage_emp') THEN
    RAISE EXCEPTION 'Not authorized to punch this attendance row';
  END IF;

  IF p_field = 'check_in' THEN
    IF a.check_in IS NOT NULL AND a.check_out IS NULL THEN
      RAISE EXCEPTION 'Already checked in — check out first or wait until session ends';
    END IF;
    UPDATE attendance SET
      check_in = v_time,
      check_out = NULL,
      break_start = NULL,
      break_end = NULL,
      break_min = NULL,
      ess_unavailable = false,
      source = 'self'
    WHERE id = p_attendance RETURNING * INTO a;
  ELSIF p_field = 'check_out' THEN
    IF a.check_in IS NULL THEN
      RAISE EXCEPTION 'Check in before checking out';
    END IF;
    IF a.check_out IS NOT NULL THEN
      RAISE EXCEPTION 'Already checked out for this day';
    END IF;
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
      'fn_attendance_close_only_update',
      'fn_start_attendance_day',
      'fn_record_punch'
    )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END $$;
