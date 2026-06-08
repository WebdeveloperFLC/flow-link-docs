-- EU visa submission checklist seeds (additive — new services 081–0b4 only)
-- Regenerate: node scripts/generate-eu-artifacts.mjs

-- France – Student Visa (VLS-TS) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000081'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('admission_from_recognised_french_institution', 'Admission from recognised French institution', true, 1),
  ('admission_documentation_india_', 'admission documentation (India)', true, 2),
  ('proof_of_funds_or_financial_proof', 'Proof of funds or financial proof', true, 3),
  ('health_insurance_travel_statutory_', 'Health insurance (travel + statutory)', true, 4),
  ('motivation_letter_and_cv', 'Motivation letter and CV', true, 5),
  ('language_proficiency_as_required_', 'Language proficiency (as required)', true, 6),
  ('valid_passport', 'Valid passport', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000081'::uuid AND c.item_key = x.item_key
);

-- France – Schengen Visitor Visa (Type C) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000082'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('valid_passport_3_months_beyond_stay_', 'Valid passport (3+ months beyond stay)', true, 1),
  ('travel_medical_insurance_30_000_', 'Travel medical insurance €30,000+', true, 2),
  ('proof_of_accommodation_and_itinerary', 'Proof of accommodation and itinerary', true, 3),
  ('proof_of_funds', 'Proof of funds', true, 4),
  ('strong_ties_to_india', 'Strong ties to India', true, 5),
  ('cover_letter_explaining_purpose', 'Cover letter explaining purpose', true, 6),
  ('biometrics_if_not_in_vis_', 'Biometrics (if not in VIS)', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000082'::uuid AND c.item_key = x.item_key
);

-- Italy – Student Visa (National D Visa) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000091'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('admission_from_recognised_italian_institution', 'Admission from recognised Italian institution', true, 1),
  ('admission_documentation_india_', 'admission documentation (India)', true, 2),
  ('proof_of_funds_or_financial_proof', 'Proof of funds or financial proof', true, 3),
  ('health_insurance_travel_statutory_', 'Health insurance (travel + statutory)', true, 4),
  ('motivation_letter_and_cv', 'Motivation letter and CV', true, 5),
  ('language_proficiency_as_required_', 'Language proficiency (as required)', true, 6),
  ('valid_passport', 'Valid passport', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000091'::uuid AND c.item_key = x.item_key
);

-- Italy – Schengen Visitor Visa (Type C) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-000000000092'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('valid_passport_3_months_beyond_stay_', 'Valid passport (3+ months beyond stay)', true, 1),
  ('travel_medical_insurance_30_000_', 'Travel medical insurance €30,000+', true, 2),
  ('proof_of_accommodation_and_itinerary', 'Proof of accommodation and itinerary', true, 3),
  ('proof_of_funds', 'Proof of funds', true, 4),
  ('strong_ties_to_india', 'Strong ties to India', true, 5),
  ('cover_letter_explaining_purpose', 'Cover letter explaining purpose', true, 6),
  ('biometrics_if_not_in_vis_', 'Biometrics (if not in VIS)', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-000000000092'::uuid AND c.item_key = x.item_key
);

-- Netherlands – Student Visa (MVV + Residence Permit) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000a1'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('admission_from_recognised_dutch_institution', 'Admission from recognised Dutch institution', true, 1),
  ('admission_documentation_india_', 'admission documentation (India)', true, 2),
  ('proof_of_funds_or_financial_proof', 'Proof of funds or financial proof', true, 3),
  ('health_insurance_travel_statutory_', 'Health insurance (travel + statutory)', true, 4),
  ('motivation_letter_and_cv', 'Motivation letter and CV', true, 5),
  ('language_proficiency_as_required_', 'Language proficiency (as required)', true, 6),
  ('valid_passport', 'Valid passport', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000a1'::uuid AND c.item_key = x.item_key
);

-- Netherlands – Schengen Visitor Visa (Type C) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000a2'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('valid_passport_3_months_beyond_stay_', 'Valid passport (3+ months beyond stay)', true, 1),
  ('travel_medical_insurance_30_000_', 'Travel medical insurance €30,000+', true, 2),
  ('proof_of_accommodation_and_itinerary', 'Proof of accommodation and itinerary', true, 3),
  ('proof_of_funds', 'Proof of funds', true, 4),
  ('strong_ties_to_india', 'Strong ties to India', true, 5),
  ('cover_letter_explaining_purpose', 'Cover letter explaining purpose', true, 6),
  ('biometrics_if_not_in_vis_', 'Biometrics (if not in VIS)', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000a2'::uuid AND c.item_key = x.item_key
);

-- Ireland – Stamp 2 Student Permission — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000a3'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('cas_from_licensed_ireland_sponsor', 'CAS from licensed Ireland sponsor', true, 1),
  ('financial_requirement_met_28_day_rule_', 'Financial requirement met (28-day rule)', true, 2),
  ('english_language_at_selt_level_if_required_', 'English language at SELT level (if required)', true, 3),
  ('tb_test_certificate_if_applicable_', 'TB test certificate (if applicable)', true, 4),
  ('atas_certificate_if_course_requires_', 'ATAS certificate (if course requires)', true, 5),
  ('genuine_student_credible_study_plan', 'Genuine student / credible study plan', true, 6),
  ('immigration_history_disclosed', 'Immigration history disclosed', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000a3'::uuid AND c.item_key = x.item_key
);

-- Ireland – Short Stay Visit Visa (C) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000a4'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
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
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000a4'::uuid AND c.item_key = x.item_key
);

-- Spain – Student Visa (National D Visa) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000a5'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('admission_from_recognised_spanish_institution', 'Admission from recognised Spanish institution', true, 1),
  ('admission_documentation_india_', 'admission documentation (India)', true, 2),
  ('proof_of_funds_or_financial_proof', 'Proof of funds or financial proof', true, 3),
  ('health_insurance_travel_statutory_', 'Health insurance (travel + statutory)', true, 4),
  ('motivation_letter_and_cv', 'Motivation letter and CV', true, 5),
  ('language_proficiency_as_required_', 'Language proficiency (as required)', true, 6),
  ('valid_passport', 'Valid passport', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000a5'::uuid AND c.item_key = x.item_key
);

-- Spain – Schengen Visitor Visa (Type C) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000a6'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('valid_passport_3_months_beyond_stay_', 'Valid passport (3+ months beyond stay)', true, 1),
  ('travel_medical_insurance_30_000_', 'Travel medical insurance €30,000+', true, 2),
  ('proof_of_accommodation_and_itinerary', 'Proof of accommodation and itinerary', true, 3),
  ('proof_of_funds', 'Proof of funds', true, 4),
  ('strong_ties_to_india', 'Strong ties to India', true, 5),
  ('cover_letter_explaining_purpose', 'Cover letter explaining purpose', true, 6),
  ('biometrics_if_not_in_vis_', 'Biometrics (if not in VIS)', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000a6'::uuid AND c.item_key = x.item_key
);

-- Malta – Student Visa (National D Visa) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000a7'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('admission_from_recognised_maltese_institution', 'Admission from recognised Maltese institution', true, 1),
  ('admission_documentation_india_', 'admission documentation (India)', true, 2),
  ('proof_of_funds_or_financial_proof', 'Proof of funds or financial proof', true, 3),
  ('health_insurance_travel_statutory_', 'Health insurance (travel + statutory)', true, 4),
  ('motivation_letter_and_cv', 'Motivation letter and CV', true, 5),
  ('language_proficiency_as_required_', 'Language proficiency (as required)', true, 6),
  ('valid_passport', 'Valid passport', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000a7'::uuid AND c.item_key = x.item_key
);

-- Malta – Schengen Visitor Visa (Type C) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000a8'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('valid_passport_3_months_beyond_stay_', 'Valid passport (3+ months beyond stay)', true, 1),
  ('travel_medical_insurance_30_000_', 'Travel medical insurance €30,000+', true, 2),
  ('proof_of_accommodation_and_itinerary', 'Proof of accommodation and itinerary', true, 3),
  ('proof_of_funds', 'Proof of funds', true, 4),
  ('strong_ties_to_india', 'Strong ties to India', true, 5),
  ('cover_letter_explaining_purpose', 'Cover letter explaining purpose', true, 6),
  ('biometrics_if_not_in_vis_', 'Biometrics (if not in VIS)', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000a8'::uuid AND c.item_key = x.item_key
);

-- Finland – Residence Permit for Studies — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000a9'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('admission_from_recognised_finnish_institution', 'Admission from recognised Finnish institution', true, 1),
  ('admission_documentation_india_', 'admission documentation (India)', true, 2),
  ('proof_of_funds_or_financial_proof', 'Proof of funds or financial proof', true, 3),
  ('health_insurance_travel_statutory_', 'Health insurance (travel + statutory)', true, 4),
  ('motivation_letter_and_cv', 'Motivation letter and CV', true, 5),
  ('language_proficiency_as_required_', 'Language proficiency (as required)', true, 6),
  ('valid_passport', 'Valid passport', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000a9'::uuid AND c.item_key = x.item_key
);

-- Finland – Schengen Visitor Visa (Type C) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000aa'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('valid_passport_3_months_beyond_stay_', 'Valid passport (3+ months beyond stay)', true, 1),
  ('travel_medical_insurance_30_000_', 'Travel medical insurance €30,000+', true, 2),
  ('proof_of_accommodation_and_itinerary', 'Proof of accommodation and itinerary', true, 3),
  ('proof_of_funds', 'Proof of funds', true, 4),
  ('strong_ties_to_india', 'Strong ties to India', true, 5),
  ('cover_letter_explaining_purpose', 'Cover letter explaining purpose', true, 6),
  ('biometrics_if_not_in_vis_', 'Biometrics (if not in VIS)', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000aa'::uuid AND c.item_key = x.item_key
);

-- Sweden – Residence Permit for Studies — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000ab'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('admission_from_recognised_swedish_institution', 'Admission from recognised Swedish institution', true, 1),
  ('admission_documentation_india_', 'admission documentation (India)', true, 2),
  ('proof_of_funds_or_financial_proof', 'Proof of funds or financial proof', true, 3),
  ('health_insurance_travel_statutory_', 'Health insurance (travel + statutory)', true, 4),
  ('motivation_letter_and_cv', 'Motivation letter and CV', true, 5),
  ('language_proficiency_as_required_', 'Language proficiency (as required)', true, 6),
  ('valid_passport', 'Valid passport', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000ab'::uuid AND c.item_key = x.item_key
);

-- Sweden – Schengen Visitor Visa (Type C) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000ac'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('valid_passport_3_months_beyond_stay_', 'Valid passport (3+ months beyond stay)', true, 1),
  ('travel_medical_insurance_30_000_', 'Travel medical insurance €30,000+', true, 2),
  ('proof_of_accommodation_and_itinerary', 'Proof of accommodation and itinerary', true, 3),
  ('proof_of_funds', 'Proof of funds', true, 4),
  ('strong_ties_to_india', 'Strong ties to India', true, 5),
  ('cover_letter_explaining_purpose', 'Cover letter explaining purpose', true, 6),
  ('biometrics_if_not_in_vis_', 'Biometrics (if not in VIS)', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000ac'::uuid AND c.item_key = x.item_key
);

-- Austria – Student Residence Permit — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000ad'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('admission_from_recognised_austrian_institution', 'Admission from recognised Austrian institution', true, 1),
  ('admission_documentation_india_', 'admission documentation (India)', true, 2),
  ('proof_of_funds_or_financial_proof', 'Proof of funds or financial proof', true, 3),
  ('health_insurance_travel_statutory_', 'Health insurance (travel + statutory)', true, 4),
  ('motivation_letter_and_cv', 'Motivation letter and CV', true, 5),
  ('language_proficiency_as_required_', 'Language proficiency (as required)', true, 6),
  ('valid_passport', 'Valid passport', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000ad'::uuid AND c.item_key = x.item_key
);

-- Austria – Schengen Visitor Visa (Type C) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000ae'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('valid_passport_3_months_beyond_stay_', 'Valid passport (3+ months beyond stay)', true, 1),
  ('travel_medical_insurance_30_000_', 'Travel medical insurance €30,000+', true, 2),
  ('proof_of_accommodation_and_itinerary', 'Proof of accommodation and itinerary', true, 3),
  ('proof_of_funds', 'Proof of funds', true, 4),
  ('strong_ties_to_india', 'Strong ties to India', true, 5),
  ('cover_letter_explaining_purpose', 'Cover letter explaining purpose', true, 6),
  ('biometrics_if_not_in_vis_', 'Biometrics (if not in VIS)', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000ae'::uuid AND c.item_key = x.item_key
);

-- Belgium – Student Visa (Long Stay / Type D) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000af'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('admission_from_recognised_belgian_institution', 'Admission from recognised Belgian institution', true, 1),
  ('admission_documentation_india_', 'admission documentation (India)', true, 2),
  ('proof_of_funds_or_financial_proof', 'Proof of funds or financial proof', true, 3),
  ('health_insurance_travel_statutory_', 'Health insurance (travel + statutory)', true, 4),
  ('motivation_letter_and_cv', 'Motivation letter and CV', true, 5),
  ('language_proficiency_as_required_', 'Language proficiency (as required)', true, 6),
  ('valid_passport', 'Valid passport', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000af'::uuid AND c.item_key = x.item_key
);

-- Belgium – Schengen Visitor Visa (Type C) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000b0'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('valid_passport_3_months_beyond_stay_', 'Valid passport (3+ months beyond stay)', true, 1),
  ('travel_medical_insurance_30_000_', 'Travel medical insurance €30,000+', true, 2),
  ('proof_of_accommodation_and_itinerary', 'Proof of accommodation and itinerary', true, 3),
  ('proof_of_funds', 'Proof of funds', true, 4),
  ('strong_ties_to_india', 'Strong ties to India', true, 5),
  ('cover_letter_explaining_purpose', 'Cover letter explaining purpose', true, 6),
  ('biometrics_if_not_in_vis_', 'Biometrics (if not in VIS)', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000b0'::uuid AND c.item_key = x.item_key
);

-- Denmark – Residence Permit for Studies — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000b1'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('admission_from_recognised_danish_institution', 'Admission from recognised Danish institution', true, 1),
  ('admission_documentation_india_', 'admission documentation (India)', true, 2),
  ('proof_of_funds_or_financial_proof', 'Proof of funds or financial proof', true, 3),
  ('health_insurance_travel_statutory_', 'Health insurance (travel + statutory)', true, 4),
  ('motivation_letter_and_cv', 'Motivation letter and CV', true, 5),
  ('language_proficiency_as_required_', 'Language proficiency (as required)', true, 6),
  ('valid_passport', 'Valid passport', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000b1'::uuid AND c.item_key = x.item_key
);

-- Denmark – Schengen Visitor Visa (Type C) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000b2'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('valid_passport_3_months_beyond_stay_', 'Valid passport (3+ months beyond stay)', true, 1),
  ('travel_medical_insurance_30_000_', 'Travel medical insurance €30,000+', true, 2),
  ('proof_of_accommodation_and_itinerary', 'Proof of accommodation and itinerary', true, 3),
  ('proof_of_funds', 'Proof of funds', true, 4),
  ('strong_ties_to_india', 'Strong ties to India', true, 5),
  ('cover_letter_explaining_purpose', 'Cover letter explaining purpose', true, 6),
  ('biometrics_if_not_in_vis_', 'Biometrics (if not in VIS)', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000b2'::uuid AND c.item_key = x.item_key
);

-- Portugal – Student Visa (National D Visa) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000b3'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('admission_from_recognised_portuguese_institution', 'Admission from recognised Portuguese institution', true, 1),
  ('admission_documentation_india_', 'admission documentation (India)', true, 2),
  ('proof_of_funds_or_financial_proof', 'Proof of funds or financial proof', true, 3),
  ('health_insurance_travel_statutory_', 'Health insurance (travel + statutory)', true, 4),
  ('motivation_letter_and_cv', 'Motivation letter and CV', true, 5),
  ('language_proficiency_as_required_', 'Language proficiency (as required)', true, 6),
  ('valid_passport', 'Valid passport', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000b3'::uuid AND c.item_key = x.item_key
);

-- Portugal – Schengen Visitor Visa (Type C) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000b4'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('valid_passport_3_months_beyond_stay_', 'Valid passport (3+ months beyond stay)', true, 1),
  ('travel_medical_insurance_30_000_', 'Travel medical insurance €30,000+', true, 2),
  ('proof_of_accommodation_and_itinerary', 'Proof of accommodation and itinerary', true, 3),
  ('proof_of_funds', 'Proof of funds', true, 4),
  ('strong_ties_to_india', 'Strong ties to India', true, 5),
  ('cover_letter_explaining_purpose', 'Cover letter explaining purpose', true, 6),
  ('biometrics_if_not_in_vis_', 'Biometrics (if not in VIS)', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000b4'::uuid AND c.item_key = x.item_key
);
