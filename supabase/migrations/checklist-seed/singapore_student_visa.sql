-- Singapore – Student's Pass (STP) — 9 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000e7'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('admission_from_ica_recognised_institution', 'Admission from ICA-recognised institution', true, 1),
  ('solar_application_submitted_by_institution', 'SOLAR application submitted by institution', true, 2),
  ('financial_proof_per_institution_guidelines', 'Financial proof per institution guidelines', true, 3),
  ('medical_examination_if_required', 'Medical examination (if required)', true, 4),
  ('valid_passport_6_months', 'Valid passport 6+ months', true, 5),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 6),
  ('client_approval_received', 'Client approval on final file', true, 7),
  ('quality_review_completed', 'Quality review sign-off', true, 8),
  ('submission_approved', 'Submission approved & lodged', true, 9)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000e7'::uuid AND c.item_key = x.item_key
);
