-- Merge duplicate staging rows that differ only by campus.
-- One program per institution + title + level; all campuses stored on the survivor row.

CREATE OR REPLACE FUNCTION public.upi_row_campus_names(_campus_name text, _metadata jsonb)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT coalesce(array_agg(DISTINCT trim(c) ORDER BY trim(c)), ARRAY[]::text[])
  FROM (
    SELECT unnest(string_to_array(coalesce(_campus_name, ''), ',')) AS c
    UNION ALL
    SELECT jsonb_array_elements_text(coalesce(_metadata->'campus_names', '[]'::jsonb))
  ) parts
  WHERE trim(c) <> '';
$$;

-- Dedup key ignores campus (same program across campuses = one row).
CREATE OR REPLACE FUNCTION public.upi_course_dedup_key(
  _institution_id uuid,
  _course_title text,
  _program_level_id uuid,
  _program_level text,
  _campus_name text DEFAULT NULL
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
    lower(trim(coalesce(_program_level, '')))
  );
$$;

CREATE OR REPLACE FUNCTION public.upi_course_dedup_hash(
  _institution_id uuid,
  _course_title text,
  _program_level_id uuid,
  _program_level text,
  _campus_name text DEFAULT NULL
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
  _campus_name text DEFAULT NULL
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

UPDATE public.upi_courses_staging SET dedup_hash = NULL;

WITH computed AS (
  SELECT
    s.*,
    public.upi_staging_row_dedup_hash(
      s.institution_id,
      s.course_title,
      s.program_level_id,
      s.metadata,
      NULL
    ) AS new_hash
  FROM public.upi_courses_staging s
),
ranked AS (
  SELECT
    id,
    new_hash,
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
),
campus_flat AS (
  SELECT c.new_hash, unnest(public.upi_row_campus_names(c.campus_name, c.metadata)) AS campus
  FROM computed c
),
campus_agg AS (
  SELECT new_hash, array_agg(DISTINCT campus ORDER BY campus) AS campuses
  FROM campus_flat
  WHERE campus IS NOT NULL AND trim(campus) <> ''
  GROUP BY new_hash
),
merged AS (
  SELECT
    r.id,
    r.new_hash,
    ca.campuses
  FROM ranked r
  LEFT JOIN campus_agg ca ON ca.new_hash = r.new_hash
  WHERE r.rn = 1
)
UPDATE public.upi_courses_staging s
SET
  campus_name = CASE
    WHEN coalesce(array_length(m.campuses, 1), 0) > 0 THEN array_to_string(m.campuses, ', ')
    ELSE s.campus_name
  END,
  metadata = coalesce(s.metadata, '{}'::jsonb) || jsonb_build_object('campus_names', to_jsonb(coalesce(m.campuses, ARRAY[]::text[]))),
  dedup_hash = m.new_hash,
  updated_at = now()
FROM merged m
WHERE s.id = m.id;

WITH computed AS (
  SELECT
    s.id,
    public.upi_staging_row_dedup_hash(
      s.institution_id,
      s.course_title,
      s.program_level_id,
      s.metadata,
      NULL
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
  NULL
)
WHERE dedup_hash IS NULL;
