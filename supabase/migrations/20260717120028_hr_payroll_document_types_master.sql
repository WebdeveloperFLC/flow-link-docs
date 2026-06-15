-- HR Payroll — Employee document types master (dropdown in Employee → Documents)

CREATE TABLE IF NOT EXISTS hr_document_types (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL,
  label       text NOT NULL,
  code        text NOT NULL,
  sort_order  int NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, code)
);

CREATE INDEX IF NOT EXISTS idx_hr_document_types_org
  ON hr_document_types (org_id, is_active, sort_order);

ALTER TABLE hr_document_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY ref_read_hr_document_types ON hr_document_types FOR SELECT
  USING (current_hr_role(org_id) IS NOT NULL OR current_employee_id(org_id) IS NOT NULL);

CREATE POLICY ref_write_hr_document_types ON hr_document_types FOR ALL
  USING (has_perm(org_id, 'configure') OR has_perm(org_id, 'manage_emp'))
  WITH CHECK (has_perm(org_id, 'configure') OR has_perm(org_id, 'manage_emp'));

CREATE TRIGGER trg_hr_document_types_updated
  BEFORE UPDATE ON hr_document_types
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Demo org seed (matches prior HR_DOC_TYPES constant)
INSERT INTO hr_document_types (org_id, label, code, sort_order)
SELECT v_org, t.label, t.code, t.ord
FROM (VALUES
  ('Offer Letter', 'offer_letter', 10),
  ('Appointment Letter', 'appointment_letter', 20),
  ('Aadhaar Card', 'aadhaar_card', 30),
  ('PAN Card', 'pan_card', 40),
  ('Passport', 'passport', 50),
  ('Resume', 'resume', 60),
  ('Form 16', 'form_16', 70),
  ('Bank Proof', 'bank_proof', 80),
  ('Other', 'other', 999)
) AS t(label, code, ord)
CROSS JOIN (SELECT '00000000-0000-0000-0000-0000000000f1'::uuid AS v_org) o
WHERE NOT EXISTS (
  SELECT 1 FROM hr_document_types WHERE org_id = o.v_org LIMIT 1
);
