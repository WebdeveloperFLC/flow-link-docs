-- =====================================================================
-- WTM Pack 2.3 — Workforce Rules Engine (WRE)
-- Store Facts. Calculate Results. Does NOT modify fn_compute_payroll.
-- =====================================================================

-- Extend operational session status
DO $$ BEGIN ALTER TYPE wtm_session_status ADD VALUE IF NOT EXISTS 'Exception'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE wtm_session_status ADD VALUE IF NOT EXISTS 'Holiday'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE wtm_session_status ADD VALUE IF NOT EXISTS 'Weekly Off'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE wtm_payroll_status AS ENUM (
    'Present', 'Half Day', 'Absent', 'Paid Leave', 'Unpaid Leave', 'Holiday', 'Weekly Off'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE wre_eval_trigger AS ENUM (
    'clock_out', 'aems_correction', 'manual_reeval', 'policy_change', 'calendar_change'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE wtm_attendance_sessions
  ADD COLUMN IF NOT EXISTS payroll_status wtm_payroll_status,
  ADD COLUMN IF NOT EXISTS is_mispunch boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS latest_evaluation_id uuid;

-- ---------------------------------------------------------------------
-- 1. Evaluation runs (append-only audit chain)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wre_evaluations (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  uuid NOT NULL,
  employee_id             uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  session_id              uuid REFERENCES wtm_attendance_sessions(id) ON DELETE CASCADE,
  work_date               date NOT NULL,
  trigger                 wre_eval_trigger NOT NULL,
  trigger_ref_id          uuid,
  bundle_id               uuid REFERENCES wpms_policy_bundles(id) ON DELETE SET NULL,
  attendance_policy_id    uuid REFERENCES wpms_policies(id) ON DELETE SET NULL,
  holiday_policy_id       uuid REFERENCES wpms_policies(id) ON DELETE SET NULL,
  shift_id                uuid REFERENCES shifts(id) ON DELETE SET NULL,
  bundle_version          int,
  attendance_policy_version int,
  holiday_policy_version  int,
  policy_config           jsonb NOT NULL DEFAULT '{}'::jsonb,
  shift_snapshot          jsonb NOT NULL DEFAULT '{}'::jsonb,
  input_snapshot          jsonb NOT NULL DEFAULT '{}'::jsonb,
  result                  jsonb NOT NULL DEFAULT '{}'::jsonb,
  payroll_status          wtm_payroll_status NOT NULL DEFAULT 'Absent',
  operational_status      wtm_session_status NOT NULL DEFAULT 'Completed',
  is_mispunch             boolean NOT NULL DEFAULT false,
  late_minutes            int NOT NULL DEFAULT 0,
  early_exit_minutes      int NOT NULL DEFAULT 0,
  overtime_minutes        int NOT NULL DEFAULT 0,
  monthly_late_minutes    int NOT NULL DEFAULT 0,
  remaining_grace_minutes int NOT NULL DEFAULT 0,
  evaluated_at            timestamptz NOT NULL DEFAULT now(),
  evaluated_by            uuid,
  evaluated_by_label      text DEFAULT 'System',
  superseded_by           uuid REFERENCES wre_evaluations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_wre_evaluations_session
  ON wre_evaluations (session_id, evaluated_at DESC);

CREATE INDEX IF NOT EXISTS idx_wre_evaluations_emp_month
  ON wre_evaluations (employee_id, work_date DESC);

ALTER TABLE wre_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY wre_evaluations_select ON wre_evaluations FOR SELECT
  USING (
    is_hr(org_id)
    OR manages_employee(org_id, employee_id)
    OR employee_id = current_employee_id(org_id)
  );

CREATE POLICY wre_evaluations_insert ON wre_evaluations FOR INSERT
  WITH CHECK (current_hr_role(org_id) IS NOT NULL OR employee_id = current_employee_id(org_id));

-- ---------------------------------------------------------------------
-- 2. Immutable attendance snapshots (one row per evaluation version)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wtm_attendance_snapshots (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  uuid NOT NULL,
  session_id              uuid NOT NULL REFERENCES wtm_attendance_sessions(id) ON DELETE CASCADE,
  employee_id             uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  work_date               date NOT NULL,
  evaluation_id           uuid NOT NULL REFERENCES wre_evaluations(id) ON DELETE RESTRICT,
  version                 int NOT NULL DEFAULT 1,
  shift_id                uuid,
  clock_in                time,
  clock_out               time,
  working_duration_min    int NOT NULL DEFAULT 0,
  break_duration_min      int NOT NULL DEFAULT 0,
  late_minutes            int NOT NULL DEFAULT 0,
  early_exit_minutes      int NOT NULL DEFAULT 0,
  overtime_minutes        int NOT NULL DEFAULT 0,
  monthly_late_minutes    int NOT NULL DEFAULT 0,
  remaining_grace_minutes int NOT NULL DEFAULT 0,
  payroll_status          wtm_payroll_status NOT NULL,
  operational_status      wtm_session_status NOT NULL,
  is_mispunch             boolean NOT NULL DEFAULT false,
  bundle_version          int,
  attendance_policy_version int,
  holiday_policy_version  int,
  snapshot_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, version)
);

CREATE INDEX IF NOT EXISTS idx_wtm_snapshots_emp_date
  ON wtm_attendance_snapshots (employee_id, work_date DESC);

CREATE INDEX IF NOT EXISTS idx_wtm_snapshots_org_month
  ON wtm_attendance_snapshots (org_id, work_date);

ALTER TABLE wtm_attendance_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY wtm_snapshots_select ON wtm_attendance_snapshots FOR SELECT
  USING (
    is_hr(org_id)
    OR manages_employee(org_id, employee_id)
    OR employee_id = current_employee_id(org_id)
  );

CREATE POLICY wtm_snapshots_insert ON wtm_attendance_snapshots FOR INSERT
  WITH CHECK (current_hr_role(org_id) IS NOT NULL OR employee_id = current_employee_id(org_id));

-- ---------------------------------------------------------------------
-- 3. WPMS policy resolvers
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_wpms_employee_bundle_at(p_employee uuid, p_as_of date DEFAULT CURRENT_DATE)
RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_bundle uuid;
BEGIN
  SELECT bundle_id INTO v_bundle
  FROM wpms_employee_bundle_assignments
  WHERE employee_id = p_employee
    AND effective_from <= p_as_of
    AND (effective_to IS NULL OR effective_to >= p_as_of)
  ORDER BY effective_from DESC
  LIMIT 1;

  IF v_bundle IS NULL THEN
    SELECT wpms_current_bundle_id INTO v_bundle FROM employees WHERE id = p_employee;
  END IF;

  RETURN v_bundle;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_wpms_employee_bundle_at TO authenticated;

CREATE OR REPLACE FUNCTION fn_wpms_policy_config_at(
  p_employee uuid,
  p_kind wpms_policy_kind,
  p_as_of date DEFAULT CURRENT_DATE
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_bundle uuid;
  v_policy_id uuid;
  v_config jsonb;
BEGIN
  v_bundle := fn_wpms_employee_bundle_at(p_employee, p_as_of);
  IF v_bundle IS NULL THEN RETURN '{}'::jsonb; END IF;

  SELECT CASE p_kind
    WHEN 'attendance' THEN attendance_policy_id
    WHEN 'holiday_calendar' THEN holiday_calendar_id
    WHEN 'leave' THEN leave_policy_id
    WHEN 'payroll' THEN payroll_policy_id
    ELSE NULL
  END INTO v_policy_id
  FROM wpms_policy_bundles WHERE id = v_bundle;

  SELECT config INTO v_config FROM wpms_policies WHERE id = v_policy_id;
  RETURN COALESCE(v_config, '{}'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION fn_wpms_policy_config_at TO authenticated;

-- ---------------------------------------------------------------------
-- 4. Core evaluator
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_wre_evaluate_session(
  p_session_id uuid,
  p_trigger wre_eval_trigger DEFAULT 'clock_out',
  p_trigger_ref uuid DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL,
  p_actor_label text DEFAULT NULL
) RETURNS wre_evaluations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s wtm_attendance_sessions;
  sh shifts;
  v_shift_id uuid;
  v_policy jsonb;
  v_hol_policy jsonb;
  v_bundle uuid;
  v_bundle_row wpms_policy_bundles;
  v_att_policy wpms_policies;
  v_hol_policy_row wpms_policies;
  v_eval wre_evaluations;
  v_version int;
  v_eff_in time;
  v_eff_out time;
  v_grace int;
  v_late int := 0;
  v_early int := 0;
  v_ot int := 0;
  v_scheduled_min numeric;
  v_payroll wtm_payroll_status := 'Absent';
  v_operational wtm_session_status := 'Completed';
  v_mispunch boolean := false;
  v_derived jsonb;
  v_month_late int := 0;
  v_monthly_grace int := 30;
  v_remaining_grace int := 0;
  v_is_holiday boolean := false;
  v_is_wo boolean := false;
  v_ex attendance_exceptions;
  v_min_present_min numeric;
  v_min_half_min numeric;
  v_max_late int;
BEGIN
  SELECT * INTO s FROM wtm_attendance_sessions WHERE id = p_session_id FOR UPDATE;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Session not found'; END IF;
  IF s.session_status = 'Locked' THEN
    RAISE EXCEPTION 'Session is locked — cannot re-evaluate';
  END IF;

  v_bundle := fn_wpms_employee_bundle_at(s.employee_id, s.work_date);
  IF v_bundle IS NOT NULL THEN
    SELECT * INTO v_bundle_row FROM wpms_policy_bundles WHERE id = v_bundle;
    IF v_bundle_row.attendance_policy_id IS NOT NULL THEN
      SELECT * INTO v_att_policy FROM wpms_policies WHERE id = v_bundle_row.attendance_policy_id;
    END IF;
    IF v_bundle_row.holiday_calendar_id IS NOT NULL THEN
      SELECT * INTO v_hol_policy_row FROM wpms_policies WHERE id = v_bundle_row.holiday_calendar_id;
    END IF;
  END IF;

  v_policy := COALESCE(v_att_policy.config, fn_wpms_policy_config_at(s.employee_id, 'attendance', s.work_date));
  v_hol_policy := COALESCE(v_hol_policy_row.config, fn_wpms_policy_config_at(s.employee_id, 'holiday_calendar', s.work_date));

  v_shift_id := COALESCE(s.shift_id, fn_employee_shift_at(s.employee_id, s.work_date));
  SELECT * INTO sh FROM shifts WHERE id = v_shift_id;
  IF sh.id IS NULL THEN
    SELECT s2.* INTO sh FROM shifts s2 JOIN employees e ON e.shift_id = s2.id WHERE e.id = s.employee_id;
  END IF;

  v_eff_in := s.clock_in;
  v_eff_out := s.clock_out;

  SELECT * INTO v_ex FROM attendance_exceptions
  WHERE employee_id = s.employee_id AND work_date = s.work_date AND status = 'Approved'
  ORDER BY resolved_at DESC NULLS LAST LIMIT 1;

  IF v_ex.id IS NOT NULL THEN
    v_eff_in := COALESCE(v_ex.approved_clock_in, v_ex.requested_clock_in, v_eff_in);
    v_eff_out := COALESCE(v_ex.approved_clock_out, v_ex.requested_clock_out, v_eff_out);
    v_operational := 'Exception';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM holidays h
    WHERE h.org_id = s.org_id AND h.holiday_date = s.work_date
  ) INTO v_is_holiday;

  v_is_wo := fn_is_weekly_off_day(s.org_id, s.employee_id, s.work_date);

  IF v_is_holiday THEN
    v_payroll := 'Holiday';
    v_operational := 'Holiday';
  ELSIF v_is_wo AND v_eff_in IS NULL THEN
    v_payroll := 'Weekly Off';
    v_operational := 'Weekly Off';
  ELSIF v_eff_in IS NULL AND v_eff_out IS NULL THEN
    v_payroll := 'Absent';
    v_operational := COALESCE(v_operational, 'Completed');
  ELSE
    v_grace := COALESCE((v_policy->>'grace_minutes')::int, sh.grace_min, 0);
    v_monthly_grace := COALESCE((v_policy->>'monthly_grace_minutes')::int, (v_policy->>'monthly_late_minutes_cap')::int, 30);
    v_max_late := COALESCE((v_policy->>'maximum_late_minutes')::int, 9999);
    v_min_present_min := COALESCE((v_policy->>'minimum_present_hours')::numeric, (v_policy->>'working_hours')::numeric, 9) * 60;
    v_min_half_min := COALESCE((v_policy->>'minimum_half_day_hours')::numeric, 4) * 60;

    IF v_eff_in IS NOT NULL AND sh.login_time IS NOT NULL THEN
      v_late := GREATEST(0, (
        EXTRACT(EPOCH FROM v_eff_in) - EXTRACT(EPOCH FROM sh.login_time)
      ) / 60 - v_grace)::int;
    END IF;

    IF v_eff_out IS NOT NULL AND sh.logout_time IS NOT NULL THEN
      v_early := GREATEST(0, (
        EXTRACT(EPOCH FROM sh.logout_time) - EXTRACT(EPOCH FROM v_eff_out)
      ) / 60)::int;
      IF (v_policy->>'early_exit_threshold_minutes') IS NOT NULL
         AND v_early > (v_policy->>'early_exit_threshold_minutes')::int THEN
        NULL; -- threshold exceeded — captured in result
      END IF;
    END IF;

    v_scheduled_min := fn_shift_scheduled_work_minutes(sh.login_time, sh.logout_time, COALESCE(sh.break_min, 0));
    IF s.working_duration_min > 0 THEN
      v_ot := GREATEST(0, s.working_duration_min - v_scheduled_min::int);
    END IF;

    SELECT COALESCE(SUM(late_minutes), 0) INTO v_month_late
    FROM wtm_attendance_snapshots
    WHERE employee_id = s.employee_id
      AND date_trunc('month', work_date) = date_trunc('month', s.work_date)
      AND session_id != s.id;

    v_remaining_grace := GREATEST(0, v_monthly_grace - v_month_late - v_late);

    v_derived := fn_derive_status(
      v_eff_in, v_eff_out, 'Absent'::att_status,
      COALESCE(sh.login_time, '10:00'::time),
      COALESCE(sh.logout_time, '19:00'::time),
      COALESCE(sh.break_min, 0),
      false,
      s.break_duration_min,
      NULL, NULL
    );

    v_payroll := CASE (v_derived->>'status')
      WHEN 'Present' THEN 'Present'::wtm_payroll_status
      WHEN 'Half Day' THEN 'Half Day'::wtm_payroll_status
      WHEN 'Absent' THEN 'Absent'::wtm_payroll_status
      WHEN 'Holiday' THEN 'Holiday'::wtm_payroll_status
      WHEN 'Week Off' THEN 'Weekly Off'::wtm_payroll_status
      ELSE 'Absent'::wtm_payroll_status
    END;

    IF v_late > v_max_late AND v_payroll = 'Present' THEN
      v_payroll := 'Half Day';
    END IF;

    IF s.working_duration_min > 0 AND s.working_duration_min < v_min_half_min::int THEN
      v_payroll := 'Absent';
    ELSIF s.working_duration_min >= v_min_half_min::int AND s.working_duration_min < v_min_present_min::int THEN
      v_payroll := 'Half Day';
    ELSIF s.working_duration_min >= v_min_present_min::int THEN
      v_payroll := 'Present';
    END IF;

    v_mispunch := COALESCE((v_derived->>'is_mispunch')::boolean, false);
    IF v_eff_in IS NOT NULL AND v_eff_out IS NULL AND s.session_status = 'Completed' THEN
      v_mispunch := true;
    END IF;

    v_operational := COALESCE(v_operational, 'Completed');
  END IF;

  INSERT INTO wre_evaluations (
    org_id, employee_id, session_id, work_date, trigger, trigger_ref_id,
    bundle_id, attendance_policy_id, holiday_policy_id, shift_id,
    bundle_version, attendance_policy_version, holiday_policy_version,
    policy_config, shift_snapshot, input_snapshot,
    result, payroll_status, operational_status, is_mispunch,
    late_minutes, early_exit_minutes, overtime_minutes,
    monthly_late_minutes, remaining_grace_minutes,
    evaluated_by, evaluated_by_label
  ) VALUES (
    s.org_id, s.employee_id, s.id, s.work_date, p_trigger, p_trigger_ref,
    v_bundle, v_att_policy.id, v_hol_policy_row.id, sh.id,
    v_bundle_row.version, v_att_policy.version, v_hol_policy_row.version,
    v_policy,
    jsonb_build_object('login', sh.login_time, 'logout', sh.logout_time, 'grace_min', sh.grace_min, 'break_min', sh.break_min),
    jsonb_build_object(
      'clock_in', s.clock_in, 'clock_out', s.clock_out,
      'working_min', s.working_duration_min, 'break_min', s.break_duration_min,
      'effective_in', v_eff_in, 'effective_out', v_eff_out,
      'exception_id', v_ex.id
    ),
    jsonb_build_object(
      'is_holiday', v_is_holiday, 'is_weekly_off', v_is_wo,
      'monthly_grace', v_monthly_grace, 'derived', v_derived
    ),
    v_payroll, v_operational, v_mispunch,
    v_late, v_early, v_ot,
    v_month_late + v_late, v_remaining_grace,
    p_actor_id, COALESCE(p_actor_label, 'System')
  ) RETURNING * INTO v_eval;

  SELECT COALESCE(MAX(version), 0) + 1 INTO v_version
  FROM wtm_attendance_snapshots WHERE session_id = s.id;

  INSERT INTO wtm_attendance_snapshots (
    org_id, session_id, employee_id, work_date, evaluation_id, version,
    shift_id, clock_in, clock_out, working_duration_min, break_duration_min,
    late_minutes, early_exit_minutes, overtime_minutes,
    monthly_late_minutes, remaining_grace_minutes,
    payroll_status, operational_status, is_mispunch,
    bundle_version, attendance_policy_version, holiday_policy_version
  ) VALUES (
    s.org_id, s.id, s.employee_id, s.work_date, v_eval.id, v_version,
    sh.id, s.clock_in, s.clock_out, s.working_duration_min, s.break_duration_min,
    v_late, v_early, v_ot,
    v_month_late + v_late, v_remaining_grace,
    v_payroll, v_operational, v_mispunch,
    v_bundle_row.version, v_att_policy.version, v_hol_policy_row.version
  );

  UPDATE wtm_attendance_sessions SET
    payroll_status = v_payroll,
    attendance_status = CASE v_payroll
      WHEN 'Weekly Off' THEN 'Weekly Off'::wtm_attendance_status
      WHEN 'Holiday' THEN 'Holiday'::wtm_attendance_status
      WHEN 'Half Day' THEN 'Half Day'::wtm_attendance_status
      WHEN 'Absent' THEN 'Absent'::wtm_attendance_status
      ELSE 'Present'::wtm_attendance_status
    END,
    session_status = CASE
      WHEN v_operational IN ('Holiday', 'Weekly Off', 'Exception') THEN v_operational
      ELSE session_status
    END,
    is_mispunch = v_mispunch,
    latest_evaluation_id = v_eval.id
  WHERE id = s.id;

  INSERT INTO audit_log (org_id, actor_id, actor_label, action, target, new_value)
  VALUES (
    s.org_id, p_actor_id, COALESCE(p_actor_label, 'System'),
    CASE WHEN p_trigger = 'manual_reeval' THEN 'Rule Re-Evaluation' ELSE 'Rule Evaluation' END,
    s.work_date::text || ' · ' || s.employee_id::text,
    v_payroll::text || ' · late ' || v_late || 'm'
  );

  PERFORM fn_wtm_log_event(
    s.org_id, s.employee_id,
    CASE WHEN p_trigger IN ('manual_reeval', 'policy_change', 'calendar_change') THEN 'Rule Re-Evaluated' ELSE 'Rule Evaluated' END,
    s.id, NULL,
    jsonb_build_object(
      'evaluation_id', v_eval.id,
      'payroll_status', v_payroll,
      'late_minutes', v_late,
      'remaining_grace', v_remaining_grace,
      'policy_version', v_att_policy.version
    ),
    p_actor_id, p_actor_label
  );

  PERFORM fn_wtm_sync_attendance_rollup(s.id);

  RETURN v_eval;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_wre_evaluate_session TO authenticated;

-- ---------------------------------------------------------------------
-- 5. Bulk re-evaluation
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_wre_reevaluate(
  p_org uuid,
  p_from date,
  p_to date,
  p_employee uuid DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_dry_run boolean DEFAULT true,
  p_actor_id uuid DEFAULT NULL,
  p_actor_label text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ids uuid[];
  v_id uuid;
  v_count int := 0;
BEGIN
  IF NOT (has_perm(p_org, 'manage_emp') OR has_perm(p_org, 'approve')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT array_agg(id) INTO v_ids
  FROM wtm_attendance_sessions
  WHERE org_id = p_org
    AND work_date BETWEEN p_from AND p_to
    AND session_status IN ('Completed', 'Exception', 'Holiday', 'Weekly Off')
    AND (p_employee IS NULL OR employee_id = p_employee);

  v_ids := COALESCE(v_ids, ARRAY[]::uuid[]);

  IF p_dry_run THEN
    RETURN jsonb_build_object('dry_run', true, 'count', array_length(v_ids, 1), 'session_ids', v_ids);
  END IF;

  FOREACH v_id IN ARRAY v_ids LOOP
    PERFORM fn_wre_evaluate_session(v_id, 'manual_reeval', NULL, p_actor_id, p_actor_label);
    v_count := v_count + 1;
  END LOOP;

  INSERT INTO audit_log (org_id, actor_id, actor_label, action, target, new_value)
  VALUES (p_org, p_actor_id, p_actor_label, 'Bulk Rule Re-Evaluation', p_from::text || '..' || p_to::text, v_count::text);

  RETURN jsonb_build_object('dry_run', false, 'count', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION fn_wre_reevaluate TO authenticated;

-- ---------------------------------------------------------------------
-- 6. Hook clock-out → evaluate before rollup
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_wtm_clock_out(
  p_session uuid,
  p_time time DEFAULT NULL,
  p_meta jsonb DEFAULT '{}'::jsonb,
  p_actor_id uuid DEFAULT NULL,
  p_actor_label text DEFAULT NULL
) RETURNS wtm_attendance_sessions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s wtm_attendance_sessions;
  v_time time := COALESCE(p_time, current_time);
  v_now timestamptz := now();
  v_open_break int;
BEGIN
  SELECT * INTO s FROM wtm_attendance_sessions WHERE id = p_session FOR UPDATE;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Session not found'; END IF;

  IF s.employee_id <> current_employee_id(s.org_id)
     AND NOT manages_employee(s.org_id, s.employee_id)
     AND NOT has_perm(s.org_id, 'manage_emp') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF s.clock_in IS NULL THEN RAISE EXCEPTION 'Clock in before clock out'; END IF;
  IF s.clock_out IS NOT NULL OR s.session_status = 'Completed' THEN
    RAISE EXCEPTION 'Already clocked out';
  END IF;

  SELECT COUNT(*) INTO v_open_break FROM wtm_attendance_breaks WHERE session_id = s.id AND break_in IS NULL;
  IF v_open_break > 0 THEN RAISE EXCEPTION 'End break before clocking out'; END IF;

  UPDATE wtm_attendance_sessions SET
    clock_out = v_time, clock_out_at = v_now, session_status = 'Completed',
    device_info = device_info || COALESCE(p_meta, '{}'::jsonb),
    modified_by = p_actor_id, modified_by_label = p_actor_label
  WHERE id = p_session RETURNING * INTO s;

  PERFORM fn_wtm_recalc_session_durations(s.id);
  SELECT * INTO s FROM wtm_attendance_sessions WHERE id = s.id;

  PERFORM fn_wre_evaluate_session(s.id, 'clock_out', NULL, p_actor_id, p_actor_label);

  SELECT * INTO s FROM wtm_attendance_sessions WHERE id = s.id;

  PERFORM fn_wtm_log_event(
    s.org_id, s.employee_id, 'AttendanceSessionCompleted', s.id, NULL,
    jsonb_build_object('work_date', s.work_date, 'new', v_time::text, 'working_min', s.working_duration_min,
      'payroll_status', s.payroll_status),
    p_actor_id, p_actor_label
  );

  PERFORM fn_wtm_log_event(
    s.org_id, s.employee_id, 'Clock Out', s.id, NULL,
    jsonb_build_object('work_date', s.work_date, 'new', v_time::text),
    p_actor_id, p_actor_label
  );

  RETURN s;
END;
$$;

-- Hook AEMS correction
CREATE OR REPLACE FUNCTION fn_aems_apply_session_correction(
  p_exception_id uuid,
  p_clock_in time,
  p_clock_out time,
  p_actor_id uuid DEFAULT NULL,
  p_actor_label text DEFAULT NULL
) RETURNS wtm_attendance_sessions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ex attendance_exceptions;
  s wtm_attendance_sessions;
  v_shift uuid;
BEGIN
  SELECT * INTO ex FROM attendance_exceptions WHERE id = p_exception_id FOR UPDATE;
  IF ex.id IS NULL THEN RAISE EXCEPTION 'Exception not found'; END IF;

  SELECT * INTO s FROM wtm_attendance_sessions
  WHERE employee_id = ex.employee_id AND work_date = ex.work_date;

  v_shift := fn_employee_shift_at(ex.employee_id, ex.work_date);

  IF s.id IS NULL THEN
    INSERT INTO wtm_attendance_sessions (
      org_id, employee_id, shift_id, work_date,
      clock_in, clock_out, clock_in_at, clock_out_at,
      session_status, attendance_status,
      created_by, created_by_label, modified_by, modified_by_label
    ) VALUES (
      ex.org_id, ex.employee_id, v_shift, ex.work_date,
      p_clock_in, p_clock_out,
      (ex.work_date + p_clock_in)::timestamptz,
      CASE WHEN p_clock_out IS NOT NULL THEN (ex.work_date + p_clock_out)::timestamptz ELSE NULL END,
      CASE WHEN p_clock_out IS NOT NULL THEN 'Completed'::wtm_session_status ELSE 'Working'::wtm_session_status END,
      'Present'::wtm_attendance_status,
      p_actor_id, p_actor_label, p_actor_id, p_actor_label
    ) RETURNING * INTO s;
    UPDATE attendance_exceptions SET session_id = s.id WHERE id = ex.id;
  ELSE
    UPDATE wtm_attendance_sessions SET
      clock_in = COALESCE(p_clock_in, clock_in),
      clock_out = p_clock_out,
      clock_in_at = COALESCE((ex.work_date + p_clock_in)::timestamptz, clock_in_at),
      clock_out_at = CASE WHEN p_clock_out IS NOT NULL THEN (ex.work_date + p_clock_out)::timestamptz ELSE clock_out_at END,
      session_status = CASE WHEN p_clock_out IS NOT NULL THEN 'Completed'::wtm_session_status ELSE session_status END,
      modified_by = p_actor_id, modified_by_label = p_actor_label
    WHERE id = s.id RETURNING * INTO s;
  END IF;

  PERFORM fn_wtm_recalc_session_durations(s.id);
  SELECT * INTO s FROM wtm_attendance_sessions WHERE id = s.id;

  IF s.session_status = 'Completed' OR p_clock_out IS NOT NULL THEN
    PERFORM fn_wre_evaluate_session(s.id, 'aems_correction', p_exception_id, p_actor_id, p_actor_label);
  END IF;

  SELECT * INTO s FROM wtm_attendance_sessions WHERE id = s.id;

  PERFORM fn_wtm_log_event(
    ex.org_id, ex.employee_id, 'Attendance Corrected', s.id, NULL,
    jsonb_build_object('exception_id', ex.id, 'clock_in', p_clock_in::text, 'clock_out', COALESCE(p_clock_out::text, 'null')),
    p_actor_id, p_actor_label
  );

  RETURN s;
END;
$$;

-- Extend WPMS attendance policy with half-day / grace evaluation fields
UPDATE wpms_policies SET config = config || '{
  "minimum_present_hours": 9,
  "minimum_half_day_hours": 4,
  "maximum_late_minutes": 120,
  "early_exit_threshold_minutes": 30,
  "monthly_grace_minutes": 30
}'::jsonb
WHERE org_id = '00000000-0000-0000-0000-0000000000f1'
  AND policy_kind = 'attendance'
  AND NOT (config ? 'minimum_present_hours');
