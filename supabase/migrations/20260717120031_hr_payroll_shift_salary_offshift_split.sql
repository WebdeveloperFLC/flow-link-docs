-- =====================================================================
-- HR Payroll — Salary from shift hours only; off-shift tracked separately
-- Punch anytime 24h (migration 30). Payable days / late / OT use shift window.
-- off_shift_min is performance-only — never affects fn_compute_payroll.
-- =====================================================================

ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS shift_work_min int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS off_shift_min int NOT NULL DEFAULT 0;

ALTER TABLE payroll_lines
  ADD COLUMN IF NOT EXISTS off_shift_minutes int NOT NULL DEFAULT 0;

-- Split a day's punches into shift-window work vs off-shift contribution.
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
  IF p_check_in IS NULL OR p_check_out IS NULL OR p_check_out <= p_check_in THEN
    RETURN jsonb_build_object('shift_work_min', 0, 'off_shift_min', 0, 'ot_minutes', 0);
  END IF;

  ci := extract(epoch FROM p_check_in) / 60;
  co := extract(epoch FROM p_check_out) / 60;
  lg := extract(epoch FROM COALESCE(p_login, '10:00'::time)) / 60;
  lo := extract(epoch FROM COALESCE(p_logout, '19:00'::time)) / 60;
  gross := co - ci;

  shift_start := GREATEST(ci, lg);
  shift_end := LEAST(co, lo);
  shift_gross := GREATEST(0, shift_end - shift_start);
  off_before := GREATEST(0, lg - ci);

  IF ci >= lo THEN
    -- Entirely outside office hours — performance tracking only.
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

-- OT for payroll rollup — shift extension only (not off-shift-only days).
CREATE OR REPLACE FUNCTION fn_calc_day_ot_minutes(
  p_check_in time,
  p_check_out time,
  p_break_min int,
  p_login time,
  p_logout time,
  p_shift_break int,
  p_ot_eligible boolean
) RETURNS int LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  split jsonb;
BEGIN
  IF NOT COALESCE(p_ot_eligible, false) OR p_check_in IS NULL OR p_check_out IS NULL THEN
    RETURN 0;
  END IF;
  split := fn_calc_shift_hour_split(p_check_in, p_check_out, p_break_min, p_login, p_logout);
  RETURN COALESCE((split->>'ot_minutes')::int, 0);
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

-- Restore full rollup (migration 30 dropped ot_minutes) + off-shift performance total.
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
      WHERE check_in IS NOT NULL
        AND check_in >= (COALESCE(sh.login_time, '10:00') + make_interval(mins => COALESCE(sh.grace_min, 5)))
        AND check_in <= COALESCE(sh.logout_time, '19:00')
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

-- Persist off-shift total on payroll line for reporting (not used in net salary).
CREATE OR REPLACE FUNCTION fn_build_payroll_line(p_employee uuid, p_cycle uuid)
RETURNS payroll_lines LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c record;
  e record;
  inp jsonb;
  calc jsonb;
  row payroll_lines;
  use_override boolean;
  ov jsonb;
  v_late_pol jsonb;
  v_mis_pol jsonb;
  v_sul_pol jsonb;
  v_ot_pol jsonb;
  v_pt_pol jsonb;
  v_ca_pol jsonb;
  v_ul_mult numeric;
  v_pt_amt numeric;
  v_country text;
BEGIN
  SELECT * INTO c FROM payroll_cycles WHERE id = p_cycle;
  IF c.status <> 'Draft' THEN
    RAISE EXCEPTION 'Cycle % is %; cannot rebuild line', c.label, c.status;
  END IF;
  SELECT * INTO e FROM employees WHERE id = p_employee;

  use_override := false;
  ov := NULL;
  SELECT is_overridden, override_json INTO use_override, ov
  FROM payroll_lines WHERE cycle_id = p_cycle AND employee_id = p_employee;
  use_override := COALESCE(use_override, false);

  IF use_override THEN
    inp := ov;
  ELSE
    inp := fn_rollup_inputs(p_employee, p_cycle);
  END IF;

  v_late_pol := fn_resolve_policy(e.org_id, 'late', c.start_date);
  v_mis_pol := fn_resolve_policy(e.org_id, 'mispunch', c.start_date);
  v_sul_pol := fn_resolve_policy(e.org_id, 'sandwich_ul', c.start_date);
  v_ot_pol := fn_resolve_policy(e.org_id, 'overtime', c.start_date);
  v_pt_pol := fn_resolve_policy(e.org_id, 'professional_tax', c.start_date);
  v_ca_pol := fn_resolve_policy(e.org_id, 'canada_deductions', c.start_date);
  v_ul_mult := COALESCE((v_sul_pol->>'ul_multiplier')::numeric, 2);
  v_pt_amt := COALESCE((v_pt_pol->>'default_amount')::numeric, 200);
  v_country := COALESCE(NULLIF(trim(e.payroll_country), ''), 'IN');

  calc := fn_compute_payroll(
    c.payroll_days, e.monthly_gross, e.basic, e.incentive, e.bonus,
    e.pf_applicable, e.esic_applicable,
    (inp->>'leaves')::numeric, (inp->>'paid_leaves')::numeric,
    (inp->>'late')::int, (inp->>'ul')::int, (inp->>'sandwich')::numeric,
    (inp->>'mispunch')::int, (inp->>'comp_off')::numeric, (inp->>'unpaid_training')::int,
    v_late_pol, v_mis_pol, v_ul_mult,
    COALESCE((inp->>'ot_minutes')::int, 0), v_ot_pol,
    COALESCE(e.pt_applicable, false),
    CASE WHEN COALESCE(e.pt_applicable, false) THEN v_pt_amt ELSE 0 END,
    v_country,
    v_ca_pol,
    COALESCE(e.other_deductions, 0),
    COALESCE(e.tds_applicable, false)
  );

  INSERT INTO payroll_lines AS pl (
    org_id, cycle_id, employee_id, payroll_days, monthly_gross, basic,
    leaves_taken, paid_leaves, comp_off, late_count, mispunch_count, ul_count,
    sandwich_count, unpaid_training, ot_minutes, ot_pay, off_shift_minutes,
    late_deduction, mispunch_deduction,
    payable_days, daily_rate, gross_earned, incentive, bonus,
    pf_employee, esic_employee, pt_employee, net_salary, is_overridden, override_json
  ) VALUES (
    e.org_id, p_cycle, p_employee, c.payroll_days, e.monthly_gross, e.basic,
    (inp->>'leaves')::numeric, (inp->>'paid_leaves')::numeric, (inp->>'comp_off')::numeric,
    (inp->>'late')::int, (inp->>'mispunch')::int, (inp->>'ul')::int,
    (inp->>'sandwich')::numeric, (inp->>'unpaid_training')::int,
    COALESCE((inp->>'ot_minutes')::int, 0), COALESCE((calc->>'ot_pay')::numeric, 0),
    COALESCE((inp->>'off_shift_minutes')::int, 0),
    (calc->>'late_deduction')::numeric, (calc->>'mispunch_deduction')::numeric,
    (calc->>'payable_days')::numeric, (calc->>'daily_rate')::numeric,
    (calc->>'gross_earned')::numeric, (calc->>'incentive')::numeric, (calc->>'bonus')::numeric,
    (calc->>'pf_employee')::numeric, (calc->>'esic_employee')::numeric,
    COALESCE((calc->>'pt_employee')::numeric, 0), (calc->>'net_salary')::numeric,
    COALESCE(use_override, false), ov
  )
  ON CONFLICT (cycle_id, employee_id) DO UPDATE SET
    payroll_days = excluded.payroll_days, monthly_gross = excluded.monthly_gross, basic = excluded.basic,
    leaves_taken = excluded.leaves_taken, paid_leaves = excluded.paid_leaves, comp_off = excluded.comp_off,
    late_count = excluded.late_count, mispunch_count = excluded.mispunch_count, ul_count = excluded.ul_count,
    sandwich_count = excluded.sandwich_count, unpaid_training = excluded.unpaid_training,
    ot_minutes = excluded.ot_minutes, ot_pay = excluded.ot_pay, off_shift_minutes = excluded.off_shift_minutes,
    late_deduction = excluded.late_deduction, mispunch_deduction = excluded.mispunch_deduction,
    payable_days = excluded.payable_days, daily_rate = excluded.daily_rate, gross_earned = excluded.gross_earned,
    incentive = excluded.incentive, bonus = excluded.bonus,
    pf_employee = excluded.pf_employee, esic_employee = excluded.esic_employee,
    pt_employee = excluded.pt_employee, net_salary = excluded.net_salary,
    is_overridden = excluded.is_overridden, override_json = excluded.override_json
  RETURNING * INTO row;
  RETURN row;
END;
$$;

-- Backfill derived columns for existing rows in open cycles.
UPDATE attendance a
SET
  shift_work_min = COALESCE((fn_calc_shift_hour_split(
    a.check_in, a.check_out, COALESCE(a.break_min, 0)::int,
    COALESCE(s.login_time, '10:00'), COALESCE(s.logout_time, '19:00')
  )->>'shift_work_min')::int, 0),
  off_shift_min = COALESCE((fn_calc_shift_hour_split(
    a.check_in, a.check_out, COALESCE(a.break_min, 0)::int,
    COALESCE(s.login_time, '10:00'), COALESCE(s.logout_time, '19:00')
  )->>'off_shift_min')::int, 0)
FROM employees e
JOIN shifts s ON s.id = e.shift_id
WHERE a.employee_id = e.id
  AND a.check_in IS NOT NULL
  AND a.check_out IS NOT NULL;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig FROM pg_proc p
    WHERE p.proname IN (
      'fn_calc_shift_hour_split',
      'fn_calc_day_ot_minutes',
      'fn_rollup_inputs',
      'fn_build_payroll_line'
    )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END $$;
