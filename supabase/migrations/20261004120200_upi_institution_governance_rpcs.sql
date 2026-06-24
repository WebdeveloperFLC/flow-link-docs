-- M3 — Institution governance: activation validation, status RPC, derived is_active
-- Preserves Mark Final (no changes to fn_mark_final_and_create_application).
-- catalog_status unchanged. Fee schedule warnings only — never block activation.

-- ---------------------------------------------------------------------------
-- Activation validation
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_validate_upi_institution_activation(_institution_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.upi_institutions;
  v_errors jsonb := '[]'::jsonb;
  v_warnings jsonb := '[]'::jsonb;
  v_is_canada boolean;
BEGIN
  SELECT * INTO v_row
  FROM public.upi_institutions
  WHERE id = _institution_id;

  IF v_row.id IS NULL THEN
    RETURN jsonb_build_object(
      'errors', jsonb_build_array(jsonb_build_object('code', 'not_found', 'message', 'Institution not found')),
      'warnings', '[]'::jsonb
    );
  END IF;

  v_is_canada := public.fn_upi_institution_is_canada(v_row);

  -- Hard blockers
  IF v_row.name IS NULL OR trim(v_row.name) = '' THEN
    v_errors := v_errors || jsonb_build_array(jsonb_build_object(
      'code', 'missing_name', 'message', 'Institution name is required'));
  END IF;

  IF v_row.institution_type IS NULL OR trim(v_row.institution_type) = '' THEN
    v_errors := v_errors || jsonb_build_array(jsonb_build_object(
      'code', 'missing_institution_type', 'message', 'Institution type is required'));
  END IF;

  IF (v_row.country_id IS NULL)
     AND (v_row.country_name IS NULL OR trim(v_row.country_name) = '') THEN
    v_errors := v_errors || jsonb_build_array(jsonb_build_object(
      'code', 'missing_country', 'message', 'Country is required'));
  END IF;

  IF v_row.website_url IS NULL OR trim(v_row.website_url) = '' THEN
    v_errors := v_errors || jsonb_build_array(jsonb_build_object(
      'code', 'missing_website', 'message', 'Official website URL is required'));
  END IF;

  IF v_row.application_portal_url IS NULL OR trim(v_row.application_portal_url) = '' THEN
    v_errors := v_errors || jsonb_build_array(jsonb_build_object(
      'code', 'missing_application_portal', 'message', 'Application portal URL is required'));
  END IF;

  IF v_is_canada THEN
    IF v_row.dli_number IS NULL OR trim(v_row.dli_number) = '' THEN
      v_errors := v_errors || jsonb_build_array(jsonb_build_object(
        'code', 'missing_dli', 'message', 'DLI number is required for Canadian institutions'));
    END IF;

    IF v_row.pgwp_eligible IS NULL THEN
      v_errors := v_errors || jsonb_build_array(jsonb_build_object(
        'code', 'missing_pgwp', 'message', 'PGWP eligibility must be set (Yes or No) for Canadian institutions'));
    END IF;
  END IF;

  -- Warnings only (fees — never block)
  IF NOT EXISTS (
    SELECT 1
    FROM public.institution_fee_schedule f
    WHERE f.upi_institution_id = _institution_id
      AND f.fee_type = 'APPLICATION'
      AND f.status = 'ACTIVE'
      AND f.program_id IS NULL
      AND f.partnership_route_id IS NULL
  ) THEN
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'code', 'missing_application_fee',
      'message', 'No active institution-default application fee on Fee Schedule'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.institution_fee_schedule f
    WHERE f.upi_institution_id = _institution_id
      AND f.fee_type = 'TUITION'
      AND f.status = 'ACTIVE'
      AND f.fee_accuracy = 'APPROXIMATE'
      AND f.program_id IS NULL
      AND f.partnership_route_id IS NULL
  ) THEN
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'code', 'missing_tuition_fee',
      'message', 'No active approximate tuition fee on Fee Schedule'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.institution_fee_schedule f
    WHERE f.upi_institution_id = _institution_id
      AND f.fee_type = 'DEPOSIT'
      AND f.status = 'ACTIVE'
      AND f.fee_accuracy = 'APPROXIMATE'
      AND f.program_id IS NULL
      AND f.partnership_route_id IS NULL
  ) THEN
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'code', 'missing_deposit_fee',
      'message', 'No active approximate deposit fee on Fee Schedule'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.upi_institution_contacts c
    WHERE c.institution_id = _institution_id
      AND c.is_active = true
      AND c.email IS NOT NULL
      AND trim(c.email) <> ''
  ) THEN
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'code', 'missing_contacts',
      'message', 'No active institution contact with email (recommended)'));
  END IF;

  IF v_row.last_loa_verified_at IS NULL THEN
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'code', 'missing_loa_verified',
      'message', 'Last LOA verified date is empty (recommended)'));
  END IF;

  RETURN jsonb_build_object('errors', v_errors, 'warnings', v_warnings);
END;
$$;

COMMENT ON FUNCTION public.fn_validate_upi_institution_activation(uuid) IS
  'Activation checklist for institution_status → Active. Errors block; fee/contact gaps warn only (M3).';

-- ---------------------------------------------------------------------------
-- Status transition RPC
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_upi_institution_set_status(
  p_institution_id uuid,
  p_status text,
  p_force_warnings boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.upi_institutions;
  v_validation jsonb;
  v_errors jsonb;
  v_warnings jsonb;
BEGIN
  IF p_status NOT IN ('Draft', 'Review', 'Active', 'Inactive', 'Archived') THEN
    RETURN jsonb_build_object(
      'ok', false,
      'errors', jsonb_build_array(jsonb_build_object('code', 'invalid_status', 'message', 'Invalid institution status')),
      'warnings', '[]'::jsonb
    );
  END IF;

  SELECT * INTO v_row
  FROM public.upi_institutions
  WHERE id = p_institution_id
  FOR UPDATE;

  IF v_row.id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'errors', jsonb_build_array(jsonb_build_object('code', 'not_found', 'message', 'Institution not found')),
      'warnings', '[]'::jsonb
    );
  END IF;

  IF p_status = 'Active' AND v_row.institution_status IS DISTINCT FROM 'Active' THEN
    v_validation := public.fn_validate_upi_institution_activation(p_institution_id);
    v_errors := coalesce(v_validation->'errors', '[]'::jsonb);
    v_warnings := coalesce(v_validation->'warnings', '[]'::jsonb);

    IF jsonb_array_length(v_errors) > 0 THEN
      RETURN jsonb_build_object('ok', false, 'errors', v_errors, 'warnings', v_warnings);
    END IF;

    IF NOT p_force_warnings AND jsonb_array_length(v_warnings) > 0 THEN
      RETURN jsonb_build_object(
        'ok', false,
        'needs_confirmation', true,
        'errors', '[]'::jsonb,
        'warnings', v_warnings
      );
    END IF;
  END IF;

  PERFORM set_config('app.upi_skip_activation_check', 'on', true);

  UPDATE public.upi_institutions
  SET
    institution_status = p_status,
    updated_at = now()
  WHERE id = p_institution_id;

  RETURN jsonb_build_object(
    'ok', true,
    'institution_status', p_status,
    'is_active', (p_status = 'Active'),
    'errors', '[]'::jsonb,
    'warnings', coalesce(v_validation->'warnings', '[]'::jsonb)
  );
END;
$$;

COMMENT ON FUNCTION public.fn_upi_institution_set_status(uuid, text, boolean) IS
  'Governed institution_status transitions. Activation validates profile; warnings require p_force_warnings (M3).';

GRANT EXECUTE ON FUNCTION public.fn_validate_upi_institution_activation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_upi_institution_set_status(uuid, text, boolean) TO authenticated;

-- ---------------------------------------------------------------------------
-- Derived is_active + guard direct activation bypass
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trg_upi_institutions_status_governance()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_validation jsonb;
  v_errors jsonb;
BEGIN
  NEW.is_active := (NEW.institution_status = 'Active');

  IF TG_OP = 'UPDATE'
     AND NEW.institution_status = 'Active'
     AND OLD.institution_status IS DISTINCT FROM 'Active'
     AND coalesce(current_setting('app.upi_skip_activation_check', true), '') <> 'on' THEN
    v_validation := public.fn_validate_upi_institution_activation(NEW.id);
    v_errors := coalesce(v_validation->'errors', '[]'::jsonb);
    IF jsonb_array_length(v_errors) > 0 THEN
      RAISE EXCEPTION 'institution_activation_blocked: %', v_errors::text
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_upi_institutions_status_governance ON public.upi_institutions;
CREATE TRIGGER trg_upi_institutions_status_governance
  BEFORE INSERT OR UPDATE OF institution_status, is_active ON public.upi_institutions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_upi_institutions_status_governance();

-- One-time sync is_active from institution_status
UPDATE public.upi_institutions
SET is_active = (institution_status = 'Active')
WHERE is_active IS DISTINCT FROM (institution_status = 'Active');

COMMENT ON COLUMN public.upi_institutions.is_active IS
  'Derived from institution_status = Active (M3). Do not update directly — use fn_upi_institution_set_status.';

COMMENT ON COLUMN public.upi_institutions.institution_status IS
  'Governance SSOT: Draft, Review, Active, Inactive, Archived. Transitions via fn_upi_institution_set_status (M3).';
