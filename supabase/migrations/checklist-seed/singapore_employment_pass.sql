-- Singapore – Employment Pass / S Pass (Work Pass) — 10 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000ea'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('signed_offer_from_licensed_singapore_employer', 'Signed offer from licensed Singapore employer', true, 1),
  ('mom_work_permit_pre_approval_obtained', 'MOM work permit / pre-approval obtained', true, 2),
  ('degree_experience_attested_for_singapore', 'Degree/experience attested for Singapore', true, 3),
  ('passport_valid_6_months', 'Passport valid 6+ months', true, 4),
  ('medical_fitness_singapore_panel', 'Medical fitness (Singapore panel)', true, 5),
  ('role_matches_qualification_skill_level', 'Role matches qualification (skill level)', true, 6),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 7),
  ('client_approval_received', 'Client approval on final file', true, 8),
  ('quality_review_completed', 'Quality review sign-off', true, 9),
  ('submission_approved', 'Submission approved & lodged', true, 10)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000ea'::uuid AND c.item_key = x.item_key
);
