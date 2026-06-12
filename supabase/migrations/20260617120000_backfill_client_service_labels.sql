-- Backfill human-readable application_type and flag clients needing pipeline refresh.
-- Run after 20260617100000_seed_stage_pipelines.sql.
-- Counselors can switch active service on Client Detail to re-assign pipeline.

-- 1) application_type stored as raw service code (uuid::Country)
UPDATE public.clients c
SET application_type = label.new_type,
    updated_at = now()
FROM (
  SELECT
    c2.id,
    COALESCE(
      NULLIF(trim(sl.academy_metadata->>'displayName'), ''),
      CASE
        WHEN trim(sl.service) <> '' AND trim(sl.sub_service) <> ''
             AND lower(trim(sl.service)) <> lower(trim(sl.sub_service))
          THEN trim(sl.service) || ' – ' || trim(sl.sub_service)
        ELSE COALESCE(NULLIF(trim(sl.sub_service), ''), trim(sl.service))
      END
    ) AS new_type
  FROM public.clients c2
  JOIN public.service_library sl
    ON sl.id = split_part(c2.application_type, '::', 1)::uuid
  WHERE c2.application_type ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(::.+)?$'
) label
WHERE c.id = label.id
  AND label.new_type IS NOT NULL
  AND label.new_type <> c.application_type;

-- 2) application_type missing / country-only — derive from first visa_services code
UPDATE public.clients c
SET application_type = label.new_type,
    updated_at = now()
FROM (
  SELECT
    c2.id,
    COALESCE(
      NULLIF(trim(sl.academy_metadata->>'displayName'), ''),
      CASE
        WHEN trim(sl.service) <> '' AND trim(sl.sub_service) <> ''
             AND lower(trim(sl.service)) <> lower(trim(sl.sub_service))
          THEN trim(sl.service) || ' – ' || trim(sl.sub_service)
        ELSE COALESCE(NULLIF(trim(sl.sub_service), ''), trim(sl.service))
      END
    ) AS new_type
  FROM public.clients c2
  JOIN public.service_library sl
    ON sl.id = split_part(c2.visa_services[1], '::', 1)::uuid
  WHERE c2.visa_services IS NOT NULL
    AND cardinality(c2.visa_services) > 0
    AND c2.visa_services[1] ~ '^[0-9a-f]{8}-'
    AND (
      c2.application_type IS NULL
      OR trim(c2.application_type) = ''
      OR trim(c2.application_type) = trim(c2.country)
      OR c2.application_type ~ '^[0-9a-f]{8}-[0-9a-f]{4}-'
    )
) label
WHERE c.id = label.id
  AND label.new_type IS NOT NULL
  AND (c.application_type IS DISTINCT FROM label.new_type);

-- 3) Ops view: clients with services but no pipeline (refresh via Client Detail → Active application)
CREATE OR REPLACE VIEW public.v_clients_needing_pipeline AS
SELECT
  c.id,
  c.full_name,
  c.application_id,
  c.application_type,
  c.country,
  c.visa_services,
  c.pipeline_id
FROM public.clients c
WHERE c.pipeline_id IS NULL
  AND (
    cardinality(COALESCE(c.visa_services, ARRAY[]::text[])) > 0
    OR c.application_type IS NOT NULL
  );

COMMENT ON VIEW public.v_clients_needing_pipeline IS
  'Clients missing pipeline_id after service enrollment. Apply stage pipeline seed then switch active service on Client Detail.';
