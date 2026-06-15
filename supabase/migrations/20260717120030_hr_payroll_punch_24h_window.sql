-- =====================================================================
-- HR Payroll — 24-hour punch window
-- Shift login/logout stay fixed for late / half-day / OT reference.
-- Employees may check in and check out at any time (no shift-window block).
-- =====================================================================

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

  IF fn_attendance_cycle_locked(a.org_id, a.work_date) THEN
    RAISE EXCEPTION 'Attendance frozen — payroll cycle is locked for %', a.work_date;
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

-- Half-day only when arrival is very late but still within official shift hours.
-- Early punch (before login) or after-shift punch → Present; late rollup uses shift window separately.
CREATE OR REPLACE FUNCTION fn_derive_status(
  p_in time,
  p_out time,
  p_status att_status,
  p_login time,
  p_logout time,
  p_half_after int,
  p_is_mispunch boolean
) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  ci int;
  co int;
  lg int;
  lo int;
  mp boolean;
  st att_status;
BEGIN
  IF p_status IN ('Leave', 'Sick Leave', 'Week Off', 'Holiday', 'Unauthorized Leave') THEN
    RETURN jsonb_build_object('status', p_status, 'is_mispunch', p_is_mispunch);
  END IF;

  ci := CASE WHEN p_in IS NULL THEN NULL ELSE extract(epoch FROM p_in) / 60 END;
  co := CASE WHEN p_out IS NULL THEN NULL ELSE extract(epoch FROM p_out) / 60 END;
  lg := extract(epoch FROM COALESCE(p_login, '10:00')) / 60;
  lo := extract(epoch FROM COALESCE(p_logout, '19:00')) / 60;

  IF ci IS NULL AND co IS NULL THEN
    RETURN jsonb_build_object('status', 'Absent', 'is_mispunch', false);
  END IF;

  mp := (ci IS NULL) <> (co IS NULL);
  st := 'Present';

  IF ci IS NOT NULL
     AND ci > lg + COALESCE(p_half_after, 60)
     AND ci <= lo THEN
    st := 'Half Day';
  END IF;

  RETURN jsonb_build_object('status', st, 'is_mispunch', mp);
END;
$$;

CREATE OR REPLACE FUNCTION trg_attendance_derive() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  sh record;
  d jsonb;
BEGIN
  SELECT s.* INTO sh FROM shifts s JOIN employees e ON e.shift_id = s.id WHERE e.id = NEW.employee_id;
  d := fn_derive_status(
    NEW.check_in,
    NEW.check_out,
    NEW.status,
    COALESCE(sh.login_time, '10:00'),
    COALESCE(sh.logout_time, '19:00'),
    COALESCE(sh.half_day_after_min, 60),
    NEW.is_mispunch
  );
  IF NEW.status NOT IN ('Leave', 'Sick Leave', 'Week Off', 'Holiday', 'Unauthorized Leave') THEN
    NEW.status := (d->>'status')::att_status;
    NEW.is_mispunch := (d->>'is_mispunch')::boolean;
  END IF;
  IF NEW.break_min IS NULL AND NEW.break_start IS NOT NULL AND NEW.break_end IS NOT NULL THEN
    NEW.break_min := greatest(0, (extract(epoch FROM NEW.break_end) - extract(epoch FROM NEW.break_start)) / 60);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fn_rollup_inputs(p_employee uuid, p_cycle uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE AS $$
DECLARE
  c record;
  e record;
  sh record;
  v_late int := 0;
  v_mis int := 0;
  v_leaves numeric := 0;
  v_woff int := 0;
  v_working numeric := 0;
  v_ul int := 0;
  v_paid numeric := 0;
  v_compoff numeric := 0;
  v_sandwich numeric := 0;
  v_train int := 0;
  v_late_exempt int := 0;
  v_mis_approved int := 0;
BEGIN
  SELECT * INTO c FROM payroll_cycles WHERE id = p_cycle;
  SELECT * INTO e FROM employees WHERE id = p_employee;
  SELECT * INTO sh FROM shifts WHERE id = e.shift_id;

  SELECT
    count(*) FILTER (WHERE status = 'Present')
      + count(*) FILTER (WHERE status = 'Half Day') * 0.5,
    count(*) FILTER (WHERE status IN ('Leave', 'Sick Leave')),
    count(*) FILTER (WHERE status IN ('Week Off', 'Holiday')),
    count(*) FILTER (WHERE status = 'Unauthorized Leave'),
    count(*) FILTER (WHERE is_mispunch)
      + count(*) FILTER (WHERE status = 'Absent'),
    count(*) FILTER (
      WHERE check_in IS NOT NULL
        AND check_in >= (COALESCE(sh.login_time, '10:00') + make_interval(mins => COALESCE(sh.grace_min, 5)))
        AND check_in <= COALESCE(sh.logout_time, '19:00')
        AND status NOT IN ('Week Off', 'Holiday', 'Leave', 'Sick Leave', 'Unauthorized Leave', 'Absent')
    )
  INTO v_working, v_leaves, v_woff, v_ul, v_mis, v_late
  FROM attendance
  WHERE employee_id = p_employee AND work_date BETWEEN c.start_date AND c.end_date;

  SELECT COALESCE(sum(days), 0) INTO v_paid FROM leave_requests
  WHERE employee_id = p_employee AND status = 'Approved' AND type <> 'Unpaid Leave'
    AND from_date BETWEEN c.start_date AND c.end_date;

  SELECT count(*) INTO v_compoff FROM compoff_requests
  WHERE employee_id = p_employee AND status = 'Approved'
    AND worked_date BETWEEN c.start_date AND c.end_date;

  SELECT count(*) INTO v_late_exempt FROM late_exemptions
  WHERE employee_id = p_employee AND status = 'Approved'
    AND delay_min > COALESCE(sh.grace_min, 5)
    AND late_date BETWEEN c.start_date AND c.end_date;

  SELECT count(*) INTO v_mis_approved FROM mispunch_requests
  WHERE employee_id = p_employee AND status = 'Approved'
    AND punch_date BETWEEN c.start_date AND c.end_date;

  SELECT COALESCE(sum(CASE WHEN is_sandwich THEN 1 ELSE 0 END), 0) INTO v_sandwich
  FROM leave_requests
  WHERE employee_id = p_employee AND status = 'Approved'
    AND from_date BETWEEN c.start_date AND c.end_date;

  SELECT COALESCE(sum(unpaid_days), 0) INTO v_train FROM training_records
  WHERE employee_id = p_employee AND status <> 'Cancelled';

  RETURN jsonb_build_object(
    'late', greatest(0, v_late - v_late_exempt),
    'mispunch', greatest(0, v_mis - v_mis_approved),
    'leaves', v_leaves,
    'paid_leaves', v_paid,
    'comp_off', v_compoff,
    'ul', v_ul,
    'sandwich', v_sandwich,
    'unpaid_training', v_train,
    'working', round(v_working, 1),
    'week_off', v_woff
  );
END;
$$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig FROM pg_proc p
    WHERE p.proname IN ('fn_record_punch', 'fn_derive_status', 'fn_rollup_inputs')
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END $$;
