-- Extended legacy pipeline backfill (v2).
-- Covers plain application_type labels, VIS-* codes, and retired service_library UUIDs.
-- Run after 20260617141000_refine_clients_needing_pipeline_view.sql

-- Retired duplicate Canada student rows → canonical library id
UPDATE public.clients c
SET
  visa_services = ARRAY(
    SELECT
      CASE split_part(s, '::', 1)
        WHEN '7811e0d2-348a-45ea-80fd-7c073ca66a63' THEN
          'c35e6051-f40f-47bf-9cac-0a386c47a336::' || COALESCE(NULLIF(split_part(s, '::', 2), ''), 'Canada')
        WHEN 'c87706af-bd1e-4a33-a3dd-fab701c1ed3f' THEN
          'c35e6051-f40f-47bf-9cac-0a386c47a336::' || COALESCE(NULLIF(split_part(s, '::', 2), ''), 'Canada')
        ELSE s
      END
    FROM unnest(c.visa_services) AS s
  ),
  updated_at = now()
WHERE c.pipeline_id IS NULL
  AND c.visa_services IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM unnest(c.visa_services) AS s
    WHERE split_part(s, '::', 1) IN (
      '7811e0d2-348a-45ea-80fd-7c073ca66a63',
      'c87706af-bd1e-4a33-a3dd-fab701c1ed3f'
    )
  );

-- Normalize legacy VIS-* tokens in visa_services[] to libraryId::Country
WITH vis_canonical(code, dest_country, service_category, library_id) AS (
  VALUES
    ('VIS-CA-STUD', 'Canada', 'Study Visa', 'c35e6051-f40f-47bf-9cac-0a386c47a336'::uuid),
    ('VIS-CA-VISIT', 'Canada', 'Visitor Visa', 'b2000001-0001-4000-8000-000000000011'::uuid),
    ('VIS-CA-TOUR', 'Canada', 'Visitor Visa', 'b2000001-0001-4000-8000-000000000011'::uuid),
    ('VIS-CA-SUPER', 'Canada', 'Super Visa', 'b2000001-0001-4000-8000-000000000016'::uuid),
    ('VIS-CA-SPOUS', 'Canada', 'Spouse Visa', 'b2000001-0001-4000-8000-000000000012'::uuid),
    ('VIS-CA-STEXT', 'Canada', 'Study Permit Extension', 'b2000001-0001-4000-8000-000000000018'::uuid),
    ('VIS-CA-PGWP', 'Canada', 'PGWP Work Permit', 'b2000001-0001-4000-8000-000000000014'::uuid),
    ('VIS-CA-PR', 'Canada', 'Express Entry PR', 'b2000001-0001-4000-8000-000000000013'::uuid),
    ('VIS-UK-STUD', 'United Kingdom', 'Study Visa', 'b2000001-0001-4000-8000-000000000021'::uuid),
    ('VIS-DE-OPP', 'Germany', 'Opportunity Card Chancenkarte', 'b2000001-0001-4000-8000-000000000054'::uuid)
),
normalized AS (
  SELECT
    c.id AS client_id,
    ARRAY(
      SELECT COALESCE(
        vm.library_id::text || '::' || vm.dest_country,
        s
      )
      FROM unnest(c.visa_services) AS s
      LEFT JOIN vis_canonical vm ON vm.code = trim(s)
    ) AS new_services
  FROM public.clients c
  WHERE c.pipeline_id IS NULL
    AND c.visa_services IS NOT NULL
    AND cardinality(c.visa_services) > 0
    AND EXISTS (
      SELECT 1
      FROM unnest(c.visa_services) AS s
      JOIN vis_canonical vm ON vm.code = trim(s)
    )
)
UPDATE public.clients c
SET
  visa_services = n.new_services,
  updated_at = now()
FROM normalized n
WHERE c.id = n.client_id;

-- Resolve destination country for plain labels (residence vs destination)
CREATE OR REPLACE FUNCTION public._legacy_client_dest_country(
  _country text,
  _interested_countries text[],
  _application_type text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    NULLIF(trim(_interested_countries[1]), ''),
    CASE lower(trim(_country))
      WHEN 'canada' THEN 'Canada'
      WHEN 'united kingdom' THEN 'United Kingdom'
      WHEN 'germany' THEN 'Germany'
      WHEN 'australia' THEN 'Australia'
      WHEN 'united states' THEN 'United States'
      WHEN 'new zealand' THEN 'New Zealand'
      WHEN 'india' THEN
        CASE
          WHEN _application_type ILIKE '%uk%' OR _application_type ILIKE 'VIS-UK-%' THEN 'United Kingdom'
          WHEN _application_type ILIKE '%germany%' OR _application_type ILIKE 'VIS-DE-%' THEN 'Germany'
          WHEN _application_type ILIKE '%australia%' THEN 'Australia'
          ELSE 'Canada'
        END
      ELSE NULL
    END
  );
$$;

-- 1) VIS-* codes in visa_services[] or application_type
WITH vis_map(code, dest_country, service_category) AS (
  VALUES
    ('VIS-CA-STUD', 'Canada', 'Study Visa'),
    ('VIS-CA-VISIT', 'Canada', 'Visitor Visa'),
    ('VIS-CA-TOUR', 'Canada', 'Visitor Visa'),
    ('VIS-CA-SUPER', 'Canada', 'Super Visa'),
    ('VIS-CA-SPOUS', 'Canada', 'Spouse Visa'),
    ('VIS-CA-STEXT', 'Canada', 'Study Permit Extension'),
    ('VIS-CA-PGWP', 'Canada', 'PGWP Work Permit'),
    ('VIS-CA-PR', 'Canada', 'Express Entry PR'),
    ('VIS-UK-STUD', 'United Kingdom', 'Study Visa'),
    ('VIS-DE-OPP', 'Germany', 'Opportunity Card Chancenkarte')
),
vis_clients AS (
  SELECT
    c.id AS client_id,
    vm.dest_country,
    vm.service_category
  FROM public.clients c
  JOIN vis_map vm
    ON vm.code = trim(c.application_type)
    OR (
      c.visa_services IS NOT NULL
      AND cardinality(c.visa_services) > 0
      AND vm.code = trim(c.visa_services[1])
    )
  WHERE c.pipeline_id IS NULL
    AND c.application_type NOT ILIKE '%assessment%'
),
vis_matched AS (
  SELECT DISTINCT ON (vc.client_id)
    vc.client_id,
    sp.id AS pipeline_id,
    vc.dest_country
  FROM vis_clients vc
  JOIN public.stage_pipelines sp
    ON sp.is_active = true
   AND lower(trim(sp.country)) = lower(trim(vc.dest_country))
   AND lower(trim(sp.service_category)) = lower(trim(vc.service_category))
  ORDER BY vc.client_id, length(sp.name) DESC
)
UPDATE public.clients c
SET
  pipeline_id = vm.pipeline_id,
  current_stage_id = public._first_pipeline_stage(vm.pipeline_id),
  interested_countries = CASE
    WHEN c.interested_countries IS NULL OR cardinality(c.interested_countries) = 0 THEN ARRAY[vm.dest_country]
    ELSE c.interested_countries
  END,
  updated_at = now()
FROM vis_matched vm
WHERE c.id = vm.client_id;

-- 2) Plain application_type labels (no pipeline yet)
WITH label_map(application_type, dest_country, service_category) AS (
  VALUES
    ('Student Visa', NULL::text, 'Study Visa'),
    ('Spousal Sponsorship', NULL::text, 'Spouse Visa'),
    ('Super Visa', 'Canada', 'Super Visa'),
    ('Study Permit Extension', 'Canada', 'Study Permit Extension'),
    ('Post Study Work Permit', 'Canada', 'PGWP Work Permit'),
    ('Tourist Visa', NULL::text, 'Visitor Visa'),
    ('Canada PR Dependent', 'Canada', 'Spouse Dependent OWP')
),
plain_clients AS (
  SELECT
    c.id AS client_id,
    COALESCE(lm.dest_country, public._legacy_client_dest_country(c.country, c.interested_countries, c.application_type)) AS dest_country,
    lm.service_category
  FROM public.clients c
  JOIN label_map lm ON lower(trim(c.application_type)) = lower(trim(lm.application_type))
  WHERE c.pipeline_id IS NULL
    AND c.application_type NOT ILIKE '%assessment%'
    AND c.application_type NOT ILIKE 'VIS-%'
    AND c.application_type !~ '^[0-9a-f]{8}-'
),
plain_matched AS (
  SELECT DISTINCT ON (pc.client_id)
    pc.client_id,
    sp.id AS pipeline_id,
    pc.dest_country
  FROM plain_clients pc
  JOIN public.stage_pipelines sp
    ON sp.is_active = true
   AND lower(trim(sp.country)) = lower(trim(pc.dest_country))
   AND lower(trim(sp.service_category)) = lower(trim(pc.service_category))
  WHERE pc.dest_country IS NOT NULL
  ORDER BY pc.client_id, length(sp.name) DESC
)
UPDATE public.clients c
SET
  pipeline_id = pm.pipeline_id,
  current_stage_id = public._first_pipeline_stage(pm.pipeline_id),
  interested_countries = CASE
    WHEN c.interested_countries IS NULL OR cardinality(c.interested_countries) = 0 THEN ARRAY[pm.dest_country]
    ELSE c.interested_countries
  END,
  updated_at = now()
FROM plain_matched pm
WHERE c.id = pm.client_id;

-- 3) UUID visa_services[] — join service_library OR infer from code suffix / remap table
WITH uuid_remap(old_id, dest_country, service_category, new_library_id) AS (
  VALUES
    ('7811e0d2-348a-45ea-80fd-7c073ca66a63'::uuid, 'Canada', 'Study Visa', 'c35e6051-f40f-47bf-9cac-0a386c47a336'::uuid),
    ('c87706af-bd1e-4a33-a3dd-fab701c1ed3f'::uuid, 'Canada', 'Study Visa', 'c35e6051-f40f-47bf-9cac-0a386c47a336'::uuid)
),
uuid_clients AS (
  SELECT
    c.id AS client_id,
    COALESCE(
      NULLIF(split_part(c.visa_services[1], '::', 2), ''),
      ur.dest_country,
      public._legacy_client_dest_country(c.country, c.interested_countries, c.application_type)
    ) AS dest_country,
    COALESCE(
      CASE
        WHEN COALESCE(sl.academy_metadata->>'displayName', sl.sub_service, sl.service, '') ILIKE '%student%'
          OR COALESCE(sl.academy_metadata->>'displayName', sl.sub_service, sl.service, '') ILIKE '%study%'
          THEN 'Study Visa'
        WHEN COALESCE(sl.academy_metadata->>'displayName', sl.sub_service, sl.service, '') ILIKE '%visitor%'
          OR COALESCE(sl.academy_metadata->>'displayName', sl.sub_service, sl.service, '') ILIKE '%visit%'
          THEN 'Visitor Visa'
        WHEN COALESCE(sl.academy_metadata->>'displayName', sl.sub_service, sl.service, '') ILIKE '%spouse%'
          THEN 'Spouse Visa'
        WHEN COALESCE(sl.academy_metadata->>'displayName', sl.sub_service, sl.service, '') ILIKE '%super%'
          THEN 'Super Visa'
        WHEN COALESCE(sl.academy_metadata->>'displayName', sl.sub_service, sl.service, '') ILIKE '%extension%'
          THEN 'Study Permit Extension'
        WHEN COALESCE(sl.academy_metadata->>'displayName', sl.sub_service, sl.service, '') ILIKE '%pgwp%'
          OR COALESCE(sl.academy_metadata->>'displayName', sl.sub_service, sl.service, '') ILIKE '%post study%'
          THEN 'PGWP Work Permit'
        WHEN COALESCE(sl.academy_metadata->>'displayName', sl.sub_service, sl.service, '') ILIKE '%express%'
          THEN 'Express Entry PR'
        ELSE NULL
      END,
      ur.service_category
    ) AS service_category,
    COALESCE(ur.new_library_id, sl.id) AS library_id
  FROM public.clients c
  LEFT JOIN public.service_library sl
    ON sl.id = split_part(c.visa_services[1], '::', 1)::uuid
  LEFT JOIN uuid_remap ur
    ON ur.old_id = split_part(c.visa_services[1], '::', 1)::uuid
  WHERE c.pipeline_id IS NULL
    AND c.visa_services IS NOT NULL
    AND cardinality(c.visa_services) > 0
    AND c.visa_services[1] ~ '^[0-9a-f]{8}-'
    AND c.application_type NOT ILIKE '%assessment%'
),
uuid_matched AS (
  SELECT DISTINCT ON (uc.client_id)
    uc.client_id,
    sp.id AS pipeline_id,
    uc.dest_country,
    uc.library_id
  FROM uuid_clients uc
  JOIN public.stage_pipelines sp
    ON sp.is_active = true
   AND lower(trim(sp.country)) = lower(trim(uc.dest_country))
   AND lower(trim(sp.service_category)) = lower(trim(uc.service_category))
  WHERE uc.dest_country IS NOT NULL
    AND uc.service_category IS NOT NULL
  ORDER BY uc.client_id, length(sp.name) DESC
)
UPDATE public.clients c
SET
  pipeline_id = um.pipeline_id,
  current_stage_id = public._first_pipeline_stage(um.pipeline_id),
  visa_services = ARRAY[um.library_id::text || '::' || um.dest_country],
  interested_countries = CASE
    WHEN c.interested_countries IS NULL OR cardinality(c.interested_countries) = 0 THEN ARRAY[um.dest_country]
    ELSE c.interested_countries
  END,
  updated_at = now()
FROM uuid_matched um
WHERE c.id = um.client_id;

-- 4) application_type still stored as uuid::Country (label backfill + pipeline if missing)
WITH typed AS (
  SELECT
    c.id AS client_id,
    COALESCE(
      NULLIF(trim(sl.academy_metadata->>'displayName'), ''),
      CASE
        WHEN trim(sl.service) <> '' AND trim(sl.sub_service) <> ''
             AND lower(trim(sl.service)) <> lower(trim(sl.sub_service))
          THEN trim(sl.service) || ' – ' || trim(sl.sub_service)
        ELSE COALESCE(NULLIF(trim(sl.sub_service), ''), trim(sl.service))
      END
    ) AS new_type,
    COALESCE(
      NULLIF(split_part(c.application_type, '::', 2), ''),
      public._legacy_client_dest_country(c.country, c.interested_countries, c.application_type)
    ) AS dest_country,
    CASE
      WHEN COALESCE(sl.academy_metadata->>'displayName', sl.sub_service, sl.service, '') ILIKE '%student%'
        OR COALESCE(sl.academy_metadata->>'displayName', sl.sub_service, sl.service, '') ILIKE '%study%'
        THEN 'Study Visa'
      WHEN COALESCE(sl.academy_metadata->>'displayName', sl.sub_service, sl.service, '') ILIKE '%visitor%'
        THEN 'Visitor Visa'
      WHEN COALESCE(sl.academy_metadata->>'displayName', sl.sub_service, sl.service, '') ILIKE '%spouse%'
        THEN 'Spouse Visa'
      ELSE 'Study Visa'
    END AS service_category,
    sl.id AS library_id
  FROM public.clients c
  JOIN public.service_library sl
    ON sl.id = split_part(c.application_type, '::', 1)::uuid
  WHERE c.application_type ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(::.+)?$'
),
typed_matched AS (
  SELECT DISTINCT ON (t.client_id)
    t.client_id,
    t.new_type,
    t.dest_country,
    t.service_category,
    t.library_id,
    sp.id AS pipeline_id
  FROM typed t
  LEFT JOIN public.stage_pipelines sp
    ON sp.is_active = true
   AND lower(trim(sp.country)) = lower(trim(t.dest_country))
   AND lower(trim(sp.service_category)) = lower(trim(t.service_category))
  ORDER BY t.client_id, length(sp.name) DESC NULLS LAST
)
UPDATE public.clients c
SET
  application_type = tm.new_type,
  pipeline_id = COALESCE(c.pipeline_id, tm.pipeline_id),
  current_stage_id = COALESCE(
    c.current_stage_id,
    CASE WHEN tm.pipeline_id IS NOT NULL THEN public._first_pipeline_stage(tm.pipeline_id) END
  ),
  visa_services = CASE
    WHEN c.visa_services IS NULL OR cardinality(c.visa_services) = 0
      THEN ARRAY[tm.library_id::text || '::' || tm.dest_country]
    ELSE c.visa_services
  END,
  interested_countries = CASE
    WHEN c.interested_countries IS NULL OR cardinality(c.interested_countries) = 0 THEN ARRAY[tm.dest_country]
    ELSE c.interested_countries
  END,
  updated_at = now()
FROM typed_matched tm
WHERE c.id = tm.client_id;

-- 5) Backfill visa_services for plain-label clients now on a pipeline
UPDATE public.clients c
SET
  visa_services = ARRAY['c35e6051-f40f-47bf-9cac-0a386c47a336::Canada'],
  updated_at = now()
WHERE c.pipeline_id IS NOT NULL
  AND (c.visa_services IS NULL OR cardinality(c.visa_services) = 0)
  AND lower(trim(c.application_type)) = 'student visa'
  AND EXISTS (
    SELECT 1
    FROM public.stage_pipelines sp
    WHERE sp.id = c.pipeline_id
      AND lower(trim(sp.country)) = 'canada'
      AND sp.service_category = 'Study Visa'
  );

UPDATE public.clients c
SET
  visa_services = ARRAY['b2000001-0001-4000-8000-000000000012::Canada'],
  updated_at = now()
WHERE c.pipeline_id IS NOT NULL
  AND (c.visa_services IS NULL OR cardinality(c.visa_services) = 0)
  AND lower(trim(c.application_type)) = 'spousal sponsorship'
  AND EXISTS (
    SELECT 1
    FROM public.stage_pipelines sp
    WHERE sp.id = c.pipeline_id
      AND lower(trim(sp.country)) = 'canada'
      AND sp.service_category = 'Spouse Visa'
  );

UPDATE public.clients c
SET
  visa_services = ARRAY['b2000001-0001-4000-8000-000000000016::Canada'],
  updated_at = now()
WHERE c.pipeline_id IS NOT NULL
  AND (c.visa_services IS NULL OR cardinality(c.visa_services) = 0)
  AND lower(trim(c.application_type)) = 'super visa';

UPDATE public.clients c
SET
  visa_services = ARRAY['b2000001-0001-4000-8000-000000000018::Canada'],
  updated_at = now()
WHERE c.pipeline_id IS NOT NULL
  AND (c.visa_services IS NULL OR cardinality(c.visa_services) = 0)
  AND lower(trim(c.application_type)) = 'study permit extension';

UPDATE public.clients c
SET
  visa_services = ARRAY['b2000001-0001-4000-8000-000000000014::Canada'],
  updated_at = now()
WHERE c.pipeline_id IS NOT NULL
  AND (c.visa_services IS NULL OR cardinality(c.visa_services) = 0)
  AND lower(trim(c.application_type)) = 'post study work permit';

UPDATE public.clients c
SET
  visa_services = ARRAY['b2000001-0001-4000-8000-000000000011::Canada'],
  updated_at = now()
WHERE c.pipeline_id IS NOT NULL
  AND (c.visa_services IS NULL OR cardinality(c.visa_services) = 0)
  AND lower(trim(c.application_type)) = 'tourist visa';

COMMENT ON FUNCTION public._legacy_client_dest_country IS
  'Infer visa destination from residence country, interested_countries, or FLC defaults (India → Canada).';

-- Exclude assessment-only visa_services tokens from ops view (e.g. VIS-DE-ASSESS)
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
  AND c.application_type NOT ILIKE '%— assessment%'
  AND c.application_type NOT ILIKE '%eligibility assessment%'
  AND NOT (
    c.visa_services IS NOT NULL
    AND cardinality(c.visa_services) > 0
    AND (
      c.visa_services[1] ILIKE '%assess%'
      OR c.visa_services[1] ILIKE '%eligibility%'
    )
    AND c.application_type ILIKE '%student visa%'
  )
  AND (
    cardinality(COALESCE(c.visa_services, ARRAY[]::text[])) > 0
    OR (
      c.application_type IS NOT NULL
      AND trim(c.application_type) <> ''
      AND c.application_type NOT ILIKE '%assessment%'
    )
  );
