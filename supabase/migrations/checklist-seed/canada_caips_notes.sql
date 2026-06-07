-- Canada – CAIPS / GCMS Notes Request — 13 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-00000000001a'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('signed_consent_from_applicant_or_authorized_pers', 'Signed consent from applicant or authorized person', true, 1),
  ('requester_eligibility_confirmed_for_atip_submiss', 'Requester eligibility confirmed for ATIP submission', true, 2),
  ('applicant_identity_details_match_ircc_records', 'Applicant identity details match IRCC records', true, 3),
  ('application_number_uci_or_file_details_available', 'Application number, UCI, or file details available', true, 4),
  ('refusal_letter_or_application_history_collected_', 'Refusal letter or application history collected where relevant', true, 5),
  ('applicant_understands_notes_are_not_an_appeal', 'Applicant understands notes are not an appeal', true, 6),
  ('privacy_authorization_and_service_agreement_on_f', 'Privacy authorization and service agreement on file', true, 7),
  ('correct_department_and_record_type_selected_in_a', 'Correct department and record type selected in ATIP portal', true, 8),
  ('delivery_email_and_client_contact_details_verifi', 'Delivery email and client contact details verified', true, 9),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 10),
  ('client_approval_received', 'Client approval on final file', true, 11),
  ('quality_review_completed', 'Quality review sign-off', true, 12),
  ('submission_approved', 'Submission approved & lodged', true, 13)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-00000000001a'::uuid AND c.item_key = x.item_key
);
