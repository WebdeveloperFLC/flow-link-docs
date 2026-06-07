-- Germany – Job Seeker Visa — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000055'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('recognised_qualification_anabin_zab', 'Recognised qualification (Anabin/ZAB)', true, 1),
  ('blocked_account_or_financial_proof', 'Blocked account or financial proof', true, 2),
  ('health_insurance_for_stay', 'Health insurance for stay', true, 3),
  ('detailed_cv_and_cover_letter', 'Detailed CV and cover letter', true, 4),
  ('job_search_plan', 'Job search plan', true, 5),
  ('valid_passport', 'Valid passport', true, 6),
  ('accommodation_plan_in_germany', 'Accommodation plan in Germany', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000055'::uuid AND c.item_key = x.item_key
);
