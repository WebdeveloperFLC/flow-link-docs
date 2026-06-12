-- CEE + Singapore go-live verification queries (read-only).
-- Run after 20260617165000_expand_service_pipeline_stages.sql

-- 1) All 16 CEE/Singapore service_library rows
SELECT 'cee_services' AS check_name, COUNT(*) AS cnt
FROM service_library
WHERE id >= 'b2000001-0001-4000-8000-0000000000dc'
  AND id <= 'b2000001-0001-4000-8000-0000000000eb';

-- 2) CEE/Singapore pipelines exist
SELECT 'cee_pipelines' AS check_name, COUNT(*) AS cnt
FROM stage_pipelines
WHERE country IN ('Poland', 'Hungary', 'Latvia', 'Singapore', 'Finland')
  AND is_active = true
  AND (
    service_category ILIKE '%Student%'
    OR service_category ILIKE '%Visitor%'
    OR service_category ILIKE '%Spouse%'
    OR service_category ILIKE '%Family%'
    OR service_category ILIKE '%Blue Card%'
    OR service_category ILIKE '%Employment%'
    OR service_category ILIKE '%Work%'
    OR service_category ILIKE '%Dependant%'
  );

-- 3) Stage counts by template (should match: study=12, visitor=10, work/spouse/pr=11)
SELECT
  public._pipeline_stage_template(sp.service_category) AS template,
  COUNT(DISTINCT sp.id) AS pipelines,
  MIN(stage_counts.cnt) AS min_stages,
  MAX(stage_counts.cnt) AS max_stages
FROM stage_pipelines sp
JOIN (
  SELECT pipeline_id, COUNT(*) AS cnt
  FROM pipeline_stages
  GROUP BY pipeline_id
) stage_counts ON stage_counts.pipeline_id = sp.id
WHERE sp.is_active = true
  AND sp.country IN ('Poland', 'Hungary', 'Latvia', 'Singapore', 'Finland')
GROUP BY template
ORDER BY template;
