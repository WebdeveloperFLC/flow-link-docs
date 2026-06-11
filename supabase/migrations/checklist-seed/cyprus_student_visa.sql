-- Cyprus – Student Visa (Entry Permit + Pink Slip) — 12 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000c8'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('unconditional_offer_from_crmd_recognised_institu', 'Unconditional offer from CRMD-recognised institution', true, 1),
  ('pcc_apostilled_mea_cyprus_embassy_attested', 'PCC apostilled (MEA) + Cyprus Embassy attested', true, 2),
  ('medical_panel_hiv_hep_b_c_syphilis_tb_valid_4_mo', 'Medical panel (HIV, Hep B/C, Syphilis, TB — valid 4 months)', true, 3),
  ('financial_proof_7_000_10_000', 'Financial proof €7,000–€10,000+', true, 4),
  ('proof_of_accommodation_in_cyprus', 'Proof of accommodation in Cyprus', true, 5),
  ('tuition_deposit_paid_university_receipt', 'Tuition deposit paid (university receipt)', true, 6),
  ('valid_passport_1_year_beyond_arrival', 'Valid passport (1+ year beyond arrival)', true, 7),
  ('english_proficiency_or_university_waiver', 'English proficiency or university waiver', true, 8),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 9),
  ('client_approval_received', 'Client approval on final file', true, 10),
  ('quality_review_completed', 'Quality review sign-off', true, 11),
  ('submission_approved', 'Submission approved & lodged', true, 12)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000c8'::uuid AND c.item_key = x.item_key
);
