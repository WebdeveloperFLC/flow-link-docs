-- Canada – Visitor Visa (TRV) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000011'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('valid_passport_6_months_validity_recommended', 'Valid passport (6+ months validity recommended)', true, 1),
  ('proof_of_purpose_tourism_family_business', 'Proof of purpose (tourism / family / business)', true, 2),
  ('proof_of_funds_for_trip_duration', 'Proof of funds for trip duration', true, 3),
  ('strong_ties_to_home_country', 'Strong ties to home country', true, 4),
  ('biometrics_completed', 'Biometrics completed', true, 5),
  ('medical_exam_if_required', 'Medical exam (if required)', true, 6),
  ('no_prior_misrepresentation_or_serious_inadmissib', 'No prior misrepresentation or serious inadmissibility', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000011'::uuid AND c.item_key = x.item_key
);
