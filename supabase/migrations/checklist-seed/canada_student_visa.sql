-- Canada – Student Visa (Study Permit — Outside Canada) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'c35e6051-f40f-47bf-9cac-0a386c47a336'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('letter_of_acceptance_loa_from_dli', 'Letter of acceptance (LOA) from DLI', true, 1),
  ('proof_of_financial_support_tuition_living', 'Proof of financial support (tuition + living)', true, 2),
  ('language_proficiency_sds', 'Language proficiency (SDS)', true, 3),
  ('biometrics_completed', 'Biometrics completed', true, 4),
  ('medical_exam_if_required', 'Medical exam (if required)', true, 5),
  ('no_criminal_immigration_misrepresentation', 'No criminal / immigration misrepresentation', true, 6),
  ('genuine_student_ties_to_home_country', 'Genuine student / ties to home country', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'c35e6051-f40f-47bf-9cac-0a386c47a336'::uuid AND c.item_key = x.item_key
);
