-- Quiz question counts for all canonical visa services (expect 75 each = 25 per level)
SELECT
  sl.id,
  COALESCE(sl.academy_metadata->>'displayName', sl.sub_service) AS service_name,
  jsonb_array_length(COALESCE(sl.academy_metadata->'quiz', '[]'::jsonb)) AS quiz_total,
  (
    SELECT COUNT(*)::int
    FROM jsonb_array_elements(COALESCE(sl.academy_metadata->'quiz', '[]'::jsonb)) q
    WHERE COALESCE((q->>'level')::int, 1) = 1
  ) AS level_1,
  (
    SELECT COUNT(*)::int
    FROM jsonb_array_elements(COALESCE(sl.academy_metadata->'quiz', '[]'::jsonb)) q
    WHERE COALESCE((q->>'level')::int, 1) = 2
  ) AS level_2,
  (
    SELECT COUNT(*)::int
    FROM jsonb_array_elements(COALESCE(sl.academy_metadata->'quiz', '[]'::jsonb)) q
    WHERE COALESCE((q->>'level')::int, 1) = 3
  ) AS level_3
FROM public.service_library sl
WHERE sl.service_category = 'visa_immigration'
  AND sl.is_active = true
  AND sl.academy_metadata ? 'displayName'
ORDER BY service_name;

-- Summary: how many services still need quiz expansion
SELECT
  COUNT(*) FILTER (WHERE jsonb_array_length(COALESCE(academy_metadata->'quiz', '[]'::jsonb)) >= 75) AS done_75,
  COUNT(*) FILTER (WHERE jsonb_array_length(COALESCE(academy_metadata->'quiz', '[]'::jsonb)) < 75) AS need_more,
  COUNT(*) AS total
FROM public.service_library
WHERE service_category = 'visa_immigration'
  AND is_active = true
  AND academy_metadata ? 'displayName';
