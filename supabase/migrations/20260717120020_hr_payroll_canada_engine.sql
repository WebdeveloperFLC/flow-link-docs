-- =====================================================================
-- HR Payroll — Canada deductions engine (CPP / EI / tax) + build line wiring
-- Run after 20260717120019_hr_payroll_lifecycle_salary_revision.sql
-- Maps: pf_employee → CPP, esic_employee → EI, pt_employee → tax + other
-- =====================================================================

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
  p_ot_policy     jsonb DEFAULT NULL,
  p_pt_applicable boolean DEFAULT false,
  p_pt_amount     numeric DEFAULT 0,
  p_payroll_country text DEFAULT 'IN',
  p_canada_policy jsonb DEFAULT NULL,
  p_other_deductions numeric DEFAULT 0,
  p_tds_applicable boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  k numeric; n numeric; payable numeric; daily numeric; gross numeric;
  basic numeric; pf_wage numeric; pf_emp numeric; esic_emp numeric; pt_emp numeric; net numeric;
  pf_ceiling numeric := COALESCE((p_late_policy->>'pf_ceiling')::numeric, 15000);
  esic_ceiling numeric := COALESCE((p_late_policy->>'esic_ceiling')::numeric, 21000);
  v_ot_pay numeric := 0;
  v_hourly numeric;
  v_mode text;
  v_min_ot int;
  v_cpp_rate numeric;
  v_ei_rate numeric;
  v_tax_rate numeric;
  v_policy_other numeric;
  v_is_ca boolean;
BEGIN
  k := fn_late_deduction(p_late, p_late_policy);
  n := fn_mispunch_deduction(p_mispunch, p_mispunch_policy);
  payable := p_payroll_days - COALESCE(p_leaves, 0) + COALESCE(p_paid_leaves, 0)
             + COALESCE(p_compoff, 0) - k - (COALESCE(p_ul, 0) * COALESCE(p_ul_mult, 2))
             - COALESCE(p_sandwich, 0) - n - COALESCE(p_unpaid_training, 0);
  daily := round(p_monthly / NULLIF(p_payroll_days, 0), 2);
  gross := round(daily * payable);
  basic := COALESCE(p_basic, round(p_monthly * 0.5));

  v_mode := COALESCE(p_ot_policy->>'mode', 'display');
  v_min_ot := COALESCE((p_ot_policy->>'min_ot_minutes')::int, 30);
  IF v_mode = 'paid' AND COALESCE(p_ot_minutes, 0) >= v_min_ot THEN
    v_hourly := daily / COALESCE((p_ot_policy->>'hours_per_day')::numeric, 8);
    v_ot_pay := round(
      (p_ot_minutes / 60.0) * v_hourly * COALESCE((p_ot_policy->>'rate_multiplier')::numeric, 1.5)
    );
  END IF;

  v_is_ca := upper(COALESCE(p_payroll_country, 'IN')) IN ('CA', 'CAN', 'CANADA');

  IF v_is_ca THEN
    v_cpp_rate := COALESCE((p_canada_policy->>'cpp_rate')::numeric, 0.0595);
    v_ei_rate := COALESCE((p_canada_policy->>'ei_rate')::numeric, 0.0166);
    v_tax_rate := CASE WHEN COALESCE(p_tds_applicable, false)
      THEN COALESCE((p_canada_policy->>'income_tax_flat')::numeric, 0)
      ELSE 0 END;
    v_policy_other := COALESCE((p_canada_policy->>'other_deductions')::numeric, 0);
    pf_emp := round(gross * v_cpp_rate);
    esic_emp := round(gross * v_ei_rate);
    pt_emp := round(gross * v_tax_rate) + v_policy_other + COALESCE(p_other_deductions, 0);
  ELSE
    pf_wage := least(basic, pf_ceiling);
    pf_emp  := CASE WHEN p_pf_applicable THEN round(pf_wage * 0.12) ELSE 0 END;
    esic_emp := CASE WHEN p_esic_applicable AND p_monthly <= esic_ceiling THEN round(gross * 0.0075) ELSE 0 END;
    pt_emp := CASE WHEN COALESCE(p_pt_applicable, false) THEN COALESCE(p_pt_amount, 0) ELSE 0 END;
    IF COALESCE(p_tds_applicable, false) THEN
      pt_emp := pt_emp + COALESCE(p_other_deductions, 0);
    END IF;
  END IF;

  net := gross + COALESCE(p_incentive, 0) + COALESCE(p_bonus, 0) + v_ot_pay - pf_emp - esic_emp - pt_emp;
  RETURN jsonb_build_object(
    'late_deduction', k,
    'mispunch_deduction', n,
    'payable_days', round(payable, 2),
    'daily_rate', daily,
    'gross_earned', gross,
    'pf_employee', pf_emp,
    'esic_employee', esic_emp,
    'pt_employee', pt_emp,
    'incentive', COALESCE(p_incentive, 0),
    'bonus', COALESCE(p_bonus, 0),
    'ot_minutes', COALESCE(p_ot_minutes, 0),
    'ot_pay', v_ot_pay,
    'net_salary', round(net),
    'payroll_country', CASE WHEN v_is_ca THEN 'CA' ELSE 'IN' END
  );
END;
$$;

CREATE OR REPLACE FUNCTION fn_build_payroll_line(p_employee uuid, p_cycle uuid)
RETURNS payroll_lines LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c record; e record; inp jsonb; calc jsonb; row payroll_lines;
  use_override boolean; ov jsonb;
  v_late_pol jsonb; v_mis_pol jsonb; v_sul_pol jsonb; v_ot_pol jsonb; v_pt_pol jsonb; v_ca_pol jsonb;
  v_ul_mult numeric; v_pt_amt numeric;
  v_country text;
BEGIN
  SELECT * INTO c FROM payroll_cycles WHERE id = p_cycle;
  IF c.status NOT IN ('Draft', 'Processed', 'Approved') THEN
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
    sandwich_count, unpaid_training, ot_minutes, ot_pay,
    late_deduction, mispunch_deduction,
    payable_days, daily_rate, gross_earned, incentive, bonus,
    pf_employee, esic_employee, pt_employee, net_salary, is_overridden, override_json
  ) VALUES (
    e.org_id, p_cycle, p_employee, c.payroll_days, e.monthly_gross, e.basic,
    (inp->>'leaves')::numeric, (inp->>'paid_leaves')::numeric, (inp->>'comp_off')::numeric,
    (inp->>'late')::int, (inp->>'mispunch')::int, (inp->>'ul')::int,
    (inp->>'sandwich')::numeric, (inp->>'unpaid_training')::int,
    COALESCE((inp->>'ot_minutes')::int, 0), COALESCE((calc->>'ot_pay')::numeric, 0),
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
    ot_minutes = excluded.ot_minutes, ot_pay = excluded.ot_pay,
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

-- Lock-time historical snapshot (full line copy per employee)
CREATE TABLE IF NOT EXISTS payroll_line_snapshots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL,
  cycle_id        uuid NOT NULL REFERENCES payroll_cycles(id) ON DELETE CASCADE,
  employee_id     uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  line_json       jsonb NOT NULL,
  input_snapshot  jsonb,
  locked_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cycle_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_payroll_snapshots_cycle ON payroll_line_snapshots (cycle_id);

-- Extend lock to persist snapshots
CREATE OR REPLACE FUNCTION fn_lock_payroll_cycle(p_cycle uuid)
RETURNS payroll_cycles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c payroll_cycles;
  e record;
  pl record;
BEGIN
  SELECT * INTO c FROM payroll_cycles WHERE id = p_cycle FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Cycle not found'; END IF;
  IF c.status NOT IN ('Draft', 'Approved') THEN
    RAISE EXCEPTION 'Cycle must be Draft (legacy) or Approved to lock (current: %)', c.status;
  END IF;
  IF NOT has_perm(c.org_id, 'approve') THEN RAISE EXCEPTION 'Approve permission required'; END IF;

  IF c.status = 'Draft' THEN
    PERFORM fn_rebuild_cycle_lines(p_cycle);
  END IF;

  FOR e IN
    SELECT id FROM employees
    WHERE org_id = c.org_id AND status NOT IN ('Terminated', 'Resigned')
  LOOP
    UPDATE payroll_lines
    SET input_snapshot = fn_rollup_inputs(e.id, p_cycle)
    WHERE cycle_id = p_cycle AND employee_id = e.id;

    SELECT * INTO pl FROM payroll_lines WHERE cycle_id = p_cycle AND employee_id = e.id;
    IF pl.id IS NOT NULL THEN
      INSERT INTO payroll_line_snapshots (org_id, cycle_id, employee_id, line_json, input_snapshot)
      VALUES (
        c.org_id, p_cycle, e.id,
        to_jsonb(pl) - 'id' - 'created_at',
        pl.input_snapshot
      )
      ON CONFLICT (cycle_id, employee_id) DO UPDATE SET
        line_json = excluded.line_json,
        input_snapshot = excluded.input_snapshot,
        locked_at = now();
    END IF;
  END LOOP;

  UPDATE payroll_cycles
  SET status = 'Locked', approved_at = COALESCE(approved_at, now())
  WHERE id = p_cycle
  RETURNING * INTO c;

  INSERT INTO audit_log (org_id, actor_label, action, target, new_value)
  VALUES (
    c.org_id, 'HR', 'Payroll Locked', c.label,
    c.status || ' · ' || (SELECT COUNT(*)::text FROM payroll_line_snapshots WHERE cycle_id = p_cycle) || ' snapshots'
  );

  RETURN c;
END;
$$;

GRANT SELECT ON payroll_line_snapshots TO authenticated;

-- Demo: Toronto branch employee with CAD payroll (if Toronto branch exists)
DO $$
DECLARE
  v_org uuid := '00000000-0000-0000-0000-0000000000f1';
  v_co uuid;
  v_br uuid;
  v_shift uuid;
BEGIN
  SELECT id INTO v_co FROM companies WHERE org_id = v_org AND currency = 'CAD' LIMIT 1;
  IF v_co IS NULL THEN
    INSERT INTO companies (org_id, name, legal_name, currency, is_active)
    VALUES (v_org, 'Future Link Canada', 'Future Link Consultants Canada Inc.', 'CAD', true)
    RETURNING id INTO v_co;
  END IF;

  SELECT id INTO v_br FROM public.branches
  WHERE country = 'CA' OR name ILIKE '%canada%' OR city ILIKE '%toronto%'
  ORDER BY display_order
  LIMIT 1;
  IF v_br IS NULL THEN
    SELECT id INTO v_br FROM public.branches WHERE is_active = true ORDER BY display_order LIMIT 1;
  END IF;
  SELECT id INTO v_shift FROM shifts WHERE org_id = v_org ORDER BY working_days_per_week LIMIT 1;

  IF v_br IS NOT NULL AND v_shift IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM employees WHERE org_id = v_org AND emp_code = 'FL-CA01'
  ) THEN
    INSERT INTO employees (
      org_id, emp_code, first_name, last_name, full_name,
      designation, department, company_id, branch_id,
      employment_type, date_of_joining, work_week, status, shift_id,
      salary_currency, payroll_country,
      monthly_gross, basic, hra, conveyance, special_allow,
      pf_applicable, esic_applicable, pt_applicable, tds_applicable
    ) VALUES (
      v_org, 'FL-CA01', 'Priya', 'Sharma', 'Priya Sharma',
      'Counselor', 'Counselling', v_co, v_br,
      'Full-Time', '2025-09-01', '5-Day', 'Confirmed', v_shift,
      'CAD', 'CA',
      4500, 2250, 900, 0, 1350,
      false, false, false, false
    );
  END IF;
END $$;
