-- =====================================================================
-- HR Payroll — 24h punch for all shifts (day + overnight night)
-- Re-applies punch freedom if migration 13 guards still live.
-- Fixes night shifts (logout < login), overnight sessions, off-shift no penalty.
-- =====================================================================

CREATE OR REPLACE FUNCTION fn_punch_on_timeline(
  p_min numeric,
  p_login numeric,
  p_logout numeric
) RETURNS numeric LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF p_logout < p_login AND p_min <= p_logout THEN
    RETURN p_min + 24 * 60;
  END IF;
  RETURN p_min;
END;
$$;

CREATE OR REPLACE FUNCTION fn_shift_logout_effective(
  p_login numeric,
  p_logout numeric
) RETURNS numeric LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF p_logout < p_login THEN
    RETURN p_logout + 24 * 60;
  END IF;
  RETURN p_logout;
END;
$$;

CREATE OR REPLACE FUNCTION fn_time_minutes_span(
  p_in time,
  p_out time
) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  ci numeric;
  co numeric;
BEGIN
  IF p_in IS NULL OR p_out IS NULL THEN
    RETURN jsonb_build_object('ci', NULL, 'co', NULL, 'gross', 0);
  END IF;
  ci := extract(epoch FROM p_in) / 60;
  co := extract(epoch FROM p_out) / 60;
  IF co <= ci THEN
    co := co + 24 * 60;
  END IF;
  RETURN jsonb_build_object('ci', ci, 'co', co, 'gross', co - ci);
END;
$$;

CREATE OR REPLACE FUNCTION fn_calc_shift_hour_split(
  p_check_in time,
  p_check_out time,
  p_break_min int,
  p_login time,
  p_logout time
) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  ci numeric;
  co numeric;
  ci_raw numeric;
  lg numeric;
  lo numeric;
  lo_eff numeric;
  gross numeric;
  shift_start numeric;
  shift_end numeric;
  shift_gross numeric;
  off_before numeric;
  shift_break numeric;
  shift_net numeric;
  ot_min int := 0;
BEGIN
  IF p_check_in IS NULL OR p_check_out IS NULL THEN
    RETURN jsonb_build_object('shift_work_min', 0, 'off_shift_min', 0, 'ot_minutes', 0);
  END IF;

  lg := extract(epoch FROM COALESCE(p_login, '10:00'::time)) / 60;
  lo := extract(epoch FROM COALESCE(p_logout, '19:00'::time)) / 60;
  lo_eff := fn_shift_logout_effective(lg, lo);

  ci_raw := extract(epoch FROM p_check_in) / 60;
  ci := fn_punch_on_timeline(ci_raw, lg, lo);
  co := extract(epoch FROM p_check_out) / 60;
  IF co <= ci_raw THEN
    co := co + 24 * 60;
  END IF;
  gross := co - ci;

  IF gross <= 0 THEN
    RETURN jsonb_build_object('shift_work_min', 0, 'off_shift_min', 0, 'ot_minutes', 0);
  END IF;

  shift_start := GREATEST(ci, lg);
  shift_end := LEAST(co, lo_eff);
  shift_gross := GREATEST(0, shift_end - shift_start);

  IF shift_gross <= 0 THEN
    RETURN jsonb_build_object(
      'shift_work_min', 0,
      'off_shift_min', GREATEST(0, round(gross))::int,
      'ot_minutes', 0
    );
  END IF;

  off_before := GREATEST(0, lg - ci);
  IF co > lo_eff THEN
    ot_min := GREATEST(0, round(co - lo_eff)::int);
  END IF;

  shift_break := round(COALESCE(p_break_min, 0) * (shift_gross / gross));
  shift_net := GREATEST(0, round(shift_gross - shift_break));

  RETURN jsonb_build_object(
    'shift_work_min', shift_net::int,
    'off_shift_min', GREATEST(0, round(off_before))::int,
    'ot_minutes', ot_min
  );
END;
$$;

-- No shift-window block — locked cycle guard only.
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

CREATE OR REPLACE FUNCTION fn_derive_status(
  p_in time,
  p_out time,
  p_status att_status,
  p_login time,
  p_logout time,
  p_half_after int,
  p_full_after int,
  p_is_mispunch boolean
) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  ci numeric;
  co numeric;
  lg numeric;
  lo numeric;
  lo_eff numeric;
  ci_t numeric;
  mp boolean;
  st att_status;
  in_shift boolean;
BEGIN
  IF p_status IN ('Leave', 'Sick Leave', 'Week Off', 'Holiday', 'Unauthorized Leave') THEN
    RETURN jsonb_build_object('status', p_status, 'is_mispunch', p_is_mispunch);
  END IF;

  ci := CASE WHEN p_in IS NULL THEN NULL ELSE extract(epoch FROM p_in) / 60 END;
  co := CASE WHEN p_out IS NULL THEN NULL ELSE extract(epoch FROM p_out) / 60 END;
  lg := extract(epoch FROM COALESCE(p_login, '10:00')) / 60;
  lo := extract(epoch FROM COALESCE(p_logout, '19:00')) / 60;
  lo_eff := fn_shift_logout_effective(lg, lo);

  IF ci IS NULL AND co IS NULL THEN
    RETURN jsonb_build_object('status', 'Absent', 'is_mispunch', false);
  END IF;

  IF ci IS NOT NULL AND co IS NULL THEN
    RETURN jsonb_build_object('status', 'Present', 'is_mispunch', false);
  END IF;

  IF ci IS NULL AND co IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'Present', 'is_mispunch', true);
  END IF;

  mp := false;
  st := 'Present';
  ci_t := fn_punch_on_timeline(ci, lg, lo);
  in_shift := ci_t >= lg AND ci_t <= lo_eff;

  IF in_shift THEN
    IF ci_t > lg + COALESCE(p_full_after, 180) THEN
      st := 'Absent';
    ELSIF ci_t > lg + COALESCE(p_half_after, 60) THEN
      st := 'Half Day';
    END IF;
  END IF;

  RETURN jsonb_build_object('status', st, 'is_mispunch', mp);
END;
$$;

CREATE OR REPLACE FUNCTION fn_is_late_check_in(
  p_check_in time,
  p_login time,
  p_logout time,
  p_grace int
) RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  ci numeric;
  lg numeric;
  lo numeric;
  lo_eff numeric;
  ci_t numeric;
BEGIN
  IF p_check_in IS NULL THEN
    RETURN false;
  END IF;
  ci := extract(epoch FROM p_check_in) / 60;
  lg := extract(epoch FROM COALESCE(p_login, '10:00')) / 60;
  lo := extract(epoch FROM COALESCE(p_logout, '19:00')) / 60;
  lo_eff := fn_shift_logout_effective(lg, lo);
  ci_t := fn_punch_on_timeline(ci, lg, lo);
  RETURN ci_t >= lg + COALESCE(p_grace, 5) AND ci_t <= lo_eff;
END;
$$;

CREATE OR REPLACE FUNCTION trg_attendance_derive() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  sh record;
  d jsonb;
  split jsonb;
BEGIN
  SELECT s.* INTO sh FROM shifts s JOIN employees e ON e.shift_id = s.id WHERE e.id = NEW.employee_id;

  split := fn_calc_shift_hour_split(
    NEW.check_in,
    NEW.check_out,
    COALESCE(NEW.break_min, 0)::int,
    COALESCE(sh.login_time, '10:00'),
    COALESCE(sh.logout_time, '19:00')
  );
  NEW.shift_work_min := COALESCE((split->>'shift_work_min')::int, 0);
  NEW.off_shift_min := COALESCE((split->>'off_shift_min')::int, 0);

  d := fn_derive_status(
    NEW.check_in,
    NEW.check_out,
    NEW.status,
    COALESCE(sh.login_time, '10:00'),
    COALESCE(sh.logout_time, '19:00'),
    COALESCE(sh.half_day_after_min, 60),
    COALESCE(sh.full_day_after_min, 180),
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

-- Late count: only in-shift arrivals (day + overnight night shifts).
CREATE OR REPLACE FUNCTION fn_rollup_inputs(p_employee uuid, p_cycle uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
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
  v_ot int := 0;
  v_off_shift int := 0;
  v_shift_work int := 0;
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
      WHERE fn_is_late_check_in(
        check_in,
        COALESCE(sh.login_time, '10:00'),
        COALESCE(sh.logout_time, '19:00'),
        COALESCE(sh.grace_min, 5)
      )
      AND status NOT IN ('Week Off', 'Holiday', 'Leave', 'Sick Leave', 'Unauthorized Leave', 'Absent')
    ),
    COALESCE(sum(off_shift_min), 0)::int,
    COALESCE(sum(shift_work_min), 0)::int
  INTO v_working, v_leaves, v_woff, v_ul, v_mis, v_late, v_off_shift, v_shift_work
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

  SELECT COALESCE(sum(fn_calc_day_ot_minutes(
    a.check_in, a.check_out, COALESCE(a.break_min, 0)::int,
    sh.login_time, sh.logout_time, COALESCE(sh.break_min, 0)::int, COALESCE(sh.ot_eligible, true)
  )), 0)::int INTO v_ot
  FROM attendance a
  WHERE a.employee_id = p_employee AND a.work_date BETWEEN c.start_date AND c.end_date;

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
    'week_off', v_woff,
    'ot_minutes', v_ot,
    'off_shift_minutes', v_off_shift,
    'shift_work_minutes', v_shift_work
  );
END;
$$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig FROM pg_proc p
    WHERE p.proname IN (
      'fn_punch_on_timeline',
      'fn_shift_logout_effective',
      'fn_time_minutes_span',
      'fn_calc_shift_hour_split',
      'fn_record_punch',
      'fn_derive_status',
      'fn_is_late_check_in',
      'fn_calc_day_ot_minutes',
      'fn_rollup_inputs'
    )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END $$;
