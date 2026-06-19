-- HR Payroll — Security Cheque fields on employees (Bank tab)
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS security_cheque_status text NOT NULL DEFAULT 'Pending'
    CHECK (security_cheque_status IN ('Submitted', 'Pending', 'Not Submitted')),
  ADD COLUMN IF NOT EXISTS security_cheque_reason text,
  ADD COLUMN IF NOT EXISTS security_cheque_storage_path text,
  ADD COLUMN IF NOT EXISTS security_cheque_file_name text,
  ADD COLUMN IF NOT EXISTS security_cheque_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS security_cheque_uploaded_by uuid,
  ADD COLUMN IF NOT EXISTS security_cheque_uploaded_by_label text;
