-- Reconcile misassigned staging courses, align countries, and remove duplicates.
-- Safe to re-run (idempotent dedup phase).

CREATE OR REPLACE FUNCTION public.upi_normalize_institution_name(name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(regexp_replace(trim(coalesce(name, '')), '[^a-z0-9]+', ' ', 'g'));
$$;

CREATE OR REPLACE FUNCTION public.upi_normalize_country(country text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(trim(coalesce(country, '')))
    WHEN 'uk' THEN 'united kingdom'
    WHEN 'u k' THEN 'united kingdom'
    WHEN 'great britain' THEN 'united kingdom'
    WHEN 'england' THEN 'united kingdom'
    WHEN 'usa' THEN 'united states'
    WHEN 'us' THEN 'united states'
    WHEN 'u s a' THEN 'united states'
    WHEN 'uae' THEN 'united arab emirates'
    ELSE lower(trim(coalesce(country, '')))
  END;
$$;

CREATE OR REPLACE FUNCTION public.upi_url_host(url text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT nullif(
    lower(
      regexp_replace(
        regexp_replace(trim(coalesce(url, '')), '^https?://(www\.)?', '', 'i'),
        '/.*$', ''
      )
    ),
    ''
  );
$$;

-- 1) Reassign institution_id when metadata institute_name matches a different institution.
UPDATE public.upi_courses_staging s
SET institution_id = i.id,
    updated_at = now()
FROM public.upi_institutions i
WHERE nullif(trim(s.metadata->>'institute_name'), '') IS NOT NULL
  AND public.upi_normalize_institution_name(s.metadata->>'institute_name')
      = public.upi_normalize_institution_name(i.name)
  AND s.institution_id IS DISTINCT FROM i.id;

-- 2) Reassign by source URL host when it matches an institution website.
UPDATE public.upi_courses_staging s
SET institution_id = i.id,
    updated_at = now()
FROM public.upi_institutions i
WHERE s.institution_id IS DISTINCT FROM i.id
  AND public.upi_url_host(s.source_url) IS NOT NULL
  AND public.upi_url_host(i.website_url) IS NOT NULL
  AND (
    public.upi_url_host(s.source_url) = public.upi_url_host(i.website_url)
    OR public.upi_url_host(s.source_url) LIKE '%' || public.upi_url_host(i.website_url)
    OR public.upi_url_host(i.website_url) LIKE '%' || public.upi_url_host(s.source_url)
  );

-- 3) Backfill country_name from institution when missing.
UPDATE public.upi_courses_staging s
SET country_name = i.country_name,
    updated_at = now()
FROM public.upi_institutions i
WHERE s.institution_id = i.id
  AND i.country_name IS NOT NULL
  AND nullif(trim(s.country_name), '') IS NULL;

-- 4) When row country conflicts with assigned institution, try metadata name + country match.
UPDATE public.upi_courses_staging s
SET institution_id = i.id,
    updated_at = now()
FROM public.upi_institutions wrong_i,
     public.upi_institutions i
WHERE s.institution_id = wrong_i.id
  AND nullif(trim(s.country_name), '') IS NOT NULL
  AND wrong_i.country_name IS NOT NULL
  AND i.country_name IS NOT NULL
  AND public.upi_normalize_country(s.country_name) <> public.upi_normalize_country(wrong_i.country_name)
  AND public.upi_normalize_country(s.country_name) = public.upi_normalize_country(i.country_name)
  AND nullif(trim(s.metadata->>'institute_name'), '') IS NOT NULL
  AND public.upi_normalize_institution_name(s.metadata->>'institute_name')
      = public.upi_normalize_institution_name(i.name)
  AND s.institution_id IS DISTINCT FROM i.id;

-- 5) Remove rows that still conflict with institution country (clearly misassigned).
DELETE FROM public.upi_courses_staging s
USING public.upi_institutions i
WHERE s.institution_id = i.id
  AND nullif(trim(s.country_name), '') IS NOT NULL
  AND i.country_name IS NOT NULL
  AND public.upi_normalize_country(s.country_name) <> public.upi_normalize_country(i.country_name);

-- 6) Remove orphan staging rows (no institution).
DELETE FROM public.upi_courses_staging
WHERE institution_id IS NULL;

-- 7) Re-run dedup cleanup (same logic as 20260605160000_upi_courses_dedup_fix.sql).
UPDATE public.upi_courses_staging SET dedup_hash = NULL;

WITH computed AS (
  SELECT
    s.id,
    public.upi_staging_row_dedup_hash(
      s.institution_id,
      s.course_title,
      s.program_level_id,
      s.metadata,
      s.campus_name
    ) AS new_hash,
    s.review_status,
    s.confidence_score,
    s.extracted_at
  FROM public.upi_courses_staging s
),
ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY new_hash
      ORDER BY
        CASE review_status
          WHEN 'published' THEN 1
          WHEN 'approved' THEN 2
          WHEN 'needs_update' THEN 3
          WHEN 'pending_review' THEN 4
          WHEN 'rejected' THEN 5
          ELSE 6
        END,
        confidence_score DESC NULLS LAST,
        extracted_at ASC NULLS LAST
    ) AS rn
  FROM computed
)
DELETE FROM public.upi_courses_staging s
USING ranked r
WHERE s.id = r.id
  AND r.rn > 1;

UPDATE public.upi_courses_staging s
SET dedup_hash = public.upi_staging_row_dedup_hash(
  s.institution_id,
  s.course_title,
  s.program_level_id,
  s.metadata,
  s.campus_name
);
