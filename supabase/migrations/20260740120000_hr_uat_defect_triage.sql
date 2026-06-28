-- =====================================================================
-- HR UAT Defect Triage — WRE safe policy resolution (clock-out fix)
-- Does NOT modify fn_compute_payroll or payroll engine.
-- =====================================================================

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
  v_att_policy_id uuid;
  v_hol_policy_id uuid;
  v_bundle_version int;
  v_att_policy_version int;
  v_hol_policy_version int;
BEGIN
  SELECT * INTO s FROM wtm_attendance_sessions WHERE id = p_session_id FOR UPDATE;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Session not found'; END IF;
  IF s.session_status = 'Locked' THEN
    RAISE EXCEPTION 'Session is locked — cannot re-evaluate';
  END IF;

  v_policy := fn_wpms_policy_config_at(s.employee_id, 'attendance', s.work_date);
  v_hol_policy := fn_wpms_policy_config_at(s.employee_id, 'holiday_calendar', s.work_date);
  v_att_policy_id := NULL;
  v_hol_policy_id := NULL;
  v_bundle_version := NULL;
  v_att_policy_version := NULL;
  v_hol_policy_version := NULL;

  v_bundle := fn_wpms_employee_bundle_at(s.employee_id, s.work_date);
  IF v_bundle IS NOT NULL THEN
    SELECT * INTO v_bundle_row FROM wpms_policy_bundles WHERE id = v_bundle;
    IF FOUND THEN
      v_bundle_version := v_bundle_row.version;
      IF v_bundle_row.attendance_policy_id IS NOT NULL THEN
        SELECT * INTO v_att_policy FROM wpms_policies WHERE id = v_bundle_row.attendance_policy_id;
        IF FOUND THEN
          v_att_policy_id := v_att_policy.id;
          v_att_policy_version := v_att_policy.version;
          v_policy := COALESCE(v_att_policy.config, v_policy);
        END IF;
      END IF;
      IF v_bundle_row.holiday_calendar_id IS NOT NULL THEN
        SELECT * INTO v_hol_policy_row FROM wpms_policies WHERE id = v_bundle_row.holiday_calendar_id;
        IF FOUND THEN
          v_hol_policy_id := v_hol_policy_row.id;
          v_hol_policy_version := v_hol_policy_row.version;
          v_hol_policy := COALESCE(v_hol_policy_row.config, v_hol_policy);
        END IF;
      END IF;
    END IF;
  END IF;

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
    v_bundle, v_att_policy_id, v_hol_policy_id, sh.id,
    v_bundle_version, v_att_policy_version, v_hol_policy_version,
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
    v_bundle_version, v_att_policy_version, v_hol_policy_version
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
      'policy_version', v_att_policy_version
    ),
    p_actor_id, p_actor_label
  );

  PERFORM fn_wtm_sync_attendance_rollup(s.id);

  RETURN v_eval;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_wre_evaluate_session TO authenticated;
