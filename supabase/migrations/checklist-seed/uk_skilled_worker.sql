-- UK – Skilled Worker Visa — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000024'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('certificate_of_sponsorship_from_licensed_sponsor', 'Certificate of Sponsorship from licensed sponsor', true, 1),
  ('job_at_rqf_level_3_eligible_soc_code', 'Job at RQF Level 3+ (eligible SOC code)', true, 2),
  ('salary_meets_threshold_going_rate', 'Salary meets threshold/going rate', true, 3),
  ('english_b1_selt_or_exempt', 'English B1 (SELT or exempt)', true, 4),
  ('tb_test_india', 'TB test (India)', true, 5),
  ('maintenance_funds_if_applicable', 'Maintenance funds (if applicable)', true, 6),
  ('70_points_total_achieved', '70 points total achieved', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000024'::uuid AND c.item_key = x.item_key
);
