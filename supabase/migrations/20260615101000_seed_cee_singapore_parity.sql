-- CEE + Singapore checklists + HTML specimen links
-- Regenerate: node scripts/generate-cee-singapore-artifacts.mjs
-- FAQs + full academy_metadata: run visa-metadata-seed/batches/batch-{poland,hungary,latvia,singapore,finland}.sql

-- CEE + Singapore submission checklist seeds

-- Poland – Student Visa (National D + Residence for Studies) — 10 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000dc'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('admission_from_recognised_poland_institution', 'Admission from recognised Poland institution', true, 1),
  ('proof_of_funds_for_study_period', 'Proof of funds for study period', true, 2),
  ('health_insurance_travel_statutory', 'Health insurance (travel + statutory)', true, 3),
  ('motivation_letter_and_cv', 'Motivation letter and CV', true, 4),
  ('language_proficiency_as_required', 'Language proficiency (as required)', true, 5),
  ('valid_passport', 'Valid passport', true, 6),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 7),
  ('client_approval_received', 'Client approval on final file', true, 8),
  ('quality_review_completed', 'Quality review sign-off', true, 9),
  ('submission_approved', 'Submission approved & lodged', true, 10)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000dc'::uuid AND c.item_key = x.item_key
);

-- Poland – Schengen Visitor Visa (Type C) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000dd'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
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
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000dd'::uuid AND c.item_key = x.item_key
);

-- Poland – Family Reunification (Spouse / Join Family) — 10 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000de'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('valid_marriage_certificate_apostilled_translated', 'Valid marriage certificate (apostilled/translated)', true, 1),
  ('sponsor_legal_status_in_destination_country', 'Sponsor legal status in destination country', true, 2),
  ('proof_of_genuine_relationship', 'Proof of genuine relationship', true, 3),
  ('sponsor_adequate_income_and_housing', 'Sponsor adequate income and housing', true, 4),
  ('health_insurance_coverage', 'Health insurance coverage', true, 5),
  ('language_integration_requirements_if_applicable', 'Language/integration requirements (if applicable)', true, 6),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 7),
  ('client_approval_received', 'Client approval on final file', true, 8),
  ('quality_review_completed', 'Quality review sign-off', true, 9),
  ('submission_approved', 'Submission approved & lodged', true, 10)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000de'::uuid AND c.item_key = x.item_key
);

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

-- Hungary – Student Residence Permit (National D Visa) — 10 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000e0'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('admission_from_recognised_hungary_institution', 'Admission from recognised Hungary institution', true, 1),
  ('proof_of_funds_for_study_period', 'Proof of funds for study period', true, 2),
  ('health_insurance_travel_statutory', 'Health insurance (travel + statutory)', true, 3),
  ('motivation_letter_and_cv', 'Motivation letter and CV', true, 4),
  ('language_proficiency_as_required', 'Language proficiency (as required)', true, 5),
  ('valid_passport', 'Valid passport', true, 6),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 7),
  ('client_approval_received', 'Client approval on final file', true, 8),
  ('quality_review_completed', 'Quality review sign-off', true, 9),
  ('submission_approved', 'Submission approved & lodged', true, 10)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000e0'::uuid AND c.item_key = x.item_key
);

-- Hungary – Schengen Visitor Visa (Type C) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000e1'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
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
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000e1'::uuid AND c.item_key = x.item_key
);

-- Hungary – Family Reunification (Spouse / Join Family) — 10 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000e2'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('valid_marriage_certificate_apostilled_translated', 'Valid marriage certificate (apostilled/translated)', true, 1),
  ('sponsor_legal_status_in_destination_country', 'Sponsor legal status in destination country', true, 2),
  ('proof_of_genuine_relationship', 'Proof of genuine relationship', true, 3),
  ('sponsor_adequate_income_and_housing', 'Sponsor adequate income and housing', true, 4),
  ('health_insurance_coverage', 'Health insurance coverage', true, 5),
  ('language_integration_requirements_if_applicable', 'Language/integration requirements (if applicable)', true, 6),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 7),
  ('client_approval_received', 'Client approval on final file', true, 8),
  ('quality_review_completed', 'Quality review sign-off', true, 9),
  ('submission_approved', 'Submission approved & lodged', true, 10)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000e2'::uuid AND c.item_key = x.item_key
);

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

-- Latvia – Student Residence Permit (National D Visa) — 10 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000e4'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('admission_from_recognised_latvia_institution', 'Admission from recognised Latvia institution', true, 1),
  ('proof_of_funds_for_study_period', 'Proof of funds for study period', true, 2),
  ('health_insurance_travel_statutory', 'Health insurance (travel + statutory)', true, 3),
  ('motivation_letter_and_cv', 'Motivation letter and CV', true, 4),
  ('language_proficiency_as_required', 'Language proficiency (as required)', true, 5),
  ('valid_passport', 'Valid passport', true, 6),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 7),
  ('client_approval_received', 'Client approval on final file', true, 8),
  ('quality_review_completed', 'Quality review sign-off', true, 9),
  ('submission_approved', 'Submission approved & lodged', true, 10)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000e4'::uuid AND c.item_key = x.item_key
);

-- Latvia – Schengen Visitor Visa (Type C) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000e5'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
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
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000e5'::uuid AND c.item_key = x.item_key
);

-- Latvia – Family Reunification (Spouse / Join Family) — 10 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000e6'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('valid_marriage_certificate_apostilled_translated', 'Valid marriage certificate (apostilled/translated)', true, 1),
  ('sponsor_legal_status_in_destination_country', 'Sponsor legal status in destination country', true, 2),
  ('proof_of_genuine_relationship', 'Proof of genuine relationship', true, 3),
  ('sponsor_adequate_income_and_housing', 'Sponsor adequate income and housing', true, 4),
  ('health_insurance_coverage', 'Health insurance coverage', true, 5),
  ('language_integration_requirements_if_applicable', 'Language/integration requirements (if applicable)', true, 6),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 7),
  ('client_approval_received', 'Client approval on final file', true, 8),
  ('quality_review_completed', 'Quality review sign-off', true, 9),
  ('submission_approved', 'Submission approved & lodged', true, 10)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000e6'::uuid AND c.item_key = x.item_key
);

-- Singapore – Student's Pass (STP) — 9 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000e7'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('admission_from_ica_recognised_institution', 'Admission from ICA-recognised institution', true, 1),
  ('solar_application_submitted_by_institution', 'SOLAR application submitted by institution', true, 2),
  ('financial_proof_per_institution_guidelines', 'Financial proof per institution guidelines', true, 3),
  ('medical_examination_if_required', 'Medical examination (if required)', true, 4),
  ('valid_passport_6_months', 'Valid passport 6+ months', true, 5),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 6),
  ('client_approval_received', 'Client approval on final file', true, 7),
  ('quality_review_completed', 'Quality review sign-off', true, 8),
  ('submission_approved', 'Submission approved & lodged', true, 9)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000e7'::uuid AND c.item_key = x.item_key
);

-- Singapore – Short-Term Visit / Visitor — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000e8'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('valid_passport_6_months', 'Valid passport (6+ months)', true, 1),
  ('passport_scan_and_photo_per_spec', 'Passport scan and photo per spec', true, 2),
  ('confirmed_duration_and_entry_type_30_60_90_singl', 'Confirmed duration and entry type (30/60/90, single/multiple)', true, 3),
  ('emirate_route_selected_dubai_sharjah_abu_dhabi', 'Emirate route selected (Dubai / Sharjah / Abu Dhabi)', true, 4),
  ('return_onward_travel_plan', 'Return/onward travel plan', true, 5),
  ('no_prior_singapore_overstay_or_ban', 'No prior Singapore overstay or ban', true, 6),
  ('sponsor_or_authorised_agent_engaged', 'Sponsor or authorised agent engaged', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000e8'::uuid AND c.item_key = x.item_key
);

-- Singapore – Dependant's Pass / LTVP (Spouse & Dependants) — 10 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000e9'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('valid_marriage_certificate_apostilled_translated', 'Valid marriage certificate (apostilled/translated)', true, 1),
  ('sponsor_legal_status_in_destination_country', 'Sponsor legal status in destination country', true, 2),
  ('proof_of_genuine_relationship', 'Proof of genuine relationship', true, 3),
  ('sponsor_adequate_income_and_housing', 'Sponsor adequate income and housing', true, 4),
  ('health_insurance_coverage', 'Health insurance coverage', true, 5),
  ('language_integration_requirements_if_applicable', 'Language/integration requirements (if applicable)', true, 6),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 7),
  ('client_approval_received', 'Client approval on final file', true, 8),
  ('quality_review_completed', 'Quality review sign-off', true, 9),
  ('submission_approved', 'Submission approved & lodged', true, 10)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000e9'::uuid AND c.item_key = x.item_key
);

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

-- Finland – Family Reunification (Spouse / Join Family) — 10 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000eb'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('valid_marriage_certificate_apostilled_translated', 'Valid marriage certificate (apostilled/translated)', true, 1),
  ('sponsor_legal_status_in_destination_country', 'Sponsor legal status in destination country', true, 2),
  ('proof_of_genuine_relationship', 'Proof of genuine relationship', true, 3),
  ('sponsor_adequate_income_and_housing', 'Sponsor adequate income and housing', true, 4),
  ('health_insurance_coverage', 'Health insurance coverage', true, 5),
  ('language_integration_requirements_if_applicable', 'Language/integration requirements (if applicable)', true, 6),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 7),
  ('client_approval_received', 'Client approval on final file', true, 8),
  ('quality_review_completed', 'Quality review sign-off', true, 9),
  ('submission_approved', 'Submission approved & lodged', true, 10)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000eb'::uuid AND c.item_key = x.item_key
);

-- Link checklist HTML specimens
INSERT INTO public.service_library_checklist_files
  (library_id, file_name, file_path, mime_type, size_bytes, version, is_current, notes)
SELECT v.library_id, v.file_name, v.file_path, v.mime_type, v.size_bytes, v.version, v.is_current, v.notes
FROM (VALUES
  ('b2000001-0001-4000-8000-0000000000dc'::uuid, 'Poland – Student Visa (National D + Residence for Studies) — Document Checklist.html', '/specimens/checklists/poland-student-visa.html', 'text/html', 108892, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client'),
  ('b2000001-0001-4000-8000-0000000000dd'::uuid, 'Poland – Schengen Visitor Visa (Type C) — Document Checklist.html', '/specimens/checklists/poland-visitor-visa.html', 'text/html', 108791, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client'),
  ('b2000001-0001-4000-8000-0000000000de'::uuid, 'Poland – Family Reunification (Spouse / Join Family) — Document Checklist.html', '/specimens/checklists/poland-spouse-visa.html', 'text/html', 108789, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client'),
  ('b2000001-0001-4000-8000-0000000000df'::uuid, 'Poland – EU Blue Card / Skilled Worker Residence — Document Checklist.html', '/specimens/checklists/poland-eu-blue-card.html', 'text/html', 107941, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client'),
  ('b2000001-0001-4000-8000-0000000000e0'::uuid, 'Hungary – Student Residence Permit (National D Visa) — Document Checklist.html', '/specimens/checklists/hungary-student-visa.html', 'text/html', 108856, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client'),
  ('b2000001-0001-4000-8000-0000000000e1'::uuid, 'Hungary – Schengen Visitor Visa (Type C) — Document Checklist.html', '/specimens/checklists/hungary-visitor-visa.html', 'text/html', 108800, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client'),
  ('b2000001-0001-4000-8000-0000000000e2'::uuid, 'Hungary – Family Reunification (Spouse / Join Family) — Document Checklist.html', '/specimens/checklists/hungary-spouse-visa.html', 'text/html', 108786, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client'),
  ('b2000001-0001-4000-8000-0000000000e3'::uuid, 'Hungary – Residence Permit for Employment — Document Checklist.html', '/specimens/checklists/hungary-work-permit.html', 'text/html', 108279, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client'),
  ('b2000001-0001-4000-8000-0000000000e4'::uuid, 'Latvia – Student Residence Permit (National D Visa) — Document Checklist.html', '/specimens/checklists/latvia-student-visa.html', 'text/html', 108856, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client'),
  ('b2000001-0001-4000-8000-0000000000e5'::uuid, 'Latvia – Schengen Visitor Visa (Type C) — Document Checklist.html', '/specimens/checklists/latvia-visitor-visa.html', 'text/html', 108793, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client'),
  ('b2000001-0001-4000-8000-0000000000e6'::uuid, 'Latvia – Family Reunification (Spouse / Join Family) — Document Checklist.html', '/specimens/checklists/latvia-spouse-visa.html', 'text/html', 108786, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client'),
  ('b2000001-0001-4000-8000-0000000000e7'::uuid, 'Singapore – Students Pass (STP) — Document Checklist.html', '/specimens/checklists/singapore-student-visa.html', 'text/html', 108347, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client'),
  ('b2000001-0001-4000-8000-0000000000e8'::uuid, 'Singapore – Short-Term Visit / Visitor — Document Checklist.html', '/specimens/checklists/singapore-visitor-visa.html', 'text/html', 108462, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client'),
  ('b2000001-0001-4000-8000-0000000000e9'::uuid, 'Singapore – Dependants Pass / LTVP (Spouse & Dependants) — Document Checklist.html', '/specimens/checklists/singapore-spouse-dependent-visa.html', 'text/html', 108819, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client'),
  ('b2000001-0001-4000-8000-0000000000ea'::uuid, 'Singapore – Employment Pass / S Pass (Work Pass) — Document Checklist.html', '/specimens/checklists/singapore-employment-pass.html', 'text/html', 107980, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client'),
  ('b2000001-0001-4000-8000-0000000000eb'::uuid, 'Finland – Family Reunification (Spouse / Join Family) — Document Checklist.html', '/specimens/checklists/finland-spouse-visa.html', 'text/html', 108794, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client')
) AS v(library_id, file_name, file_path, mime_type, size_bytes, version, is_current, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_checklist_files c
  WHERE c.library_id = v.library_id
    AND c.file_path = v.file_path
    AND c.is_current = true
);
