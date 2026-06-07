-- Find Canada rows missing full quiz (run in Supabase SQL Editor)

SELECT id,
       sub_service,
       COALESCE(jsonb_array_length(academy_metadata->'quiz'), 0) AS quiz_count
FROM service_library
WHERE service = 'Canada'
  AND is_active = true
ORDER BY quiz_count, sub_service;

-- Expected: 11 rows with quiz_count = 75
-- Usually missing: Student Visa + Visitor TRV (largest SQL files)
