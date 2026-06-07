-- Submission checklist item counts (expect >= 10 per active visa service)
SELECT
  sl.id,
  sl.academy_metadata->>'displayName' AS service_name,
  (SELECT count(*) FROM service_library_submission_checklist c
     WHERE c.library_id = sl.id AND c.is_active = true) AS checklist_items
FROM service_library sl
WHERE sl.service_category = 'visa_immigration'
  AND sl.is_active = true
  AND sl.academy_metadata ? 'displayName'
ORDER BY checklist_items ASC, service_name;

SELECT
  COUNT(*) FILTER (WHERE sub.cnt >= 10) AS done_10plus,
  COUNT(*) FILTER (WHERE sub.cnt < 10) AS need_more,
  COUNT(*) AS total,
  MIN(sub.cnt) AS min_items,
  MAX(sub.cnt) AS max_items
FROM (
  SELECT sl.id,
    (SELECT count(*) FROM service_library_submission_checklist c
       WHERE c.library_id = sl.id AND c.is_active = true) AS cnt
  FROM service_library sl
  WHERE sl.service_category = 'visa_immigration'
    AND sl.is_active = true
    AND sl.academy_metadata ? 'displayName'
) sub;
