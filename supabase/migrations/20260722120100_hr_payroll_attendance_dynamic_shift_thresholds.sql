-- =====================================================================
-- HR Payroll Phase A.1 — Dynamic shift thresholds from Shift Master
-- Scheduled working = (logout - login) - shift.break_min (not work_hours)
-- Net worked = (check_out - check_in) - actual break (punches / break_min)
-- Uses fn_employee_shift_at(work_date) in trigger (unchanged from Phase A).
-- Payroll formula unchanged.
-- =====================================================================

-- Scheduled net minutes for a shift (handles overnight logout < login).
CREATE OR REPLACE FUNCTION fn_shift_scheduled_work_minutes(
  p_login time,
  p_logout time,
  p_shift_break_min int DEFAULT 0
) RETURNS numeric LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  lg numeric;
  lo numeric;
  lo_eff numeric;
BEGIN
  lg := extract(epoch FROM COALESCE(p_login, '10:00'::time)) / 60;
  lo := extract(epoch FROM COALESCE(p_logout, '19:00'::time)) / 60;
  lo_eff := fn_shift_logout_effective(lg, lo);
  RETURN greatest(0, (lo_eff - lg) - COALESCE(p_shift_break_min, 0));
END;
$$;

-- Replace work_hours-based signature from Phase A.
DROP FUNCTION IF EXISTS fn_derive_status(
  time, time, att_status, numeric, boolean, int, time, time
);

CREATE OR REPLACE FUNCTION fn_derive_status(
  p_in time,
  p_out time,
  p_status att_status,
  p_login time DEFAULT '10:00'::time,
  p_logout time DEFAULT '19:00'::time,
  p_shift_break_min int DEFAULT 45,
  p_is_mispunch boolean DEFAULT false,
  p_actual_break_min int DEFAULT NULL,
  p_break_start time DEFAULT NULL,
  p_break_end time DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  mp boolean;
  st att_status;
  v_net numeric;
  v_full_min numeric;
  v_half_min numeric;
BEGIN
  IF p_status IN ('Leave', 'Sick Leave', 'Week Off', 'Holiday', 'Unauthorized Leave') THEN
    RETURN jsonb_build_object('status', p_status, 'is_mispunch', p_is_mispunch);
  END IF;

  IF p_in IS NULL AND p_out IS NULL THEN
    RETURN jsonb_build_object('status', 'Absent', 'is_mispunch', false);
  END IF;

  IF p_in IS NOT NULL AND p_out IS NULL THEN
    RETURN jsonb_build_object('status', 'Present', 'is_mispunch', false);
  END IF;

  IF p_in IS NULL AND p_out IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'Present', 'is_mispunch', true);
  END IF;

  v_full_min := fn_shift_scheduled_work_minutes(p_login, p_logout, p_shift_break_min);
  v_half_min := v_full_min / 2;
  v_net := fn_attendance_net_work_minutes(
    p_in, p_out, p_actual_break_min, p_break_start, p_break_end
  );

  mp := false;
  st := 'Absent';

  IF v_net IS NOT NULL AND v_full_min > 0 THEN
    IF v_net >= v_full_min THEN
      st := 'Present';
    ELSIF v_net >= v_half_min THEN
      st := 'Half Day';
    ELSE
      st := 'Absent';
    END IF;
  ELSIF v_net IS NOT NULL AND v_full_min <= 0 THEN
    st := 'Present';
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
  v_actual_break int;
BEGIN
  v_shift_id := fn_employee_shift_at(NEW.employee_id, NEW.work_date);
  SELECT s.* INTO sh FROM shifts s WHERE s.id = v_shift_id;
  IF sh.id IS NULL THEN
    SELECT s.* INTO sh FROM shifts s JOIN employees e ON e.shift_id = s.id WHERE e.id = NEW.employee_id;
  END IF;

  v_actual_break := fn_attendance_break_minutes(NEW.break_min, NEW.break_start, NEW.break_end);
  IF NEW.break_min IS NULL AND v_actual_break > 0 THEN
    NEW.break_min := v_actual_break;
  END IF;

  split := fn_calc_shift_hour_split(
    NEW.check_in,
    NEW.check_out,
    COALESCE(v_actual_break, 0)::int,
    COALESCE(sh.login_time, '10:00'::time),
    COALESCE(sh.logout_time, '19:00'::time)
  );
  NEW.shift_work_min := COALESCE((split->>'shift_work_min')::int, 0);
  NEW.off_shift_min := COALESCE((split->>'off_shift_min')::int, 0);

  d := fn_derive_status(
    NEW.check_in,
    NEW.check_out,
    NEW.status,
    COALESCE(sh.login_time, '10:00'::time),
    COALESCE(sh.logout_time, '19:00'::time),
    COALESCE(sh.break_min, 0),
    NEW.is_mispunch,
    v_actual_break,
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

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig FROM pg_proc p
    WHERE p.proname IN ('fn_shift_scheduled_work_minutes', 'fn_derive_status')
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END $$;
