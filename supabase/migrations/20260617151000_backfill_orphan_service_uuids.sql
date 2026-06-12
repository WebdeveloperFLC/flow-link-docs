-- Resolve last orphan service UUID clients (suffix-based legacy enrolment codes).
-- Run after 20260617150000_backfill_client_pipelines_legacy_v2.sql

-- South Korea student (legacy enrolments reference orphan UUIDs with ::South Korea suffix)
INSERT INTO public.service_library (id, service_category, service, sub_service, display_order, is_active, academy_metadata)
VALUES (
  'b2000001-0001-4000-8000-0000000000ec'::uuid,
  'visa_immigration',
  'South Korea',
  'Student Visa (D-2 / D-4)',
  130,
  true,
  '{"displayName":"South Korea Student Visa"}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  service = EXCLUDED.service,
  sub_service = EXCLUDED.sub_service,
  is_active = EXCLUDED.is_active,
  academy_metadata = EXCLUDED.academy_metadata,
  updated_at = now();

INSERT INTO public.service_library_countries (library_id, country)
VALUES ('b2000001-0001-4000-8000-0000000000ec'::uuid, 'South Korea')
ON CONFLICT DO NOTHING;

DO $$
DECLARE
  pid uuid;
  finland_pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES (
    'c3000001-0001-4000-8000-0ec000000001'::uuid,
    'South Korea Student Visa',
    'South Korea',
    'Study Visa',
    true,
    'Legacy orphan UUID backfill — South Korea student visa'
  )
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  SELECT id INTO finland_pid
  FROM public.stage_pipelines
  WHERE country = 'Finland' AND service_category = 'Study Visa'
  LIMIT 1;

  IF finland_pid IS NOT NULL THEN
    INSERT INTO public.pipeline_stages (
      pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible
    )
    SELECT
      pid, ps.key, ps.label, ps.client_label, ps.sort_order, ps.color, ps.notify_client, ps.is_client_visible
    FROM public.pipeline_stages ps
    WHERE ps.pipeline_id = finland_pid
      AND NOT EXISTS (
        SELECT 1 FROM public.pipeline_stages x
        WHERE x.pipeline_id = pid AND x.key = ps.key
      );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public._canonical_study_library_id(_dest_country text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(trim(_dest_country))
    WHEN 'canada' THEN 'c35e6051-f40f-47bf-9cac-0a386c47a336'::uuid
    WHEN 'germany' THEN 'b2000001-0001-4000-8000-000000000051'::uuid
    WHEN 'united kingdom' THEN 'b2000001-0001-4000-8000-000000000021'::uuid
    WHEN 'united states' THEN 'b2000001-0001-4000-8000-000000000031'::uuid
    WHEN 'australia' THEN 'b2000001-0001-4000-8000-000000000041'::uuid
    WHEN 'south korea' THEN 'b2000001-0001-4000-8000-0000000000ec'::uuid
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public._normalize_orphan_service_code(_raw_code text)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  lib_part text;
  dest_part text;
  canonical uuid;
BEGIN
  IF _raw_code IS NULL OR trim(_raw_code) = '' THEN
    RETURN _raw_code;
  END IF;

  IF _raw_code !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(::.+)?$' THEN
    RETURN _raw_code;
  END IF;

  lib_part := split_part(_raw_code, '::', 1);
  dest_part := NULLIF(trim(split_part(_raw_code, '::', 2)), '');

  IF dest_part IS NULL THEN
    RETURN _raw_code;
  END IF;

  IF EXISTS (SELECT 1 FROM public.service_library sl WHERE sl.id = lib_part::uuid) THEN
    RETURN lib_part || '::' || dest_part;
  END IF;

  canonical := public._canonical_study_library_id(dest_part);
  IF canonical IS NULL THEN
    RETURN _raw_code;
  END IF;

  RETURN canonical::text || '::' || dest_part;
END;
$$;

-- Normalize orphan UUID tokens in visa_services[] (keep all enrolled destinations)
UPDATE public.clients c
SET
  visa_services = ARRAY(
    SELECT public._normalize_orphan_service_code(s)
    FROM unnest(c.visa_services) AS s
  ),
  updated_at = now()
WHERE c.pipeline_id IS NULL
  AND c.visa_services IS NOT NULL
  AND cardinality(c.visa_services) > 0
  AND EXISTS (
    SELECT 1
    FROM unnest(c.visa_services) AS s
    WHERE s ~ '^[0-9a-f]{8}-'
      AND public._normalize_orphan_service_code(s) <> s
  );

-- Assign pipeline from first visa_services entry (service_library join OR suffix fallback)
WITH orphan_clients AS (
  SELECT
    c.id AS client_id,
    c.visa_services[1] AS raw_code,
    public._normalize_orphan_service_code(c.visa_services[1]) AS service_code,
    COALESCE(
      NULLIF(trim(split_part(public._normalize_orphan_service_code(c.visa_services[1]), '::', 2)), ''),
      public._legacy_client_dest_country(c.country, c.interested_countries, c.application_type)
    ) AS dest_country,
    COALESCE(
      CASE
        WHEN COALESCE(sl.academy_metadata->>'displayName', sl.sub_service, sl.service, '') ILIKE '%student%'
          OR COALESCE(sl.academy_metadata->>'displayName', sl.sub_service, sl.service, '') ILIKE '%study%'
          THEN 'Study Visa'
        WHEN COALESCE(sl.academy_metadata->>'displayName', sl.sub_service, sl.service, '') ILIKE '%visitor%'
          THEN 'Visitor Visa'
        WHEN COALESCE(sl.academy_metadata->>'displayName', sl.sub_service, sl.service, '') ILIKE '%spouse%'
          THEN 'Spouse Visa'
        ELSE NULL
      END,
      CASE
        WHEN c.application_type ILIKE '%student%' THEN 'Study Visa'
        WHEN c.application_type ILIKE '%visitor%' OR c.application_type ILIKE '%tourist%' THEN 'Visitor Visa'
        WHEN c.application_type ILIKE '%spouse%' THEN 'Spouse Visa'
        ELSE 'Study Visa'
      END
    ) AS service_category,
    COALESCE(
      sl.id,
      public._canonical_study_library_id(
        COALESCE(
          NULLIF(trim(split_part(public._normalize_orphan_service_code(c.visa_services[1]), '::', 2)), ''),
          public._legacy_client_dest_country(c.country, c.interested_countries, c.application_type)
        )
      )
    ) AS library_id
  FROM public.clients c
  LEFT JOIN public.service_library sl
    ON sl.id = split_part(public._normalize_orphan_service_code(c.visa_services[1]), '::', 1)::uuid
  WHERE c.pipeline_id IS NULL
    AND c.visa_services IS NOT NULL
    AND cardinality(c.visa_services) > 0
    AND c.visa_services[1] ~ '^[0-9a-f]{8}-'
),
orphan_matched AS (
  SELECT DISTINCT ON (oc.client_id)
    oc.client_id,
    sp.id AS pipeline_id,
    oc.dest_country,
    oc.library_id,
    oc.service_code
  FROM orphan_clients oc
  JOIN public.stage_pipelines sp
    ON sp.is_active = true
   AND lower(trim(sp.country)) = lower(trim(oc.dest_country))
   AND lower(trim(sp.service_category)) = lower(trim(oc.service_category))
  WHERE oc.dest_country IS NOT NULL
    AND oc.service_category IS NOT NULL
    AND oc.library_id IS NOT NULL
  ORDER BY oc.client_id, length(sp.name) DESC
)
UPDATE public.clients c
SET
  pipeline_id = om.pipeline_id,
  current_stage_id = public._first_pipeline_stage(om.pipeline_id),
  application_type = COALESCE(
    NULLIF(trim(sl.academy_metadata->>'displayName'), ''),
    CASE
      WHEN trim(sl.service) <> '' AND trim(sl.sub_service) <> ''
           AND lower(trim(sl.service)) <> lower(trim(sl.sub_service))
        THEN trim(sl.service) || ' – ' || trim(sl.sub_service)
      ELSE COALESCE(NULLIF(trim(sl.sub_service), ''), trim(sl.service))
    END,
    c.application_type
  ),
  interested_countries = CASE
    WHEN c.interested_countries IS NULL OR cardinality(c.interested_countries) = 0 THEN ARRAY[om.dest_country]
    ELSE c.interested_countries
  END,
  updated_at = now()
FROM orphan_matched om
JOIN public.service_library sl ON sl.id = om.library_id
WHERE c.id = om.client_id;

-- Fix application_type still stored as orphan uuid::Country (no service_library join in prior pass)
WITH typed_orphans AS (
  SELECT
    c.id AS client_id,
    COALESCE(
      NULLIF(trim(split_part(c.application_type, '::', 2)), ''),
      public._legacy_client_dest_country(c.country, c.interested_countries, c.application_type)
    ) AS dest_country,
    public._canonical_study_library_id(
      COALESCE(
        NULLIF(trim(split_part(c.application_type, '::', 2)), ''),
        public._legacy_client_dest_country(c.country, c.interested_countries, c.application_type)
      )
    ) AS library_id
  FROM public.clients c
  WHERE c.application_type ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(::.+)?$'
    AND NOT EXISTS (
      SELECT 1
      FROM public.service_library sl
      WHERE sl.id = split_part(c.application_type, '::', 1)::uuid
    )
),
typed_orphans_matched AS (
  SELECT DISTINCT ON (t.client_id)
    t.client_id,
    t.dest_country,
    t.library_id,
    sp.id AS pipeline_id,
    COALESCE(
      NULLIF(trim(sl.academy_metadata->>'displayName'), ''),
      CASE
        WHEN trim(sl.service) <> '' AND trim(sl.sub_service) <> ''
             AND lower(trim(sl.service)) <> lower(trim(sl.sub_service))
          THEN trim(sl.service) || ' – ' || trim(sl.sub_service)
        ELSE COALESCE(NULLIF(trim(sl.sub_service), ''), trim(sl.service))
      END
    ) AS new_type
  FROM typed_orphans t
  JOIN public.service_library sl ON sl.id = t.library_id
  LEFT JOIN public.stage_pipelines sp
    ON sp.is_active = true
   AND lower(trim(sp.country)) = lower(trim(t.dest_country))
   AND sp.service_category = 'Study Visa'
  WHERE t.library_id IS NOT NULL
    AND t.dest_country IS NOT NULL
  ORDER BY t.client_id, length(sp.name) DESC NULLS LAST
)
UPDATE public.clients c
SET
  application_type = tom.new_type,
  pipeline_id = COALESCE(c.pipeline_id, tom.pipeline_id),
  current_stage_id = COALESCE(
    c.current_stage_id,
    CASE WHEN tom.pipeline_id IS NOT NULL THEN public._first_pipeline_stage(tom.pipeline_id) END
  ),
  interested_countries = CASE
    WHEN c.interested_countries IS NULL OR cardinality(c.interested_countries) = 0 THEN ARRAY[tom.dest_country]
    ELSE c.interested_countries
  END,
  updated_at = now()
FROM typed_orphans_matched tom
WHERE c.id = tom.client_id;

COMMENT ON FUNCTION public._canonical_study_library_id IS
  'Map destination country to canonical Study Visa service_library.id for orphan UUID backfill.';
COMMENT ON FUNCTION public._normalize_orphan_service_code IS
  'Rewrite legacy orphan library UUIDs to canonical service_library ids using ::Country suffix.';
