-- Hungary – Residence Permit for Employment — 10 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000e3'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('recognised_qualification_or_equivalent_skilled_w', 'Recognised qualification or equivalent skilled worker profile', true, 1),
  ('concrete_job_offer_matching_qualification_if_req', 'Concrete job offer matching qualification (if required)', true, 2),
  ('salary_meets_threshold_for_occupation_region', 'Salary meets threshold for occupation/region', true, 3),
  ('health_insurance_and_accommodation_plan', 'Health insurance and accommodation plan', true, 4),
  ('hungarian_language_level_per_role_requirements', 'Hungarian language level per role requirements', true, 5),
  ('clean_immigration_and_criminal_history', 'Clean immigration and criminal history', true, 6),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 7),
  ('client_approval_received', 'Client approval on final file', true, 8),
  ('quality_review_completed', 'Quality review sign-off', true, 9),
  ('submission_approved', 'Submission approved & lodged', true, 10)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000e3'::uuid AND c.item_key = x.item_key
);
