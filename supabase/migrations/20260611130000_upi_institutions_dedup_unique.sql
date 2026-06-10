-- Merge duplicate institutions (same normalized name + country) and block future duplicates.
-- Same institution name in DIFFERENT countries is allowed (e.g. Arden Berlin/Germany vs Arden London/UK).

CREATE OR REPLACE FUNCTION public.upi_institution_dedup_key(_name text, _country text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT concat_ws(
    '||',
    public.upi_normalize_institution_name(_name),
    public.upi_normalize_country(coalesce(_country, ''))
  );
$$;

-- Build survivor map: duplicate id → canonical institution id.
CREATE TEMP TABLE _inst_merge_map ON COMMIT DROP AS
WITH keyed AS (
  SELECT
    i.*,
    public.upi_institution_dedup_key(i.name, i.country_name) AS dedup_key
  FROM public.upi_institutions i
),
ranked AS (
  SELECT
    id,
    dedup_key,
    ROW_NUMBER() OVER (
      PARTITION BY dedup_key
      ORDER BY
        is_partner DESC NULLS LAST,
        (nullif(trim(logo_url), '') IS NOT NULL) DESC,
        (nullif(trim(website_url), '') IS NOT NULL) DESC,
        is_active DESC NULLS LAST,
        created_at ASC
    ) AS rn
  FROM keyed
),
survivors AS (
  SELECT dedup_key, id AS survivor_id FROM ranked WHERE rn = 1
)
SELECT r.id AS dup_id, s.survivor_id
FROM ranked r
JOIN survivors s ON s.dedup_key = r.dedup_key
WHERE r.id <> s.survivor_id;

-- Drop duplicate partnership routes on dup rows when survivor already has the same channel.
DELETE FROM public.upi_partnership_routes pr
USING _inst_merge_map m
WHERE pr.institution_id = m.dup_id
  AND pr.channel_type = 'direct'
  AND pr.status = 'active'
  AND EXISTS (
    SELECT 1 FROM public.upi_partnership_routes existing
    WHERE existing.institution_id = m.survivor_id
      AND existing.channel_type = 'direct'
      AND existing.status = 'active'
  );

DELETE FROM public.upi_partnership_routes pr
USING _inst_merge_map m
WHERE pr.institution_id = m.dup_id
  AND pr.channel_type = 'indirect'
  AND pr.status = 'active'
  AND pr.aggregator_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.upi_partnership_routes existing
    WHERE existing.institution_id = m.survivor_id
      AND existing.channel_type = 'indirect'
      AND existing.status = 'active'
      AND existing.aggregator_id = pr.aggregator_id
  );

-- Reassign foreign keys from duplicates to survivors (partnership routes handled separately).
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'upi_campuses',
    'upi_institution_sources',
    'upi_sync_jobs',
    'upi_uploaded_documents',
    'upi_ai_suggestions',
    'upi_agreements',
    'upi_commissions',
    'upi_commission_students',
    'upi_commission_invoices',
    'upi_claim_cycles',
    'upi_invoices',
    'upi_courses_staging',
    'upi_scholarship_rules',
    'upi_promotions',
    'upi_marketing_campaigns',
    'upi_commission_snapshots'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'institution_id'
    ) THEN
      EXECUTE format(
        'UPDATE public.%I x SET institution_id = m.survivor_id FROM _inst_merge_map m WHERE x.institution_id = m.dup_id',
        t
      );
    END IF;
  END LOOP;
END $$;

UPDATE public.upi_partnership_routes x
SET institution_id = m.survivor_id,
    updated_at = now()
FROM _inst_merge_map m
WHERE x.institution_id = m.dup_id;

-- Collapse any remaining duplicate active routes after merge.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY institution_id
      ORDER BY is_default_route DESC, priority_rank ASC, created_at ASC
    ) AS rn
  FROM public.upi_partnership_routes
  WHERE channel_type = 'direct' AND status = 'active'
)
DELETE FROM public.upi_partnership_routes pr
USING ranked r
WHERE pr.id = r.id AND r.rn > 1;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY institution_id, aggregator_id
      ORDER BY is_default_route DESC, priority_rank ASC, created_at ASC
    ) AS rn
  FROM public.upi_partnership_routes
  WHERE channel_type = 'indirect' AND status = 'active' AND aggregator_id IS NOT NULL
)
DELETE FROM public.upi_partnership_routes pr
USING ranked r
WHERE pr.id = r.id AND r.rn > 1;

UPDATE public.upi_institution_tags ut
SET institution_id = m.survivor_id
FROM _inst_merge_map m
WHERE ut.institution_id = m.dup_id
  AND NOT EXISTS (
    SELECT 1 FROM public.upi_institution_tags x
    WHERE x.institution_id = m.survivor_id AND x.tag_id = ut.tag_id
  );

DELETE FROM public.upi_institution_tags ut
USING _inst_merge_map m
WHERE ut.institution_id = m.dup_id;

UPDATE public.clients c
SET linked_institution_id = m.survivor_id
FROM _inst_merge_map m
WHERE c.linked_institution_id = m.dup_id;

UPDATE public.cf_universities u
SET upi_institution_id = m.survivor_id
FROM _inst_merge_map m
WHERE u.upi_institution_id = m.dup_id;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'upi_institution_id'
  ) THEN
    UPDATE public.courses c
    SET upi_institution_id = m.survivor_id
    FROM _inst_merge_map m
    WHERE c.upi_institution_id = m.dup_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'dsh_media'
  ) THEN
    UPDATE public.dsh_media d
    SET institution_id = m.survivor_id
    FROM _inst_merge_map m
    WHERE d.institution_id = m.dup_id;
  END IF;
END $$;

-- Merge survivor metadata from duplicates (keep richest fields).
UPDATE public.upi_institutions s
SET
  logo_url = coalesce(nullif(trim(s.logo_url), ''), x.logo_url),
  website_url = coalesce(nullif(trim(s.website_url), ''), x.website_url),
  is_partner = s.is_partner OR x.is_partner,
  partner_since = coalesce(s.partner_since, x.partner_since),
  notes = coalesce(nullif(trim(s.notes), ''), nullif(trim(x.notes), '')),
  updated_at = now()
FROM (
  SELECT
    m.survivor_id,
    bool_or(i.is_partner) AS is_partner,
    min(i.partner_since) AS partner_since,
    max(nullif(trim(i.logo_url), '')) AS logo_url,
    max(nullif(trim(i.website_url), '')) AS website_url,
    max(nullif(trim(i.notes), '')) AS notes
  FROM _inst_merge_map m
  JOIN public.upi_institutions i ON i.id = m.dup_id
  GROUP BY m.survivor_id
) x
WHERE s.id = x.survivor_id;

DELETE FROM public.upi_institutions i
USING _inst_merge_map m
WHERE i.id = m.dup_id;

-- Re-dedup courses after institution merge (same program may exist on former duplicate rows).
UPDATE public.upi_courses_staging SET dedup_hash = NULL;

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
WHERE s.id = r.id AND r.rn > 1;

UPDATE public.upi_courses_staging s
SET dedup_hash = public.upi_staging_row_dedup_hash(
  s.institution_id,
  s.course_title,
  s.program_level_id,
  s.metadata,
  NULL
)
WHERE dedup_hash IS NULL;

-- Prevent duplicate institutions going forward (scoped by country — not name alone).
DROP INDEX IF EXISTS idx_upi_institutions_dedup_unique;
CREATE UNIQUE INDEX idx_upi_institutions_dedup_unique
  ON public.upi_institutions (
    public.upi_normalize_institution_name(name),
    public.upi_normalize_country(coalesce(country_name, ''))
  );
