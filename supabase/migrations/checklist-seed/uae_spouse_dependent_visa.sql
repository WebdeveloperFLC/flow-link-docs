-- United Arab Emirates – Spouse / Dependent Visa — 10 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000d8'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('sponsor_holds_valid_uae_residence_visa', 'Sponsor holds valid UAE residence visa', true, 1),
  ('sponsor_salary_meets_minimum_aed_4_000_typical', 'Sponsor salary meets minimum (AED 4,000+ typical)', true, 2),
  ('ejari_registered_accommodation', 'Ejari-registered accommodation', true, 3),
  ('attested_marriage_certificate_mofa_uae', 'Attested marriage certificate (MOFA UAE)', true, 4),
  ('dependent_passport_6_months_valid', 'Dependent passport 6+ months valid', true, 5),
  ('relationship_proof_genuine_and_documented', 'Relationship proof genuine and documented', true, 6),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 7),
  ('client_approval_received', 'Client approval on final file', true, 8),
  ('quality_review_completed', 'Quality review sign-off', true, 9),
  ('submission_approved', 'Submission approved & lodged', true, 10)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000d8'::uuid AND c.item_key = x.item_key
);
