-- =====================================================================
-- HR Payroll — Punch anytime (24h), overnight sessions, off-shift no penalty
-- Salary / late / half-day use shift window only; extra hours are tracked
-- in off_shift_min and never affect fn_compute_payroll payable days.
-- Re-applies migration 30 punch freedom if migration 13 rules still live.
-- =====================================================================

-- Minutes since midnight; add 24h when check-out is on the next calendar day.
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
  span jsonb;
  ci numeric;
  co numeric;
  lg numeric;
  lo numeric;
  gross numeric;
  shift_start numeric;
  shift_end numeric;
  shift_gross numeric;
  off_before numeric;
  off_shift numeric;
  shift_break numeric;
  shift_net numeric;
  ot_min int := 0;
BEGIN
  IF p_check_in IS NULL OR p_check_out IS NULL THEN
    RETURN jsonb_build_object('shift_work_min', 0, 'off_shift_min', 0, 'ot_minutes', 0);
  END IF;

  span := fn_time_minutes_span(p_check_in, p_check_out);
  ci := (span->>'ci')::numeric;
  co := (span->>'co')::numeric;
  gross := (span->>'gross')::numeric;

  IF gross <= 0 THEN
    RETURN jsonb_build_object('shift_work_min', 0, 'off_shift_min', 0, 'ot_minutes', 0);
  END IF;

  lg := extract(epoch FROM COALESCE(p_login, '10:00'::time)) / 60;
  lo := extract(epoch FROM COALESCE(p_logout, '19:00'::time)) / 60;

  shift_start := GREATEST(ci, lg);
  shift_end := LEAST(co, lo);
  shift_gross := GREATEST(0, shift_end - shift_start);
  off_before := GREATEST(0, lg - ci);

  IF ci >= lo THEN
    off_shift := gross;
    ot_min := 0;
  ELSIF co > lo THEN
    off_shift := off_before;
    ot_min := GREATEST(0, round(co - lo)::int);
  ELSE
    off_shift := off_before;
    ot_min := 0;
  END IF;

  IF gross > 0 AND shift_gross > 0 THEN
    shift_break := round(COALESCE(p_break_min, 0) * (shift_gross / gross));
  ELSE
    shift_break := 0;
  END IF;
  shift_net := GREATEST(0, round(shift_gross - shift_break));

  RETURN jsonb_build_object(
    'shift_work_min', shift_net::int,
    'off_shift_min', GREATEST(0, round(off_shift))::int,
    'ot_minutes', ot_min
  );
END;
$$;

-- No shift-window block on punches; locked cycle guard only.
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
  ci int;
  co int;
  lg int;
  lo int;
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

  IF ci IS NULL AND co IS NULL THEN
    RETURN jsonb_build_object('status', 'Absent', 'is_mispunch', false);
  END IF;

  -- Still on the clock — not a mispunch.
  IF ci IS NOT NULL AND co IS NULL THEN
    RETURN jsonb_build_object('status', 'Present', 'is_mispunch', false);
  END IF;

  IF ci IS NULL AND co IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'Present', 'is_mispunch', true);
  END IF;

  mp := false;
  st := 'Present';
  in_shift := ci >= lg AND ci <= lo;

  IF in_shift THEN
    IF ci > lg + COALESCE(p_full_after, 180) THEN
      st := 'Absent';
    ELSIF ci > lg + COALESCE(p_half_after, 60) THEN
      st := 'Half Day';
    END IF;
  END IF;

  RETURN jsonb_build_object('status', st, 'is_mispunch', mp);
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

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig FROM pg_proc p
    WHERE p.proname IN (
      'fn_time_minutes_span',
      'fn_calc_shift_hour_split',
      'fn_record_punch',
      'fn_derive_status',
      'fn_calc_day_ot_minutes'
    )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END $$;
