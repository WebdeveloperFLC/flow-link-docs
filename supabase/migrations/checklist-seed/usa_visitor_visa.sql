-- USA – Visitor Visa (B1/B2) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000032'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('valid_passport', 'Valid passport', true, 1),
  ('clear_temporary_purpose', 'Clear temporary purpose', true, 2),
  ('strong_ties_to_india', 'Strong ties to India', true, 3),
  ('proof_of_funds_for_trip', 'Proof of funds for trip', true, 4),
  ('ds_160_completed_accurately', 'DS-160 completed accurately', true, 5),
  ('no_prior_visa_fraud', 'No prior visa fraud', true, 6),
  ('interview_appointment_booked', 'Interview appointment booked', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000032'::uuid AND c.item_key = x.item_key
);
