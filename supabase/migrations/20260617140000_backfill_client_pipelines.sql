-- Assign stage pipelines to legacy clients missing pipeline_id.
-- Skips "— assessment" rows (pre-enrollment / eligibility only).
-- Run after 20260617100000_seed_stage_pipelines.sql

CREATE OR REPLACE FUNCTION public._first_pipeline_stage(_pipeline_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT id
  FROM public.pipeline_stages
  WHERE pipeline_id = _pipeline_id
  ORDER BY sort_order ASC
  LIMIT 1;
$$;

-- 1) Clients with visa_services[] — match pipeline by destination + service shape
WITH coded AS (
  SELECT
    c.id AS client_id,
    c.visa_services[1] AS service_code,
    split_part(c.visa_services[1], '::', 1)::uuid AS library_id,
    NULLIF(split_part(c.visa_services[1], '::', 2), '') AS code_country,
    COALESCE(
      NULLIF(split_part(c.visa_services[1], '::', 2), ''),
      c.interested_countries[1],
      CASE
        WHEN c.application_type ILIKE '%canada%' OR c.application_type ILIKE 'VIS-CA-%' THEN 'Canada'
        WHEN c.application_type ILIKE '%uk%' OR c.application_type ILIKE 'VIS-UK-%' THEN 'United Kingdom'
        WHEN c.application_type ILIKE '%usa%' OR c.application_type ILIKE '%F-1%' THEN 'United States'
        WHEN c.application_type ILIKE '%germany%' THEN 'Germany'
        WHEN c.application_type ILIKE '%australia%' THEN 'Australia'
        ELSE NULL
      END
    ) AS dest_country,
    COALESCE(sl.academy_metadata->>'displayName', sl.sub_service, sl.service, '') AS service_label
  FROM public.clients c
  JOIN public.service_library sl ON sl.id = split_part(c.visa_services[1], '::', 1)::uuid
  WHERE c.pipeline_id IS NULL
    AND c.visa_services IS NOT NULL
    AND cardinality(c.visa_services) > 0
    AND c.visa_services[1] ~ '^[0-9a-f]{8}-'
),
matched AS (
  SELECT DISTINCT ON (coded.client_id)
    coded.client_id,
    sp.id AS pipeline_id
  FROM coded
  JOIN public.stage_pipelines sp
    ON sp.is_active = true
   AND lower(trim(sp.country)) = lower(trim(coded.dest_country))
   AND (
     (
       (coded.service_label ILIKE '%student%' OR coded.service_label ILIKE '%study%' OR coded.service_label ILIKE '%stp%')
       AND sp.service_category = 'Study Visa'
     )
     OR (
       (coded.service_label ILIKE '%visitor%' OR coded.service_label ILIKE '%visit%')
       AND (sp.service_category ILIKE '%visitor%' OR sp.service_category = 'Visitor Visa')
     )
     OR (
       (coded.service_label ILIKE '%spouse%' OR coded.service_label ILIKE '%depend%')
       AND sp.service_category ILIKE '%spous%'
     )
     OR (
       (coded.service_label ILIKE '%bowp%' OR coded.service_label ILIKE '%work permit%' OR coded.service_label ILIKE '%employment%')
       AND (sp.service_category ILIKE '%work%' OR sp.service_category ILIKE '%bowp%' OR sp.service_category ILIKE '%permit%')
     )
     OR (
       (coded.service_label ILIKE '%express entry%' OR coded.service_label ILIKE '%permanent%')
       AND (sp.service_category ILIKE '%express%' OR sp.service_category ILIKE '%permanent%' OR sp.service_category ILIKE '%residency%')
     )
   )
  WHERE coded.dest_country IS NOT NULL
  ORDER BY coded.client_id, length(sp.name) DESC
)
UPDATE public.clients c
SET
  pipeline_id = m.pipeline_id,
  current_stage_id = public._first_pipeline_stage(m.pipeline_id),
  interested_countries = CASE
    WHEN c.interested_countries IS NULL OR cardinality(c.interested_countries) = 0 THEN
      ARRAY(SELECT DISTINCT coded.dest_country FROM coded WHERE coded.client_id = c.id AND coded.dest_country IS NOT NULL)
    ELSE c.interested_countries
  END,
  updated_at = now()
FROM matched m
WHERE c.id = m.client_id;

-- 2) Legacy application_type labels (no visa_services) — explicit destination + category map
WITH legacy AS (
  SELECT
    c.id AS client_id,
    CASE
      WHEN c.application_type ILIKE 'VIS-CA-%'
        OR c.application_type ILIKE '%SDS%'
        OR c.application_type ILIKE '%study permit%canada%'
        THEN 'Canada'
      WHEN c.application_type ILIKE 'VIS-UK-%'
        OR c.application_type ILIKE '%uk%student%'
        THEN 'United Kingdom'
      WHEN c.application_type ILIKE '%USA%Student%'
        OR c.application_type ILIKE '%F-1%'
        THEN 'United States'
      WHEN c.application_type ILIKE '%Express Entry%'
        OR c.application_type ILIKE '%PR — eligibility%'
        THEN 'Canada'
      WHEN c.application_type = 'Visitor Visa' AND lower(trim(c.country)) = 'canada'
        THEN 'Canada'
      WHEN c.application_type ILIKE '%visitor%' AND c.interested_countries[1] IS NOT NULL
        THEN c.interested_countries[1]
      ELSE NULL
    END AS dest_country,
    CASE
      WHEN c.application_type ILIKE 'VIS-CA-%'
        OR c.application_type ILIKE '%SDS%'
        OR c.application_type ILIKE '%USA%Student%'
        OR c.application_type ILIKE '%F-1%'
        OR c.application_type ILIKE 'VIS-UK-%'
        OR c.application_type ILIKE '%uk%student%'
        THEN 'Study Visa'
      WHEN c.application_type ILIKE '%Express Entry%'
        OR c.application_type ILIKE '%PR — eligibility%'
        THEN 'Express Entry PR'
      WHEN c.application_type ILIKE '%visitor%'
        OR c.application_type = 'Visitor Visa'
        THEN 'Visitor Visa'
      ELSE NULL
    END AS service_category
  FROM public.clients c
  WHERE c.pipeline_id IS NULL
    AND (c.visa_services IS NULL OR cardinality(c.visa_services) = 0)
    AND c.application_type IS NOT NULL
    AND c.application_type NOT ILIKE '%— assessment%'
    AND c.application_type NOT ILIKE '%assessment%eligibility%'
),
legacy_matched AS (
  SELECT DISTINCT ON (l.client_id)
    l.client_id,
    sp.id AS pipeline_id,
    l.dest_country
  FROM legacy l
  JOIN public.stage_pipelines sp
    ON sp.is_active = true
   AND lower(trim(sp.country)) = lower(trim(l.dest_country))
   AND lower(trim(sp.service_category)) = lower(trim(l.service_category))
  WHERE l.dest_country IS NOT NULL
    AND l.service_category IS NOT NULL
  ORDER BY l.client_id, length(sp.name) DESC
)
UPDATE public.clients c
SET
  pipeline_id = lm.pipeline_id,
  current_stage_id = public._first_pipeline_stage(lm.pipeline_id),
  interested_countries = CASE
    WHEN c.interested_countries IS NULL OR cardinality(c.interested_countries) = 0 THEN ARRAY[lm.dest_country]
    ELSE c.interested_countries
  END,
  updated_at = now()
FROM legacy_matched lm
WHERE c.id = lm.client_id;

-- 3) Backfill visa_services for common legacy Canada/UK labels (optional linkage)
UPDATE public.clients c
SET
  visa_services = ARRAY['c35e6051-f40f-47bf-9cac-0a386c47a336::Canada'],
  updated_at = now()
WHERE c.pipeline_id IS NOT NULL
  AND (c.visa_services IS NULL OR cardinality(c.visa_services) = 0)
  AND (
    c.application_type ILIKE 'VIS-CA-%'
    OR c.application_type ILIKE '%Student Visa (SDS)%'
  );

UPDATE public.clients c
SET
  visa_services = ARRAY['b2000001-0001-4000-8000-000000000021::United Kingdom'],
  updated_at = now()
WHERE c.pipeline_id IS NOT NULL
  AND (c.visa_services IS NULL OR cardinality(c.visa_services) = 0)
  AND c.application_type ILIKE 'VIS-UK-%';

UPDATE public.clients c
SET
  visa_services = ARRAY['b2000001-0001-4000-8000-000000000031::United States'],
  updated_at = now()
WHERE c.pipeline_id IS NOT NULL
  AND (c.visa_services IS NULL OR cardinality(c.visa_services) = 0)
  AND (c.application_type ILIKE '%USA%Student%' OR c.application_type ILIKE '%F-1%');

UPDATE public.clients c
SET
  visa_services = ARRAY['b2000001-0001-4000-8000-000000000011::Canada'],
  updated_at = now()
WHERE c.pipeline_id IS NOT NULL
  AND (c.visa_services IS NULL OR cardinality(c.visa_services) = 0)
  AND c.application_type = 'Visitor Visa'
  AND lower(trim(c.country)) = 'canada';

UPDATE public.clients c
SET
  visa_services = ARRAY['b2000001-0001-4000-8000-000000000013::Canada'],
  updated_at = now()
WHERE c.pipeline_id IS NOT NULL
  AND (c.visa_services IS NULL OR cardinality(c.visa_services) = 0)
  AND c.application_type ILIKE '%Express Entry%';

COMMENT ON FUNCTION public._first_pipeline_stage IS
  'Helper: lowest sort_order stage id for a pipeline (used by legacy client backfill).';
