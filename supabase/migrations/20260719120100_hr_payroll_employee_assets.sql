-- HR Payroll — Employee assets (Assets tab on Employee Master)

CREATE TABLE IF NOT EXISTS employee_assets (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                      uuid NOT NULL,
  employee_id                 uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  asset_type                  text NOT NULL,
  asset_type_other            text,
  asset_name                  text,
  model_number                text,
  serial_number               text,
  asset_tag                   text,
  mac_address                 text,
  imei_number                 text,
  remarks                     text,
  issue_date                  date NOT NULL,
  issued_by_employee_id       uuid REFERENCES employees(id),
  issued_by_label             text NOT NULL,
  asset_status                text NOT NULL DEFAULT 'Issued'
    CHECK (asset_status IN ('Issued', 'Returned', 'Damaged', 'Lost', 'Replaced', 'Cancelled')),
  return_date                 date,
  collected_by_employee_id      uuid REFERENCES employees(id),
  collected_by_label            text,
  asset_condition               text
    CHECK (asset_condition IS NULL OR asset_condition IN ('Good', 'Fair', 'Damaged', 'Not Working')),
  return_remarks                text,
  accessories                   jsonb NOT NULL DEFAULT '[]'::jsonb,
  accessory_other               text,
  created_at                    timestamptz NOT NULL DEFAULT now(),
  updated_at                    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_assets_emp
  ON employee_assets (employee_id, issue_date DESC);

CREATE INDEX IF NOT EXISTS idx_employee_assets_status
  ON employee_assets (employee_id, asset_status);

ALTER TABLE employee_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY employee_assets_select ON employee_assets FOR SELECT USING (
  is_hr(org_id) OR employee_id = current_employee_id(org_id)
);

CREATE POLICY employee_assets_write ON employee_assets FOR ALL
  USING (has_perm(org_id, 'manage_emp'))
  WITH CHECK (has_perm(org_id, 'manage_emp'));

DROP TRIGGER IF EXISTS trg_employee_assets_updated ON employee_assets;
CREATE TRIGGER trg_employee_assets_updated
  BEFORE UPDATE ON employee_assets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

GRANT SELECT, INSERT, UPDATE ON employee_assets TO authenticated;

-- Demo org read/write bootstrap
DO $$
DECLARE
  v_demo uuid := '00000000-0000-0000-0000-0000000000f1';
BEGIN
  EXECUTE format('DROP POLICY IF EXISTS hr_demo_read_%I ON %I', 'employee_assets', 'employee_assets');
  EXECUTE format(
    'CREATE POLICY hr_demo_read_%I ON %I FOR SELECT TO authenticated USING (org_id = %L::uuid)',
    'employee_assets', 'employee_assets', v_demo
  );
  EXECUTE format('DROP POLICY IF EXISTS hr_demo_write_%I ON %I', 'employee_assets', 'employee_assets');
  EXECUTE format(
    'CREATE POLICY hr_demo_write_%I ON %I FOR INSERT TO authenticated WITH CHECK (org_id = %L::uuid)',
    'employee_assets', 'employee_assets', v_demo
  );
  EXECUTE format('DROP POLICY IF EXISTS hr_demo_update_%I ON %I', 'employee_assets', 'employee_assets');
  EXECUTE format(
    'CREATE POLICY hr_demo_update_%I ON %I FOR UPDATE TO authenticated USING (org_id = %L::uuid) WITH CHECK (org_id = %L::uuid)',
    'employee_assets', 'employee_assets', v_demo, v_demo
  );
END $$;
