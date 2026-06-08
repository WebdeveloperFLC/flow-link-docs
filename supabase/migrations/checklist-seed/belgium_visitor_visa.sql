-- Belgium – Schengen Visitor Visa (Type C) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000b0'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('valid_passport_3_months_beyond_stay_', 'Valid passport (3+ months beyond stay)', true, 1),
  ('travel_medical_insurance_30_000_', 'Travel medical insurance €30,000+', true, 2),
  ('proof_of_accommodation_and_itinerary', 'Proof of accommodation and itinerary', true, 3),
  ('proof_of_funds', 'Proof of funds', true, 4),
  ('strong_ties_to_india', 'Strong ties to India', true, 5),
  ('cover_letter_explaining_purpose', 'Cover letter explaining purpose', true, 6),
  ('biometrics_if_not_in_vis_', 'Biometrics (if not in VIS)', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000b0'::uuid AND c.item_key = x.item_key
);
