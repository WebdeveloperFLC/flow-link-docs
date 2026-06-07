-- Canada – Study Permit Extension — 13 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000018'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('client_is_physically_in_canada', 'Client is physically in Canada', true, 1),
  ('current_study_permit_is_valid_or_client_is_withi', 'Current study permit is valid or client is within restoration period', true, 2),
  ('continues_at_a_dli_or_has_valid_new_loa_from_dli', 'Continues at a DLI or has valid new LOA from DLI', true, 3),
  ('proof_of_enrolment_or_transcript_shows_active_st', 'Proof of enrolment or transcript shows active study progress', true, 4),
  ('proof_of_funds_covers_tuition_living_costs_and_r', 'Proof of funds covers tuition, living costs, and return transport', true, 5),
  ('passport_valid_beyond_requested_extension_period', 'Passport valid beyond requested extension period', true, 6),
  ('no_unauthorized_work_or_study_history', 'No unauthorized work or study history', true, 7),
  ('medical_exam_completed_if_ircc_profile_requires_', 'Medical exam completed if IRCC profile requires it', true, 8),
  ('academic_gaps_program_changes_or_delayed_complet', 'Academic gaps, program changes, or delayed completion explained', true, 9),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 10),
  ('client_approval_received', 'Client approval on final file', true, 11),
  ('quality_review_completed', 'Quality review sign-off', true, 12),
  ('submission_approved', 'Submission approved & lodged', true, 13)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000018'::uuid AND c.item_key = x.item_key
);
