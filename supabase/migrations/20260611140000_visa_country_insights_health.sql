-- Extend visa content health check with Country & costs (working rights + full cost breakdown)
-- Must DROP first: CREATE OR REPLACE cannot insert columns before existing ones (42P16).

DROP VIEW IF EXISTS public.v_visa_content_health;

CREATE VIEW public.v_visa_content_health AS
WITH settle_abroad AS (
  SELECT unnest(ARRAY[
    'b2000001-0001-4000-8000-000000000011'::uuid,
    'b2000001-0001-4000-8000-000000000012'::uuid,
    'b2000001-0001-4000-8000-000000000013'::uuid,
    'b2000001-0001-4000-8000-000000000014'::uuid,
    'b2000001-0001-4000-8000-000000000015'::uuid,
    'b2000001-0001-4000-8000-000000000016'::uuid,
    'b2000001-0001-4000-8000-000000000051'::uuid,
    'b2000001-0001-4000-8000-000000000052'::uuid,
    'b2000001-0001-4000-8000-000000000053'::uuid,
    'b2000001-0001-4000-8000-000000000054'::uuid,
    'b2000001-0001-4000-8000-000000000055'::uuid,
    'b2000001-0001-4000-8000-000000000056'::uuid,
    'b2000001-0001-4000-8000-000000000057'::uuid,
    'b2000001-0001-4000-8000-000000000058'::uuid
  ]) AS library_id
),
canonical AS (
  SELECT sl.id
  FROM public.service_library sl
  WHERE sl.service_category = 'visa_immigration'
    AND sl.is_active
    AND (
      sl.id::text ~ '^b2000001-0001-4000-8000-'
      OR sl.id = 'c35e6051-f40f-47bf-9cac-0a386c47a336'::uuid
    )
),
quiz_counts AS (
  SELECT
    sl.id,
    COALESCE(sl.academy_metadata->>'displayName', sl.sub_service) AS service_name,
    jsonb_array_length(COALESCE(sl.academy_metadata->'quiz', '[]'::jsonb)) AS quiz_total,
    (
      SELECT COUNT(*)::int FROM jsonb_array_elements(COALESCE(sl.academy_metadata->'quiz', '[]'::jsonb)) q
      WHERE COALESCE((q->>'level')::int, 1) = 1
    ) AS quiz_l1,
    (
      SELECT COUNT(*)::int FROM jsonb_array_elements(COALESCE(sl.academy_metadata->'quiz', '[]'::jsonb)) q
      WHERE COALESCE((q->>'level')::int, 1) = 2
    ) AS quiz_l2,
    (
      SELECT COUNT(*)::int FROM jsonb_array_elements(COALESCE(sl.academy_metadata->'quiz', '[]'::jsonb)) q
      WHERE COALESCE((q->>'level')::int, 1) = 3
    ) AS quiz_l3,
    jsonb_array_length(COALESCE(sl.academy_metadata->'redFlags', '[]'::jsonb)) AS red_flags,
    jsonb_array_length(COALESCE(sl.academy_metadata->'faqs', '[]'::jsonb)) AS faqs,
    EXISTS (SELECT 1 FROM settle_abroad sa WHERE sa.library_id = sl.id) AS uses_settle_abroad,
    (
      SELECT COUNT(*)::int FROM public.service_eligibility_questions q
      WHERE q.library_id = sl.id AND q.is_active
    ) AS eligibility_questions,
    (sl.academy_metadata->'workingRights'->'applicant'->>'summary') IS NOT NULL AS has_applicant_rights,
    (sl.academy_metadata->'workingRights'->'spouse'->>'summary') IS NOT NULL AS has_spouse_rights,
    jsonb_array_length(
      COALESCE(sl.academy_metadata->'fullCostBreakdown'->'sections', '[]'::jsonb)
    ) AS cost_breakdown_sections
  FROM public.service_library sl
  INNER JOIN canonical c ON c.id = sl.id
)
SELECT
  id,
  service_name,
  quiz_total,
  quiz_l1,
  quiz_l2,
  quiz_l3,
  red_flags,
  faqs,
  eligibility_questions,
  uses_settle_abroad,
  has_applicant_rights,
  has_spouse_rights,
  cost_breakdown_sections,
  CASE
    WHEN quiz_total < 75 OR quiz_l1 < 25 OR quiz_l2 < 25 OR quiz_l3 < 25 THEN 'quiz_incomplete'
    WHEN red_flags < 5 THEN 'red_flags_low'
    WHEN faqs < 30 THEN 'faqs_low'
    WHEN NOT uses_settle_abroad AND eligibility_questions < 8 THEN 'eligibility_missing'
    WHEN NOT has_applicant_rights OR NOT has_spouse_rights THEN 'working_rights_missing'
    WHEN cost_breakdown_sections < 4 THEN 'cost_breakdown_missing'
    ELSE 'ok'
  END AS status
FROM quiz_counts
ORDER BY status DESC, service_name;

COMMENT ON VIEW public.v_visa_content_health IS
  'Canonical visa services only. Filter WHERE status <> ''ok''. Includes working_rights and cost_breakdown checks.';
