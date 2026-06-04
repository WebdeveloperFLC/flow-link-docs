-- Run in Supabase SQL Editor → export as CSV/JSON for Claude content generation.
-- One row per service_library master; use library_id in each JSON file / bulk upload.

SELECT
  sl.id AS library_id,
  sl.service_category,
  sl.service,
  sl.sub_service,
  sl.is_active,
  COALESCE(
    (SELECT json_agg(c.country ORDER BY c.country)
     FROM public.service_library_countries c
     WHERE c.library_id = sl.id),
    '[]'::json
  ) AS countries,
  CASE
    WHEN sl.academy_metadata IS NULL OR sl.academy_metadata = '{}'::jsonb THEN 'empty'
    ELSE 'has_content'
  END AS metadata_status,
  sl.academy_metadata->>'displayName' AS current_display_name
FROM public.service_library sl
WHERE sl.is_active = true
ORDER BY sl.service_category, sl.service, sl.sub_service;
