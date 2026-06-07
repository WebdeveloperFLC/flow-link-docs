-- Canada – Visitor Record (In-Canada Extension) — 13 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000019'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('client_is_physically_in_canada', 'Client is physically in Canada', true, 1),
  ('current_visitor_student_or_worker_status_is_vali', 'Current visitor, student, or worker status is valid or restorable', true, 2),
  ('clear_temporary_reason_for_extended_stay', 'Clear temporary reason for extended stay', true, 3),
  ('proof_of_funds_for_extended_visit', 'Proof of funds for extended visit', true, 4),
  ('accommodation_or_host_support_evidence', 'Accommodation or host support evidence', true, 5),
  ('no_unauthorized_work_or_study_planned', 'No unauthorized work or study planned', true, 6),
  ('ties_outside_canada_or_credible_departure_plan', 'Ties outside Canada or credible departure plan', true, 7),
  ('passport_valid_for_requested_stay_period', 'Passport valid for requested stay period', true, 8),
  ('prior_status_history_and_refusals_disclosed', 'Prior status history and refusals disclosed', true, 9),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 10),
  ('client_approval_received', 'Client approval on final file', true, 11),
  ('quality_review_completed', 'Quality review sign-off', true, 12),
  ('submission_approved', 'Submission approved & lodged', true, 13)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000019'::uuid AND c.item_key = x.item_key
);
