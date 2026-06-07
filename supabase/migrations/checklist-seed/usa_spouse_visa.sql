-- USA – Spouse / Fiancé Visa (K-1 / CR-1 / IR-1) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000033'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('us_citizen_petitioner_not_green_card_holder_for_', 'US citizen petitioner (not green card holder for K-1)', true, 1),
  ('legally_valid_marriage_or_qualifying_engagement', 'Legally valid marriage or qualifying engagement', true, 2),
  ('genuine_relationship_evidence', 'Genuine relationship evidence', true, 3),
  ('i_864_affidavit_of_support', 'I-864 affidavit of support', true, 4),
  ('civil_documents_birth_marriage_police', 'Civil documents (birth, marriage, police)', true, 5),
  ('medical_exam_by_panel_physician', 'Medical exam by panel physician', true, 6),
  ('ds_260_and_embassy_interview', 'DS-260 and embassy interview', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000033'::uuid AND c.item_key = x.item_key
);
