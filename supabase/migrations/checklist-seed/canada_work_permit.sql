-- Canada – Work Permit (LMIA & LMIA-Exempt) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000015'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('valid_job_offer_contract', 'Valid job offer / contract', true, 1),
  ('lmia_positive_or_exempt_category_confirmed', 'LMIA positive or exempt category confirmed', true, 2),
  ('qualifying_work_experience_education', 'Qualifying work experience/education', true, 3),
  ('medical_exam_if_required', 'Medical exam (if required)', true, 4),
  ('biometrics_completed', 'Biometrics completed', true, 5),
  ('no_criminal_inadmissibility', 'No criminal inadmissibility', true, 6),
  ('employer_compliance_history', 'Employer compliance history', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000015'::uuid AND c.item_key = x.item_key
);
