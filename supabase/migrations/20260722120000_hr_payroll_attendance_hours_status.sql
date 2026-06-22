-- =====================================================================
-- HR Payroll Phase A — Hours-based attendance status derivation
-- Net worked = (check_out - check_in) - break
-- Present  >= work_hours | Half Day >= work_hours/2 | Absent < work_hours/2
-- Uses fn_employee_shift_at(work_date) for shift history.
-- Late marks, mispunch rules, ESS punch flow unchanged.
-- Payroll formula unchanged (Phase B).
-- =====================================================================

-- Resolve break duration from stored minutes or break_start/break_end punches.
CREATE OR REPLACE FUNCTION fn_attendance_break_minutes(
  p_break_min int DEFAULT NULL,
  p_break_start time DEFAULT NULL,
  p_break_end time DEFAULT NULL
) RETURNS int LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  bs numeric;
  be numeric;
BEGIN
  IF COALESCE(p_break_min, 0) > 0 THEN
    RETURN p_break_min;
  END IF;
  IF p_break_start IS NULL OR p_break_end IS NULL THEN
    RETURN 0;
  END IF;
  bs := extract(epoch FROM p_break_start) / 60;
  be := extract(epoch FROM p_break_end) / 60;
  IF be <= bs THEN
    be := be + 24 * 60;
  END IF;
  RETURN greatest(0, round(be - bs))::int;
END;
$$;

-- Gross span handles overnight checkout (check_out on clock before check_in).
CREATE OR REPLACE FUNCTION fn_attendance_net_work_minutes(
  p_in time,
  p_out time,
  p_break_min int DEFAULT NULL,
  p_break_start time DEFAULT NULL,
  p_break_end time DEFAULT NULL
) RETURNS numeric LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  ci numeric;
  co numeric;
  br int;
BEGIN
  IF p_in IS NULL OR p_out IS NULL THEN
    RETURN NULL;
  END IF;
  ci := extract(epoch FROM p_in) / 60;
  co := extract(epoch FROM p_out) / 60;
  IF co <= ci THEN
    co := co + 24 * 60;
  END IF;
  br := fn_attendance_break_minutes(p_break_min, p_break_start, p_break_end);
  RETURN greatest(0, (co - ci) - br);
END;
$$;

-- Drop legacy check-in-lateness signature (migration 40).
DROP FUNCTION IF EXISTS fn_derive_status(
  time, time, att_status, time, time, int, int, boolean
);

CREATE OR REPLACE FUNCTION fn_derive_status(
  p_in time,
  p_out time,
  p_status att_status,
  p_work_hours numeric DEFAULT 9,
  p_is_mispunch boolean DEFAULT false,
  p_break_min int DEFAULT NULL,
  p_break_start time DEFAULT NULL,
  p_break_end time DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  mp boolean;
  st att_status;
  v_net numeric;
  v_full_min numeric;
  v_half_min numeric;
  v_wh numeric;
BEGIN
  IF p_status IN ('Leave', 'Sick Leave', 'Week Off', 'Holiday', 'Unauthorized Leave') THEN
    RETURN jsonb_build_object('status', p_status, 'is_mispunch', p_is_mispunch);
  END IF;

  IF p_in IS NULL AND p_out IS NULL THEN
    RETURN jsonb_build_object('status', 'Absent', 'is_mispunch', false);
  END IF;

  -- Open session / one-sided punch — preserve mispunch semantics (migration 40).
  IF p_in IS NOT NULL AND p_out IS NULL THEN
    RETURN jsonb_build_object('status', 'Present', 'is_mispunch', false);
  END IF;

  IF p_in IS NULL AND p_out IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'Present', 'is_mispunch', true);
  END IF;

  v_wh := COALESCE(NULLIF(p_work_hours, 0), 9);
  v_full_min := v_wh * 60;
  v_half_min := v_full_min / 2;
  v_net := fn_attendance_net_work_minutes(p_in, p_out, p_break_min, p_break_start, p_break_end);

  mp := false;
  st := 'Absent';

  IF v_net IS NOT NULL THEN
    IF v_net >= v_full_min THEN
      st := 'Present';
    ELSIF v_net >= v_half_min THEN
      st := 'Half Day';
    ELSE
      st := 'Absent';
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
  v_shift_id uuid;
  v_break_min int;
BEGIN
  v_shift_id := fn_employee_shift_at(NEW.employee_id, NEW.work_date);
  SELECT s.* INTO sh FROM shifts s WHERE s.id = v_shift_id;
  IF sh.id IS NULL THEN
    SELECT s.* INTO sh FROM shifts s JOIN employees e ON e.shift_id = s.id WHERE e.id = NEW.employee_id;
  END IF;

  v_break_min := fn_attendance_break_minutes(NEW.break_min, NEW.break_start, NEW.break_end);
  IF NEW.break_min IS NULL AND v_break_min > 0 THEN
    NEW.break_min := v_break_min;
  END IF;

  split := fn_calc_shift_hour_split(
    NEW.check_in,
    NEW.check_out,
    COALESCE(v_break_min, 0)::int,
    COALESCE(sh.login_time, '10:00'::time),
    COALESCE(sh.logout_time, '19:00'::time)
  );
  NEW.shift_work_min := COALESCE((split->>'shift_work_min')::int, 0);
  NEW.off_shift_min := COALESCE((split->>'off_shift_min')::int, 0);

  d := fn_derive_status(
    NEW.check_in,
    NEW.check_out,
    NEW.status,
    COALESCE(sh.work_hours, 9),
    NEW.is_mispunch,
    v_break_min,
    NEW.break_start,
    NEW.break_end
  );

  IF NEW.status NOT IN ('Leave', 'Sick Leave', 'Week Off', 'Holiday', 'Unauthorized Leave') THEN
    NEW.status := (d->>'status')::att_status;
    NEW.is_mispunch := (d->>'is_mispunch')::boolean;
  END IF;

  RETURN NEW;
END;
$$;

-- Late marks: per attendance row use shift effective on work_date.
CREATE OR REPLACE FUNCTION fn_rollup_inputs(p_employee uuid, p_cycle uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c record;
  e record;
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

  SELECT
    count(*) FILTER (WHERE a.status = 'Present')
      + count(*) FILTER (WHERE a.status = 'Half Day') * 0.5,
    count(*) FILTER (WHERE a.status IN ('Leave', 'Sick Leave')),
    count(*) FILTER (WHERE a.status IN ('Week Off', 'Holiday')),
    count(*) FILTER (WHERE a.status = 'Unauthorized Leave'),
    count(*) FILTER (WHERE a.is_mispunch)
      + count(*) FILTER (WHERE a.status = 'Absent'),
    count(*) FILTER (
      WHERE fn_is_late_check_in(
        a.check_in,
        COALESCE(sh.login_time, '10:00'::time),
        COALESCE(sh.logout_time, '19:00'::time),
        COALESCE(sh.grace_min, 5)
      )
      AND a.status NOT IN ('Week Off', 'Holiday', 'Leave', 'Sick Leave', 'Unauthorized Leave', 'Absent')
    ),
    COALESCE(sum(a.off_shift_min), 0)::int,
    COALESCE(sum(a.shift_work_min), 0)::int
  INTO v_working, v_leaves, v_woff, v_ul, v_mis, v_late, v_off_shift, v_shift_work
  FROM attendance a
  LEFT JOIN shifts sh ON sh.id = fn_employee_shift_at(a.employee_id, a.work_date)
  WHERE a.employee_id = p_employee AND a.work_date BETWEEN c.start_date AND c.end_date;

  SELECT COALESCE(sum(days), 0) INTO v_paid FROM leave_requests
  WHERE employee_id = p_employee AND status = 'Approved' AND type <> 'Unpaid Leave'
    AND from_date BETWEEN c.start_date AND c.end_date;

  SELECT count(*) INTO v_compoff FROM compoff_requests
  WHERE employee_id = p_employee AND status = 'Approved'
    AND worked_date BETWEEN c.start_date AND c.end_date;

  SELECT count(*) INTO v_late_exempt FROM late_exemptions le
  WHERE le.employee_id = p_employee
    AND le.status = 'Approved'
    AND le.late_date BETWEEN c.start_date AND c.end_date
    AND le.delay_min > COALESCE(
      (SELECT s.grace_min FROM shifts s WHERE s.id = fn_employee_shift_at(p_employee, le.late_date)),
      5
    );

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
  LEFT JOIN shifts sh ON sh.id = fn_employee_shift_at(a.employee_id, a.work_date)
  WHERE a.employee_id = p_employee
    AND a.work_date BETWEEN c.start_date AND c.end_date
    AND a.status IN ('Present', 'Half Day');

  RETURN jsonb_build_object(
    'late', greatest(0, v_late - v_late_exempt),
    'mispunch', greatest(0, v_mis - v_mis_approved),
    'leaves', v_leaves,
    'paid_leaves', v_paid,
    'comp_off', v_compoff,
    'ul', v_ul,
    'sandwich', v_sandwich,
    'unpaid_training', v_train,
    'ot_minutes', v_ot,
    'off_shift_minutes', v_off_shift,
    'shift_work_minutes', v_shift_work,
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
    WHERE p.proname IN (
      'fn_attendance_break_minutes',
      'fn_attendance_net_work_minutes',
      'fn_derive_status',
      'fn_rollup_inputs'
    )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END $$;
