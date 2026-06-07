-- Canada – Spouse / Dependent Open Work Permit — 13 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-00000000001b'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('principal_applicant_has_valid_qualifying_status_', 'Principal applicant has valid qualifying status in Canada or approved pathway', true, 1),
  ('applicant_is_spouse_common_law_partner_or_qualif', 'Applicant is spouse, common-law partner, or qualifying dependant under IRCC rules', true, 2),
  ('relationship_is_genuine_and_well_documented', 'Relationship is genuine and well documented', true, 3),
  ('principal_worker_occupation_employer_or_permit_c', 'Principal worker occupation, employer, or permit category qualifies where required', true, 4),
  ('principal_student_program_and_institution_qualif', 'Principal student program and institution qualify where required', true, 5),
  ('applicant_passport_valid_for_requested_permit_pe', 'Applicant passport valid for requested permit period', true, 6),
  ('applicant_has_no_inadmissibility_misrepresentati', 'Applicant has no inadmissibility, misrepresentation, or undisclosed refusal issue', true, 7),
  ('funds_or_family_support_evidence_available_for_s', 'Funds or family support evidence available for settlement and stay', true, 8),
  ('medical_exam_or_biometrics_completed_if_required', 'Medical exam or biometrics completed if required', true, 9),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 10),
  ('client_approval_received', 'Client approval on final file', true, 11),
  ('quality_review_completed', 'Quality review sign-off', true, 12),
  ('submission_approved', 'Submission approved & lodged', true, 13)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-00000000001b'::uuid AND c.item_key = x.item_key
);
