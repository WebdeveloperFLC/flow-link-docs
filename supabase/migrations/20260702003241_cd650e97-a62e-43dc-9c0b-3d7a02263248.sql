-- CF ↔ UPI linkage — country + name matching helpers

CREATE OR REPLACE FUNCTION public.fn_cf_upi_country_name_to_code(p_country_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(trim(coalesce(p_country_name, '')))
    WHEN 'canada' THEN 'CA'
    WHEN 'united states' THEN 'US'
    WHEN 'usa' THEN 'US'
    WHEN 'us' THEN 'US'
    WHEN 'america' THEN 'US'
    WHEN 'united kingdom' THEN 'GB'
    WHEN 'uk' THEN 'GB'
    WHEN 'britain' THEN 'GB'
    WHEN 'england' THEN 'GB'
    WHEN 'australia' THEN 'AU'
    WHEN 'new zealand' THEN 'NZ'
    WHEN 'ireland' THEN 'IE'
    WHEN 'germany' THEN 'DE'
    WHEN 'france' THEN 'FR'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.fn_cf_upi_names_match_exact(p_cf_name text, p_upi_name text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(trim(coalesce(p_cf_name, ''))) = lower(trim(coalesce(p_upi_name, '')))
    AND length(trim(coalesce(p_cf_name, ''))) > 0;
$$;

CREATE OR REPLACE FUNCTION public.fn_cf_upi_names_match_normalized(p_cf_name text, p_upi_name text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT public.upi_normalize_institution_name(p_cf_name) = public.upi_normalize_institution_name(p_upi_name)
    AND length(public.upi_normalize_institution_name(p_cf_name)) >= 3;
$$;

CREATE OR REPLACE FUNCTION public.fn_cf_upi_upi_matches_cf_country(
  p_upi_country_name text,
  p_cf_country_code text
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    p_cf_country_code IS NOT NULL
    AND (
      public.fn_cf_upi_country_name_to_code(p_upi_country_name) = p_cf_country_code
      OR EXISTS (
        SELECT 1 FROM public.cf_countries cc
        WHERE cc.code = p_cf_country_code
          AND lower(trim(coalesce(cc.name, ''))) = lower(trim(coalesce(p_upi_country_name, '')))
      )
      OR (
        nullif(trim(coalesce(p_upi_country_name, '')), '') IS NULL
        AND public.fn_cf_upi_country_name_to_code(p_upi_country_name) IS NULL
      )
    );
$$;

COMMENT ON FUNCTION public.fn_cf_upi_country_name_to_code IS
  'Map upi_institutions.country_name to cf_countries.code (aligned with publish edge fn).';