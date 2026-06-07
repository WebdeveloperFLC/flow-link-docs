-- Canada – Post-Graduation Work Permit (PGWP) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000014'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('graduated_from_eligible_dli_program', 'Graduated from eligible DLI program', true, 1),
  ('valid_study_permit_at_completion', 'Valid study permit at completion', true, 2),
  ('completion_letter_transcript', 'Completion letter / transcript', true, 3),
  ('applied_within_180_days_of_completion', 'Applied within 180 days of completion', true, 4),
  ('full_time_student_status_maintained', 'Full-time student status maintained', true, 5),
  ('passport_valid_through_desired_pgwp_period', 'Passport valid through desired PGWP period', true, 6),
  ('not_previously_received_pgwp', 'Not previously received PGWP', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000014'::uuid AND c.item_key = x.item_key
);
