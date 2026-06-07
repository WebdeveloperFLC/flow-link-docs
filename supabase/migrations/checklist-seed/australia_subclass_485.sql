-- Australia – Temporary Graduate Visa (Subclass 485) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000045'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('completed_eligible_australian_qualification', 'Completed eligible Australian qualification', true, 1),
  ('applied_within_6_months_of_completion', 'Applied within 6 months of completion', true, 2),
  ('valid_student_visa_compliance_history', 'Valid student visa compliance history', true, 3),
  ('competent_english', 'Competent English', true, 4),
  ('health_insurance_if_required', 'Health insurance (if required)', true, 5),
  ('skills_assessment_graduate_work_stream', 'Skills assessment (Graduate Work Stream)', true, 6),
  ('health_and_character_clearances', 'Health and character clearances', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000045'::uuid AND c.item_key = x.item_key
);
