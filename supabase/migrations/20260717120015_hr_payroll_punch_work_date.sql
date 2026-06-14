-- =====================================================================
-- HR Payroll — Punch work_date from client (timezone parity) + ESS guard
-- Run after 20260717120014_hr_payroll_overtime_pay.sql
-- =====================================================================

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

  IF fn_attendance_cycle_locked(e.org_id, v_date) THEN
    RAISE EXCEPTION 'Attendance frozen — payroll cycle is locked for %', v_date;
  END IF;

  INSERT INTO attendance (org_id, employee_id, work_date, check_in, status, is_mispunch, source)
  VALUES (e.org_id, p_employee, v_date, v_time, 'Present', false, 'self')
  ON CONFLICT (employee_id, work_date) DO UPDATE SET
    check_in = COALESCE(attendance.check_in, EXCLUDED.check_in),
    status = CASE
      WHEN attendance.status IN ('Week Off', 'Holiday', 'Leave', 'Sick Leave') THEN attendance.status
      ELSE 'Present'
    END,
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
    WHERE p.proname = 'fn_start_attendance_day'
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END $$;
