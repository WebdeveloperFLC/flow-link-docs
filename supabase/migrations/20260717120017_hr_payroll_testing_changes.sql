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

-- Extend compute with optional PT
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
  p_pt_applicable boolean DEFAULT false,
  p_pt_amount     numeric DEFAULT 0
) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  k numeric; n numeric; payable numeric; daily numeric; gross numeric;
  basic numeric; pf_wage numeric; pf_emp numeric; esic_emp numeric; pt_emp numeric; net numeric;
  pf_ceiling numeric := COALESCE((p_late_policy->>'pf_ceiling')::numeric, 15000);
  esic_ceiling numeric := COALESCE((p_late_policy->>'esic_ceiling')::numeric, 21000);
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
  net := gross + COALESCE(p_incentive, 0) + COALESCE(p_bonus, 0) - pf_emp - esic_emp - pt_emp;
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
    'net_salary', round(net)
  );
END;
$$;

-- 2026 holiday seed (India 6-day + Canada 5-day from List_of_holiday.docx)
DO $$
DECLARE v_org uuid := '00000000-0000-0000-0000-0000000000f1';
BEGIN
  INSERT INTO holidays (org_id, holiday_date, name, type, applicable_tags)
  SELECT v_org, d, n, t::holiday_type, tags::jsonb
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
    WHERE h.org_id = v_org AND h.holiday_date = v.d::date AND h.name = v.n
  );
END $$;

GRANT EXECUTE ON FUNCTION fn_calendar_days_in_month(date) TO authenticated;
