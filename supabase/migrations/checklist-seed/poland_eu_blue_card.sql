-- Poland – EU Blue Card / Skilled Worker Residence — 9 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000df'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('university_degree_recognised_in_poland', 'University degree recognised in Poland', true, 1),
  ('job_offer_meets_blue_card_salary_threshold', 'Job offer meets Blue Card salary threshold', true, 2),
  ('contract_duration_and_role_details_documented', 'Contract duration and role details documented', true, 3),
  ('health_insurance_arranged', 'Health insurance arranged', true, 4),
  ('work_authorisation_route_confirmed_with_employer', 'Work authorisation route confirmed with employer', true, 5),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 6),
  ('client_approval_received', 'Client approval on final file', true, 7),
  ('quality_review_completed', 'Quality review sign-off', true, 8),
  ('submission_approved', 'Submission approved & lodged', true, 9)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000df'::uuid AND c.item_key = x.item_key
);
