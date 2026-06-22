-- =====================================================================
-- HR Payroll Phase B — Automatic Weekly Off generation
-- Off days from work week (5-Day: Sat+Sun, 6-Day: Sun) via shift history.
-- Holiday rows are never overwritten. Payroll formulas unchanged.
-- =====================================================================

-- Configurable weekly-off weekdays per work week (policy domain weekly_off).
-- DOW: PostgreSQL EXTRACT(DOW) — 0=Sunday … 6=Saturday.
CREATE OR REPLACE FUNCTION fn_weekly_off_policy_config(p_org uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (
      SELECT p.config
      FROM policies p
      WHERE p.org_id = p_org
        AND p.domain = 'weekly_off'
        AND p.effective_from <= current_date
      ORDER BY p.effective_from DESC, p.version DESC
      LIMIT 1
    ),
    '{"five_day_off_dow":[6,0],"six_day_off_dow":[0]}'::jsonb
  );
$$;

CREATE OR REPLACE FUNCTION fn_weekly_off_dow_for_work_week(p_org uuid, p_work_week text)
RETURNS int[] LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  cfg jsonb;
  arr jsonb;
  out int[] := ARRAY[]::int[];
  elem jsonb;
BEGIN
  cfg := fn_weekly_off_policy_config(p_org);
  IF lower(trim(p_work_week)) = '5-day' THEN
    arr := COALESCE(cfg->'five_day_off_dow', '[6,0]'::jsonb);
  ELSE
    arr := COALESCE(cfg->'six_day_off_dow', '[0]'::jsonb);
  END IF;
  FOR elem IN SELECT * FROM jsonb_array_elements(arr) LOOP
    out := array_append(out, (elem #>> '{}')::int);
  END LOOP;
  RETURN out;
END;
$$;

-- Resolve work week from shift effective on date (shift history), else employee.work_week.
CREATE OR REPLACE FUNCTION fn_employee_work_week_at(p_employee uuid, p_date date)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_shift_id uuid;
  v_wdpw int;
  v_emp_ww text;
BEGIN
  SELECT work_week::text INTO v_emp_ww FROM employees WHERE id = p_employee;
  v_shift_id := fn_employee_shift_at(p_employee, p_date);
  IF v_shift_id IS NOT NULL THEN
    SELECT working_days_per_week INTO v_wdpw FROM shifts WHERE id = v_shift_id;
    IF v_wdpw IS NOT NULL THEN
      IF v_wdpw >= 6 THEN RETURN '6-Day'; END IF;
      RETURN '5-Day';
    END IF;
  END IF;
  RETURN COALESCE(v_emp_ww, '6-Day');
END;
$$;

CREATE OR REPLACE FUNCTION fn_is_weekly_off_day(p_org uuid, p_employee uuid, p_date date)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_dow int;
  v_ww text;
  v_off int[];
BEGIN
  v_dow := EXTRACT(DOW FROM p_date)::int;
  v_ww := fn_employee_work_week_at(p_employee, p_date);
  v_off := fn_weekly_off_dow_for_work_week(p_org, v_ww);
  RETURN v_dow = ANY(v_off);
END;
$$;

CREATE OR REPLACE FUNCTION fn_employee_attendance_eligible(p_employee uuid, p_date date)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = p_employee
      AND e.status NOT IN ('Terminated', 'Resigned')
      AND (e.date_of_joining IS NULL OR p_date >= e.date_of_joining)
      AND (e.exit_date IS NULL OR p_date <= e.exit_date)
  );
$$;

-- Core stamp: one employee, one date. Idempotent; never overwrites protected statuses.
CREATE OR REPLACE FUNCTION _fn_stamp_weekly_off(p_org uuid, p_employee uuid, p_date date)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_existing att_status;
BEGIN
  IF NOT fn_employee_attendance_eligible(p_employee, p_date) THEN
    RETURN false;
  END IF;
  IF NOT fn_is_weekly_off_day(p_org, p_employee, p_date) THEN
    RETURN false;
  END IF;

  SELECT status INTO v_existing
  FROM attendance
  WHERE employee_id = p_employee AND work_date = p_date;

  IF v_existing = 'Holiday' THEN
    RETURN false;
  END IF;
  IF v_existing IN ('Present', 'Half Day', 'Leave', 'Sick Leave', 'Unauthorized Leave') THEN
    RETURN false;
  END IF;

  INSERT INTO attendance (org_id, employee_id, work_date, status, is_mispunch, source)
  VALUES (p_org, p_employee, p_date, 'Week Off', false, 'system')
  ON CONFLICT (employee_id, work_date) DO UPDATE SET
    status = 'Week Off',
    is_mispunch = false,
    source = 'system'
  WHERE attendance.status NOT IN (
    'Holiday', 'Present', 'Half Day', 'Leave', 'Sick Leave', 'Unauthorized Leave'
  );

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION fn_apply_weekly_offs_for_date(
  p_org uuid,
  p_date date,
  p_internal boolean DEFAULT false
) RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  e record;
  n int := 0;
BEGIN
  IF NOT p_internal
     AND NOT has_perm(p_org, 'configure')
     AND NOT has_perm(p_org, 'manage_emp') THEN
    RAISE EXCEPTION 'Configure or manage_emp permission required';
  END IF;

  FOR e IN
    SELECT id FROM employees
    WHERE org_id = p_org AND status NOT IN ('Terminated', 'Resigned')
  LOOP
    IF _fn_stamp_weekly_off(p_org, e.id, p_date) THEN
      n := n + 1;
    END IF;
  END LOOP;

  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION fn_apply_weekly_offs_for_range(
  p_org uuid,
  p_from date,
  p_to date,
  p_employee uuid DEFAULT NULL,
  p_internal boolean DEFAULT false
) RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  d date;
  e record;
  n int := 0;
BEGIN
  IF p_from IS NULL OR p_to IS NULL OR p_to < p_from THEN
    RAISE EXCEPTION 'Invalid date range';
  END IF;

  IF NOT p_internal THEN
    IF p_employee IS NOT NULL THEN
      IF current_employee_id(p_org) IS DISTINCT FROM p_employee
         AND NOT has_perm(p_org, 'configure')
         AND NOT has_perm(p_org, 'manage_emp') THEN
        RAISE EXCEPTION 'Not allowed to sync weekly offs for this employee';
      END IF;
    ELSIF NOT has_perm(p_org, 'configure') AND NOT has_perm(p_org, 'manage_emp') THEN
      RAISE EXCEPTION 'Configure or manage_emp permission required';
    END IF;
  END IF;

  d := p_from;
  WHILE d <= p_to LOOP
    IF p_employee IS NOT NULL THEN
      IF _fn_stamp_weekly_off(p_org, p_employee, d) THEN
        n := n + 1;
      END IF;
    ELSE
      FOR e IN
        SELECT id FROM employees
        WHERE org_id = p_org AND status NOT IN ('Terminated', 'Resigned')
      LOOP
        IF _fn_stamp_weekly_off(p_org, e.id, d) THEN
          n := n + 1;
        END IF;
      END LOOP;
    END IF;
    d := d + 1;
  END LOOP;

  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION fn_apply_weekly_offs_for_cycle(p_org uuid, p_cycle uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c record;
BEGIN
  SELECT * INTO c FROM payroll_cycles WHERE id = p_cycle;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Cycle not found'; END IF;
  IF c.org_id IS DISTINCT FROM p_org THEN RAISE EXCEPTION 'Cycle org mismatch'; END IF;
  RETURN fn_apply_weekly_offs_for_range(p_org, c.start_date, c.end_date, NULL, true);
END;
$$;

-- Stamp weekly offs before payroll line rebuild (Draft / Processed / Approved cycles).
CREATE OR REPLACE FUNCTION fn_rebuild_cycle_lines(p_cycle uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c payroll_cycles;
  e record;
  v_count int := 0;
BEGIN
  SELECT * INTO c FROM payroll_cycles WHERE id = p_cycle FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Cycle not found'; END IF;
  IF c.status NOT IN ('Draft', 'Processed', 'Approved') THEN
    RAISE EXCEPTION 'Cycle % is %; cannot rebuild', c.label, c.status;
  END IF;

  PERFORM fn_apply_weekly_offs_for_cycle(c.org_id, p_cycle);

  FOR e IN
    SELECT id FROM employees
    WHERE org_id = c.org_id AND status NOT IN ('Terminated', 'Resigned')
  LOOP
    PERFORM fn_build_payroll_line(e.id, p_cycle);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- Seed default weekly-off policy for demo org.
INSERT INTO policies (org_id, domain, effective_from, version, config)
SELECT
  '00000000-0000-0000-0000-0000000000f1'::uuid,
  'weekly_off',
  '2026-01-01'::date,
  1,
  '{"five_day_off_dow":[6,0],"six_day_off_dow":[0],"note":"6=Saturday,0=Sunday"}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM policies
  WHERE org_id = '00000000-0000-0000-0000-0000000000f1'::uuid
    AND domain = 'weekly_off'
);

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig FROM pg_proc p
    WHERE p.proname IN (
      'fn_weekly_off_policy_config',
      'fn_weekly_off_dow_for_work_week',
      'fn_employee_work_week_at',
      'fn_is_weekly_off_day',
      'fn_employee_attendance_eligible',
      'fn_apply_weekly_offs_for_date',
      'fn_apply_weekly_offs_for_range',
      'fn_apply_weekly_offs_for_cycle',
      'fn_rebuild_cycle_lines'
    )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END $$;
