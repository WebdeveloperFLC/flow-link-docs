DROP VIEW IF EXISTS public.v_upi_institution_profile_readiness CASCADE;

ALTER TABLE public.upi_institutions
  ADD COLUMN IF NOT EXISTS institution_status text NOT NULL DEFAULT 'Draft',
  ADD COLUMN IF NOT EXISTS dli_number text,
  ADD COLUMN IF NOT EXISTS pgwp_eligible boolean,
  ADD COLUMN IF NOT EXISTS pal_required boolean,
  ADD COLUMN IF NOT EXISTS international_student_url text,
  ADD COLUMN IF NOT EXISTS application_portal_url text,
  ADD COLUMN IF NOT EXISTS deposit_policy_url text,
  ADD COLUMN IF NOT EXISTS main_intakes text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS processing_time text,
  ADD COLUMN IF NOT EXISTS application_method text,
  ADD COLUMN IF NOT EXISTS institution_description text,
  ADD COLUMN IF NOT EXISTS last_loa_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS profile_source_url text,
  ADD COLUMN IF NOT EXISTS profile_source_type text,
  ADD COLUMN IF NOT EXISTS profile_source_reference text,
  ADD COLUMN IF NOT EXISTS profile_source_notes text,
  ADD COLUMN IF NOT EXISTS last_human_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_human_verified_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS human_verification_method text,
  ADD COLUMN IF NOT EXISTS completeness_score numeric(5,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.upi_institutions.institution_status IS
  'Lifecycle: Draft, Review, Active, Inactive, Archived. Governance RPC in M3.';
COMMENT ON COLUMN public.upi_institutions.deposit_policy_url IS
  'Official URL describing deposit/tuition deposit policy for international students.';
COMMENT ON COLUMN public.upi_institutions.profile_source_url IS
  'Primary source URL used to verify institution profile fields.';
COMMENT ON COLUMN public.upi_institutions.profile_source_type IS
  'How profile data was sourced: WEBSITE, LOA, PARTNER_PORTAL, EMAIL, MANUAL, AGREEMENT, OTHER.';
COMMENT ON COLUMN public.upi_institutions.completeness_score IS
  'Weighted 0–100 profile completeness; auto-computed on insert/update (M1).';

ALTER TABLE public.upi_institutions
  DROP CONSTRAINT IF EXISTS upi_institutions_institution_status_chk,
  DROP CONSTRAINT IF EXISTS upi_institutions_institution_type_chk,
  DROP CONSTRAINT IF EXISTS upi_institutions_application_method_chk,
  DROP CONSTRAINT IF EXISTS upi_institutions_profile_source_type_chk,
  DROP CONSTRAINT IF EXISTS upi_institutions_human_verification_method_chk,
  DROP CONSTRAINT IF EXISTS upi_institutions_completeness_score_chk;

ALTER TABLE public.upi_institutions
  ADD CONSTRAINT upi_institutions_institution_status_chk CHECK (
    institution_status IN ('Draft', 'Review', 'Active', 'Inactive', 'Archived')
  ),
  ADD CONSTRAINT upi_institutions_institution_type_chk CHECK (
    institution_type IS NULL OR institution_type IN (
      'Public College', 'Polytechnic', 'University', 'Private College', 'Language School', 'Other'
    )
  ),
  ADD CONSTRAINT upi_institutions_application_method_chk CHECK (
    application_method IS NULL OR application_method IN (
      'Direct', 'Agent Portal', 'OCAS', 'ApplyBoard', 'IDP', 'Other'
    )
  ),
  ADD CONSTRAINT upi_institutions_profile_source_type_chk CHECK (
    profile_source_type IS NULL OR profile_source_type IN (
      'WEBSITE', 'LOA', 'PARTNER_PORTAL', 'EMAIL', 'MANUAL', 'AGREEMENT', 'OTHER'
    )
  ),
  ADD CONSTRAINT upi_institutions_human_verification_method_chk CHECK (
    human_verification_method IS NULL OR human_verification_method IN (
      'WEBSITE', 'LOA', 'PARTNER_PORTAL', 'EMAIL', 'MANUAL', 'AGREEMENT', 'OTHER'
    )
  ),
  ADD CONSTRAINT upi_institutions_completeness_score_chk CHECK (
    completeness_score >= 0 AND completeness_score <= 100
  );

CREATE INDEX IF NOT EXISTS idx_upi_institutions_status
  ON public.upi_institutions (institution_status);

CREATE INDEX IF NOT EXISTS idx_upi_institutions_dli_number
  ON public.upi_institutions (dli_number)
  WHERE dli_number IS NOT NULL AND trim(dli_number) <> '';

CREATE INDEX IF NOT EXISTS idx_upi_institutions_completeness
  ON public.upi_institutions (completeness_score DESC);

UPDATE public.upi_institutions SET institution_type = 'University'
WHERE institution_type IN ('Public University', 'Private University');

UPDATE public.upi_institutions SET institution_type = 'Public College'
WHERE institution_type IN ('Community College', 'Pathway Provider');

UPDATE public.upi_institutions SET institution_type = 'Other'
WHERE institution_type IS NOT NULL
  AND institution_type NOT IN (
    'Public College', 'Polytechnic', 'University', 'Private College', 'Language School', 'Other'
  );

UPDATE public.upi_institutions
SET institution_status = CASE
  WHEN is_active IS TRUE THEN 'Active'
  ELSE 'Inactive'
END
WHERE institution_status = 'Draft';

CREATE OR REPLACE FUNCTION public.fn_upi_institution_is_canada(_row public.upi_institutions)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT
    lower(trim(coalesce(_row.country_name, ''))) IN ('canada', 'ca')
    OR EXISTS (
      SELECT 1
      FROM public.upi_countries c
      WHERE c.id = _row.country_id
        AND c.iso_alpha2 = 'CA'
    );
$$;

CREATE OR REPLACE FUNCTION public.fn_compute_upi_institution_completeness_score(_row public.upi_institutions)
RETURNS numeric
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_score numeric := 0;
  v_is_canada boolean;
BEGIN
  v_is_canada := public.fn_upi_institution_is_canada(_row);

  IF _row.name IS NOT NULL AND trim(_row.name) <> '' THEN
    v_score := v_score + 5;
  END IF;
  IF _row.institution_type IS NOT NULL AND trim(_row.institution_type) <> '' THEN
    v_score := v_score + 10;
  END IF;
  IF _row.country_name IS NOT NULL OR _row.country_id IS NOT NULL THEN
    v_score := v_score + 10;
  END IF;
  IF _row.website_url IS NOT NULL AND trim(_row.website_url) <> '' THEN
    v_score := v_score + 15;
  END IF;

  IF _row.application_portal_url IS NOT NULL AND trim(_row.application_portal_url) <> '' THEN
    v_score := v_score + 8;
  END IF;
  IF _row.international_student_url IS NOT NULL AND trim(_row.international_student_url) <> '' THEN
    v_score := v_score + 4;
  END IF;
  IF _row.deposit_policy_url IS NOT NULL AND trim(_row.deposit_policy_url) <> '' THEN
    v_score := v_score + 4;
  END IF;
  IF _row.logo_url IS NOT NULL AND trim(_row.logo_url) <> '' THEN
    v_score := v_score + 4;
  END IF;

  IF _row.city IS NOT NULL AND trim(_row.city) <> '' THEN
    v_score := v_score + 5;
  END IF;
  IF _row.state_province IS NOT NULL AND trim(_row.state_province) <> '' THEN
    v_score := v_score + 5;
  END IF;

  IF _row.main_intakes IS NOT NULL AND cardinality(_row.main_intakes) > 0 THEN
    v_score := v_score + 5;
  END IF;
  IF _row.processing_time IS NOT NULL AND trim(_row.processing_time) <> '' THEN
    v_score := v_score + 5;
  END IF;
  IF _row.application_method IS NOT NULL AND trim(_row.application_method) <> '' THEN
    v_score := v_score + 5;
  END IF;

  IF v_is_canada THEN
    IF _row.dli_number IS NOT NULL AND trim(_row.dli_number) <> '' THEN
      v_score := v_score + 8;
    END IF;
    IF _row.pgwp_eligible IS NOT NULL THEN
      v_score := v_score + 7;
    END IF;
  ELSE
    IF _row.institution_description IS NOT NULL AND trim(_row.institution_description) <> '' THEN
      v_score := v_score + 15;
    END IF;
  END IF;

  IF v_is_canada AND _row.institution_description IS NOT NULL AND trim(_row.institution_description) <> '' THEN
    v_score := v_score + 5;
  END IF;
  IF _row.last_loa_verified_at IS NOT NULL THEN
    v_score := v_score + 5;
  END IF;
  IF _row.last_human_verified_at IS NOT NULL THEN
    v_score := v_score + 5;
  END IF;

  RETURN round(least(100, greatest(0, v_score)), 2);
END;
$$;

COMMENT ON FUNCTION public.fn_compute_upi_institution_completeness_score(public.upi_institutions) IS
  'Weighted Institution Completeness Score (0–100). Contacts weighted in M2.';

CREATE OR REPLACE FUNCTION public.trg_upi_institutions_completeness_score()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.completeness_score := public.fn_compute_upi_institution_completeness_score(NEW);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_upi_institutions_completeness_score ON public.upi_institutions;
CREATE TRIGGER trg_upi_institutions_completeness_score
  BEFORE INSERT OR UPDATE ON public.upi_institutions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_upi_institutions_completeness_score();

UPDATE public.upi_institutions i
SET completeness_score = public.fn_compute_upi_institution_completeness_score(i.*);

CREATE OR REPLACE VIEW public.v_upi_institution_profile_readiness AS
SELECT
  i.id,
  i.name,
  i.institution_status,
  i.completeness_score,
  i.website_url IS NOT NULL AND trim(i.website_url) <> '' AS has_official_website,
  i.application_portal_url IS NOT NULL AND trim(i.application_portal_url) <> '' AS has_application_portal,
  i.deposit_policy_url IS NOT NULL AND trim(i.deposit_policy_url) <> '' AS has_deposit_policy_url,
  public.fn_upi_institution_is_canada(i.*) AS is_canada,
  CASE
    WHEN public.fn_upi_institution_is_canada(i.*) THEN i.dli_number IS NOT NULL AND trim(i.dli_number) <> ''
    ELSE true
  END AS dli_ok,
  CASE
    WHEN public.fn_upi_institution_is_canada(i.*) THEN i.pgwp_eligible IS NOT NULL
    ELSE true
  END AS pgwp_ok,
  i.last_loa_verified_at,
  i.last_human_verified_at,
  i.last_human_verified_by,
  i.human_verification_method,
  i.profile_source_url,
  i.profile_source_type,
  i.profile_source_reference
FROM public.upi_institutions i;

COMMENT ON VIEW public.v_upi_institution_profile_readiness IS
  'Profile readiness for governance UI. Fee warnings and contacts added in M2/M3.';

GRANT SELECT ON public.v_upi_institution_profile_readiness TO authenticated;

COMMENT ON TABLE public.institution_fee_schedule IS
  'Institution fee defaults (ws-2). APPLICATION must be EXACT; TUITION/DEPOSIT typically APPROXIMATE. '
  'Route overrides via upi_partnership_routes; program fees via staging/cf_courses.';