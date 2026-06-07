-- Australia – Student Visa (Subclass 500) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000041'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('coe_from_cricos_provider', 'CoE from CRICOS provider', true, 1),
  ('genuine_student_gs_requirement', 'Genuine Student (GS) requirement', true, 2),
  ('financial_capacity', 'Financial capacity', true, 3),
  ('english_proficiency', 'English proficiency', true, 4),
  ('oshc_for_study_duration', 'OSHC for study duration', true, 5),
  ('health_exam_if_required', 'Health exam (if required)', true, 6),
  ('police_certificates_if_required', 'Police certificates (if required)', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000041'::uuid AND c.item_key = x.item_key
);
