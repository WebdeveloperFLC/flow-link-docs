-- Seed submission checklist items for all 36 visa services
-- Source: eligibility criteria in content/service-library/*.json + workflow tail
-- Safe to re-run (skips existing item_key per service)

-- Canada – Student Visa (Study Permit — Outside Canada) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'c35e6051-f40f-47bf-9cac-0a386c47a336'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('letter_of_acceptance_loa_from_dli', 'Letter of acceptance (LOA) from DLI', true, 1),
  ('proof_of_financial_support_tuition_living', 'Proof of financial support (tuition + living)', true, 2),
  ('language_proficiency_sds', 'Language proficiency (SDS)', true, 3),
  ('biometrics_completed', 'Biometrics completed', true, 4),
  ('medical_exam_if_required', 'Medical exam (if required)', true, 5),
  ('no_criminal_immigration_misrepresentation', 'No criminal / immigration misrepresentation', true, 6),
  ('genuine_student_ties_to_home_country', 'Genuine student / ties to home country', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'c35e6051-f40f-47bf-9cac-0a386c47a336'::uuid AND c.item_key = x.item_key
);

-- Canada – Visitor Visa (TRV) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000011'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('valid_passport_6_months_validity_recommended', 'Valid passport (6+ months validity recommended)', true, 1),
  ('proof_of_purpose_tourism_family_business', 'Proof of purpose (tourism / family / business)', true, 2),
  ('proof_of_funds_for_trip_duration', 'Proof of funds for trip duration', true, 3),
  ('strong_ties_to_home_country', 'Strong ties to home country', true, 4),
  ('biometrics_completed', 'Biometrics completed', true, 5),
  ('medical_exam_if_required', 'Medical exam (if required)', true, 6),
  ('no_prior_misrepresentation_or_serious_inadmissib', 'No prior misrepresentation or serious inadmissibility', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000011'::uuid AND c.item_key = x.item_key
);

-- Canada – Spouse / Partner Sponsorship — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000012'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('sponsor_is_canadian_citizen_or_pr_aged_18', 'Sponsor is Canadian citizen or PR aged 18+', true, 1),
  ('legally_valid_marriage_or_qualifying_relationshi', 'Legally valid marriage or qualifying relationship', true, 2),
  ('genuine_relationship_evidence', 'Genuine relationship evidence', true, 3),
  ('sponsor_not_in_default_of_prior_sponsorship_unde', 'Sponsor not in default of prior sponsorship undertakings', true, 4),
  ('medical_exam_completed', 'Medical exam completed', true, 5),
  ('police_certificates_as_required', 'Police certificates as required', true, 6),
  ('biometrics_completed', 'Biometrics completed', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000012'::uuid AND c.item_key = x.item_key
);

-- Canada – Express Entry (Permanent Residence) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000013'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('eligible_program_fsw_cec_fst', 'Eligible program (FSW/CEC/FST)', true, 1),
  ('language_test_clb_minimum_per_program', 'Language test (CLB minimum per program)', true, 2),
  ('eca_for_foreign_credentials_fsw', 'ECA for foreign credentials (FSW)', true, 3),
  ('crs_score_competitive_for_recent_draws', 'CRS score competitive for recent draws', true, 4),
  ('work_experience_documented_noc_teer', 'Work experience documented (NOC/TEER)', true, 5),
  ('proof_of_funds_fsw_fst_if_applicable', 'Proof of funds (FSW/ FST if applicable)', true, 6),
  ('medical_and_police_completed_after_ita', 'Medical and police completed after ITA', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000013'::uuid AND c.item_key = x.item_key
);

-- Canada – Post-Graduation Work Permit (PGWP) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000014'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('graduated_from_eligible_dli_program', 'Graduated from eligible DLI program', true, 1),
  ('valid_study_permit_at_completion', 'Valid study permit at completion', true, 2),
  ('completion_letter_transcript', 'Completion letter / transcript', true, 3),
  ('applied_within_180_days_of_completion', 'Applied within 180 days of completion', true, 4),
  ('full_time_student_status_maintained', 'Full-time student status maintained', true, 5),
  ('passport_valid_through_desired_pgwp_period', 'Passport valid through desired PGWP period', true, 6),
  ('not_previously_received_pgwp', 'Not previously received PGWP', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000014'::uuid AND c.item_key = x.item_key
);

-- Canada – Work Permit (LMIA & LMIA-Exempt) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000015'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('valid_job_offer_contract', 'Valid job offer / contract', true, 1),
  ('lmia_positive_or_exempt_category_confirmed', 'LMIA positive or exempt category confirmed', true, 2),
  ('qualifying_work_experience_education', 'Qualifying work experience/education', true, 3),
  ('medical_exam_if_required', 'Medical exam (if required)', true, 4),
  ('biometrics_completed', 'Biometrics completed', true, 5),
  ('no_criminal_inadmissibility', 'No criminal inadmissibility', true, 6),
  ('employer_compliance_history', 'Employer compliance history', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000015'::uuid AND c.item_key = x.item_key
);

-- Canada – Super Visa (Parents & Grandparents) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000016'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('child_grandchild_is_canadian_citizen_or_pr', 'Child/grandchild is Canadian citizen or PR', true, 1),
  ('sponsor_meets_lico_minimum_income', 'Sponsor meets LICO minimum income', true, 2),
  ('medical_exam_completed', 'Medical exam completed', true, 3),
  ('canadian_medical_insurance_arranged', 'Canadian medical insurance arranged', true, 4),
  ('invitation_letter_from_child_grandchild', 'Invitation letter from child/grandchild', true, 5),
  ('biometrics_completed', 'Biometrics completed', true, 6),
  ('ties_to_home_country_india', 'Ties to home country (India)', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000016'::uuid AND c.item_key = x.item_key
);

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

-- Canada – Study Permit Extension — 13 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000018'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('client_is_physically_in_canada', 'Client is physically in Canada', true, 1),
  ('current_study_permit_is_valid_or_client_is_withi', 'Current study permit is valid or client is within restoration period', true, 2),
  ('continues_at_a_dli_or_has_valid_new_loa_from_dli', 'Continues at a DLI or has valid new LOA from DLI', true, 3),
  ('proof_of_enrolment_or_transcript_shows_active_st', 'Proof of enrolment or transcript shows active study progress', true, 4),
  ('proof_of_funds_covers_tuition_living_costs_and_r', 'Proof of funds covers tuition, living costs, and return transport', true, 5),
  ('passport_valid_beyond_requested_extension_period', 'Passport valid beyond requested extension period', true, 6),
  ('no_unauthorized_work_or_study_history', 'No unauthorized work or study history', true, 7),
  ('medical_exam_completed_if_ircc_profile_requires_', 'Medical exam completed if IRCC profile requires it', true, 8),
  ('academic_gaps_program_changes_or_delayed_complet', 'Academic gaps, program changes, or delayed completion explained', true, 9),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 10),
  ('client_approval_received', 'Client approval on final file', true, 11),
  ('quality_review_completed', 'Quality review sign-off', true, 12),
  ('submission_approved', 'Submission approved & lodged', true, 13)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000018'::uuid AND c.item_key = x.item_key
);

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

-- UK – Student Visa (Student Route) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000021'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('cas_from_licensed_uk_sponsor', 'CAS from licensed UK sponsor', true, 1),
  ('financial_requirement_met_28_day_rule', 'Financial requirement met (28-day rule)', true, 2),
  ('english_language_at_selt_level_if_required', 'English language at SELT level (if required)', true, 3),
  ('tb_test_certificate_if_applicable', 'TB test certificate (if applicable)', true, 4),
  ('atas_certificate_if_course_requires', 'ATAS certificate (if course requires)', true, 5),
  ('genuine_student_credible_study_plan', 'Genuine student / credible study plan', true, 6),
  ('immigration_history_disclosed', 'Immigration history disclosed', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000021'::uuid AND c.item_key = x.item_key
);

-- UK – Visitor Visa (Standard Visitor) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000022'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('valid_passport', 'Valid passport', true, 1),
  ('clear_visit_purpose', 'Clear visit purpose', true, 2),
  ('proof_of_funds', 'Proof of funds', true, 3),
  ('strong_ties_to_india', 'Strong ties to India', true, 4),
  ('accommodation_and_travel_plans', 'Accommodation and travel plans', true, 5),
  ('biometrics_completed', 'Biometrics completed', true, 6),
  ('no_prior_immigration_breaches_undisclosed', 'No prior immigration breaches undisclosed', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000022'::uuid AND c.item_key = x.item_key
);

-- UK – Spouse / Partner Visa (Family) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000023'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('sponsor_is_british_citizen_or_settled_pre_settle', 'Sponsor is British citizen or settled/pre-settled', true, 1),
  ('valid_marriage_or_qualifying_relationship', 'Valid marriage or qualifying relationship', true, 2),
  ('financial_requirement_met', 'Financial requirement met', true, 3),
  ('adequate_accommodation_in_uk', 'Adequate accommodation in UK', true, 4),
  ('english_a1_entry_clearance', 'English A1 (entry clearance)', true, 5),
  ('tb_test_if_from_listed_country', 'TB test (if from listed country)', true, 6),
  ('genuine_relationship_evidence', 'Genuine relationship evidence', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000023'::uuid AND c.item_key = x.item_key
);

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

-- USA – Student Visa (F-1) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000031'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('form_i_20_from_sevp_certified_school', 'Form I-20 from SEVP-certified school', true, 1),
  ('sevis_i_901_fee_paid', 'SEVIS I-901 fee paid', true, 2),
  ('ds_160_completed_accurately', 'DS-160 completed accurately', true, 3),
  ('proof_of_financial_support', 'Proof of financial support', true, 4),
  ('english_proficiency_as_required_by_school', 'English proficiency (as required by school)', true, 5),
  ('non_immigrant_intent_ties_to_india', 'Non-immigrant intent / ties to India', true, 6),
  ('no_prior_visa_fraud_or_serious_inadmissibility', 'No prior visa fraud or serious inadmissibility', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000031'::uuid AND c.item_key = x.item_key
);

-- USA – Visitor Visa (B1/B2) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000032'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('valid_passport', 'Valid passport', true, 1),
  ('clear_temporary_purpose', 'Clear temporary purpose', true, 2),
  ('strong_ties_to_india', 'Strong ties to India', true, 3),
  ('proof_of_funds_for_trip', 'Proof of funds for trip', true, 4),
  ('ds_160_completed_accurately', 'DS-160 completed accurately', true, 5),
  ('no_prior_visa_fraud', 'No prior visa fraud', true, 6),
  ('interview_appointment_booked', 'Interview appointment booked', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000032'::uuid AND c.item_key = x.item_key
);

-- USA – Spouse / Fiancé Visa (K-1 / CR-1 / IR-1) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000033'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('us_citizen_petitioner_not_green_card_holder_for_', 'US citizen petitioner (not green card holder for K-1)', true, 1),
  ('legally_valid_marriage_or_qualifying_engagement', 'Legally valid marriage or qualifying engagement', true, 2),
  ('genuine_relationship_evidence', 'Genuine relationship evidence', true, 3),
  ('i_864_affidavit_of_support', 'I-864 affidavit of support', true, 4),
  ('civil_documents_birth_marriage_police', 'Civil documents (birth, marriage, police)', true, 5),
  ('medical_exam_by_panel_physician', 'Medical exam by panel physician', true, 6),
  ('ds_260_and_embassy_interview', 'DS-260 and embassy interview', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000033'::uuid AND c.item_key = x.item_key
);

-- USA – Green Card (Employment & Family) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000034'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('qualifying_eb_category_or_family_relationship', 'Qualifying EB category or family relationship', true, 1),
  ('employer_sponsorship_perm_eb_2_3', 'Employer sponsorship / PERM (EB-2/3)', true, 2),
  ('i_140_approved', 'I-140 approved', true, 3),
  ('priority_date_current_visa_bulletin', 'Priority date current (Visa Bulletin)', true, 4),
  ('i_485_or_consular_processing_eligible', 'I-485 or consular processing eligible', true, 5),
  ('medical_exam_completed', 'Medical exam completed', true, 6),
  ('no_serious_inadmissibility', 'No serious inadmissibility', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000034'::uuid AND c.item_key = x.item_key
);

-- Australia – Student Visa (Subclass 500) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000041'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('coe_from_cricos_provider', 'CoE from CRICOS provider', true, 1),
  ('genuine_student_gs_requirement', 'Genuine Student (GS) requirement', true, 2),
  ('financial_capacity', 'Financial capacity', true, 3),
  ('english_proficiency', 'English proficiency', true, 4),
  ('oshc_for_study_duration', 'OSHC for study duration', true, 5),
  ('health_exam_if_required', 'Health exam (if required)', true, 6),
  ('police_certificates_if_required', 'Police certificates (if required)', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000041'::uuid AND c.item_key = x.item_key
);

-- Australia – Visitor Visa (Subclass 600) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000042'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('valid_passport', 'Valid passport', true, 1),
  ('clear_temporary_visit_purpose', 'Clear temporary visit purpose', true, 2),
  ('proof_of_funds', 'Proof of funds', true, 3),
  ('strong_ties_to_india', 'Strong ties to India', true, 4),
  ('health_insurance_recommended', 'Health insurance recommended', true, 5),
  ('biometrics_if_requested', 'Biometrics (if requested)', true, 6),
  ('immigration_history_disclosed', 'Immigration history disclosed', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000042'::uuid AND c.item_key = x.item_key
);

-- Australia – Partner Visa (Subclass 820/801 or 309/100) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000043'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('qualifying_relationship_marriage_or_12_months_de', 'Qualifying relationship (marriage or 12+ months de facto)', true, 1),
  ('sponsor_is_eligible_australian_citizen_pr_eligib', 'Sponsor is eligible Australian citizen/PR/eligible NZ citizen', true, 2),
  ('genuine_and_continuing_relationship_evidence', 'Genuine and continuing relationship evidence', true, 3),
  ('health_requirements_met', 'Health requirements met', true, 4),
  ('character_requirements_police_certs', 'Character requirements (police certs)', true, 5),
  ('sponsorship_obligations_understood', 'Sponsorship obligations understood', true, 6),
  ('correct_onshore_offshore_pathway', 'Correct onshore/offshore pathway', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000043'::uuid AND c.item_key = x.item_key
);

-- Australia – Skilled Migration (Subclass 189/190/491) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000044'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('occupation_on_skilled_occupation_list', 'Occupation on skilled occupation list', true, 1),
  ('positive_skills_assessment', 'Positive skills assessment', true, 2),
  ('65_points_competitive_score', '65+ points (competitive score)', true, 3),
  ('age_under_45_at_invitation', 'Age under 45 at invitation', true, 4),
  ('competent_english_ielts_6_each_band_min', 'Competent English (IELTS 6 each band min)', true, 5),
  ('eoi_submitted_in_skillselect', 'EOI submitted in SkillSelect', true, 6),
  ('invitation_received', 'Invitation received', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000044'::uuid AND c.item_key = x.item_key
);

-- Australia – Temporary Graduate Visa (Subclass 485) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000045'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('completed_eligible_australian_qualification', 'Completed eligible Australian qualification', true, 1),
  ('applied_within_6_months_of_completion', 'Applied within 6 months of completion', true, 2),
  ('valid_student_visa_compliance_history', 'Valid student visa compliance history', true, 3),
  ('competent_english', 'Competent English', true, 4),
  ('health_insurance_if_required', 'Health insurance (if required)', true, 5),
  ('skills_assessment_graduate_work_stream', 'Skills assessment (Graduate Work Stream)', true, 6),
  ('health_and_character_clearances', 'Health and character clearances', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000045'::uuid AND c.item_key = x.item_key
);

-- Australia – Work & Holiday Visa (1 year Work & Travel) — 12 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000046'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('passport_from_eligible_whm_country', 'Passport from eligible WHM country', true, 1),
  ('age_within_limit_at_application', 'Age within limit at application', true, 2),
  ('first_working_holiday_maker_visa', 'First Working Holiday Maker visa', true, 3),
  ('sufficient_funds_aud_5_000', 'Sufficient funds (~AUD 5,000+)', true, 4),
  ('adequate_health_insurance_for_stay', 'Adequate health insurance for stay', true, 5),
  ('health_character_requirements', 'Health & character requirements', true, 6),
  ('not_bringing_dependent_children', 'Not bringing dependent children', true, 7),
  ('genuine_intention_to_holiday_work_temporarily', 'Genuine intention to holiday/work temporarily', true, 8),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 9),
  ('client_approval_received', 'Client approval on final file', true, 10),
  ('quality_review_completed', 'Quality review sign-off', true, 11),
  ('submission_approved', 'Submission approved & lodged', true, 12)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000046'::uuid AND c.item_key = x.item_key
);

-- Germany – Student Visa (National Visa) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000051'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('admission_from_recognised_german_institution', 'Admission from recognised German institution', true, 1),
  ('aps_certificate_india', 'APS certificate (India)', true, 2),
  ('blocked_account_or_financial_proof', 'Blocked account or financial proof', true, 3),
  ('health_insurance_travel_statutory', 'Health insurance (travel + statutory)', true, 4),
  ('motivation_letter_and_cv', 'Motivation letter and CV', true, 5),
  ('language_proficiency_as_required', 'Language proficiency (as required)', true, 6),
  ('valid_passport', 'Valid passport', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000051'::uuid AND c.item_key = x.item_key
);

-- Germany – Visitor / Schengen Visa (Type C) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000052'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('valid_passport_3_months_beyond_stay', 'Valid passport (3+ months beyond stay)', true, 1),
  ('travel_medical_insurance_30_000', 'Travel medical insurance €30,000+', true, 2),
  ('proof_of_accommodation_and_itinerary', 'Proof of accommodation and itinerary', true, 3),
  ('proof_of_funds', 'Proof of funds', true, 4),
  ('strong_ties_to_india', 'Strong ties to India', true, 5),
  ('cover_letter_explaining_purpose', 'Cover letter explaining purpose', true, 6),
  ('biometrics_if_not_in_vis', 'Biometrics (if not in VIS)', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000052'::uuid AND c.item_key = x.item_key
);

-- Germany – Spouse / Family Reunion Visa — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000053'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('legally_valid_marriage_recognised_in_germany', 'Legally valid marriage recognised in Germany', true, 1),
  ('sponsor_is_german_citizen_or_qualifying_resident', 'Sponsor is German citizen or qualifying resident', true, 2),
  ('adequate_housing_in_germany', 'Adequate housing in Germany', true, 3),
  ('sponsor_income_solvency', 'Sponsor income/solvency', true, 4),
  ('german_a1_certificate_if_required', 'German A1 certificate (if required)', true, 5),
  ('genuine_relationship_evidence', 'Genuine relationship evidence', true, 6),
  ('health_insurance_arrangement', 'Health insurance arrangement', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000053'::uuid AND c.item_key = x.item_key
);

-- Germany – Opportunity Card (Chancenkarte) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000054'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('minimum_6_points_achieved', 'Minimum 6 points achieved', true, 1),
  ('recognised_degree_or_it_experience_pathway', 'Recognised degree or IT experience pathway', true, 2),
  ('german_a1_or_english_b2', 'German A1 or English B2', true, 3),
  ('blocked_account_or_job_offer', 'Blocked account or job offer', true, 4),
  ('qualification_recognition_if_claiming_points', 'Qualification recognition (if claiming points)', true, 5),
  ('valid_passport', 'Valid passport', true, 6),
  ('health_insurance', 'Health insurance', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000054'::uuid AND c.item_key = x.item_key
);

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

-- New Zealand – Student Visa — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000061'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('offer_of_place_from_approved_provider', 'Offer of Place from approved provider', true, 1),
  ('proof_of_funds_tuition_living', 'Proof of funds (tuition + living)', true, 2),
  ('genuine_student_intent', 'Genuine student intent', true, 3),
  ('english_proficiency', 'English proficiency', true, 4),
  ('medical_certificate_if_required', 'Medical certificate (if required)', true, 5),
  ('police_certificate_if_required', 'Police certificate (if required)', true, 6),
  ('valid_passport', 'Valid passport', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000061'::uuid AND c.item_key = x.item_key
);

-- New Zealand – Visitor Visa — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000062'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('valid_passport', 'Valid passport', true, 1),
  ('clear_visit_purpose', 'Clear visit purpose', true, 2),
  ('proof_of_funds', 'Proof of funds', true, 3),
  ('strong_ties_to_india', 'Strong ties to India', true, 4),
  ('onward_return_travel_plans', 'Onward/return travel plans', true, 5),
  ('health_character_requirements', 'Health/character requirements', true, 6),
  ('immigration_history_disclosed', 'Immigration history disclosed', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000062'::uuid AND c.item_key = x.item_key
);

-- New Zealand – Partner of a New Zealander Visa — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000063'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('nz_citizen_or_resident_partner', 'NZ citizen or resident partner', true, 1),
  ('genuine_and_stable_relationship_12_months', 'Genuine and stable relationship 12+ months', true, 2),
  ('relationship_evidence_package', 'Relationship evidence package', true, 3),
  ('health_requirements', 'Health requirements', true, 4),
  ('character_requirements_police_certs', 'Character requirements (police certs)', true, 5),
  ('partner_support_declaration', 'Partner support declaration', true, 6),
  ('immigration_history_disclosed', 'Immigration history disclosed', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000063'::uuid AND c.item_key = x.item_key
);

-- New Zealand – Skilled Migrant Category (SMC) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000064'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('skilled_job_offer_or_current_skilled_employment_', 'Skilled job offer or current skilled employment in NZ', true, 1),
  ('points_meet_or_exceed_recent_selection_threshold', 'Points meet or exceed recent selection threshold', true, 2),
  ('age_under_55_for_maximum_points', 'Age under 55 (for maximum points)', true, 3),
  ('english_competency_ielts_6_5_avg_or_equivalent', 'English competency (IELTS 6.5 avg or equivalent)', true, 4),
  ('qualification_assessment_if_required', 'Qualification assessment (if required)', true, 5),
  ('eoi_submitted_and_selected', 'EOI submitted and selected', true, 6),
  ('health_and_character_clearances', 'Health and character clearances', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000064'::uuid AND c.item_key = x.item_key
);

-- New Zealand – Post Study Work Visa — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000065'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('completed_eligible_nz_qualification', 'Completed eligible NZ qualification', true, 1),
  ('studied_in_nz_required_duration', 'Studied in NZ required duration', true, 2),
  ('applied_within_allowed_timeframe', 'Applied within allowed timeframe', true, 3),
  ('valid_passport', 'Valid passport', true, 4),
  ('good_character', 'Good character', true, 5),
  ('medical_if_required', 'Medical (if required)', true, 6),
  ('previous_post_study_work_visa_limits', 'Previous post-study work visa limits', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000065'::uuid AND c.item_key = x.item_key
);
