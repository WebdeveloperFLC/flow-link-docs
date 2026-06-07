-- Diagnose branded checklist files (canonical visa services only)
-- Expect: current_files = 1 for all 36 rows below.

WITH canonical AS (
  SELECT unnest(ARRAY[
    'c35e6051-f40f-47bf-9cac-0a386c47a336'::uuid,
    'b2000001-0001-4000-8000-000000000011'::uuid,
    'b2000001-0001-4000-8000-000000000012'::uuid,
    'b2000001-0001-4000-8000-000000000013'::uuid,
    'b2000001-0001-4000-8000-000000000014'::uuid,
    'b2000001-0001-4000-8000-000000000015'::uuid,
    'b2000001-0001-4000-8000-000000000016'::uuid,
    'b2000001-0001-4000-8000-000000000017'::uuid,
    'b2000001-0001-4000-8000-000000000018'::uuid,
    'b2000001-0001-4000-8000-000000000019'::uuid,
    'b2000001-0001-4000-8000-00000000001a'::uuid,
    'b2000001-0001-4000-8000-00000000001b'::uuid,
    'b2000001-0001-4000-8000-000000000021'::uuid,
    'b2000001-0001-4000-8000-000000000022'::uuid,
    'b2000001-0001-4000-8000-000000000023'::uuid,
    'b2000001-0001-4000-8000-000000000024'::uuid,
    'b2000001-0001-4000-8000-000000000025'::uuid,
    'b2000001-0001-4000-8000-000000000031'::uuid,
    'b2000001-0001-4000-8000-000000000032'::uuid,
    'b2000001-0001-4000-8000-000000000033'::uuid,
    'b2000001-0001-4000-8000-000000000034'::uuid,
    'b2000001-0001-4000-8000-000000000041'::uuid,
    'b2000001-0001-4000-8000-000000000042'::uuid,
    'b2000001-0001-4000-8000-000000000043'::uuid,
    'b2000001-0001-4000-8000-000000000044'::uuid,
    'b2000001-0001-4000-8000-000000000045'::uuid,
    'b2000001-0001-4000-8000-000000000051'::uuid,
    'b2000001-0001-4000-8000-000000000052'::uuid,
    'b2000001-0001-4000-8000-000000000053'::uuid,
    'b2000001-0001-4000-8000-000000000054'::uuid,
    'b2000001-0001-4000-8000-000000000055'::uuid,
    'b2000001-0001-4000-8000-000000000061'::uuid,
    'b2000001-0001-4000-8000-000000000062'::uuid,
    'b2000001-0001-4000-8000-000000000063'::uuid,
    'b2000001-0001-4000-8000-000000000064'::uuid,
    'b2000001-0001-4000-8000-000000000065'::uuid
  ]) AS id
)
SELECT
  sl.sub_service,
  sl.id AS library_id,
  COUNT(cf.id) FILTER (WHERE cf.is_current) AS current_files,
  MAX(cf.file_path) FILTER (WHERE cf.is_current) AS checklist_path,
  MAX(cf.uploaded_at) FILTER (WHERE cf.is_current) AS last_upload
FROM canonical c
JOIN public.service_library sl ON sl.id = c.id
LEFT JOIN public.service_library_checklist_files cf ON cf.library_id = sl.id
GROUP BY sl.id, sl.sub_service
ORDER BY current_files ASC, sl.sub_service;

-- Summary only (run this block separately if needed — CTE does not carry across statements)
WITH canonical AS (
  SELECT unnest(ARRAY[
    'c35e6051-f40f-47bf-9cac-0a386c47a336'::uuid,
    'b2000001-0001-4000-8000-000000000011'::uuid,
    'b2000001-0001-4000-8000-000000000012'::uuid,
    'b2000001-0001-4000-8000-000000000013'::uuid,
    'b2000001-0001-4000-8000-000000000014'::uuid,
    'b2000001-0001-4000-8000-000000000015'::uuid,
    'b2000001-0001-4000-8000-000000000016'::uuid,
    'b2000001-0001-4000-8000-000000000017'::uuid,
    'b2000001-0001-4000-8000-000000000018'::uuid,
    'b2000001-0001-4000-8000-000000000019'::uuid,
    'b2000001-0001-4000-8000-00000000001a'::uuid,
    'b2000001-0001-4000-8000-00000000001b'::uuid,
    'b2000001-0001-4000-8000-000000000021'::uuid,
    'b2000001-0001-4000-8000-000000000022'::uuid,
    'b2000001-0001-4000-8000-000000000023'::uuid,
    'b2000001-0001-4000-8000-000000000024'::uuid,
    'b2000001-0001-4000-8000-000000000025'::uuid,
    'b2000001-0001-4000-8000-000000000031'::uuid,
    'b2000001-0001-4000-8000-000000000032'::uuid,
    'b2000001-0001-4000-8000-000000000033'::uuid,
    'b2000001-0001-4000-8000-000000000034'::uuid,
    'b2000001-0001-4000-8000-000000000041'::uuid,
    'b2000001-0001-4000-8000-000000000042'::uuid,
    'b2000001-0001-4000-8000-000000000043'::uuid,
    'b2000001-0001-4000-8000-000000000044'::uuid,
    'b2000001-0001-4000-8000-000000000045'::uuid,
    'b2000001-0001-4000-8000-000000000051'::uuid,
    'b2000001-0001-4000-8000-000000000052'::uuid,
    'b2000001-0001-4000-8000-000000000053'::uuid,
    'b2000001-0001-4000-8000-000000000054'::uuid,
    'b2000001-0001-4000-8000-000000000055'::uuid,
    'b2000001-0001-4000-8000-000000000061'::uuid,
    'b2000001-0001-4000-8000-000000000062'::uuid,
    'b2000001-0001-4000-8000-000000000063'::uuid,
    'b2000001-0001-4000-8000-000000000064'::uuid,
    'b2000001-0001-4000-8000-000000000065'::uuid
  ]) AS id
),
per_service AS (
  SELECT sl.id, COUNT(cf.id) FILTER (WHERE cf.is_current) AS current_files
  FROM canonical c
  JOIN public.service_library sl ON sl.id = c.id
  LEFT JOIN public.service_library_checklist_files cf ON cf.library_id = sl.id
  GROUP BY sl.id
)
SELECT
  COUNT(*) FILTER (WHERE current_files >= 1) AS done_36,
  COUNT(*) AS total_canonical
FROM per_service;

-- Optional: legacy duplicate rows (safe to ignore — not used in Service Academy nav)
-- SELECT sl.id, sl.service, sl.sub_service, sl.is_active
-- FROM public.service_library sl
-- WHERE sl.service_category = 'visa_immigration'
--   AND sl.is_active = true
--   AND sl.id NOT IN (SELECT id FROM canonical);
