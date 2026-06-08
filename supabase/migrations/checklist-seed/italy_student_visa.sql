-- Italy – Student Visa (National D Visa) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000091'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('admission_from_recognised_italian_institution', 'Admission from recognised Italian institution', true, 1),
  ('admission_documentation_india_', 'admission documentation (India)', true, 2),
  ('proof_of_funds_or_financial_proof', 'Proof of funds or financial proof', true, 3),
  ('health_insurance_travel_statutory_', 'Health insurance (travel + statutory)', true, 4),
  ('motivation_letter_and_cv', 'Motivation letter and CV', true, 5),
  ('language_proficiency_as_required_', 'Language proficiency (as required)', true, 6),
  ('valid_passport', 'Valid passport', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000091'::uuid AND c.item_key = x.item_key
);
