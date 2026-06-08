-- India 462 ballot eligibility correction (v2.1) — run after prior WHV seeds.

-- Remove duplicate keys from earlier migration runs
DELETE FROM public.service_library_submission_checklist
WHERE library_id = 'b2000001-0001-4000-8000-000000000046'::uuid
  AND item_key IN (
    'passport_from_eligible_working_holiday_country',
    'first_working_holiday_maker_whm_visa',
    '462_ballot_selection_if_india_china_or_vietnam_passport'
  );

INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000046'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('462_ballot_selection_if_india_china_vietnam', '462 ballot selection if India, China, or Vietnam passport', true, 2)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000046'::uuid AND c.item_key = x.item_key
);

-- Normalize sort order for canonical 13-item checklist
UPDATE public.service_library_submission_checklist AS sc
SET sort_order = v.sort_order, updated_at = now()
FROM (VALUES
  ('passport_from_eligible_whm_country', 1),
  ('462_ballot_selection_if_india_china_vietnam', 2),
  ('age_within_limit_at_application', 3),
  ('first_working_holiday_maker_visa', 4),
  ('sufficient_funds_aud_5_000', 5),
  ('adequate_health_insurance_for_stay', 6),
  ('health_character_requirements', 7),
  ('not_bringing_dependent_children', 8),
  ('genuine_intention_to_holiday_work_temporarily', 9),
  ('fees_collected', 10),
  ('client_approval_received', 11),
  ('quality_review_completed', 12),
  ('submission_approved', 13)
) AS v(item_key, sort_order)
WHERE sc.library_id = 'b2000001-0001-4000-8000-000000000046'::uuid
  AND sc.item_key = v.item_key;

SELECT
  sl.academy_metadata->>'version' AS version,
  sl.academy_metadata->'policyAlert'->>'summary' AS policy_summary,
  (SELECT count(*) FROM service_library_submission_checklist sc
     WHERE sc.library_id = sl.id AND sc.is_active) AS submission_items
FROM public.service_library sl
WHERE sl.id = 'b2000001-0001-4000-8000-000000000046'::uuid;
