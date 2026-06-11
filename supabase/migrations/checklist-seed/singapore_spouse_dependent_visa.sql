-- Singapore – Dependant's Pass / LTVP (Spouse & Dependants) — 10 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000e9'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('valid_marriage_certificate_apostilled_translated', 'Valid marriage certificate (apostilled/translated)', true, 1),
  ('sponsor_legal_status_in_destination_country', 'Sponsor legal status in destination country', true, 2),
  ('proof_of_genuine_relationship', 'Proof of genuine relationship', true, 3),
  ('sponsor_adequate_income_and_housing', 'Sponsor adequate income and housing', true, 4),
  ('health_insurance_coverage', 'Health insurance coverage', true, 5),
  ('language_integration_requirements_if_applicable', 'Language/integration requirements (if applicable)', true, 6),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 7),
  ('client_approval_received', 'Client approval on final file', true, 8),
  ('quality_review_completed', 'Quality review sign-off', true, 9),
  ('submission_approved', 'Submission approved & lodged', true, 10)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000e9'::uuid AND c.item_key = x.item_key
);
