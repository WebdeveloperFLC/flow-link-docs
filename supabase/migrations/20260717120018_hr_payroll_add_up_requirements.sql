-- =====================================================================
-- HR Payroll — add up.docx requirements (Phase 2A schema)
-- Run after 20260717120017_hr_payroll_testing_changes.sql
-- CRM-centralized RBAC deferred to final step per product spec.
-- =====================================================================

-- ---- Employee profile & statutory (add up.docx §1, §4) ----
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS middle_name text,
  ADD COLUMN IF NOT EXISTS has_esic_account boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS salary_currency text NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS payroll_country text NOT NULL DEFAULT 'IN',
  ADD COLUMN IF NOT EXISTS marital_status text,
  ADD COLUMN IF NOT EXISTS blood_group text,
  ADD COLUMN IF NOT EXISTS nationality text,
  ADD COLUMN IF NOT EXISTS emergency_contacts jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS probation_start_date date,
  ADD COLUMN IF NOT EXISTS probation_end_date date,
  ADD COLUMN IF NOT EXISTS exit_date date,
  ADD COLUMN IF NOT EXISTS exit_reason text,
  ADD COLUMN IF NOT EXISTS rehire_eligible boolean,
  ADD COLUMN IF NOT EXISTS tds_applicable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lwf_applicable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS other_deductions numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bank_verified_by text,
  ADD COLUMN IF NOT EXISTS bank_verified_at timestamptz;

UPDATE employees SET
  full_name = trim(concat_ws(' ',
    nullif(trim(first_name), ''),
    nullif(trim(middle_name), ''),
    nullif(trim(last_name), '')
  ))
WHERE first_name IS NOT NULL AND last_name IS NOT NULL AND middle_name IS NOT NULL;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- ---- Document verification workflow ----
ALTER TABLE employee_documents
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'Uploaded',
  ADD COLUMN IF NOT EXISTS remarks text,
  ADD COLUMN IF NOT EXISTS verified_by uuid,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

-- ---- Leave enhancements ----
ALTER TABLE leave_requests
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

-- ---- Comp-off duration (Full / Half / Partial) ----
ALTER TABLE compoff_requests
  ADD COLUMN IF NOT EXISTS duration_type text NOT NULL DEFAULT 'Full Day',
  ADD COLUMN IF NOT EXISTS partial_start time,
  ADD COLUMN IF NOT EXISTS partial_end time,
  ADD COLUMN IF NOT EXISTS comp_off_leave_date date,
  ADD COLUMN IF NOT EXISTS document_path text;

-- ---- Salary revision history ----
CREATE TABLE IF NOT EXISTS salary_revision_history (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid NOT NULL,
  employee_id    uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  effective_date date NOT NULL,
  old_salary     numeric(12,2) NOT NULL,
  new_salary     numeric(12,2) NOT NULL,
  revised_by     uuid,
  remarks        text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_salary_revision_emp ON salary_revision_history (employee_id, effective_date DESC);

-- ---- Payroll lifecycle (Draft → Processed → Approved → Locked → Paid) ----
DO $$ BEGIN
  ALTER TYPE payroll_status ADD VALUE IF NOT EXISTS 'Processed';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE payroll_status ADD VALUE IF NOT EXISTS 'Approved';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE payroll_cycles
  ADD COLUMN IF NOT EXISTS processed_by uuid,
  ADD COLUMN IF NOT EXISTS processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_by uuid,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- Canada deduction placeholders (configurable; engine Phase 2B)
INSERT INTO policies (org_id, domain, effective_from, version, config)
SELECT
  '00000000-0000-0000-0000-0000000000f1'::uuid,
  'canada_deductions',
  '2026-01-01'::date,
  1,
  '{"cpp_rate":0.0595,"ei_rate":0.0166,"income_tax_flat":0,"other_deductions":0}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM policies
  WHERE org_id = '00000000-0000-0000-0000-0000000000f1'::uuid
    AND domain = 'canada_deductions' AND version = 1
);

GRANT SELECT ON salary_revision_history TO authenticated;
