-- =====================================================================
-- HR Payroll — Sandwich half-day exception, 5-day night (EST), sick-leave fix
-- Run after 20260717120035_hr_payroll_policy_rules_engine.sql
-- (Also safe if migration 35 failed on fn_validate_sick_leave_rules)
-- =====================================================================

ALTER TABLE shifts
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  ADD COLUMN IF NOT EXISTS max_break_min int NOT NULL DEFAULT 45;

COMMENT ON COLUMN shifts.timezone IS 'IANA timezone for shift reference (e.g. America/Toronto for 5-day night EST)';

-- Night / Canada shifts → EST, 30m meal break per policy
UPDATE shifts SET
  timezone = 'America/Toronto',
  max_break_min = CASE WHEN type = 'Night' THEN 30 ELSE max_break_min END
WHERE type = 'Night' OR name ILIKE '%canada%' OR name ILIKE '%night%';

INSERT INTO policies (org_id, domain, effective_from, version, config)
SELECT
  '00000000-0000-0000-0000-0000000000f1'::uuid,
  'sandwich_ul',
  '2026-01-01'::date,
  2,
  '{
    "sandwich_cap": 2,
    "ul_multiplier": 2,
    "half_day_exception": true,
    "description": "Max 2 sandwich occurrences/year; no sandwich if half-day work before/after holiday"
  }'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM policies
  WHERE org_id = '00000000-0000-0000-0000-0000000000f1'::uuid
    AND domain = 'sandwich_ul' AND version = 2
);

INSERT INTO policies (org_id, domain, effective_from, version, config)
SELECT
  '00000000-0000-0000-0000-0000000000f1'::uuid,
  'leave',
  '2026-01-01'::date,
  3,
  '{
    "six_day_casual": 12,
    "six_day_sick": 6,
    "five_day_casual": 7,
    "five_day_sick": 3,
    "five_day_night_casual": 7,
    "five_day_night_sick": 3,
    "five_day_night_annual": 10,
    "five_day_night_timezone": "America/Toronto",
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
    AND domain = 'leave' AND version = 3
);

-- Resolve annual leave entitlement from work_week + shift type (5-day night EST = 10/yr)
CREATE OR REPLACE FUNCTION fn_leave_entitlement_for_employee(
  p_employee uuid,
  p_leave_type leave_type,
  p_cfg jsonb DEFAULT NULL
) RETURNS int LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  e employees;
  sh shifts;
  v_cfg jsonb;
  v_is_night_5day boolean;
BEGIN
  SELECT * INTO e FROM employees WHERE id = p_employee;
  IF e.id IS NULL THEN RETURN 0; END IF;

  v_cfg := COALESCE(p_cfg, fn_leave_policy_config(e.org_id));
  SELECT * INTO sh FROM shifts WHERE id = e.shift_id;
  v_is_night_5day := (e.work_week = '5-Day' AND COALESCE(sh.type::text, 'Day') = 'Night');

  IF p_leave_type = 'Sick Leave' THEN
    IF v_is_night_5day THEN
      RETURN COALESCE((v_cfg->>'five_day_night_sick')::int, 3);
    ELSIF e.work_week = '5-Day' THEN
      RETURN COALESCE((v_cfg->>'five_day_sick')::int, 3);
    ELSE
      RETURN COALESCE((v_cfg->>'six_day_sick')::int, 6);
    END IF;
  ELSIF p_leave_type = 'Casual Leave' THEN
    IF v_is_night_5day THEN
      RETURN COALESCE((v_cfg->>'five_day_night_casual')::int, 7);
    ELSIF e.work_week = '5-Day' THEN
      RETURN COALESCE((v_cfg->>'five_day_casual')::int, 7);
    ELSE
      RETURN COALESCE((v_cfg->>'six_day_casual')::int, 12);
    END IF;
  END IF;

  RETURN 0;
END;
$$;

CREATE OR REPLACE FUNCTION fn_is_five_day_night_est(p_employee uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM employees e
    JOIN shifts s ON s.id = e.shift_id
    WHERE e.id = p_employee
      AND e.work_week = '5-Day'
      AND s.type = 'Night'
  );
$$;

-- Fix sick-leave validation (record INTO syntax error in migration 35)
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
  v_tz text;
  v_shift_start timestamptz;
  v_notice_hours int := 2;
  v_monthly_sick numeric;
  v_cert_after numeric := 1;
BEGIN
  SELECT * INTO e FROM employees WHERE id = p_employee;
  SELECT s.login_time, COALESCE(s.timezone, 'Asia/Kolkata')
  INTO v_login, v_tz
  FROM shifts s
  WHERE s.id = e.shift_id;

  IF v_login IS NOT NULL THEN
    v_shift_start := (p_from_date + v_login) AT TIME ZONE v_tz - (v_notice_hours || ' hours')::interval;
    IF p_applied_at AT TIME ZONE v_tz > v_shift_start AT TIME ZONE v_tz
       AND p_from_date <= (p_applied_at AT TIME ZONE v_tz)::date + 1 THEN
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

-- Sandwich leave with half-day work exception (policy §7)
CREATE OR REPLACE FUNCTION fn_sandwich_half_day_exception(
  p_employee uuid,
  p_off_date date
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM attendance a
    WHERE a.employee_id = p_employee
      AND a.work_date IN (p_off_date - 1, p_off_date + 1)
      AND a.status IN ('Present', 'Half Day')
      AND a.check_in IS NOT NULL
  );
$$;

CREATE OR REPLACE FUNCTION fn_detect_sandwich_for_leave(p_request uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record;
  v_org uuid;
  v_cap int := 2;
  v_half_day_exception boolean := true;
  v_count int := 0;
  d date;
BEGIN
  SELECT lr.*, e.org_id AS emp_org INTO r
  FROM leave_requests lr
  JOIN employees e ON e.id = lr.employee_id
  WHERE lr.id = p_request;

  IF r.id IS NULL OR r.status <> 'Approved' THEN
    RETURN 0;
  END IF;

  v_org := r.emp_org;

  SELECT
    COALESCE((config->>'sandwich_cap')::int, 2),
    COALESCE((config->>'half_day_exception')::boolean, true)
  INTO v_cap, v_half_day_exception
  FROM policies
  WHERE org_id = v_org AND domain = 'sandwich_ul'
  ORDER BY effective_from DESC, version DESC
  LIMIT 1;

  UPDATE leave_requests SET is_sandwich = false
  WHERE employee_id = r.employee_id
    AND org_id = v_org
    AND from_date BETWEEN r.from_date - 7 AND r.to_date + 7;

  d := r.from_date - 1;
  WHILE d >= r.from_date - 14 LOOP
    IF EXISTS (
      SELECT 1 FROM attendance a
      WHERE a.employee_id = r.employee_id
        AND a.work_date = d
        AND a.status IN ('Week Off', 'Holiday')
    ) AND EXISTS (
      SELECT 1 FROM leave_requests lr2
      WHERE lr2.employee_id = r.employee_id
        AND lr2.status = 'Approved'
        AND lr2.from_date <= d AND lr2.to_date >= d
    ) THEN
      IF NOT (v_half_day_exception AND fn_sandwich_half_day_exception(r.employee_id, d)) THEN
        UPDATE leave_requests SET is_sandwich = true
        WHERE id = p_request AND NOT is_sandwich;
        v_count := v_count + 1;
        EXIT WHEN v_count >= v_cap;
      END IF;
    END IF;
    d := d - 1;
  END LOOP;

  d := r.to_date + 1;
  WHILE d <= r.to_date + 14 LOOP
    IF EXISTS (
      SELECT 1 FROM attendance a
      WHERE a.employee_id = r.employee_id
        AND a.work_date = d
        AND a.status IN ('Week Off', 'Holiday')
    ) AND EXISTS (
      SELECT 1 FROM leave_requests lr2
      WHERE lr2.employee_id = r.employee_id
        AND lr2.status = 'Approved'
        AND lr2.from_date <= d AND lr2.to_date >= d
    ) THEN
      IF NOT (v_half_day_exception AND fn_sandwich_half_day_exception(r.employee_id, d)) THEN
        UPDATE leave_requests SET is_sandwich = true
        WHERE id = p_request;
        v_count := v_count + 1;
        EXIT WHEN v_count >= v_cap;
      END IF;
    END IF;
    d := d + 1;
  END LOOP;

  RETURN v_count;
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
    v_casual_ent := fn_leave_entitlement_for_employee(e.id, 'Casual Leave', v_cfg);
    v_sick_ent := fn_leave_entitlement_for_employee(e.id, 'Sick Leave', v_cfg);

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

-- Re-seed entitlements using shift-aware helper (5-day night EST = 7+3 = 10)
UPDATE leave_balances lb
SET entitled = fn_leave_entitlement_for_employee(lb.employee_id, lb.type::leave_type),
    carried_in = 0
WHERE lb.type IN ('Casual Leave', 'Sick Leave');

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig FROM pg_proc p
    WHERE p.proname IN (
      'fn_leave_entitlement_for_employee',
      'fn_is_five_day_night_est',
      'fn_validate_sick_leave_rules',
      'fn_sandwich_half_day_exception',
      'fn_detect_sandwich_for_leave',
      'fn_accrue_leave_balances'
    )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END $$;
