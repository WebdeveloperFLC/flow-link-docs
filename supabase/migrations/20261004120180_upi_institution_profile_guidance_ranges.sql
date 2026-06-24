-- M3.1b — Informational profile guidance ranges (not Fee Schedule / billing)
-- Counselor-facing hints only. Fee Master continues to use institution_fee_schedule.

ALTER TABLE public.upi_institutions
  ADD COLUMN IF NOT EXISTS approximate_tuition_range text,
  ADD COLUMN IF NOT EXISTS approximate_deposit_range text;

COMMENT ON COLUMN public.upi_institutions.approximate_tuition_range IS
  'Informational counselor guidance only (e.g. Approx. CAD 15,000–22,000/year). '
  'Does not replace institution_fee_schedule TUITION rows or billing.';

COMMENT ON COLUMN public.upi_institutions.approximate_deposit_range IS
  'Informational counselor guidance only (e.g. Approx. CAD 2,000–5,000). '
  'Does not replace institution_fee_schedule DEPOSIT rows or billing.';

-- Extend readiness view (informational flags for UI hints — not activation gates)
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
  i.approximate_tuition_range IS NOT NULL AND trim(i.approximate_tuition_range) <> '' AS has_guidance_tuition_range,
  i.approximate_deposit_range IS NOT NULL AND trim(i.approximate_deposit_range) <> '' AS has_guidance_deposit_range,
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
  'Profile + contact readiness for governance UI. Guidance ranges are informational only (M3.1b).';

GRANT SELECT ON public.v_upi_institution_profile_readiness TO authenticated;
