-- USA – Student Visa (F-1) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000031'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('form_i_20_from_sevp_certified_school', 'Form I-20 from SEVP-certified school', true, 1),
  ('sevis_i_901_fee_paid', 'SEVIS I-901 fee paid', true, 2),
  ('ds_160_completed_accurately', 'DS-160 completed accurately', true, 3),
  ('proof_of_financial_support', 'Proof of financial support', true, 4),
  ('english_proficiency_as_required_by_school', 'English proficiency (as required by school)', true, 5),
  ('non_immigrant_intent_ties_to_india', 'Non-immigrant intent / ties to India', true, 6),
  ('no_prior_visa_fraud_or_serious_inadmissibility', 'No prior visa fraud or serious inadmissibility', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000031'::uuid AND c.item_key = x.item_key
);
