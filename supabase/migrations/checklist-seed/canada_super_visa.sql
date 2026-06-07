-- Canada – Super Visa (Parents & Grandparents) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000016'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('child_grandchild_is_canadian_citizen_or_pr', 'Child/grandchild is Canadian citizen or PR', true, 1),
  ('sponsor_meets_lico_minimum_income', 'Sponsor meets LICO minimum income', true, 2),
  ('medical_exam_completed', 'Medical exam completed', true, 3),
  ('canadian_medical_insurance_arranged', 'Canadian medical insurance arranged', true, 4),
  ('invitation_letter_from_child_grandchild', 'Invitation letter from child/grandchild', true, 5),
  ('biometrics_completed', 'Biometrics completed', true, 6),
  ('ties_to_home_country_india', 'Ties to home country (India)', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000016'::uuid AND c.item_key = x.item_key
);
