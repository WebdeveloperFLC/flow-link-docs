-- Fix course staging duplicates: stable dedup key (no source_url) and cleanup existing dupes.
-- Idempotent: safe to re-run if a prior attempt failed on the UPDATE step.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.upi_canonical_course_title(title text, level text DEFAULT '')
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  s text;
  lvl text;
BEGIN
  s := trim(coalesce(title, ''));
  s := regexp_replace(s, '\s*@\s*[A-Za-z][\w\s.&''-]+$', '', 'g');
  IF coalesce(level, '') <> '' THEN
    lvl := regexp_replace(trim(level), '([.*+?^${}()|[\]\\])', '\\\1', 'g');
    s := regexp_replace(s, '\s*\(\s*' || lvl || '\s*\)\s*$', '', 'i');
  END IF;
  s := regexp_replace(
    s,
    '\s*\((Bachelor|Master|Diploma|Certificate|PhD|Doctorate|Doctoral|Graduate Certificate|Postgraduate)\s*\)\s*$',
    '',
    'i'
  );
  s := lower(regexp_replace(trim(s), '\s{2,}', ' ', 'g'));
  RETURN s;
END;
$$;

-- Resolve program level the same way everywhere (metadata empty string must not block FK name).
CREATE OR REPLACE FUNCTION public.upi_course_dedup_level(_metadata jsonb, _program_level_id uuid)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(
    nullif(trim(_metadata->>'program_level'), ''),
    (SELECT name FROM public.upi_program_levels WHERE id = _program_level_id),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION public.upi_course_dedup_key(
  _institution_id uuid,
  _course_title text,
  _program_level_id uuid,
  _program_level text,
  _campus_name text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT concat_ws(
    '||',
    coalesce(_institution_id::text, ''),
    public.upi_canonical_course_title(_course_title, coalesce(_program_level, '')),
    coalesce(_program_level_id::text, ''),
    lower(trim(coalesce(_program_level, ''))),
    lower(trim(coalesce(_campus_name, '')))
  );
$$;

CREATE OR REPLACE FUNCTION public.upi_course_dedup_hash(
  _institution_id uuid,
  _course_title text,
  _program_level_id uuid,
  _program_level text,
  _campus_name text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(
    digest(
      public.upi_course_dedup_key(
        _institution_id,
        _course_title,
        _program_level_id,
        _program_level,
        _campus_name
      ),
      'sha256'
    ),
    'hex'
  );
$$;

CREATE OR REPLACE FUNCTION public.upi_staging_row_dedup_hash(
  _institution_id uuid,
  _course_title text,
  _program_level_id uuid,
  _metadata jsonb,
  _campus_name text
)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT public.upi_course_dedup_hash(
    _institution_id,
    _course_title,
    _program_level_id,
    public.upi_course_dedup_level(_metadata, _program_level_id),
    _campus_name
  );
$$;

-- Clear old hashes so survivors can be re-keyed without fighting the unique index mid-update.
UPDATE public.upi_courses_staging SET dedup_hash = NULL;

-- Drop duplicate staging rows (keep best status / highest confidence / oldest).
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

-- Backfill dedup_hash on survivors (one row per hash guaranteed).
UPDATE public.upi_courses_staging s
SET dedup_hash = public.upi_staging_row_dedup_hash(
  s.institution_id,
  s.course_title,
  s.program_level_id,
  s.metadata,
  s.campus_name
);
