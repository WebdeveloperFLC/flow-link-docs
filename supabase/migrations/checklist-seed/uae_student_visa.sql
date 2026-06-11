-- United Arab Emirates – Student Residence Visa — 12 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000cf'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('admission_from_khda_spea_adek_licensed_instituti', 'Admission from KHDA/SPEA/ADEK-licensed institution', true, 1),
  ('tuition_deposit_or_payment_receipt', 'Tuition deposit or payment receipt', true, 2),
  ('passport_valid_6_months', 'Passport valid 6+ months', true, 3),
  ('indian_documents_attested_mofa_uae_as_required', 'Indian documents attested (MOFA UAE as required)', true, 4),
  ('medical_fitness_test_uae_approved', 'Medical fitness test (UAE-approved)', true, 5),
  ('institution_visa_processing_fee_paid', 'Institution visa processing fee paid', true, 6),
  ('security_clearance_gdrfa_approval', 'Security clearance / GDRFA approval', true, 7),
  ('accommodation_proof_in_uae', 'Accommodation proof in UAE', true, 8),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 9),
  ('client_approval_received', 'Client approval on final file', true, 10),
  ('quality_review_completed', 'Quality review sign-off', true, 11),
  ('submission_approved', 'Submission approved & lodged', true, 12)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000cf'::uuid AND c.item_key = x.item_key
);
