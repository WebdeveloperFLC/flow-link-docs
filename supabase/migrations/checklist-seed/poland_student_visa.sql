-- Poland – Student Visa (National D + Residence for Studies) — 10 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000dc'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('admission_from_recognised_poland_institution', 'Admission from recognised Poland institution', true, 1),
  ('proof_of_funds_for_study_period', 'Proof of funds for study period', true, 2),
  ('health_insurance_travel_statutory', 'Health insurance (travel + statutory)', true, 3),
  ('motivation_letter_and_cv', 'Motivation letter and CV', true, 4),
  ('language_proficiency_as_required', 'Language proficiency (as required)', true, 5),
  ('valid_passport', 'Valid passport', true, 6),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 7),
  ('client_approval_received', 'Client approval on final file', true, 8),
  ('quality_review_completed', 'Quality review sign-off', true, 9),
  ('submission_approved', 'Submission approved & lodged', true, 10)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000dc'::uuid AND c.item_key = x.item_key
);
