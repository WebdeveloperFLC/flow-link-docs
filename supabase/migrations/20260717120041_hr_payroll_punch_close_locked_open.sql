-- =====================================================================
-- HR Payroll — Allow checkout on open sessions in locked cycles
-- Employees must be able to close check_in without check_out (stale sessions).
-- Shift rules unchanged; only completes an already-open punch row.
-- =====================================================================

CREATE OR REPLACE FUNCTION fn_attendance_close_only_update(
  p_old attendance,
  p_new attendance
) RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF p_old.check_in IS NULL OR p_old.check_out IS NOT NULL THEN
    RETURN false;
  END IF;

  -- Closing the day: only check_out (+ derived status fields from trigger).
  IF p_new.check_out IS NOT NULL
     AND p_new.check_in IS NOT DISTINCT FROM p_old.check_in
     AND p_new.break_start IS NOT DISTINCT FROM p_old.break_start
     AND p_new.break_end IS NOT DISTINCT FROM p_old.break_end
     AND p_new.work_date = p_old.work_date
     AND p_new.employee_id = p_old.employee_id
  THEN
    RETURN true;
  END IF;

  -- Ending break on open session.
  IF p_old.break_start IS NOT NULL
     AND p_old.break_end IS NULL
     AND p_new.break_end IS NOT NULL
     AND p_new.check_in IS NOT DISTINCT FROM p_old.check_in
     AND p_new.check_out IS NOT DISTINCT FROM p_old.check_out
     AND p_new.break_start IS NOT DISTINCT FROM p_old.break_start
  THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION trg_attendance_locked_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
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

CREATE OR REPLACE FUNCTION fn_record_punch(
  p_attendance uuid,
  p_field text,
  p_time time DEFAULT NULL
) RETURNS attendance LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  a attendance;
  v_time time := COALESCE(p_time, current_time);
  v_locked boolean;
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

  v_locked := fn_attendance_cycle_locked(a.org_id, a.work_date);

  IF v_locked THEN
    IF p_field = 'check_out' AND a.check_in IS NOT NULL AND a.check_out IS NULL THEN
      NULL; -- allow closing open session
    ELSIF p_field = 'break_end' AND a.break_start IS NOT NULL AND a.break_end IS NULL THEN
      NULL; -- allow ending break on open session
    ELSE
      RAISE EXCEPTION 'Attendance frozen — payroll cycle is locked for %', a.work_date;
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
      'fn_attendance_close_only_update',
      'fn_record_punch'
    )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END $$;
