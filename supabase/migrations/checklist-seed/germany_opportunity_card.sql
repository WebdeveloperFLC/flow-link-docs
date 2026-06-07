-- Germany – Opportunity Card (Chancenkarte) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000054'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('minimum_6_points_achieved', 'Minimum 6 points achieved', true, 1),
  ('recognised_degree_or_it_experience_pathway', 'Recognised degree or IT experience pathway', true, 2),
  ('german_a1_or_english_b2', 'German A1 or English B2', true, 3),
  ('blocked_account_or_job_offer', 'Blocked account or job offer', true, 4),
  ('qualification_recognition_if_claiming_points', 'Qualification recognition (if claiming points)', true, 5),
  ('valid_passport', 'Valid passport', true, 6),
  ('health_insurance', 'Health insurance', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000054'::uuid AND c.item_key = x.item_key
);
