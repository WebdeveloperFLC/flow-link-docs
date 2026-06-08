-- Ireland – Stamp 2 Student Permission — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000a3'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('cas_from_licensed_ireland_sponsor', 'CAS from licensed Ireland sponsor', true, 1),
  ('financial_requirement_met_28_day_rule_', 'Financial requirement met (28-day rule)', true, 2),
  ('english_language_at_selt_level_if_required_', 'English language at SELT level (if required)', true, 3),
  ('tb_test_certificate_if_applicable_', 'TB test certificate (if applicable)', true, 4),
  ('atas_certificate_if_course_requires_', 'ATAS certificate (if course requires)', true, 5),
  ('genuine_student_credible_study_plan', 'Genuine student / credible study plan', true, 6),
  ('immigration_history_disclosed', 'Immigration history disclosed', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000a3'::uuid AND c.item_key = x.item_key
);
