-- UK – Spouse / Partner Visa (Family) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000023'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('sponsor_is_british_citizen_or_settled_pre_settle', 'Sponsor is British citizen or settled/pre-settled', true, 1),
  ('valid_marriage_or_qualifying_relationship', 'Valid marriage or qualifying relationship', true, 2),
  ('financial_requirement_met', 'Financial requirement met', true, 3),
  ('adequate_accommodation_in_uk', 'Adequate accommodation in UK', true, 4),
  ('english_a1_entry_clearance', 'English A1 (entry clearance)', true, 5),
  ('tb_test_if_from_listed_country', 'TB test (if from listed country)', true, 6),
  ('genuine_relationship_evidence', 'Genuine relationship evidence', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000023'::uuid AND c.item_key = x.item_key
);
