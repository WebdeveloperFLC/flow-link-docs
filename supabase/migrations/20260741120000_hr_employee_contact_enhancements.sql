-- =====================================================================
-- HR Employee Master — Contact information enhancements (extend only)
-- Extends emergency_contacts JSONB; adds official communication + preference.
-- Does NOT affect payroll or attendance engines.
-- =====================================================================

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS official_communication_email text,
  ADD COLUMN IF NOT EXISTS preferred_contact_method text;

COMMENT ON COLUMN employees.emergency_contacts IS
  'JSON array; index 0 = personal emergency {name, phone, relation, email, alternate_mobile, address}.';
COMMENT ON COLUMN employees.official_communication_email IS
  'Official communication email — salary slips, HR notices, department mailbox, future notification routing.';
COMMENT ON COLUMN employees.preferred_contact_method IS
  'Preferred contact channel: Personal Mobile, Company Mobile, Personal Email, Company Email, WhatsApp.';

DROP FUNCTION IF EXISTS fn_update_ess_personal_contact(uuid, text, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION fn_update_ess_personal_contact(
  p_org uuid,
  p_email text,
  p_mobile text,
  p_alternate_mobile text DEFAULT NULL,
  p_emergency_name text DEFAULT NULL,
  p_emergency_relation text DEFAULT NULL,
  p_emergency_phone text DEFAULT NULL,
  p_emergency_email text DEFAULT NULL,
  p_emergency_alternate_mobile text DEFAULT NULL,
  p_emergency_address text DEFAULT NULL
)
RETURNS employees LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  e employees;
  v_contact jsonb;
BEGIN
  SELECT * INTO e
  FROM employees
  WHERE org_id = p_org AND staff_id = auth.uid()
  FOR UPDATE;

  IF e.id IS NULL THEN
    RAISE EXCEPTION 'Employee profile not found for current user';
  END IF;

  IF NULLIF(trim(p_email), '') IS NULL THEN
    RAISE EXCEPTION 'Personal email is required';
  END IF;
  IF NULLIF(trim(p_mobile), '') IS NULL THEN
    RAISE EXCEPTION 'Personal mobile is required';
  END IF;
  IF NULLIF(trim(p_emergency_name), '') IS NULL
     OR NULLIF(trim(p_emergency_relation), '') IS NULL
     OR NULLIF(trim(p_emergency_phone), '') IS NULL THEN
    RAISE EXCEPTION 'Personal emergency contact person, relationship, and number are required';
  END IF;

  v_contact := jsonb_build_array(
    jsonb_build_object(
      'name', trim(p_emergency_name),
      'phone', trim(p_emergency_phone),
      'relation', trim(p_emergency_relation),
      'email', NULLIF(trim(COALESCE(p_emergency_email, '')), ''),
      'alternate_mobile', NULLIF(trim(COALESCE(p_emergency_alternate_mobile, '')), ''),
      'address', NULLIF(trim(COALESCE(p_emergency_address, '')), '')
    )
  );

  UPDATE employees
  SET email = trim(p_email),
      mobile = trim(p_mobile),
      alternate_personal_mobile = NULLIF(trim(COALESCE(p_alternate_mobile, '')), ''),
      emergency_contacts = v_contact,
      emergency = trim(p_emergency_phone)
  WHERE id = e.id
  RETURNING * INTO e;

  INSERT INTO audit_log (org_id, actor_id, actor_label, action, target, new_value)
  VALUES (
    e.org_id,
    auth.uid(),
    fn_hr_actor_label(),
    'ESS Personal Contact Updated',
    e.full_name,
    e.email
  );

  RETURN e;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_update_ess_personal_contact(
  uuid, text, text, text, text, text, text, text, text, text
) TO authenticated;
