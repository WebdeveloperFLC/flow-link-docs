-- FAQ counts after applying faq-seed/*.sql (expect 30 each)
SELECT
  id,
  academy_metadata->>'displayName' AS service_name,
  jsonb_array_length(COALESCE(academy_metadata->'faqs', '[]'::jsonb)) AS faq_count
FROM service_library
WHERE service_category = 'visa_immigration'
  AND is_active = true
  AND academy_metadata ? 'displayName'
ORDER BY faq_count ASC, service_name;

SELECT
  COUNT(*) FILTER (WHERE jsonb_array_length(COALESCE(academy_metadata->'faqs', '[]'::jsonb)) >= 30) AS done_30,
  COUNT(*) FILTER (WHERE jsonb_array_length(COALESCE(academy_metadata->'faqs', '[]'::jsonb)) < 30) AS need_more,
  COUNT(*) AS total
FROM service_library
WHERE service_category = 'visa_immigration'
  AND is_active = true
  AND academy_metadata ? 'displayName';
