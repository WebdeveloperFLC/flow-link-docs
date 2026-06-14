-- =====================================================================
-- HR Payroll — Testing folder changes (names, shifts, holidays, PT, companies)
-- Run after 20260717120016_hr_payroll_ess_self_profile.sql
-- =====================================================================

-- Employee first / last name
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text;

UPDATE employees SET
  first_name = COALESCE(NULLIF(split_part(trim(full_name), ' ', 1), ''), full_name),
  last_name = COALESCE(NULLIF(trim(substring(full_name from position(' ' in full_name) + 1)), ''), '')
WHERE first_name IS NULL;

-- Company currency + legal name (CRM sync ready)
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'IN';

UPDATE companies SET legal_name = name WHERE legal_name IS NULL;

-- Shift working days per week (1–7)
ALTER TABLE shifts
  ADD COLUMN IF NOT EXISTS working_days_per_week int NOT NULL DEFAULT 6
    CHECK (working_days_per_week BETWEEN 1 AND 7);

-- Holiday applicability tags (shift type + employment type multi-select)
ALTER TABLE holidays
  ADD COLUMN IF NOT EXISTS applicable_tags jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Statutory extensions
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS has_pf_account boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS pt_applicable boolean NOT NULL DEFAULT true;

ALTER TABLE payroll_lines
  ADD COLUMN IF NOT EXISTS pt_employee numeric(12,2) NOT NULL DEFAULT 0;

-- PT policy default (India)
INSERT INTO policies (org_id, domain, effective_from, version, config)
SELECT
  '00000000-0000-0000-0000-0000000000f1'::uuid,
  'professional_tax',
  '2026-01-01'::date,
  1,
  '{"default_amount":200,"mandatory_below_gross":null}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM policies
  WHERE org_id = '00000000-0000-0000-0000-0000000000f1'::uuid
    AND domain = 'professional_tax' AND version = 1
);

-- Calendar-month helper
CREATE OR REPLACE FUNCTION fn_calendar_days_in_month(p_date date DEFAULT current_date)
RETURNS int LANGUAGE sql IMMUTABLE AS $$
  SELECT extract(day FROM (date_trunc('month', p_date) + interval '1 month - 1 day'))::int;
$$;

-- Extend compute with optional PT (preserves OT params from migration 14)
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
  p_pt_amount     numeric DEFAULT 0
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
  pt_emp := CASE WHEN COALESCE(p_pt_applicable, false) THEN COALESCE(p_pt_amount, 0) ELSE 0 END;

  v_mode := COALESCE(p_ot_policy->>'mode', 'display');
  v_min_ot := COALESCE((p_ot_policy->>'min_ot_minutes')::int, 30);
  IF v_mode = 'paid' AND COALESCE(p_ot_minutes, 0) >= v_min_ot THEN
    v_hourly := daily / COALESCE((p_ot_policy->>'hours_per_day')::numeric, 8);
    v_ot_pay := round(
      (p_ot_minutes / 60.0) * v_hourly * COALESCE((p_ot_policy->>'rate_multiplier')::numeric, 1.5)
    );
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
    'net_salary', round(net)
  );
END;
$$;

CREATE OR REPLACE FUNCTION fn_build_payroll_line(p_employee uuid, p_cycle uuid)
RETURNS payroll_lines LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c record; e record; inp jsonb; calc jsonb; row payroll_lines;
  use_override boolean; ov jsonb;
  v_late_pol jsonb; v_mis_pol jsonb; v_sul_pol jsonb; v_ot_pol jsonb; v_pt_pol jsonb;
  v_ul_mult numeric; v_pt_amt numeric;
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
  v_ul_mult := COALESCE((v_sul_pol->>'ul_multiplier')::numeric, 2);
  v_pt_amt := COALESCE((v_pt_pol->>'default_amount')::numeric, 200);

  calc := fn_compute_payroll(
    c.payroll_days, e.monthly_gross, e.basic, e.incentive, e.bonus,
    e.pf_applicable, e.esic_applicable,
    (inp->>'leaves')::numeric, (inp->>'paid_leaves')::numeric,
    (inp->>'late')::int, (inp->>'ul')::int, (inp->>'sandwich')::numeric,
    (inp->>'mispunch')::int, (inp->>'comp_off')::numeric, (inp->>'unpaid_training')::int,
    v_late_pol, v_mis_pol, v_ul_mult,
    COALESCE((inp->>'ot_minutes')::int, 0), v_ot_pol,
    COALESCE(e.pt_applicable, false),
    CASE WHEN COALESCE(e.pt_applicable, false) THEN v_pt_amt ELSE 0 END
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
  pl.incentive, pl.bonus, pl.pf_employee, pl.esic_employee, pl.pt_employee, pl.net_salary,
  pl.is_overridden, pl.created_at
FROM payroll_lines pl
JOIN employees e ON e.id = pl.employee_id
JOIN payroll_cycles cy ON cy.id = pl.cycle_id
LEFT JOIN companies co ON co.id = e.company_id
LEFT JOIN branches br ON br.id = e.branch_id;

GRANT SELECT ON v_payroll_preview TO authenticated;

-- 2026 holiday seed (India 6-day + Canada 5-day from List_of_holiday.docx)
DO $$
DECLARE v_org uuid := '00000000-0000-0000-0000-0000000000f1';
BEGIN
  INSERT INTO holidays (org_id, holiday_date, name, type, applicable_tags)
  SELECT v_org, d::date, n, t::holiday_type, tags::jsonb
  FROM (VALUES
    ('2026-01-14', 'Uttarayan', 'Festival', '["6-Day","Day","Full-Time"]'),
    ('2026-01-26', 'Republic Day', 'National', '["6-Day","Day","Full-Time"]'),
    ('2026-03-04', 'Dhuleti', 'Festival', '["6-Day","Day","Full-Time"]'),
    ('2026-08-28', 'Raksha Bandhan', 'Festival', '["6-Day","Day","Full-Time"]'),
    ('2026-08-15', 'Independence Day', 'National', '["6-Day","Day","Full-Time"]'),
    ('2026-09-04', 'Janmashtami', 'Festival', '["6-Day","Day","Full-Time"]'),
    ('2026-10-02', 'Gandhi Jayanti', 'National', '["6-Day","Day","Full-Time","5-Day"]'),
    ('2026-10-20', 'Dussehra', 'Festival', '["6-Day","Day","Full-Time"]'),
    ('2026-11-08', 'Diwali', 'Festival', '["6-Day","Day","Full-Time","5-Day"]'),
    ('2026-11-10', 'New Year (Bestu Varsh)', 'Festival', '["6-Day","Day","Full-Time"]'),
    ('2026-11-11', 'Bhai Dooj', 'Festival', '["6-Day","Day","Full-Time"]'),
    ('2026-10-31', 'Sardar Vallabhbhai Patel Jayanti', 'National', '["6-Day","Day","Full-Time","5-Day"]'),
    ('2026-01-01', 'New Year', 'National', '["5-Day","Day","Full-Time"]'),
    ('2026-04-03', 'Good Friday', 'National', '["5-Day","Day","Full-Time"]'),
    ('2026-09-07', 'Labour Day', 'National', '["5-Day","Day","Full-Time"]'),
    ('2026-07-01', 'Canada Day', 'National', '["5-Day","Day","Full-Time"]'),
    ('2026-10-12', 'Thanksgiving', 'National', '["5-Day","Day","Full-Time"]'),
    ('2026-12-25', 'Christmas', 'National', '["5-Day","Day","Full-Time"]')
  ) AS v(d, n, t, tags)
  WHERE NOT EXISTS (
    SELECT 1 FROM holidays h
    WHERE h.org_id = v_org AND h.holiday_date = d::date AND h.name = n
  );
END $$;

GRANT EXECUTE ON FUNCTION fn_calendar_days_in_month(date) TO authenticated;
