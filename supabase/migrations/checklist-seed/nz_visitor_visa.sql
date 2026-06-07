-- New Zealand – Visitor Visa — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000062'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('valid_passport', 'Valid passport', true, 1),
  ('clear_visit_purpose', 'Clear visit purpose', true, 2),
  ('proof_of_funds', 'Proof of funds', true, 3),
  ('strong_ties_to_india', 'Strong ties to India', true, 4),
  ('onward_return_travel_plans', 'Onward/return travel plans', true, 5),
  ('health_character_requirements', 'Health/character requirements', true, 6),
  ('immigration_history_disclosed', 'Immigration history disclosed', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000062'::uuid AND c.item_key = x.item_key
);
