-- Australia – Work & Holiday Visa (1 year Work & Travel) — 12 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000046'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('passport_from_eligible_whm_country', 'Passport from eligible WHM country', true, 1),
  ('age_within_limit_at_application', 'Age within limit at application', true, 2),
  ('first_working_holiday_maker_visa', 'First Working Holiday Maker visa', true, 3),
  ('sufficient_funds_aud_5_000', 'Sufficient funds (~AUD 5,000+)', true, 4),
  ('adequate_health_insurance_for_stay', 'Adequate health insurance for stay', true, 5),
  ('health_character_requirements', 'Health & character requirements', true, 6),
  ('not_bringing_dependent_children', 'Not bringing dependent children', true, 7),
  ('genuine_intention_to_holiday_work_temporarily', 'Genuine intention to holiday/work temporarily', true, 8),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 9),
  ('client_approval_received', 'Client approval on final file', true, 10),
  ('quality_review_completed', 'Quality review sign-off', true, 11),
  ('submission_approved', 'Submission approved & lodged', true, 12)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000046'::uuid AND c.item_key = x.item_key
);
