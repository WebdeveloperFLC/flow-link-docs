-- India 462 ballot eligibility correction (v2.1) — run after prior WHV seeds.
-- Updates academy metadata + adds submission checklist item for 462 ballot countries.

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

-- Re-run full metadata seed (v2.1 — India subclass 462 + ballot)
-- Paste contents of 20260607231000_seed_australia_work_holiday_academy_metadata.sql here,
-- or run that file immediately before this block.

SELECT
  sl.academy_metadata->>'version' AS version,
  sl.academy_metadata->'policyAlert'->>'summary' AS policy_summary,
  (SELECT count(*) FROM service_library_submission_checklist sc
     WHERE sc.library_id = sl.id AND sc.is_active) AS submission_items
FROM public.service_library sl
WHERE sl.id = 'b2000001-0001-4000-8000-000000000046'::uuid;
