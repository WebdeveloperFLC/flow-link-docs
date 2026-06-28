-- Pay basis on employee salary structure (SSOT for estimated payroll validation).
-- Does NOT modify fn_compute_payroll.

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS pay_basis text NOT NULL DEFAULT 'Monthly';

ALTER TABLE public.employees
  DROP CONSTRAINT IF EXISTS employees_pay_basis_check;

ALTER TABLE public.employees
  ADD CONSTRAINT employees_pay_basis_check
  CHECK (pay_basis IN ('Monthly', 'Daily', 'Hourly'));

COMMENT ON COLUMN public.employees.pay_basis IS
  'Salary pay basis from Employee Master: Monthly | Daily | Hourly. Drives estimated payroll validation.';
