-- USA – Green Card (Employment & Family) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000034'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('qualifying_eb_category_or_family_relationship', 'Qualifying EB category or family relationship', true, 1),
  ('employer_sponsorship_perm_eb_2_3', 'Employer sponsorship / PERM (EB-2/3)', true, 2),
  ('i_140_approved', 'I-140 approved', true, 3),
  ('priority_date_current_visa_bulletin', 'Priority date current (Visa Bulletin)', true, 4),
  ('i_485_or_consular_processing_eligible', 'I-485 or consular processing eligible', true, 5),
  ('medical_exam_completed', 'Medical exam completed', true, 6),
  ('no_serious_inadmissibility', 'No serious inadmissibility', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000034'::uuid AND c.item_key = x.item_key
);
