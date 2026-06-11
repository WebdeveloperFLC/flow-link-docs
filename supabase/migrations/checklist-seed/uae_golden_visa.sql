-- United Arab Emirates – Golden Visa (Long-Term Residence) — 10 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000db'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('qualifying_category_identified_investor_talent_p', 'Qualifying category identified (investor/talent/property/etc.)', true, 1),
  ('threshold_investment_salary_achievement_met', 'Threshold investment/salary/achievement met', true, 2),
  ('passport_valid_6_months', 'Passport valid 6+ months', true, 3),
  ('clean_uae_immigration_history', 'Clean UAE immigration history', true, 4),
  ('medical_fitness', 'Medical fitness', true, 5),
  ('category_specific_evidence_bundle_complete', 'Category-specific evidence bundle complete', true, 6),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 7),
  ('client_approval_received', 'Client approval on final file', true, 8),
  ('quality_review_completed', 'Quality review sign-off', true, 9),
  ('submission_approved', 'Submission approved & lodged', true, 10)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000db'::uuid AND c.item_key = x.item_key
);
