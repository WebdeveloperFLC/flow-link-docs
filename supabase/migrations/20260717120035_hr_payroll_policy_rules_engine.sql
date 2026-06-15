-- =====================================================================
-- HR Payroll — Policy rules engine (leave 12+6, notice, eligibility, late, break)
-- Run after 20260717120034_hr_payroll_leave_casual_sick_policy.sql
-- =====================================================================

-- ---- Shift break / late tiers ----
ALTER TABLE shifts
  ADD COLUMN IF NOT EXISTS full_day_after_min int NOT NULL DEFAULT 180,
  ADD COLUMN IF NOT EXISTS break_window_start time DEFAULT '13:00',
  ADD COLUMN IF NOT EXISTS break_window_end time DEFAULT '14:30',
  ADD COLUMN IF NOT EXISTS max_break_min int NOT NULL DEFAULT 45;

UPDATE shifts SET
  full_day_after_min = COALESCE(full_day_after_min, 180),
  max_break_min = COALESCE(max_break_min, 45),
  break_window_start = COALESCE(break_window_start, '13:00'::time),
  break_window_end = COALESCE(break_window_end, '14:30'::time);

-- ESS unavailable toggle (persisted on today's attendance row)
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS ess_unavailable boolean NOT NULL DEFAULT false;

-- ---- Policy seed ----
INSERT INTO policies (org_id, domain, effective_from, version, config)
SELECT
  '00000000-0000-0000-0000-0000000000f1'::uuid,
  'leave',
  '2026-01-01'::date,
  2,
  '{
    "six_day_casual": 12,
    "six_day_sick": 6,
    "five_day_casual": 7,
    "five_day_sick": 3,
    "monthly_paid_cap": 1.5,
    "notice_days_short": 7,
    "notice_days_long": 30,
    "notice_threshold_days": 3,
    "eligible_employment_types": ["Full time - Permanent"],
    "sick_notice_hours": 2,
    "sick_cert_after_days_per_month": 1,
    "no_carry_forward": true
  }'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM policies
  WHERE org_id = '00000000-0000-0000-0000-0000000000f1'::uuid
    AND domain = 'leave' AND version = 2
);

INSERT INTO policies (org_id, domain, effective_from, version, config)
SELECT
  '00000000-0000-0000-0000-0000000000f1'::uuid,
  'late',
  '2026-01-01'::date,
  2,
  '{
    "report_time": "10:00",
    "grace_until": "10:05",
    "half_day_after_min": 60,
    "full_day_after_min": 180,
    "slab_table": [
      {"max": 3, "deduction": 1.0},
      {"max": 6, "deduction": 1.5},
      {"max": 9, "deduction": 2.0},
      {"max": 12, "deduction": 2.5},
      {"max": 15, "deduction": 3.0},
      {"max": 18, "deduction": 3.5},
      {"max": 21, "deduction": 4.0},
      {"max": 24, "deduction": 4.5},
      {"max": 27, "deduction": 5.0},
      {"max": 999, "deduction": 5.5}
    ]
  }'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM policies
  WHERE org_id = '00000000-0000-0000-0000-0000000000f1'::uuid
    AND domain = 'late' AND version = 2
);

-- ---- Entitlements: 12 Casual + 6 Sick (6-day), 7+3 (5-day); no carry-forward ----
UPDATE leave_balances SET carried_in = 0;

UPDATE leave_balances lb
SET entitled = CASE
  WHEN lb.type = 'Sick Leave' AND e.work_week = '5-Day' THEN 3
  WHEN lb.type = 'Sick Leave' THEN 6
  WHEN lb.type = 'Casual Leave' AND e.work_week = '5-Day' THEN 7
  WHEN lb.type = 'Casual Leave' THEN 12
  ELSE lb.entitled
END,
accrued = LEAST(
  CASE
    WHEN lb.type = 'Sick Leave' AND e.work_week = '5-Day' THEN 3
    WHEN lb.type = 'Sick Leave' THEN 6
    WHEN lb.type = 'Casual Leave' AND e.work_week = '5-Day' THEN 7
    WHEN lb.type = 'Casual Leave' THEN 12
    ELSE lb.entitled
  END,
  lb.accrued
)
FROM employees e
WHERE e.id = lb.employee_id
  AND lb.type IN ('Casual Leave', 'Sick Leave');

CREATE OR REPLACE FUNCTION fn_leave_policy_config(p_org uuid, p_as_of date DEFAULT current_date)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT fn_resolve_policy(p_org, 'leave', p_as_of);
$$;

CREATE OR REPLACE FUNCTION fn_is_leave_eligible(p_employee uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  e employees;
  v_cfg jsonb;
  v_types jsonb;
  v_probation_end date;
BEGIN
  SELECT * INTO e FROM employees WHERE id = p_employee;
  IF e.id IS NULL THEN RETURN false; END IF;

  v_cfg := fn_leave_policy_config(e.org_id);
  v_types := COALESCE(v_cfg->'eligible_employment_types', '["Full time - Permanent"]'::jsonb);

  IF NOT (v_types ? e.employment_type) THEN
    RETURN false;
  END IF;

  IF COALESCE(e.work_hours, 9) < 8 THEN
    RETURN false;
  END IF;

  v_probation_end := COALESCE(
    e.probation_end_date,
    CASE WHEN e.date_of_joining IS NOT NULL THEN e.date_of_joining + interval '3 months' ELSE NULL END
  )::date;

  IF e.status = 'On Probation' OR (v_probation_end IS NOT NULL AND current_date <= v_probation_end) THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION fn_validate_leave_notice(
  p_days numeric,
  p_from_date date,
  p_applied_at timestamptz DEFAULT now()
) RETURNS jsonb LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_cfg jsonb;
  v_short int;
  v_long int;
  v_threshold numeric;
  v_required date;
BEGIN
  v_short := 7;
  v_long := 30;
  v_threshold := 3;

  IF p_days <= v_threshold THEN
    v_required := (p_applied_at::date + v_short);
    IF p_from_date < v_required THEN
      RETURN jsonb_build_object(
        'valid', false,
        'reason', 'Leave request will be rejected as leave rules not followed (minimum 7 days notice for 1–3 days leave)'
      );
    END IF;
  ELSE
    v_required := (p_applied_at::date + v_long);
    IF p_from_date < v_required THEN
      RETURN jsonb_build_object(
        'valid', false,
        'reason', 'Leave request will be rejected as leave rules not followed (minimum 1 month notice for 4+ days leave)'
      );
    END IF;
  END IF;

  RETURN jsonb_build_object('valid', true, 'reason', null);
END;
$$;

CREATE OR REPLACE FUNCTION fn_validate_sick_leave_rules(
  p_employee uuid,
  p_from_date date,
  p_days numeric,
  p_has_document boolean,
  p_applied_at timestamptz DEFAULT now()
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  e employees;
  v_login time;
  v_shift_start timestamptz;
  v_notice_hours int := 2;
  v_monthly_sick numeric;
  v_cert_after numeric := 1;
BEGIN
  SELECT * INTO e FROM employees WHERE id = p_employee;
  SELECT s.login_time INTO v_login FROM shifts s WHERE s.id = e.shift_id;

  IF v_login IS NOT NULL THEN
    v_shift_start := (p_from_date + v_login) - (v_notice_hours || ' hours')::interval;
    IF p_applied_at > v_shift_start AND p_from_date <= p_applied_at::date + 1 THEN
      RETURN jsonb_build_object(
        'valid', false,
        'reason', 'Sick Leave must be informed at least 2 hours before shift start'
      );
    END IF;
  END IF;

  SELECT COALESCE(SUM(days), 0) INTO v_monthly_sick
  FROM leave_requests
  WHERE employee_id = p_employee
    AND type = 'Sick Leave'
    AND status IN ('Approved', 'Pending')
    AND date_trunc('month', from_date) = date_trunc('month', p_from_date);

  IF v_monthly_sick + p_days > v_cert_after AND NOT p_has_document THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'Medical certificate required when Sick Leave exceeds 1 day in a month'
    );
  END IF;

  RETURN jsonb_build_object('valid', true, 'reason', null);
END;
$$;

CREATE OR REPLACE FUNCTION fn_validate_leave_rules(
  p_employee uuid,
  p_type leave_type,
  p_from_date date,
  p_days numeric,
  p_has_document boolean,
  p_applied_at timestamptz DEFAULT now(),
  p_exclude uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_notice jsonb;
  v_sick jsonb;
  v_year int;
  v_remaining numeric;
  v_monthly numeric;
  v_cap numeric := 1.5;
BEGIN
  IF p_type = 'Unpaid Leave' THEN
    RETURN jsonb_build_object('valid', true, 'reason', null);
  END IF;

  IF NOT fn_is_leave_eligible(p_employee) THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'Leave request will be rejected as leave rules not followed (not eligible — Full time Permanent after probation only)'
    );
  END IF;

  v_notice := fn_validate_leave_notice(p_days, p_from_date, p_applied_at);
  IF NOT (v_notice->>'valid')::boolean THEN
    RETURN v_notice;
  END IF;

  IF p_type = 'Sick Leave' THEN
    v_sick := fn_validate_sick_leave_rules(p_employee, p_from_date, p_days, p_has_document, p_applied_at);
    IF NOT (v_sick->>'valid')::boolean THEN
      RETURN v_sick;
    END IF;
  END IF;

  v_year := extract(year FROM p_from_date)::int;
  v_monthly := fn_leave_monthly_paid_used(p_employee, p_from_date, p_exclude);
  IF v_monthly + p_days > v_cap THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'Leave request will be rejected as leave rules not followed (monthly paid cap 1.5 days exceeded)'
    );
  END IF;

  v_remaining := fn_leave_balance_remaining(p_employee, p_type, v_year);
  IF v_remaining < p_days THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', format('Leave request will be rejected as leave rules not followed (insufficient %s balance)', p_type)
    );
  END IF;

  RETURN jsonb_build_object('valid', true, 'reason', null);
END;
$$;

CREATE OR REPLACE FUNCTION fn_apply_leave_type_policy()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_validation jsonb;
BEGIN
  IF NEW.type NOT IN ('Casual Leave', 'Sick Leave', 'Unpaid Leave') THEN
    RAISE EXCEPTION 'Only Casual Leave, Sick Leave, or Unpaid Leave may be applied';
  END IF;

  IF NEW.type = 'Unpaid Leave' THEN
    RETURN NEW;
  END IF;

  IF NOT fn_is_leave_eligible(NEW.employee_id) THEN
    NEW.type := 'Unpaid Leave';
    RETURN NEW;
  END IF;

  v_validation := fn_validate_leave_rules(
    NEW.employee_id, NEW.type, NEW.from_date, NEW.days, NEW.has_document, NEW.created_at, NEW.id
  );

  IF NOT (v_validation->>'valid')::boolean THEN
    NEW.type := 'Unpaid Leave';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fn_commit_leave_approval(p_request uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r leave_requests;
  v_year int;
BEGIN
  SELECT * INTO r FROM leave_requests WHERE id = p_request;
  v_year := extract(year FROM r.from_date)::int;

  IF r.type IN ('Casual Leave', 'Sick Leave') THEN
    INSERT INTO leave_balances (org_id, employee_id, policy_year, type, entitled, accrued, taken)
    VALUES (r.org_id, r.employee_id, v_year, r.type, 0, 0, 0)
    ON CONFLICT (employee_id, policy_year, type) DO NOTHING;

    UPDATE leave_balances
    SET taken = taken + r.days
    WHERE employee_id = r.employee_id
      AND policy_year = v_year
      AND type = r.type;
  END IF;

  PERFORM fn_detect_sandwich_for_leave(r.id);

  INSERT INTO audit_log (org_id, actor_label, action, target, new_value)
  VALUES (r.org_id, 'HR', 'Leave Approved', r.type || ' · ' || r.from_date::text, r.days::text);
END;
$$;

CREATE OR REPLACE FUNCTION fn_finalize_leave_on_approve(p_request uuid)
RETURNS leave_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r leave_requests;
  v_validation jsonb;
  v_was_approved boolean;
BEGIN
  SELECT * INTO r FROM leave_requests WHERE id = p_request FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Leave request not found'; END IF;

  v_was_approved := (r.status = 'Approved');

  IF NOT v_was_approved THEN
    IF r.type IN ('Casual Leave', 'Sick Leave') THEN
      v_validation := fn_validate_leave_rules(
        r.employee_id, r.type, r.from_date, r.days, r.has_document, r.created_at, r.id
      );
      IF NOT (v_validation->>'valid')::boolean THEN
        RAISE EXCEPTION '%', v_validation->>'reason';
      END IF;
    ELSIF r.type <> 'Unpaid Leave' THEN
      RAISE EXCEPTION 'Only Casual, Sick, or Unpaid leave may be approved';
    END IF;
  END IF;

  UPDATE leave_requests SET status = 'Approved' WHERE id = p_request RETURNING * INTO r;

  IF NOT v_was_approved THEN
    PERFORM fn_commit_leave_approval(p_request);
  END IF;

  RETURN r;
END;
$$;

CREATE OR REPLACE FUNCTION fn_process_leave_decision(
  p_request uuid,
  p_decision request_status
) RETURNS leave_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r leave_requests;
  v_year int;
  v_was_approved boolean;
  v_validation jsonb;
BEGIN
  IF p_decision NOT IN ('Approved', 'Rejected', 'Pending') THEN
    RAISE EXCEPTION 'Invalid decision %', p_decision;
  END IF;

  SELECT * INTO r FROM leave_requests WHERE id = p_request FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Leave request not found'; END IF;

  IF NOT has_perm(r.org_id, 'approve') AND r.employee_id <> current_employee_id(r.org_id) THEN
    RAISE EXCEPTION 'Not authorized to decide leave';
  END IF;

  v_was_approved := (r.status = 'Approved');
  v_year := extract(year FROM r.from_date)::int;

  IF p_decision = 'Approved' AND NOT v_was_approved THEN
    IF r.type IN ('Casual Leave', 'Sick Leave') THEN
      v_validation := fn_validate_leave_rules(
        r.employee_id, r.type, r.from_date, r.days, r.has_document, r.created_at, r.id
      );
      IF NOT (v_validation->>'valid')::boolean THEN
        RAISE EXCEPTION '%', v_validation->>'reason';
      END IF;
    END IF;
  END IF;

  UPDATE leave_requests SET status = p_decision WHERE id = p_request RETURNING * INTO r;

  IF p_decision = 'Approved' AND NOT v_was_approved THEN
    PERFORM fn_commit_leave_approval(p_request);
    INSERT INTO approvals (org_id, entity_type, entity_id, stage, decision, acted_at)
    VALUES (r.org_id, 'leave', r.id, 'HR', 'Approved', now());
  ELSIF p_decision = 'Rejected' AND v_was_approved THEN
    IF r.type IN ('Casual Leave', 'Sick Leave') THEN
      UPDATE leave_balances
      SET taken = GREATEST(0, taken - r.days)
      WHERE employee_id = r.employee_id AND policy_year = v_year AND type = r.type;
    END IF;
  ELSIF p_decision = 'Rejected' THEN
    INSERT INTO audit_log (org_id, actor_label, action, target, new_value)
    VALUES (r.org_id, 'HR', 'Leave Rejected', r.type, r.from_date::text);
  ELSIF p_decision = 'Pending' AND v_was_approved THEN
    IF r.type IN ('Casual Leave', 'Sick Leave') THEN
      UPDATE leave_balances
      SET taken = GREATEST(0, taken - r.days)
      WHERE employee_id = r.employee_id AND policy_year = v_year AND type = r.type;
    END IF;
    UPDATE leave_requests SET is_sandwich = false WHERE id = r.id;
  END IF;

  RETURN r;
END;
$$;

CREATE OR REPLACE FUNCTION fn_accrue_leave_balances(p_org uuid, p_year int DEFAULT extract(year FROM current_date)::int)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  e record;
  v_cfg jsonb;
  v_casual_ent int;
  v_sick_ent int;
  n int := 0;
BEGIN
  IF NOT has_perm(p_org, 'configure') THEN
    RAISE EXCEPTION 'Configure permission required';
  END IF;

  v_cfg := fn_leave_policy_config(p_org);

  FOR e IN SELECT * FROM employees WHERE org_id = p_org AND status NOT IN ('Terminated', 'Resigned') LOOP
    IF e.work_week = '5-Day' THEN
      v_casual_ent := COALESCE((v_cfg->>'five_day_casual')::int, 7);
      v_sick_ent := COALESCE((v_cfg->>'five_day_sick')::int, 3);
    ELSE
      v_casual_ent := COALESCE((v_cfg->>'six_day_casual')::int, 12);
      v_sick_ent := COALESCE((v_cfg->>'six_day_sick')::int, 6);
    END IF;

    INSERT INTO leave_balances (org_id, employee_id, policy_year, type, entitled, accrued, taken, carried_in)
    VALUES (p_org, e.id, p_year, 'Casual Leave', v_casual_ent, 1.0, 0, 0)
    ON CONFLICT (employee_id, policy_year, type) DO UPDATE SET
      entitled = EXCLUDED.entitled,
      accrued = LEAST(leave_balances.entitled, leave_balances.accrued + 1.0),
      carried_in = 0;

    INSERT INTO leave_balances (org_id, employee_id, policy_year, type, entitled, accrued, taken, carried_in)
    VALUES (p_org, e.id, p_year, 'Sick Leave', v_sick_ent, 0.5, 0, 0)
    ON CONFLICT (employee_id, policy_year, type) DO UPDATE SET
      entitled = EXCLUDED.entitled,
      accrued = LEAST(leave_balances.entitled, leave_balances.accrued + 0.5),
      carried_in = 0;

    n := n + 1;
  END LOOP;

  INSERT INTO audit_log (org_id, actor_label, action, target, new_value)
  VALUES (p_org, 'System', 'Leave Accrual Run', p_year::text, n::text || ' employees');

  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION fn_expire_monthly_leave_quota(p_org uuid, p_month date DEFAULT date_trunc('month', current_date)::date)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_perm(p_org, 'configure') THEN
    RAISE EXCEPTION 'Configure permission required';
  END IF;

  INSERT INTO audit_log (org_id, actor_label, action, target, new_value)
  VALUES (
    p_org, 'System', 'Monthly Leave Quota Expiry',
    to_char(p_month, 'YYYY-MM'),
    'Unused 1.5 paid days/month do not carry forward'
  );

  RETURN 1;
END;
$$;

-- Late slab default aligned to company policy (1–3 late = 1 day deduction)
CREATE OR REPLACE FUNCTION fn_late_deduction(p_late int, p_policy jsonb DEFAULT NULL)
RETURNS numeric LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  slab record;
BEGIN
  IF p_policy IS NOT NULL AND p_policy ? 'slab_table' THEN
    FOR slab IN
      SELECT (elem->>'max')::int AS max_late, (elem->>'deduction')::numeric AS ded
      FROM jsonb_array_elements(p_policy->'slab_table') AS elem
      ORDER BY (elem->>'max')::int
    LOOP
      IF p_late <= slab.max_late THEN
        RETURN slab.ded;
      END IF;
    END LOOP;
    RETURN 5.5;
  END IF;

  RETURN CASE
    WHEN p_late <= 3  THEN 1.0
    WHEN p_late <= 6  THEN 1.5
    WHEN p_late <= 9  THEN 2.0
    WHEN p_late <= 12 THEN 2.5
    WHEN p_late <= 15 THEN 3.0
    WHEN p_late <= 18 THEN 3.5
    WHEN p_late <= 21 THEN 4.0
    WHEN p_late <= 24 THEN 4.5
    WHEN p_late <= 27 THEN 5.0
    ELSE 5.5
  END;
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

  IF ci IS NOT NULL AND ci > lg + COALESCE(p_full_after, 180) THEN
    st := 'Absent';
  ELSIF ci IS NOT NULL
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

CREATE OR REPLACE FUNCTION fn_set_ess_unavailable(p_attendance uuid, p_unavailable boolean)
RETURNS attendance LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  a attendance;
BEGIN
  UPDATE attendance
  SET ess_unavailable = p_unavailable
  WHERE id = p_attendance
  RETURNING * INTO a;
  IF a.id IS NULL THEN RAISE EXCEPTION 'Attendance row not found'; END IF;
  RETURN a;
END;
$$;

CREATE OR REPLACE FUNCTION fn_apply_holidays_for_date(p_org uuid, p_date date)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  h record;
  e record;
  n int := 0;
  v_tags jsonb;
BEGIN
  IF NOT has_perm(p_org, 'configure') AND NOT has_perm(p_org, 'manage_emp') THEN
    RAISE EXCEPTION 'Configure or manage_emp permission required';
  END IF;

  FOR h IN
    SELECT * FROM holidays
    WHERE org_id = p_org AND holiday_date = p_date
  LOOP
    v_tags := COALESCE(to_jsonb(h.applicable_tags), '[]'::jsonb);

    FOR e IN
      SELECT * FROM employees
      WHERE org_id = p_org
        AND status NOT IN ('Terminated', 'Resigned')
        AND employment_type = 'Full time - Permanent'
        AND (h.branch_id IS NULL OR branch_id = h.branch_id)
    LOOP
      IF v_tags <> '[]'::jsonb THEN
        IF e.work_week = '5-Day' AND NOT (v_tags ? '5-Day') THEN CONTINUE; END IF;
        IF e.work_week <> '5-Day' AND NOT (v_tags ? '6-Day') AND NOT (v_tags ? 'Day') THEN CONTINUE; END IF;
      END IF;

      INSERT INTO attendance (org_id, employee_id, work_date, status, source)
      VALUES (p_org, e.id, p_date, 'Holiday', 'system')
      ON CONFLICT (employee_id, work_date) DO UPDATE SET
        status = 'Holiday',
        source = 'system';
      n := n + 1;
    END LOOP;
  END LOOP;

  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION trg_training_unpaid_cap()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_total int;
BEGIN
  SELECT COALESCE(SUM(unpaid_days), 0) INTO v_total
  FROM training_records
  WHERE employee_id = NEW.employee_id
    AND status <> 'Cancelled'
    AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF v_total + COALESCE(NEW.unpaid_days, 0) > 7 THEN
    RAISE EXCEPTION 'Maximum 7 unpaid training days allowed per employee';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS training_unpaid_cap ON training_records;
CREATE TRIGGER training_unpaid_cap
  BEFORE INSERT OR UPDATE OF unpaid_days, status ON training_records
  FOR EACH ROW EXECUTE FUNCTION trg_training_unpaid_cap();

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig FROM pg_proc p
    WHERE p.proname IN (
      'fn_leave_policy_config',
      'fn_is_leave_eligible',
      'fn_validate_leave_notice',
      'fn_validate_sick_leave_rules',
      'fn_validate_leave_rules',
      'fn_commit_leave_approval',
      'fn_finalize_leave_on_approve',
      'fn_process_leave_decision',
      'fn_accrue_leave_balances',
      'fn_expire_monthly_leave_quota',
      'fn_late_deduction',
      'fn_set_ess_unavailable',
      'fn_apply_holidays_for_date'
    )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END $$;
