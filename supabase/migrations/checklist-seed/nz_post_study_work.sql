-- New Zealand – Post Study Work Visa — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000065'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('completed_eligible_nz_qualification', 'Completed eligible NZ qualification', true, 1),
  ('studied_in_nz_required_duration', 'Studied in NZ required duration', true, 2),
  ('applied_within_allowed_timeframe', 'Applied within allowed timeframe', true, 3),
  ('valid_passport', 'Valid passport', true, 4),
  ('good_character', 'Good character', true, 5),
  ('medical_if_required', 'Medical (if required)', true, 6),
  ('previous_post_study_work_visa_limits', 'Previous post-study work visa limits', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000065'::uuid AND c.item_key = x.item_key
);
