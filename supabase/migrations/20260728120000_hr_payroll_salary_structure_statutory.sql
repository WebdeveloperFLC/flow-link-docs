-- HR Payroll — salary structure & statutory columns (Phase 1 schema)
-- Additive only. Engine wiring in 20260729120000_hr_payroll_salary_structure_engine.sql

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS salary_package numeric(12,2),
  ADD COLUMN IF NOT EXISTS bonus_percentage numeric(5,2),
  ADD COLUMN IF NOT EXISTS other_allowances numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS employer_pf_applicable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS employer_esic_applicable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS employee_pf_pct numeric(5,2) NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS employer_pf_pct numeric(5,2) NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS employee_esic_pct numeric(5,3) NOT NULL DEFAULT 0.75,
  ADD COLUMN IF NOT EXISTS employer_esic_pct numeric(5,2) NOT NULL DEFAULT 3.25,
  ADD COLUMN IF NOT EXISTS professional_tax_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS salary_structure_enabled boolean NOT NULL DEFAULT false;

-- Backfill employer flags from existing employee statutory toggles (one-time, idempotent)
UPDATE public.employees
SET
  employer_pf_applicable = pf_applicable,
  employer_esic_applicable = esic_applicable
WHERE employer_pf_applicable = false
  AND employer_esic_applicable = false
  AND (pf_applicable OR esic_applicable);

COMMENT ON COLUMN public.employees.salary_package IS 'CTC / salary package (monthly). Used when salary_structure_enabled = true.';
COMMENT ON COLUMN public.employees.bonus_percentage IS 'Statutory bonus % on basic. NULL until structure configured; defaults to 8.33 in engine when structure ON.';
COMMENT ON COLUMN public.employees.salary_structure_enabled IS 'When true (India only), payroll engine uses salary structure as wage/statutory source of truth.';

-- Persisted breakdown on locked payroll lines (single source of truth for UI/exports)
ALTER TABLE public.payroll_lines
  ADD COLUMN IF NOT EXISTS salary_structure_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS salary_package numeric(12,2),
  ADD COLUMN IF NOT EXISTS structure_basic numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS structure_hra numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS structure_conveyance numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS structure_bonus numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS structure_other_allowances numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_earnings_a numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS employer_pf numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS employer_esic numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_employer_cost_b numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS structure_difference numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS calc_snapshot jsonb;

COMMENT ON COLUMN public.payroll_lines.structure_difference IS 'Monthly CTC difference: salary_package − (monthly Total A + monthly Total B). Not pro-rated.';
COMMENT ON COLUMN public.payroll_lines.calc_snapshot IS 'Full fn_compute_payroll JSON output for audit.';
