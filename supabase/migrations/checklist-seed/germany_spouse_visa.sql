-- Germany – Spouse / Family Reunion Visa — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000053'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('legally_valid_marriage_recognised_in_germany', 'Legally valid marriage recognised in Germany', true, 1),
  ('sponsor_is_german_citizen_or_qualifying_resident', 'Sponsor is German citizen or qualifying resident', true, 2),
  ('adequate_housing_in_germany', 'Adequate housing in Germany', true, 3),
  ('sponsor_income_solvency', 'Sponsor income/solvency', true, 4),
  ('german_a1_certificate_if_required', 'German A1 certificate (if required)', true, 5),
  ('genuine_relationship_evidence', 'Genuine relationship evidence', true, 6),
  ('health_insurance_arrangement', 'Health insurance arrangement', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000053'::uuid AND c.item_key = x.item_key
);
