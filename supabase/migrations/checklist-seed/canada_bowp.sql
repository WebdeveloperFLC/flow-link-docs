-- Canada – BOWP (Bridging Open Work Permit) — 13 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000017'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('client_is_physically_in_canada_when_applying', 'Client is physically in Canada when applying', true, 1),
  ('currently_holds_valid_temporary_resident_status_', 'Currently holds valid temporary resident status or is eligible to restore status', true, 2),
  ('submitted_eligible_permanent_residence_applicati', 'Submitted eligible permanent residence application', true, 3),
  ('has_aor_or_proof_pr_application_passed_completen', 'Has AOR or proof PR application passed completeness check as required', true, 4),
  ('current_work_permit_expires_within_the_allowed_b', 'Current work permit expires within the allowed BOWP window or is already covered by maintained status', true, 5),
  ('passport_valid_for_requested_work_permit_period', 'Passport valid for requested work permit period', true, 6),
  ('provincial_nomination_has_no_employment_restrict', 'Provincial nomination has no employment restriction, if PNP-based', true, 7),
  ('no_inadmissibility_misrepresentation_or_unresolv', 'No inadmissibility, misrepresentation, or unresolved removal issue', true, 8),
  ('correct_work_permit_category_and_fees_selected_i', 'Correct work permit category and fees selected in IRCC portal', true, 9),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 10),
  ('client_approval_received', 'Client approval on final file', true, 11),
  ('quality_review_completed', 'Quality review sign-off', true, 12),
  ('submission_approved', 'Submission approved & lodged', true, 13)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000017'::uuid AND c.item_key = x.item_key
);
