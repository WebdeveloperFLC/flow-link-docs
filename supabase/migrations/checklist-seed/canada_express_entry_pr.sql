-- Canada – Express Entry (Permanent Residence) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000013'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('eligible_program_fsw_cec_fst', 'Eligible program (FSW/CEC/FST)', true, 1),
  ('language_test_clb_minimum_per_program', 'Language test (CLB minimum per program)', true, 2),
  ('eca_for_foreign_credentials_fsw', 'ECA for foreign credentials (FSW)', true, 3),
  ('crs_score_competitive_for_recent_draws', 'CRS score competitive for recent draws', true, 4),
  ('work_experience_documented_noc_teer', 'Work experience documented (NOC/TEER)', true, 5),
  ('proof_of_funds_fsw_fst_if_applicable', 'Proof of funds (FSW/ FST if applicable)', true, 6),
  ('medical_and_police_completed_after_ita', 'Medical and police completed after ITA', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000013'::uuid AND c.item_key = x.item_key
);
