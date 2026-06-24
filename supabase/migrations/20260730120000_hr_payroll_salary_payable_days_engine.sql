-- HR Payroll — Salary Payable Days Engine (Phase 2A)
-- Payable days from attendance FIRST; salary = monthly_gross ÷ cycle_days × payable_days.
-- CTC / salary structure NEVER drives gross — only statutory rates + component display.

ALTER TABLE public.payroll_lines
  ADD COLUMN IF NOT EXISTS payable_days_breakdown jsonb;

COMMENT ON COLUMN public.payroll_lines.payable_days_breakdown IS
  'Authoritative payable-days calculation from fn_compute_salary_payable_days (attendance-driven).';

-- ---- Step 1: Salary Payable Days (attendance → deductions → payable) ----
CREATE OR REPLACE FUNCTION fn_compute_salary_payable_days(
  p_payroll_days  int,
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
  p_formula_mode  text DEFAULT 'legacy',
  p_payroll_days_effective int DEFAULT NULL,
  p_attendance_earned numeric DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  k numeric;
  n numeric;
  payable numeric;
  v_formula text;
  v_divisor int;
  v_ul_ded numeric;
  v_att_earned numeric;
BEGIN
  k := fn_late_deduction(p_late, p_late_policy);
  n := fn_mispunch_deduction(p_mispunch, p_mispunch_policy);
  v_formula := lower(COALESCE(p_formula_mode, 'legacy'));
  v_ul_ded := COALESCE(p_ul, 0) * COALESCE(p_ul_mult, 2);

  IF v_formula = 'earned' THEN
    v_att_earned := COALESCE(p_attendance_earned, 0);
    payable := v_att_earned - k - v_ul_ded - COALESCE(p_sandwich, 0) - n - COALESCE(p_unpaid_training, 0);
    v_divisor := NULLIF(COALESCE(p_payroll_days_effective, p_payroll_days), 0);
  ELSE
    v_att_earned := NULL;
    payable := p_payroll_days - COALESCE(p_leaves, 0) + COALESCE(p_paid_leaves, 0)
               + COALESCE(p_compoff, 0) - k - v_ul_ded - COALESCE(p_sandwich, 0) - n
               - COALESCE(p_unpaid_training, 0);
    v_divisor := NULLIF(p_payroll_days, 0);
  END IF;

  RETURN jsonb_build_object(
    'formula_mode', v_formula,
    'payroll_days', p_payroll_days,
    'payroll_days_effective', COALESCE(p_payroll_days_effective, NULL),
    'attendance_earned', v_att_earned,
    'leaves_taken', COALESCE(p_leaves, 0),
    'paid_leaves', COALESCE(p_paid_leaves, 0),
    'comp_off', COALESCE(p_compoff, 0),
    'late_count', COALESCE(p_late, 0),
    'late_deduction', k,
    'mispunch_count', COALESCE(p_mispunch, 0),
    'mispunch_deduction', n,
    'ul_count', COALESCE(p_ul, 0),
    'ul_deduction_days', v_ul_ded,
    'sandwich_deduction', COALESCE(p_sandwich, 0),
    'unpaid_training', COALESCE(p_unpaid_training, 0),
    'payable_days', round(payable, 2),
    'daily_rate_divisor', v_divisor
  );
END;
$$;

-- ---- Step 2+3: Payable days then salary (gross always from monthly_gross) ----
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
  p_tds_applicable boolean DEFAULT false,
  p_formula_mode text DEFAULT 'legacy',
  p_payroll_days_effective int DEFAULT NULL,
  p_attendance_earned numeric DEFAULT NULL,
  p_structure jsonb DEFAULT NULL,
  p_structure_enabled boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_payable jsonb;
  payable numeric;
  daily numeric;
  gross numeric;
  basic numeric;
  pf_wage numeric;
  pf_emp numeric;
  esic_emp numeric;
  pt_emp numeric;
  net numeric;
  pf_ceiling numeric := COALESCE((p_late_policy->>'pf_ceiling')::numeric, 15000);
  esic_ceiling numeric := COALESCE((p_late_policy->>'esic_ceiling')::numeric, 21000);
  v_ot_pay numeric := 0;
  v_hourly numeric;
  v_ot_mode text;
  v_min_ot int;
  v_cpp_rate numeric;
  v_ei_rate numeric;
  v_policy_other numeric;
  v_is_ca boolean;
  v_divisor int;
  k numeric;
  n numeric;
  v_factor numeric;
  v_struct_basic numeric;
  v_struct_hra numeric;
  v_struct_conveyance numeric;
  v_struct_bonus numeric;
  v_struct_other numeric;
  v_er_pf numeric := 0;
  v_er_esic numeric := 0;
  v_emp_pf_pct numeric;
  v_emp_esic_pct numeric;
  v_er_pf_pct numeric;
  v_er_esic_pct numeric;
  v_monthly_b numeric;
  v_diff numeric;
  v_esic_monthly numeric;
  v_monthly_a numeric;
BEGIN
  v_payable := fn_compute_salary_payable_days(
    p_payroll_days, p_leaves, p_paid_leaves, p_late, p_ul, p_sandwich, p_mispunch,
    p_compoff, p_unpaid_training, p_late_policy, p_mispunch_policy, p_ul_mult,
    p_formula_mode, p_payroll_days_effective, p_attendance_earned
  );

  payable := (v_payable->>'payable_days')::numeric;
  k := (v_payable->>'late_deduction')::numeric;
  n := (v_payable->>'mispunch_deduction')::numeric;
  v_divisor := (v_payable->>'daily_rate_divisor')::int;

  v_is_ca := upper(COALESCE(p_payroll_country, 'IN')) IN ('CA', 'CAN', 'CANADA');

  -- Salary ALWAYS starts from monthly_gross (never CTC / structure Total A)
  daily := round(p_monthly / NULLIF(v_divisor, 0), 2);
  gross := round(daily * payable);

  v_ot_mode := COALESCE(p_ot_policy->>'mode', 'display');
  v_min_ot := COALESCE((p_ot_policy->>'min_ot_minutes')::int, 30);
  IF v_ot_mode = 'paid' AND COALESCE(p_ot_minutes, 0) >= v_min_ot THEN
    v_hourly := daily / COALESCE((p_ot_policy->>'hours_per_day')::numeric, 8);
    v_ot_pay := round(
      (p_ot_minutes / 60.0) * v_hourly * COALESCE((p_ot_policy->>'rate_multiplier')::numeric, 1.5)
    );
  END IF;

  IF p_structure_enabled AND NOT v_is_ca AND p_structure IS NOT NULL THEN
    v_factor := CASE WHEN v_divisor IS NOT NULL AND v_divisor > 0 THEN payable / v_divisor ELSE 0 END;
    v_monthly_a := COALESCE((p_structure->>'total_earnings_a')::numeric, p_monthly);
    v_esic_monthly := v_monthly_a;

    v_struct_basic := round(COALESCE((p_structure->>'basic')::numeric, 0) * v_factor);
    v_struct_hra := round(COALESCE((p_structure->>'hra')::numeric, 0) * v_factor);
    v_struct_conveyance := round(COALESCE((p_structure->>'conveyance')::numeric, 0) * v_factor);
    v_struct_bonus := round(COALESCE((p_structure->>'bonus_amount')::numeric, 0) * v_factor);
    v_struct_other := round(COALESCE((p_structure->>'other_allowances')::numeric, 0) * v_factor);

    pf_wage := least(v_struct_basic, pf_ceiling);
    v_emp_pf_pct := COALESCE((p_structure->>'employee_pf_pct')::numeric, 12);
    v_emp_esic_pct := COALESCE((p_structure->>'employee_esic_pct')::numeric, 0.75);
    v_er_pf_pct := COALESCE((p_structure->>'employer_pf_pct')::numeric, 12);
    v_er_esic_pct := COALESCE((p_structure->>'employer_esic_pct')::numeric, 3.25);

    pf_emp := CASE WHEN p_pf_applicable THEN round(pf_wage * v_emp_pf_pct / 100) ELSE 0 END;
    esic_emp := CASE
      WHEN p_esic_applicable AND v_esic_monthly <= esic_ceiling
        THEN round(gross * v_emp_esic_pct / 100)
      ELSE 0
    END;
    pt_emp := CASE
      WHEN COALESCE(p_pt_applicable, false)
        THEN COALESCE((p_structure->>'pt_amount')::numeric, p_pt_amount)
      ELSE 0
    END;
    IF COALESCE(p_tds_applicable, false) THEN
      pt_emp := pt_emp + COALESCE(p_other_deductions, 0);
    END IF;

    IF COALESCE((p_structure->>'employer_pf_applicable')::boolean, false) AND p_pf_applicable THEN
      v_er_pf := round(pf_wage * v_er_pf_pct / 100);
    END IF;
    IF COALESCE((p_structure->>'employer_esic_applicable')::boolean, false)
       AND p_esic_applicable AND v_esic_monthly <= esic_ceiling THEN
      v_er_esic := round(gross * v_er_esic_pct / 100);
    END IF;

    v_monthly_b := COALESCE((p_structure->>'total_employer_cost_b')::numeric, 0);
    v_diff := COALESCE((p_structure->>'structure_difference')::numeric, 0);
    net := gross + COALESCE(p_incentive, 0) + v_ot_pay - pf_emp - esic_emp - pt_emp;

    RETURN jsonb_build_object(
      'formula_mode', lower(COALESCE(p_formula_mode, 'legacy')),
      'payable_days_breakdown', v_payable,
      'late_deduction', k,
      'mispunch_deduction', n,
      'payable_days', round(payable, 2),
      'daily_rate', daily,
      'gross_earned', gross,
      'pf_employee', pf_emp,
      'esic_employee', esic_emp,
      'pt_employee', pt_emp,
      'incentive', COALESCE(p_incentive, 0),
      'bonus', 0,
      'ot_minutes', COALESCE(p_ot_minutes, 0),
      'ot_pay', v_ot_pay,
      'net_salary', round(net),
      'payroll_country', 'IN',
      'attendance_earned', (v_payable->>'attendance_earned')::numeric,
      'payroll_days_effective', (v_payable->>'payroll_days_effective')::int,
      'salary_structure_mode', true,
      'salary_package', (p_structure->>'salary_package')::numeric,
      'structure_basic', v_struct_basic,
      'structure_hra', v_struct_hra,
      'structure_conveyance', v_struct_conveyance,
      'structure_bonus', v_struct_bonus,
      'structure_other_allowances', v_struct_other,
      'total_earnings_a', gross,
      'employer_pf', v_er_pf,
      'employer_esic', v_er_esic,
      'total_employer_cost_b', v_monthly_b,
      'structure_difference', v_diff
    );
  END IF;

  basic := COALESCE(p_basic, round(p_monthly * 0.5));

  IF v_is_ca THEN
    v_cpp_rate := COALESCE((p_canada_policy->>'cpp_rate')::numeric, 0.0595);
    v_ei_rate := COALESCE((p_canada_policy->>'ei_rate')::numeric, 0.0166);
    v_policy_other := COALESCE((p_canada_policy->>'other_deductions')::numeric, 0);
    pf_emp := round(gross * v_cpp_rate);
    esic_emp := round(gross * v_ei_rate);
    pt_emp := fn_canada_income_tax(gross, p_canada_policy, p_tds_applicable)
              + v_policy_other + COALESCE(p_other_deductions, 0);
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
    'formula_mode', lower(COALESCE(p_formula_mode, 'legacy')),
    'payable_days_breakdown', v_payable,
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
    'payroll_country', CASE WHEN v_is_ca THEN 'CA' ELSE 'IN' END,
    'attendance_earned', (v_payable->>'attendance_earned')::numeric,
    'payroll_days_effective', (v_payable->>'payroll_days_effective')::int,
    'salary_structure_mode', false
  );
END;
$$;

-- ---- Build line: monthly_gross always wage base; persist payable breakdown ----
CREATE OR REPLACE FUNCTION fn_build_payroll_line(p_employee uuid, p_cycle uuid)
RETURNS payroll_lines LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c record; e record; inp jsonb; calc jsonb; row payroll_lines;
  use_override boolean; ov jsonb;
  v_late_pol jsonb; v_mis_pol jsonb; v_sul_pol jsonb; v_ot_pol jsonb; v_pt_pol jsonb; v_ca_pol jsonb;
  v_pay_pol jsonb;
  v_ul_mult numeric; v_pt_amt numeric; v_country text;
  v_formula_mode text;
  v_effective int;
  v_earned numeric;
  v_structure jsonb;
  v_structure_enabled boolean;
  v_cycle_bonus numeric;
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

  v_pay_pol := fn_resolve_payroll_policy(e.org_id, c.start_date);
  v_formula_mode := lower(COALESCE(v_pay_pol->>'formula_mode', 'legacy'));

  IF use_override THEN
    inp := ov;
    v_formula_mode := lower(COALESCE(inp->>'formula_mode', v_formula_mode));
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

  v_effective := COALESCE((inp->>'payroll_days_effective')::int, c.payroll_days);
  v_earned := (inp->>'attendance_earned')::numeric;

  v_structure_enabled := fn_employee_salary_structure_enabled(p_employee);
  v_structure := CASE
    WHEN v_structure_enabled THEN fn_resolve_employee_salary_structure(p_employee, v_pt_amt)
    ELSE NULL
  END;

  v_cycle_bonus := CASE WHEN v_structure_enabled THEN 0 ELSE e.bonus END;

  calc := fn_compute_payroll(
    c.payroll_days, e.monthly_gross, e.basic, e.incentive, v_cycle_bonus,
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
    COALESCE(e.tds_applicable, false),
    v_formula_mode,
    v_effective,
    v_earned,
    v_structure,
    v_structure_enabled
  );

  INSERT INTO payroll_lines AS pl (
    org_id, cycle_id, employee_id, payroll_days, monthly_gross, basic,
    leaves_taken, paid_leaves, comp_off, late_count, mispunch_count, ul_count,
    sandwich_count, unpaid_training, ot_minutes, ot_pay, off_shift_minutes,
    late_deduction, mispunch_deduction,
    payable_days, daily_rate, gross_earned, incentive, bonus,
    pf_employee, esic_employee, pt_employee, net_salary, is_overridden, override_json,
    payroll_days_effective, attendance_earned, earned_breakdown, formula_mode,
    salary_structure_mode, salary_package, structure_basic, structure_hra, structure_conveyance,
    structure_bonus, structure_other_allowances, total_earnings_a,
    employer_pf, employer_esic, total_employer_cost_b, structure_difference,
    calc_snapshot, payable_days_breakdown
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
    COALESCE(use_override, false), ov,
    CASE WHEN v_formula_mode = 'earned' THEN v_effective ELSE NULL END,
    CASE WHEN v_formula_mode = 'earned' THEN v_earned ELSE NULL END,
    CASE WHEN v_formula_mode = 'earned' THEN inp->'earned_breakdown' ELSE NULL END,
    v_formula_mode,
    COALESCE((calc->>'salary_structure_mode')::boolean, false),
    (calc->>'salary_package')::numeric,
    COALESCE((calc->>'structure_basic')::numeric, 0),
    COALESCE((calc->>'structure_hra')::numeric, 0),
    COALESCE((calc->>'structure_conveyance')::numeric, 0),
    COALESCE((calc->>'structure_bonus')::numeric, 0),
    COALESCE((calc->>'structure_other_allowances')::numeric, 0),
    COALESCE((calc->>'total_earnings_a')::numeric, 0),
    COALESCE((calc->>'employer_pf')::numeric, 0),
    COALESCE((calc->>'employer_esic')::numeric, 0),
    COALESCE((calc->>'total_employer_cost_b')::numeric, 0),
    COALESCE((calc->>'structure_difference')::numeric, 0),
    calc,
    calc->'payable_days_breakdown'
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
    is_overridden = excluded.is_overridden, override_json = excluded.override_json,
    payroll_days_effective = excluded.payroll_days_effective,
    attendance_earned = excluded.attendance_earned,
    earned_breakdown = excluded.earned_breakdown,
    formula_mode = excluded.formula_mode,
    salary_structure_mode = excluded.salary_structure_mode,
    salary_package = excluded.salary_package,
    structure_basic = excluded.structure_basic,
    structure_hra = excluded.structure_hra,
    structure_conveyance = excluded.structure_conveyance,
    structure_bonus = excluded.structure_bonus,
    structure_other_allowances = excluded.structure_other_allowances,
    total_earnings_a = excluded.total_earnings_a,
    employer_pf = excluded.employer_pf,
    employer_esic = excluded.employer_esic,
    total_employer_cost_b = excluded.total_employer_cost_b,
    structure_difference = excluded.structure_difference,
    calc_snapshot = excluded.calc_snapshot,
    payable_days_breakdown = excluded.payable_days_breakdown
  RETURNING * INTO row;
  RETURN row;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_compute_salary_payable_days(
  int, numeric, numeric, int, int, numeric, int, numeric, int,
  jsonb, jsonb, numeric, text, int, numeric
) TO authenticated;
