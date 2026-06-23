-- M2 — Institution contacts (flexible, multiple per contact type)
-- Extends completeness score to include active contacts.
-- No Mark Final, fee schedule, or CF changes.

-- ---------------------------------------------------------------------------
-- upi_institution_contacts
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.upi_institution_contacts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id    uuid NOT NULL REFERENCES public.upi_institutions(id) ON DELETE CASCADE,
  contact_type      text NOT NULL,
  contact_name      text,
  designation       text,
  department        text,
  email             text,
  phone             text,
  mobile            text,
  country           text,
  notes             text,
  is_primary        boolean NOT NULL DEFAULT false,
  is_active         boolean NOT NULL DEFAULT true,
  sort_order        int NOT NULL DEFAULT 0,
  created_by        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT upi_institution_contacts_contact_type_nonempty_chk CHECK (
    trim(contact_type) <> ''
  )
);

CREATE INDEX IF NOT EXISTS idx_upi_institution_contacts_institution
  ON public.upi_institution_contacts (institution_id, is_active, sort_order);

CREATE INDEX IF NOT EXISTS idx_upi_institution_contacts_type
  ON public.upi_institution_contacts (institution_id, lower(trim(contact_type)), sort_order);

DROP TRIGGER IF EXISTS trg_upi_institution_contacts_updated_at ON public.upi_institution_contacts;
CREATE TRIGGER trg_upi_institution_contacts_updated_at
  BEFORE UPDATE ON public.upi_institution_contacts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

COMMENT ON TABLE public.upi_institution_contacts IS
  'Flexible institution contacts (M2). Multiple rows per contact_type; no one-per-role constraint.';

ALTER TABLE public.upi_institution_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS upi_institution_contacts_catalog_select ON public.upi_institution_contacts;
DROP POLICY IF EXISTS upi_institution_contacts_catalog_insert ON public.upi_institution_contacts;
DROP POLICY IF EXISTS upi_institution_contacts_catalog_update ON public.upi_institution_contacts;
DROP POLICY IF EXISTS upi_institution_contacts_catalog_delete ON public.upi_institution_contacts;

CREATE POLICY upi_institution_contacts_catalog_select ON public.upi_institution_contacts
  FOR SELECT TO authenticated
  USING (public.can_view_upi_catalog(auth.uid()) OR public.can_view_upi_confidential(auth.uid()));

CREATE POLICY upi_institution_contacts_catalog_insert ON public.upi_institution_contacts
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_upi_catalog(auth.uid()));

CREATE POLICY upi_institution_contacts_catalog_update ON public.upi_institution_contacts
  FOR UPDATE TO authenticated
  USING (public.can_manage_upi_catalog(auth.uid()))
  WITH CHECK (public.can_manage_upi_catalog(auth.uid()));

CREATE POLICY upi_institution_contacts_catalog_delete ON public.upi_institution_contacts
  FOR DELETE TO authenticated
  USING (public.can_manage_upi_catalog(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

-- ---------------------------------------------------------------------------
-- Completeness score — include contacts (+10, capped at 100)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_compute_upi_institution_completeness_score(_row public.upi_institutions)
RETURNS numeric
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_score numeric := 0;
  v_is_canada boolean;
  v_has_active_email_contact boolean;
  v_has_active_primary_contact boolean;
BEGIN
  v_is_canada := public.fn_upi_institution_is_canada(_row);

  SELECT EXISTS (
    SELECT 1
    FROM public.upi_institution_contacts c
    WHERE c.institution_id = _row.id
      AND c.is_active = true
      AND c.email IS NOT NULL
      AND trim(c.email) <> ''
  ) INTO v_has_active_email_contact;

  SELECT EXISTS (
    SELECT 1
    FROM public.upi_institution_contacts c
    WHERE c.institution_id = _row.id
      AND c.is_active = true
      AND c.is_primary = true
  ) INTO v_has_active_primary_contact;

  -- Core identity & web presence (40)
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

  -- URLs (20)
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

  -- Location (10)
  IF _row.city IS NOT NULL AND trim(_row.city) <> '' THEN
    v_score := v_score + 5;
  END IF;
  IF _row.state_province IS NOT NULL AND trim(_row.state_province) <> '' THEN
    v_score := v_score + 5;
  END IF;

  -- Recruitment (15)
  IF _row.main_intakes IS NOT NULL AND cardinality(_row.main_intakes) > 0 THEN
    v_score := v_score + 5;
  END IF;
  IF _row.processing_time IS NOT NULL AND trim(_row.processing_time) <> '' THEN
    v_score := v_score + 5;
  END IF;
  IF _row.application_method IS NOT NULL AND trim(_row.application_method) <> '' THEN
    v_score := v_score + 5;
  END IF;

  -- Compliance (15)
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

  -- Verification & narrative (15)
  IF v_is_canada AND _row.institution_description IS NOT NULL AND trim(_row.institution_description) <> '' THEN
    v_score := v_score + 5;
  END IF;
  IF _row.last_loa_verified_at IS NOT NULL THEN
    v_score := v_score + 5;
  END IF;
  IF _row.last_human_verified_at IS NOT NULL THEN
    v_score := v_score + 5;
  END IF;

  -- Contacts (10) — M2
  IF v_has_active_email_contact THEN
    v_score := v_score + 5;
  END IF;
  IF v_has_active_primary_contact THEN
    v_score := v_score + 5;
  END IF;

  RETURN round(least(100, greatest(0, v_score)), 2);
END;
$$;

COMMENT ON FUNCTION public.fn_compute_upi_institution_completeness_score(public.upi_institutions) IS
  'Weighted Institution Completeness Score (0–100). Includes profile + active contacts (M2).';

-- Recompute institution scores when contacts change
CREATE OR REPLACE FUNCTION public.trg_upi_institution_contacts_refresh_parent_score()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_institution_id uuid;
BEGIN
  v_institution_id := COALESCE(NEW.institution_id, OLD.institution_id);
  UPDATE public.upi_institutions i
  SET completeness_score = public.fn_compute_upi_institution_completeness_score(i.*)
  WHERE i.id = v_institution_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_upi_institution_contacts_refresh_parent_score ON public.upi_institution_contacts;
CREATE TRIGGER trg_upi_institution_contacts_refresh_parent_score
  AFTER INSERT OR UPDATE OR DELETE ON public.upi_institution_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_upi_institution_contacts_refresh_parent_score();

UPDATE public.upi_institutions i
SET completeness_score = public.fn_compute_upi_institution_completeness_score(i.*);

-- Extend readiness view with contact counts
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
  i.profile_source_reference,
  (
    SELECT count(*)::integer
    FROM public.upi_institution_contacts c
    WHERE c.institution_id = i.id AND c.is_active = true
  ) AS active_contact_count,
  (
    SELECT count(*)::integer
    FROM public.upi_institution_contacts c
    WHERE c.institution_id = i.id
      AND c.is_active = true
      AND c.email IS NOT NULL
      AND trim(c.email) <> ''
  ) AS active_contact_with_email_count
FROM public.upi_institutions i;

COMMENT ON VIEW public.v_upi_institution_profile_readiness IS
  'Profile + contact readiness for governance UI (M2). Fee warnings in M3.';

GRANT SELECT ON public.v_upi_institution_profile_readiness TO authenticated;
