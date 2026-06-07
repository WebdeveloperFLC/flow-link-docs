-- UK – Graduate Route Visa — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000025'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('completed_eligible_uk_degree', 'Completed eligible UK degree', true, 1),
  ('valid_student_visa_at_application', 'Valid Student visa at application', true, 2),
  ('applied_before_student_visa_expiry', 'Applied before Student visa expiry', true, 3),
  ('studied_in_uk_required_duration', 'Studied in UK required duration', true, 4),
  ('passport_valid', 'Passport valid', true, 5),
  ('ihs_paid', 'IHS paid', true, 6),
  ('not_previously_held_graduate_route', 'Not previously held Graduate Route', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000025'::uuid AND c.item_key = x.item_key
);
