-- =====================================================================
-- HR Payroll — Overtime pay (v1.1) + register OT columns
-- Run after 20260717120013_hr_payroll_lock_export_punch.sql
-- =====================================================================

ALTER TABLE payroll_lines
  ADD COLUMN IF NOT EXISTS ot_minutes int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ot_pay numeric(12,2) NOT NULL DEFAULT 0;

-- OT minutes beyond shift target for a single day
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
  ci numeric; co numeric; login numeric; logout numeric; target numeric; net numeric;
BEGIN
  IF NOT COALESCE(p_ot_eligible, false) OR p_check_in IS NULL OR p_check_out IS NULL THEN
    RETURN 0;
  END IF;
  ci := extract(epoch FROM p_check_in) / 60;
  co := extract(epoch FROM p_check_out) / 60;
  login := extract(epoch FROM COALESCE(p_login, '10:00'::time)) / 60;
  logout := extract(epoch FROM COALESCE(p_logout, '19:00'::time)) / 60;
  net := (co - ci) - COALESCE(p_break_min, 0);
  target := logout - login - COALESCE(p_shift_break, 0);
  IF net > target THEN
    RETURN GREATEST(0, round(net - target)::int);
  END IF;
  RETURN 0;
END;
$$;

-- Roll-up with OT minutes (display + optional pay)
CREATE OR REPLACE FUNCTION fn_rollup_inputs(p_employee uuid, p_cycle uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c record; e record; sh record;
  v_late int := 0; v_mis int := 0; v_leaves numeric := 0; v_woff int := 0;
  v_working numeric := 0; v_ul int := 0; v_paid numeric := 0; v_compoff numeric := 0;
  v_sandwich numeric := 0; v_train int := 0; v_ot int := 0;
  v_late_exempt int := 0; v_mis_approved int := 0;
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
    count(*) FILTER (WHERE check_in IS NOT NULL
       AND (extract(epoch FROM check_in) / 60) - (extract(epoch FROM COALESCE(sh.login_time, '10:00')) / 60) > COALESCE(sh.grace_min, 5)
       AND status NOT IN ('Week Off', 'Holiday', 'Leave', 'Sick Leave', 'Unauthorized Leave', 'Absent'))
  INTO v_working, v_leaves, v_woff, v_ul, v_mis, v_late
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
    'working', round(v_working, 1),
    'week_off', v_woff
  );
END;
$$;

-- Core payroll with OT pay (v1.1)
CREATE OR REPLACE FUNCTION fn_compute_payroll(
  p_payroll_days  int,
  p_monthly       numeric,
  p_basic         numeric,
  p_incentive     numeric DEFAULT 0,
  p_bonus         numeric DEFAULT 0,
  p_pf_applicable boolean DEFAULT true,
  p_esic_applicable boolean DEFAULT false,
  p_leaves        numeric DEFAULT 0,
  p_paid_leaves   numeric DEFAULT 0,
  p_late          int DEFAULT 0,
  p_ul            int DEFAULT 0,
  p_sandwich      numeric DEFAULT 0,
  p_mispunch      int DEFAULT 0,
  p_compoff       numeric DEFAULT 0,
  p_unpaid_training int DEFAULT 0,
  p_late_policy   jsonb DEFAULT NULL,
  p_mispunch_policy jsonb DEFAULT NULL,
  p_ul_mult       numeric DEFAULT 2,
  p_ot_minutes    int DEFAULT 0,
  p_ot_policy     jsonb DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  k numeric; n numeric; payable numeric; daily numeric; gross numeric;
  basic numeric; pf_wage numeric; pf_emp numeric; esic_emp numeric; net numeric;
  pf_ceiling numeric := COALESCE((p_late_policy->>'pf_ceiling')::numeric, 15000);
  esic_ceiling numeric := COALESCE((p_late_policy->>'esic_ceiling')::numeric, 21000);
  v_ot_pay numeric := 0;
  v_hourly numeric;
  v_mode text;
  v_min_ot int;
BEGIN
  k := fn_late_deduction(p_late, p_late_policy);
  n := fn_mispunch_deduction(p_mispunch, p_mispunch_policy);
  payable := p_payroll_days - COALESCE(p_leaves, 0) + COALESCE(p_paid_leaves, 0)
             + COALESCE(p_compoff, 0) - k - (COALESCE(p_ul, 0) * COALESCE(p_ul_mult, 2))
             - COALESCE(p_sandwich, 0) - n - COALESCE(p_unpaid_training, 0);
  daily := round(p_monthly / NULLIF(p_payroll_days, 0), 2);
  gross := round(daily * payable);
  basic := COALESCE(p_basic, round(p_monthly * 0.5));
  pf_wage := least(basic, pf_ceiling);
  pf_emp  := CASE WHEN p_pf_applicable THEN round(pf_wage * 0.12) ELSE 0 END;
  esic_emp := CASE WHEN p_esic_applicable AND p_monthly <= esic_ceiling THEN round(gross * 0.0075) ELSE 0 END;

  v_mode := COALESCE(p_ot_policy->>'mode', 'display');
  v_min_ot := COALESCE((p_ot_policy->>'min_ot_minutes')::int, 30);
  IF v_mode = 'paid' AND COALESCE(p_ot_minutes, 0) >= v_min_ot THEN
    v_hourly := daily / COALESCE((p_ot_policy->>'hours_per_day')::numeric, 8);
    v_ot_pay := round(
      (p_ot_minutes / 60.0) * v_hourly * COALESCE((p_ot_policy->>'rate_multiplier')::numeric, 1.5)
    );
  END IF;

  net := gross + COALESCE(p_incentive, 0) + COALESCE(p_bonus, 0) + v_ot_pay - pf_emp - esic_emp;
  RETURN jsonb_build_object(
    'late_deduction', k,
    'mispunch_deduction', n,
    'payable_days', round(payable, 2),
    'daily_rate', daily,
    'gross_earned', gross,
    'pf_employee', pf_emp,
    'esic_employee', esic_emp,
    'incentive', COALESCE(p_incentive, 0),
    'bonus', COALESCE(p_bonus, 0),
    'ot_minutes', COALESCE(p_ot_minutes, 0),
    'ot_pay', v_ot_pay,
    'net_salary', round(net)
  );
END;
$$;

CREATE OR REPLACE FUNCTION fn_build_payroll_line(p_employee uuid, p_cycle uuid)
RETURNS payroll_lines LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c record; e record; inp jsonb; calc jsonb; row payroll_lines;
  use_override boolean; ov jsonb;
  v_late_pol jsonb; v_mis_pol jsonb; v_sul_pol jsonb; v_ot_pol jsonb; v_ul_mult numeric;
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
  v_ul_mult := COALESCE((v_sul_pol->>'ul_multiplier')::numeric, 2);

  calc := fn_compute_payroll(
    c.payroll_days, e.monthly_gross, e.basic, e.incentive, e.bonus,
    e.pf_applicable, e.esic_applicable,
    (inp->>'leaves')::numeric, (inp->>'paid_leaves')::numeric,
    (inp->>'late')::int, (inp->>'ul')::int, (inp->>'sandwich')::numeric,
    (inp->>'mispunch')::int, (inp->>'comp_off')::numeric, (inp->>'unpaid_training')::int,
    v_late_pol, v_mis_pol, v_ul_mult,
    COALESCE((inp->>'ot_minutes')::int, 0), v_ot_pol
  );

  INSERT INTO payroll_lines AS pl (
    org_id, cycle_id, employee_id, payroll_days, monthly_gross, basic,
    leaves_taken, paid_leaves, comp_off, late_count, mispunch_count, ul_count,
    sandwich_count, unpaid_training, ot_minutes, ot_pay,
    late_deduction, mispunch_deduction,
    payable_days, daily_rate, gross_earned, incentive, bonus,
    pf_employee, esic_employee, net_salary, is_overridden, override_json
  ) VALUES (
    e.org_id, p_cycle, p_employee, c.payroll_days, e.monthly_gross, e.basic,
    (inp->>'leaves')::numeric, (inp->>'paid_leaves')::numeric, (inp->>'comp_off')::numeric,
    (inp->>'late')::int, (inp->>'mispunch')::int, (inp->>'ul')::int,
    (inp->>'sandwich')::numeric, (inp->>'unpaid_training')::int,
    COALESCE((inp->>'ot_minutes')::int, 0), COALESCE((calc->>'ot_pay')::numeric, 0),
    (calc->>'late_deduction')::numeric, (calc->>'mispunch_deduction')::numeric,
    (calc->>'payable_days')::numeric, (calc->>'daily_rate')::numeric,
    (calc->>'gross_earned')::numeric, (calc->>'incentive')::numeric, (calc->>'bonus')::numeric,
    (calc->>'pf_employee')::numeric, (calc->>'esic_employee')::numeric, (calc->>'net_salary')::numeric,
    COALESCE(use_override, false), ov
  )
  ON CONFLICT (cycle_id, employee_id) DO UPDATE SET
    payroll_days = excluded.payroll_days, monthly_gross = excluded.monthly_gross, basic = excluded.basic,
    leaves_taken = excluded.leaves_taken, paid_leaves = excluded.paid_leaves, comp_off = excluded.comp_off,
    late_count = excluded.late_count, mispunch_count = excluded.mispunch_count, ul_count = excluded.ul_count,
    sandwich_count = excluded.sandwich_count, unpaid_training = excluded.unpaid_training,
    ot_minutes = excluded.ot_minutes, ot_pay = excluded.ot_pay,
    late_deduction = excluded.late_deduction, mispunch_deduction = excluded.mispunch_deduction,
    payable_days = excluded.payable_days, daily_rate = excluded.daily_rate, gross_earned = excluded.gross_earned,
    incentive = excluded.incentive, bonus = excluded.bonus,
    pf_employee = excluded.pf_employee, esic_employee = excluded.esic_employee, net_salary = excluded.net_salary,
    is_overridden = excluded.is_overridden, override_json = excluded.override_json
  RETURNING * INTO row;
  RETURN row;
END;
$$;

DROP VIEW IF EXISTS v_payroll_preview;
CREATE VIEW v_payroll_preview
WITH (security_invoker = true) AS
SELECT
  pl.id, pl.org_id, pl.cycle_id, pl.employee_id,
  e.emp_code, e.full_name, e.designation, e.department,
  co.name AS company_name, br.name AS branch_name,
  cy.label AS cycle_label, cy.start_date AS cycle_start, cy.end_date AS cycle_end, cy.status AS cycle_status,
  pl.payroll_days, pl.monthly_gross, pl.basic,
  pl.leaves_taken, pl.paid_leaves, pl.comp_off,
  pl.late_count, pl.mispunch_count, pl.ul_count, pl.sandwich_count, pl.unpaid_training,
  pl.ot_minutes, pl.ot_pay,
  pl.late_deduction, pl.mispunch_deduction,
  pl.payable_days, pl.daily_rate, pl.gross_earned,
  pl.incentive, pl.bonus, pl.pf_employee, pl.esic_employee, pl.net_salary,
  pl.is_overridden, pl.created_at
FROM payroll_lines pl
JOIN employees e ON e.id = pl.employee_id
JOIN payroll_cycles cy ON cy.id = pl.cycle_id
LEFT JOIN companies co ON co.id = e.company_id
LEFT JOIN branches br ON br.id = e.branch_id;

GRANT SELECT ON v_payroll_preview TO authenticated;

CREATE OR REPLACE FUNCTION fn_export_payroll_register(p_cycle uuid, p_branch text DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'emp_code', v.emp_code, 'full_name', v.full_name,
        'designation', v.designation, 'department', v.department,
        'company_name', v.company_name, 'branch_name', v.branch_name,
        'cycle_label', v.cycle_label, 'cycle_status', v.cycle_status,
        'mispunch_count', v.mispunch_count, 'late_count', v.late_count,
        'leaves_taken', v.leaves_taken, 'paid_leaves', v.paid_leaves,
        'comp_off', v.comp_off, 'ul_count', v.ul_count,
        'sandwich_count', v.sandwich_count, 'unpaid_training', v.unpaid_training,
        'ot_minutes', v.ot_minutes, 'ot_pay', v.ot_pay,
        'late_deduction', v.late_deduction, 'mispunch_deduction', v.mispunch_deduction,
        'payable_days', v.payable_days, 'daily_rate', v.daily_rate,
        'gross_earned', v.gross_earned, 'incentive', v.incentive, 'bonus', v.bonus,
        'pf_employee', v.pf_employee, 'esic_employee', v.esic_employee,
        'net_salary', v.net_salary, 'is_overridden', v.is_overridden
      )
      ORDER BY v.full_name
    ),
    '[]'::jsonb
  )
  FROM v_payroll_preview v
  WHERE v.cycle_id = p_cycle
    AND (p_branch IS NULL OR p_branch = '' OR p_branch = 'All' OR v.branch_name = p_branch);
$$;

-- Demo default: display-only OT (no pay impact on TV02 anchor)
INSERT INTO policies (org_id, domain, effective_from, version, config)
SELECT
  '00000000-0000-0000-0000-0000000000f1'::uuid,
  'overtime',
  '2026-01-01'::date,
  1,
  '{"mode":"display","rate_multiplier":1.5,"hours_per_day":8,"min_ot_minutes":30}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM policies
  WHERE org_id = '00000000-0000-0000-0000-0000000000f1'::uuid
    AND domain = 'overtime' AND version = 1
);

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig FROM pg_proc p
    WHERE p.proname IN (
      'fn_calc_day_ot_minutes',
      'fn_rollup_inputs',
      'fn_compute_payroll',
      'fn_build_payroll_line',
      'fn_export_payroll_register'
    )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END $$;
