-- HR Payroll — Employee assets: SIM/WiFi fields (additive, preserves existing rows)
ALTER TABLE employee_assets
  ADD COLUMN IF NOT EXISTS service_provider text,
  ADD COLUMN IF NOT EXISTS mobile_number text,
  ADD COLUMN IF NOT EXISTS sim_number text;
