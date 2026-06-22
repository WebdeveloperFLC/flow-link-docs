# Document Catalogue Inventory

Generated: 2026-06-22T00:14:46.926Z

> **Purpose:** Phase A inventory before catalogue expansion and strict `master_item_code` enforcement.
> Document Binder content is inventoried but classified separately — not upload catalogue candidates.

## Executive summary

| Metric | Count |
|--------|------:|
| Unique labels inventoried | 1026 |
| Seeded `document_types` codes | 23 |
| Labels matching existing catalogue | 98 |
| Upload candidates missing from catalogue | 598 |
| Non-upload (eligibility / red-flag) labels | 310 |
| Milestone / checklist labels | 29 |
| Duplicate label groups | 13 |
| Proposed new catalogue codes | 597 |
| Services scanned | 131 |
| Binder HTML files | 131 |

## Architecture alignment (locked)

| System | Role | In this inventory |
|--------|------|-------------------|
| **Document Binder** | Counselor guide / training | `document_binder`, `document_binder.html` sources |
| **Documents Tab** | Upload requirements only | Upload candidates in sections A + B |
| **Checklist** | QA / submission tasks (future) | Milestone labels — section E |
| **Eligibility / Red flags** | Service Library assessment | Non-upload — section F |
| **document_types** | Master catalogue | Sections A, D |

## A. Existing catalogue documents

Labels that match the 23 seeded `document_types` codes.

| academic_transcripts | Academic Transcripts | 0 |
| academic_transcripts | Academic transcripts — all levels completed, official sealed copies | 1 |
| academic_transcripts | Academic transcripts, degrees, and resume | 1 |
| affidavit_of_support | Affidavit of Support | 0 |
| financial_documents | Bank Statements | 0 |
| financial_documents | Bank statements — minimum 4–6 months showing consistent balance & account holder name | 1 |
| financial_documents | Bank statements / sponsor affidavit | 6 |
| financial_documents | Bank statements / sponsor affidavit (seasoned funds) | 1 |
| birth_certificate | Birth Certificate | 0 |
| birth_certificate | Birth certificates (children) | 7 |
| gic_certificate | Blocked account (Sperrkonto) or alternative financial proof per embassy checklist | 8 |
| gic_certificate | Blocked account or financial proof | 2 |
| gic_certificate | Blocked account or financial proof for living costs | 1 |
| gic_certificate | Blocked account or job offer | 1 |
| gic_certificate | Blocked account underfunded or wrong provider | 1 |
| offer_letter | CoE / provider issues | 1 |
| offer_letter | CoE from CRICOS provider | 1 |
| resume | CV / resume | 7 |
| employment_letter | Employment Letter | 0 |
| gic_certificate | GIC from participating Canadian financial institution — verify current amount | 1 |
| medical_report | Health insurance | 5 |
| medical_report | Health insurance (if required) | 1 |
| medical_report | Health insurance (travel + statutory) | 16 |
| medical_report | Health insurance and accommodation plan | 2 |
| medical_report | Health insurance arranged | 2 |
| medical_report | Health insurance arrangement | 1 |
| medical_report | Health insurance coverage | 5 |
| medical_report | Health insurance coverage arranged | 1 |
| medical_report | Health insurance covering all risks | 1 |
| medical_report | Health insurance for dependants | 7 |
| medical_report | Health insurance for stay | 1 |
| medical_report | Health insurance for the entry/gap period | 1 |
| medical_report | Health insurance for US clinical sites | 3 |
| medical_report | Health insurance gaps | 3 |
| medical_report | Health insurance recommended | 1 |
| medical_report | Health insurance type decided (statutory vs private) | 1 |
| ielts_language_test | IELTS Scorecard | 0 |
| affidavit_of_support | Invitation letter for Russian student visa (if applicable) | 1 |
| affidavit_of_support | Invitation letter from child/grandchild | 1 |
| ielts_language_test | Language test (CLB minimum per program) | 1 |
| ielts_language_test | Language test meets provincial and federal minimums | 1 |
| ielts_language_test | Language test result (TRF) — IELTS / CELPIP / PTE / TEF / DALF as required by institution | 1 |
| offer_letter | Letter of acceptance (LOA) from a DLI | 1 |
| offer_letter | Letter of acceptance / enrollment from recognised institution | 29 |
| offer_letter | Letter of acceptance for a full-time ILEP-listed course | 1 |
| marriage_certificate | Marriage certificate — civil proof with certified translation if needed | 1 |
| marriage_certificate | Marriage certificate (spouse) | 7 |
| medical_report | Medical exam (if required) | 2 |
| medical_report | Medical exam by panel physician | 1 |
| medical_report | Medical exam completed | 3 |
| medical_report | Medical exam completed if IRCC profile requires it | 1 |
| medical_report | Medical exam or biometrics completed if required | 1 |
| medical_report | Medical examination (if required) | 1 |
| medical_report | Medical Report | 0 |
| medical_report | OSHC for study duration | 1 |
| medical_report | OSHC gaps | 1 |
| passport | Passport | 0 |
| passport | Passport copy — valid 6+ months beyond program | 7 |
| photograph | Passport photographs per consulate specs | 3 |
| photograph | Passport-size photographs per embassy / online portal specifications | 122 |
| police_clearance | PCC apostilled (MEA) + Cyprus Embassy attested | 1 |
| police_clearance | PCC not apostilled or attested | 1 |
| photograph | Photograph | 0 |
| police_clearance | Police clearance (if required by consulate) | 1 |
| police_clearance | Police clearance (if required) | 6 |
| other | Principal applicant status document (work permit / study permit / PR card copy) | 1 |
| financial_documents | Proof of funds | 20 |
| financial_documents | Proof of funds (€576/month × 12) | 1 |
| financial_documents | Proof of funds (FSW/ FST if applicable) | 1 |
| financial_documents | Proof of funds (tuition + living) | 1 |
| financial_documents | Proof of funds covers tuition, living costs, and return transport | 1 |
| financial_documents | Proof of funds for extended visit | 1 |
| financial_documents | Proof of funds for living costs | 1 |
| financial_documents | Proof of funds for study period | 3 |
| financial_documents | Proof of funds for trip | 2 |
| financial_documents | Proof of funds for trip duration | 1 |
| financial_documents | Proof of funds for visit and return travel | 1 |
| financial_documents | Proof of funds insufficient | 4 |
| financial_documents | Proof of funds or financial proof | 11 |
| financial_documents | Proof of funds where required | 1 |
| photograph | Relationship evidence — photos, communication history, shared documents | 1 |
| sop | Statement of Purpose (SOP) / Study Plan — genuine student intent & career pathway | 1 |
| sop | Study plan / statement of purpose (SOP) | 1 |
| sponsorship_letter | Travel itinerary / invitation letter (if visiting family or business) | 28 |
| marriage_certificate | Valid marriage certificate (apostilled/translated) | 5 |
| passport | Valid passport | 26 |
| passport | Valid passport — bio data page + any previously issued Canadian visa pages | 1 |
| passport | Valid passport — bio page and relevant visa/stamp pages | 122 |
| passport | Valid passport (1+ year beyond arrival) | 1 |
| passport | Valid passport (3+ months beyond stay) | 17 |
| passport | Valid passport (6+ months beyond intended stay recommended) | 1 |
| passport | Valid passport (6+ months validity recommended) | 1 |
| passport | Valid passport 6+ months | 3 |
| passport | Valid passport bio page + previous Australian visa pages (if any) | 1 |
| passport | Valid passport for registration and test day | 1 |
| passport | Valid passport from eligible Working Holiday country | 1 |
| passport | Valid passport meeting current embassy/CRMD validity requirements | 1 |
| visa_forms | Visa application form complete, signed, and reviewed for consistency | 122 |


## B. Missing catalogue upload candidates

Upload-style labels found in binders/templates/manifests that do **not** map to seeded `document_types`.

| 462_ballot_registration_completed_if_required_in | 462 ballot registration completed if required (India, China, Vietnam) | 1 | australia-work-holiday |
| 462_ballot_selection_if_india_china_or_vietnam_p | 462 ballot selection if India, China, or Vietnam passport | 1 | australia-work-holiday |
| 462_ballot_skipped_india_china_vietnam | 462 ballot skipped (India/China/Vietnam) | 1 | australia-work-holiday |
| 65_points_competitive_score | 65+ points (competitive score) | 1 | australia-skilled-migration |
| 70_points_total_achieved | 70 points total achieved | 1 | uk-skilled-worker |
| academic_module_requirement_confirmed | Academic module requirement confirmed | 2 | coaching-ielts-academic-crash, coaching-ielts-academic-regular |
| academic_progress_below_16_ects_renewal_at_risk | Academic progress below 16 ECTS — renewal at risk | 1 | Austria-Student-Visa |
| accommodation_and_travel_plans | Accommodation and travel plans | 2 | ireland-visitor-visa, uk-visitor-visa |
| accommodation_confirmation | Accommodation confirmation | 2 | mbbs-medical-university-americas, mbbs-st-matthews-university |
| accommodation_confirmation_in_georgia | Accommodation confirmation in Georgia | 3 | mbbs-avicenna-batumi, mbbs-georgian-national-university-seu, mbbs-international-black-sea-university |
| accommodation_confirmation_on_saba | Accommodation confirmation on Saba | 1 | mbbs-saba-university |
| accommodation_evidence | Accommodation evidence | 1 | Latvia-Student-Visa |
| accommodation_or_host_support_evidence | Accommodation or host support evidence | 1 | canada-visitor-record |
| accommodation_plan_in_germany | Accommodation plan in Germany | 1 | germany-job-seeker |
| accommodation_proof | Accommodation proof | 1 | France-Student-Visa |
| accommodation_proof_in_uae | Accommodation proof in UAE | 1 | uae-student-visa |
| additional_funds_proof_for_dependants | Additional funds proof for dependants | 7 | mbbs-avicenna-batumi, mbbs-georgian-national-university-seu, mbbs-international-black-sea-university, mbbs-medical-unive |
| address_proof | Address Proof | 0 | — |
| adequate_accommodation_in_austria | Adequate accommodation in Austria | 1 | Austria-Student-Visa |
| adequate_accommodation_in_uk | Adequate accommodation in UK | 1 | uk-spouse-visa |
| adequate_health_insurance_for_entire_stay_in_aus | Adequate health insurance for entire stay in Australia | 1 | australia-work-holiday |
| adequate_health_insurance_for_stay | Adequate health insurance for stay | 1 | australia-work-holiday |
| adequate_housing_in_germany | Adequate housing in Germany | 1 | germany-spouse-visa |
| admission_documentation_india | admission documentation (India) | 11 | italy-student-visa, malta-student-visa, netherlands-student-visa, portugal-student-visa, spain-student-visa |
| admission_from_a_recognised_austrian_institution | Admission from a recognised Austrian institution (Zulassungsbescheid) | 1 | Austria-Student-Visa |
| admission_from_a_state_recognised_german_institu | Admission from a state-recognised German institution (staatlich anerkannt) | 1 | germany-student-visa |
| admission_from_ica_recognised_institution | Admission from ICA-recognised institution | 1 | singapore-student-visa |
| admission_from_khda_spea_adek_licensed_instituti | Admission from KHDA/SPEA/ADEK-licensed institution | 1 | uae-student-visa |
| admission_from_recognised_austrian_institution | Admission from recognised Austrian institution | 1 | Austria-Student-Visa |
| admission_from_recognised_belgian_institution | Admission from recognised Belgian institution | 1 | Belgium-Student-Visa |
| admission_from_recognised_danish_institution | Admission from recognised Danish institution | 1 | Denmark-Student-Visa |
| admission_from_recognised_dutch_institution | Admission from recognised Dutch institution | 1 | netherlands-student-visa |
| admission_from_recognised_finnish_institution | Admission from recognised Finnish institution | 1 | Finland-Student-Visa |
| admission_from_recognised_french_institution | Admission from recognised French institution | 1 | France-Student-Visa |
| admission_from_recognised_german_institution | Admission from recognised German institution | 1 | germany-student-visa |
| admission_from_recognised_hungary_institution | Admission from recognised Hungary institution | 1 | Hungary-Student-Visa |
| admission_from_recognised_italian_institution | Admission from recognised Italian institution | 1 | italy-student-visa |
| admission_from_recognised_latvia_institution | Admission from recognised Latvia institution | 1 | Latvia-Student-Visa |
| admission_from_recognised_lithuanian_institution | Admission from recognised Lithuanian institution | 1 | lithuania-student-visa |
| admission_from_recognised_maltese_institution | Admission from recognised Maltese institution | 1 | malta-student-visa |
| admission_from_recognised_poland_institution | Admission from recognised Poland institution | 1 | poland-student-visa |
| admission_from_recognised_portuguese_institution | Admission from recognised Portuguese institution | 1 | portugal-student-visa |
| admission_from_recognised_spanish_institution | Admission from recognised Spanish institution | 1 | spain-student-visa |
| admission_from_recognised_swedish_institution | Admission from recognised Swedish institution | 1 | sweden-student-visa |
| admission_to_a_higher_education_programme_in_den | Admission to a higher-education programme in Denmark | 1 | Denmark-Student-Visa |
| admission_to_a_recognised_finnish_institution | Admission to a recognised Finnish institution | 1 | Finland-Student-Visa |
| admission_to_a_recognised_french_institution_3_m | Admission to a recognised French institution (>3 months) | 1 | France-Student-Visa |
| admission_to_an_accredited_latvian_institution_o | Admission to an accredited Latvian institution (OCMA invitation) | 1 | Latvia-Student-Visa |
| age_over_limit_at_lodgement | Age over limit at lodgement | 1 | australia-work-holiday |
| age_under_45_at_invitation | Age under 45 at invitation | 1 | australia-skilled-migration |
| age_under_55_for_maximum_points | Age under 55 (for maximum points) | 1 | nz-skilled-migrant |
| all_application_questions_complete_consistent_wi | All application questions complete — consistent with supporting documents | 1 | australia-work-holiday |
| anmeldung_deadlock_not_planned | Anmeldung deadlock not planned | 1 | germany-student-visa |
| applicant_identity_details_match_ircc_records | Applicant identity details match IRCC records | 1 | canada-caips-notes |
| applicant_passport_valid_for_requested_permit_pe | Applicant passport valid for requested permit period | 1 | canada-spouse-dependent-owp |
| applicant_understands_notes_are_not_an_appeal | Applicant understands notes are not an appeal | 1 | canada-caips-notes |
| application_fee_payment_proof_if_applicable | Application fee payment proof (if applicable) | 7 | mbbs-avicenna-batumi, mbbs-georgian-national-university-seu, mbbs-international-black-sea-university, mbbs-medical-unive |
| application_filed_before_current_status_expires | Application filed before current status expires | 1 | canada-spouse-dependent-extension |
| application_number_uci_or_file_details_available | Application number, UCI, or file details available | 1 | canada-caips-notes |
| applied_before_student_visa_expiry | Applied before Student visa expiry | 1 | uk-graduate-route |
| aps_certificate_india | APS certificate (India) | 1 | germany-student-visa |
| assuming_family_or_long_term_pr_outcomes_from_th | Assuming family or long-term/PR outcomes from the study permit without checking current OIF rules | 1 | Hungary-Student-Visa |
| assuming_the_vls_ts_gives_unlimited_schengen_tra | Assuming the VLS-TS gives unlimited Schengen travel or family rights | 1 | France-Student-Visa |
| assuming_work_is_automatic_no_employer_permit | Assuming work is automatic / no employer permit | 1 | Austria-Student-Visa |
| atas_certificate_if_course_requires | ATAS certificate (if course requires) | 2 | uk-student-visa, Ireland-Student-Visa |
| attested_marriage_certificate_mofa_uae | Attested marriage certificate (MOFA UAE) | 1 | uae-spouse-dependent-visa |
| background_checks_for_hospital_affiliations | Background checks for hospital affiliations | 3 | mbbs-medical-university-americas, mbbs-saba-university, mbbs-st-matthews-university |
| bank_guarantee_repatriation_proof_overlooked | Bank guarantee / repatriation proof overlooked | 1 | Cyprus-Student-Visa |
| batch_timing_suits_student_schedule | Batch timing suits student schedule | 26 | coaching-celpip-general, coaching-duolingo-english-test, coaching-french-language-a1, coaching-french-language-a2, coach |
| biometrics_if_not_in_vis | Biometrics (if not in VIS) | 16 | austria-visitor-visa, belgium-visitor-visa, denmark-visitor-visa, finland-visitor-visa, france-visitor-visa |
| biometrics_if_requested | Biometrics (if requested) | 1 | australia-visitor-visa |
| biometrics_at_vfs_if_required | Biometrics at VFS (if required) | 1 | cyprus-visitor-visa |
| biometrics_deadline_missed | Biometrics deadline missed | 1 | canada-visitor-visa |
| blocked_account_funds_routed_through_the_agency | Blocked-account funds routed through the agency | 1 | germany-student-visa |
| brief_travel_work_plan_holiday_intent_regions_ti | Brief travel / work plan (holiday intent, regions, timeline) | 1 | australia-work-holiday |
| calling_md_an_indian_mbbs | Calling MD an Indian MBBS | 1 | mbbs-saba-university |
| campus_france_tudes_en_france_eef_procedure_comp | Campus France 'Études en France' (EEF) procedure completed | 1 | France-Student-Visa |
| canadian_medical_insurance_arranged | Canadian medical insurance arranged | 1 | canada-super-visa |
| cas_from_licensed_ireland_sponsor | CAS from licensed Ireland sponsor | 1 | Ireland-Student-Visa |
| cas_from_licensed_uk_sponsor | CAS from licensed UK sponsor | 1 | uk-student-visa |
| category_specific_evidence_bundle_complete | Category-specific evidence bundle complete | 1 | uae-golden-visa |
| certificate_of_sponsorship_from_licensed_sponsor | Certificate of Sponsorship from licensed sponsor | 1 | uk-skilled-worker |
| changed_dli_without_records | Changed DLI without records | 1 | canada-study-permit-extension |
| character_requirements_police_certs | Character requirements (police certs) | 2 | australia-spouse-visa, nz-spouse-visa |
| child_grandchild_is_canadian_citizen_or_pr | Child/grandchild is Canadian citizen or PR | 1 | canada-super-visa |
| civil_documents_birth_marriage_police | Civil documents (birth, marriage, police) | 1 | usa-spouse-visa |
| clb_mapping_sheet_mock | CLB mapping sheet (mock) | 1 | coaching-ielts-gt-regular |
| clean_criminal_record_applicants_over_21 | Clean criminal record (applicants over 21) | 1 | Belgium-Student-Visa |
| clean_immigration_and_criminal_history | Clean immigration and criminal history | 2 | germany-skilled-worker, hungary-work-permit |
| clean_uae_immigration_history | Clean UAE immigration history | 1 | uae-golden-visa |
| clear_temporary_purpose | Clear temporary purpose | 1 | usa-visitor-visa |
| clear_temporary_reason_for_extended_stay | Clear temporary reason for extended stay | 1 | canada-visitor-record |
| clear_temporary_visit_purpose | Clear temporary visit purpose | 1 | australia-visitor-visa |
| clear_visit_purpose | Clear visit purpose | 3 | ireland-visitor-visa, nz-visitor-visa, uk-visitor-visa |
| client_briefed_on_study_limit_generally_up_to_4_ | Client briefed on study limit (generally up to 4 months study) | 1 | australia-work-holiday |
| client_briefed_on_whm_work_restrictions_6_month_ | Client briefed on WHM work restrictions (6-month employer limit, etc.) | 1 | australia-work-holiday |
| client_is_physically_in_canada | Client is physically in Canada | 2 | canada-study-permit-extension, canada-visitor-record |
| client_is_physically_in_canada_when_applying | Client is physically in Canada when applying | 1 | canada-bowp |
| closed_permit_employer_change | Closed permit employer change | 1 | canada-work-permit |
| commune_registration_missed_8_days | Commune registration missed (8 days) | 1 | Belgium-Student-Visa |
| competent_english | Competent English | 1 | australia-subclass-485 |
| competent_english_ielts_6_each_band_min | Competent English (IELTS 6 each band min) | 1 | australia-skilled-migration |
| completed_online_application_abmu_portal | Completed online application (ABMU portal) | 1 | mbbs-avicenna-batumi |
| completed_online_application_ibsu_portal | Completed online application (IBSU portal) | 1 | mbbs-international-black-sea-university |
| completed_online_application_mua_portal | Completed online application (MUA portal) | 1 | mbbs-medical-university-americas |
| completed_online_application_seu_portal | Completed online application (SEU portal) | 1 | mbbs-georgian-national-university-seu |
| completed_online_application_smusom_portal | Completed online application (SMUSOM portal) | 1 | mbbs-st-matthews-university |
| completed_online_application_synergy_portal | Completed online application (Synergy portal) | 1 | mbbs-synergy-university |
| completed_susom_online_application_common_applic | Completed SUSOM online application (Common Application portal) | 1 | mbbs-saba-university |
| completion_letter_transcript | Completion letter / transcript | 1 | canada-pgwp |
| comprehensive_private_health_insurance | Comprehensive private health insurance | 1 | Finland-Student-Visa |
| confirm_institution_type_for_pgwp_must_be_public | Confirm institution type for PGWP — must be public DLI where applicable | 1 | canada-student-visa |
| confirmed_duration_and_entry_type_30_60_90_singl | Confirmed duration and entry type (30/60/90, single/multiple) | 2 | singapore-visitor-visa, uae-visitor-visa |
| continues_at_a_dli_or_has_valid_new_loa_from_dli | Continues at a DLI or has valid new LOA from DLI | 1 | canada-study-permit-extension |
| contribution_fee_redevance_bijdrage_unpaid_inadm | Contribution fee (redevance/bijdrage) unpaid → inadmissible | 1 | Belgium-Student-Visa |
| correct_department_and_record_type_selected_in_a | Correct department and record type selected in ATIP portal | 1 | canada-caips-notes |
| correct_extension_form_and_fees_selected | Correct extension form and fees selected | 1 | canada-spouse-dependent-extension |
| correct_module_selected_academic_gt_ukvi | Correct module selected (Academic / GT / UKVI) | 1 | coaching-ielts-test-reference |
| correct_onshore_offshore_pathway | Correct onshore/offshore pathway | 1 | australia-spouse-visa |
| correct_work_permit_category_and_fees_selected_i | Correct work permit category and fees selected in IRCC portal | 1 | canada-bowp |
| cos_errors | CoS errors | 1 | uk-skilled-worker |
| course_fee_collected | Course fee collected | 27 | coaching-celpip-general, coaching-duolingo-english-test, coaching-french-language-a1, coaching-french-language-a2, coach |
| cover_letter_explaining_purpose | Cover letter explaining purpose | 17 | austria-visitor-visa, belgium-visitor-visa, cyprus-visitor-visa, denmark-visitor-visa, finland-visitor-visa |
| cover_letter_too_generic | Cover letter too generic | 2 | ireland-visitor-visa, uk-visitor-visa |
| cpr_tuition_sequencing_missed | CPR / tuition sequencing missed | 1 | Denmark-Student-Visa |
| crash_eligibility_form_mock | Crash eligibility form (mock) | 1 | coaching-ielts-academic-crash |
| criminal_record_certificate | Criminal record certificate | 1 | Austria-Student-Visa |
| crs_score_competitive_for_recent_draws | CRS score competitive for recent draws | 1 | canada-express-entry-pr |
| cultural_marriage_without_support | Cultural marriage without support | 1 | nz-spouse-visa |
| current_visitor_student_or_worker_status_is_vali | Current visitor, student, or worker status is valid or restorable | 1 | canada-visitor-record |
| degree_experience_attested_for_singapore | Degree/experience attested for Singapore | 1 | singapore-employment-pass |
| degree_experience_attested_for_uae | Degree/experience attested for UAE | 1 | uae-work-permit |
| degrees_diplomas_originals_and_copies_certified_ | Degrees / diplomas — originals and copies; certified translations where applicable | 1 | canada-student-visa |
| delivery_email_and_client_contact_details_verifi | Delivery email and client contact details verified | 1 | canada-caips-notes |
| dependant_visa_applications_per_jurisdiction | Dependant visa applications per jurisdiction | 7 | mbbs-avicenna-batumi, mbbs-georgian-national-university-seu, mbbs-international-black-sea-university, mbbs-medical-unive |
| dependent_passport_6_months_valid | Dependent passport 6+ months valid | 1 | uae-spouse-dependent-visa |
| detailed_cv_and_cover_letter | Detailed CV and cover letter | 1 | germany-job-seeker |
| diagnostic_or_prior_gt_score_on_file | Diagnostic or prior GT score on file | 1 | coaching-ielts-gt-regular |
| diagnostic_or_prior_score_on_file | Diagnostic or prior score on file | 26 | coaching-celpip-general, coaching-duolingo-english-test, coaching-french-language-a1, coaching-french-language-a2, coach |
| diagnostic_shows_gap_1_0_band_to_agreed_target_o | Diagnostic shows gap ≤ 1.0 band to agreed target (or skill retake) | 1 | coaching-ielts-academic-crash |
| digital_photo_ircc_specifications_420_540_px_whi | Digital photo — IRCC specifications (420 × 540 px, white background, neutral expression) | 1 | canada-student-visa |
| digital_photo_per_home_affairs_immiaccount_speci | Digital photo per Home Affairs / ImmiAccount specifications | 1 | australia-work-holiday |
| dli_number_verified_against_ircc_s_official_dli_ | DLI number verified against IRCC's official DLI list at canada.ca | 1 | canada-student-visa |
| document_checklist_outside_canada_specimen | Document checklist — outside Canada (specimen) | 1 | canada-student-visa |
| document_quality | Document quality | 1 | uk-student-visa |
| documents_not_ready_at_invitation | Documents not ready at invitation | 1 | australia-skilled-migration |
| ds_160_completed_accurately | DS-160 completed accurately | 2 | usa-student-visa, usa-visitor-visa |
| ds_260_and_embassy_interview | DS-260 and embassy interview | 1 | usa-spouse-visa |
| eca_for_foreign_credentials_fsw | ECA for foreign credentials (FSW) | 1 | canada-express-entry-pr |
| ejari_registered_accommodation | Ejari-registered accommodation | 1 | uae-spouse-dependent-visa |
| emirate_route_selected_dubai_sharjah_abu_dhabi | Emirate route selected (Dubai / Sharjah / Abu Dhabi) | 2 | singapore-visitor-visa, uae-visitor-visa |
| emirates_id_delay | Emirates ID delay | 2 | singapore-student-visa, uae-student-visa |
| employer_compliance_history | Employer compliance history | 1 | canada-work-permit |
| employer_sponsorship_perm_eb_2_3 | Employer sponsorship / PERM (EB-2/3) | 1 | usa-green-card |
| employer_restricted_pnp_nomination | Employer-restricted PNP nomination | 1 | canada-bowp |
| employment_focused_motive | Employment-focused motive | 1 | australia-work-holiday |
| english_a1_entry_clearance | English A1 (entry clearance) | 1 | uk-spouse-visa |
| english_b1_selt_or_exempt | English B1 (SELT or exempt) | 1 | uk-skilled-worker |
| english_competency_ielts_6_5_avg_or_equivalent | English competency (IELTS 6.5 avg or equivalent) | 1 | nz-skilled-migrant |
| english_language_at_selt_level_if_required | English language at SELT level (if required) | 2 | uk-student-visa, Ireland-Student-Visa |
| english_not_competent | English not competent | 1 | australia-subclass-485 |
| english_proficiency | English proficiency | 2 | Australia-Student-Visa, nz-student-visa |
| english_proficiency_as_required_by_school | English proficiency (as required by school) | 1 | usa-student-visa |
| english_proficiency_if_required | English proficiency (if required) | 7 | mbbs-avicenna-batumi, mbbs-georgian-national-university-seu, mbbs-international-black-sea-university, mbbs-medical-unive |
| english_proficiency_evidence_if_requested | English proficiency evidence (if requested) | 6 | mbbs-avicenna-batumi, mbbs-georgian-national-university-seu, mbbs-international-black-sea-university, mbbs-medical-unive |
| english_proficiency_evidence_toefl_ielts_if_requ | English proficiency evidence (TOEFL/IELTS if requested) | 1 | mbbs-saba-university |
| english_proficiency_or_university_waiver | English proficiency or university waiver | 1 | Cyprus-Student-Visa |
| english_requirement_missed | English requirement missed | 1 | uk-spouse-visa |
| english_language_ability_where_required | English-language ability where required | 1 | Ireland-Student-Visa |
| enrollment_agreement_signed | Enrollment agreement signed | 28 | coaching-celpip-general, coaching-duolingo-english-test, coaching-french-language-a1, coaching-french-language-a2, coach |
| enrollment_checklist_celpip_general | Enrollment checklist — CELPIP General | 1 | coaching-celpip-general |
| enrollment_checklist_ielts_academic_regular | Enrollment checklist — IELTS Academic Regular | 1 | coaching-ielts-test-reference |
| eoi_selected_but_docs_not_ready | EOI selected but docs not ready | 1 | nz-skilled-migrant |
| eoi_submitted_and_selected | EOI submitted and selected | 1 | nz-skilled-migrant |
| eoi_submitted_in_skillselect | EOI submitted in SkillSelect | 1 | australia-skilled-migration |
| expired_passport_at_booking | Expired passport at booking | 1 | coaching-ielts-test-reference |
| family_information_form_imm_5707_or_imm_5645_if_ | Family information form IMM 5707 (or IMM 5645 if applicable) | 1 | canada-student-visa |
| family_relocation_without_visa_plan | Family relocation without visa plan | 7 | mbbs-avicenna-batumi, mbbs-georgian-national-university-seu, mbbs-international-black-sea-university, mbbs-medical-unive |
| final_admission_enrolment_at_a_recognised_belgia | Final admission/enrolment at a recognised Belgian institution | 1 | Belgium-Student-Visa |
| financial_proof_bank_statements_history_bank_gua | Financial proof (bank statements + history; bank guarantee if required) | 1 | Cyprus-Student-Visa |
| financial_proof_7_000_10_000 | Financial proof €7,000–€10,000+ | 1 | Cyprus-Student-Visa |
| financial_proof_per_institution_guidelines | Financial proof per institution guidelines | 1 | singapore-student-visa |
| financial_requirement_met_28_day_rule | Financial requirement met (28-day rule) | 2 | uk-student-visa, Ireland-Student-Visa |
| first_working_holiday_maker_whm_visa_no_prior_wh | First Working Holiday Maker (WHM) visa — no prior WHM held | 1 | australia-work-holiday |
| first_working_holiday_maker_visa | First Working Holiday Maker visa | 1 | australia-work-holiday |
| form_i_20_from_sevp_certified_school | Form I-20 from SEVP-certified school | 1 | usa-student-visa |
| full_time_admission_to_a_recognised_hungarian_in | Full-time admission to a recognised Hungarian institution | 1 | Hungary-Student-Visa |
| full_time_student_status_maintained | Full-time student status maintained | 1 | canada-pgwp |
| funds_and_admissibility_evidence_current | Funds and admissibility evidence current | 1 | canada-spouse-dependent-extension |
| funds_for_visit_and_return_travel | Funds for visit and return travel | 1 | canada-spouse-dependent-visitor |
| funds_not_genuinely_available_unexplained_large_ | Funds not genuinely available / unexplained large deposit | 1 | Australia-Student-Visa |
| funds_or_family_support_evidence_available_for_s | Funds or family support evidence available for settlement and stay | 1 | canada-spouse-dependent-owp |
| generic_cover_letter | Generic cover letter | 2 | australia-visitor-visa, nz-visitor-visa |
| generic_or_copied_sop | Generic or copied SOP | 1 | canada-student-visa |
| genuine_and_continuing_relationship_evidence | Genuine and continuing relationship evidence | 1 | australia-spouse-visa |
| genuine_and_stable_relationship_12_months | Genuine and stable relationship 12+ months | 1 | nz-spouse-visa |
| genuine_intention_to_holiday_work_temporarily | Genuine intention to holiday/work temporarily | 1 | australia-work-holiday |
| genuine_relationship_evidence | Genuine relationship evidence | 4 | canada-spouse-visa, germany-spouse-visa, uk-spouse-visa, usa-spouse-visa |
| genuine_training_intent_and_career_plan | Genuine training intent and career plan | 1 | germany-ausbildung |
| genuine_student_credibility | Genuine-student credibility | 1 | Ireland-Student-Visa |
| genuine_full_time_study_intent | Genuine, full-time study intent | 1 | Finland-Student-Visa |
| georgia_long_stay_d5_student_visa_application | Georgia long-stay D5 / student visa application | 3 | mbbs-avicenna-batumi, mbbs-georgian-national-university-seu, mbbs-international-black-sea-university |
| german_a1_certificate_if_required | German A1 certificate (if required) | 1 | germany-spouse-visa |
| german_a1_or_english_b2 | German A1 or English B2 | 1 | germany-opportunity-card |
| german_language_level_b1_b2_as_required_by_progr | German language level B1/B2 as required by program | 1 | germany-ausbildung |
| german_language_level_per_role_requirements | German language level per role requirements | 1 | germany-skilled-worker |
| good_character | Good character | 1 | nz-post-study-work |
| government_support_letter_letter_of_support_if_r | Government support letter / letter of support if required for passport country | 1 | australia-work-holiday |
| graduate_certificate_assumed_pal_exempt | Graduate certificate assumed PAL-exempt | 1 | canada-student-visa |
| gt_writing_task_1_letter_sample_mock | GT Writing Task 1 letter sample (mock) | 1 | coaching-ielts-gt-regular |
| guaranteed_licensure_promise | Guaranteed licensure promise | 6 | mbbs-avicenna-batumi, mbbs-georgian-national-university-seu, mbbs-international-black-sea-university, mbbs-medical-unive |
| guaranteed_residency_promise | Guaranteed residency promise | 1 | mbbs-saba-university |
| has_aor_or_proof_pr_application_passed_completen | Has AOR or proof PR application passed completeness check as required | 1 | canada-bowp |
| health_character_requirements | Health & character requirements | 2 | australia-work-holiday, nz-visitor-visa |
| health_and_character_clearances | Health and character clearances | 2 | australia-subclass-485, nz-skilled-migrant |
| health_exam_if_required | Health exam (if required) | 1 | Australia-Student-Visa |
| health_examinations_completed_if_home_affairs_re | Health examinations completed if Home Affairs requests them | 1 | australia-work-holiday |
| health_requirements | Health requirements | 1 | nz-spouse-visa |
| hiv_test_certificate_if_required_by_consulate | HIV test certificate (if required by consulate) | 1 | mbbs-synergy-university |
| hungarian_language_level_per_role_requirements | Hungarian language level per role requirements | 1 | hungary-work-permit |
| i_140_approved | I-140 approved | 1 | usa-green-card |
| i_864_affidavit_of_support | I-864 affidavit of support | 1 | usa-spouse-visa |
| id_proof | ID Proof | 0 | — |
| identity_verification_at_a_mission_vfs | Identity verification at a mission/VFS | 1 | Finland-Student-Visa |
| ihs_not_paid | IHS not paid | 1 | uk-graduate-route |
| ihs_paid | IHS paid | 1 | uk-graduate-route |
| immiaccount_created_and_online_whm_application_s | ImmiAccount created and online WHM application started | 1 | australia-work-holiday |
| immigration_history_concerns | Immigration history concerns | 2 | ireland-visitor-visa, uk-visitor-visa |
| immigration_history_disclosed | Immigration history disclosed | 5 | australia-visitor-visa, nz-spouse-visa, nz-visitor-visa, uk-student-visa, Ireland-Student-Visa |
| immigration_history_fully_disclosed | Immigration history fully disclosed | 1 | canada-pnp-program |
| immigration_medical_exam_if_required | Immigration medical exam (if required) | 1 | canada-student-visa |
| income_cannot_generate_the_savings_shown | Income cannot generate the savings shown | 1 | canada-student-visa |
| incomplete_completion_evidence | Incomplete completion evidence | 1 | nz-post-study-work |
| incomplete_it_experience_evidence | Incomplete IT experience evidence | 3 | germany-blue-card, germany-opportunity-card, poland-eu-blue-card |
| incomplete_noa_documents | Incomplete NOA documents | 1 | canada-super-visa |
| incorrect_eb_category | Incorrect EB category | 1 | usa-green-card |
| incorrect_fee_or_application_type | Incorrect fee or application type | 1 | canada-bowp |
| indian_documents_attested_mofa_uae_as_required | Indian documents attested (MOFA UAE as required) | 1 | uae-student-visa |
| intent_to_reside_in_nominating_province | Intent to reside in nominating province | 1 | canada-pnp-program |
| intent_to_reside_in_ontario_demonstrable | Intent to reside in Ontario demonstrable | 1 | canada-oinp |
| interview_appointment_booked | Interview appointment booked | 1 | usa-visitor-visa |
| invitation_received | Invitation received | 1 | australia-skilled-migration |
| ircc_online_profile_complete_imm_5257_online_app | IRCC online profile complete — IMM 5257 / online application signed & reviewed | 1 | canada-student-visa |
| itr_tax_returns | ITR / Tax Returns | 0 | — |
| job_offer_meets_blue_card_salary_threshold | Job offer meets Blue Card salary threshold | 2 | germany-blue-card, poland-eu-blue-card |
| job_offer_meets_noc_teer_and_wage_requirements_i | Job offer meets NOC/TEER and wage requirements if stream requires | 1 | canada-oinp |
| job_search_plan | Job search plan | 1 | germany-job-seeker |
| language_ability_matching_the_programme | Language ability matching the programme | 4 | Denmark-Student-Visa, France-Student-Visa, Hungary-Student-Visa, Latvia-Student-Visa |
| language_proficiency_as_required | Language proficiency (as required) | 16 | germany-student-visa, italy-student-visa, lithuania-student-visa, malta-student-visa, netherlands-student-visa |
| language_proficiency_evidence_dli_genuineness | Language proficiency evidence (DLI / genuineness) | 1 | canada-student-visa |
| language_proof_missing | Language proof missing | 10 | germany-ausbildung, germany-student-visa, italy-student-visa, lithuania-student-visa, malta-student-visa |
| language_scores_expired | Language scores expired | 4 | canada-express-entry-pr, canada-oinp, canada-pnp-program, canada-tr-to-pr |
| language_scores_meet_oinp_and_ircc_minimums | Language scores meet OINP and IRCC minimums | 1 | canada-oinp |
| language_scores_meet_pr_program_minimums | Language scores meet PR program minimums | 1 | canada-tr-to-pr |
| language_integration_requirements_if_applicable | Language/integration requirements (if applicable) | 5 | finland-spouse-visa, hungary-spouse-visa, latvia-spouse-visa, poland-spouse-visa, singapore-spouse-dependent-visa |
| legally_valid_marriage_recognised_in_germany | Legally valid marriage recognised in Germany | 1 | germany-spouse-visa |
| letters_of_recommendation_per_susom_requirements | Letters of recommendation (per SUSOM requirements) | 1 | mbbs-saba-university |
| letters_of_recommendation_per_university_require | Letters of recommendation (per university requirements) | 6 | mbbs-avicenna-batumi, mbbs-georgian-national-university-seu, mbbs-international-black-sea-university, mbbs-medical-unive |
| lmia_positive_or_exempt_category_confirmed | LMIA positive or exempt category confirmed | 1 | canada-work-permit |
| long_serial_extensions | Long serial extensions | 1 | canada-visitor-record |
| long_stay_without_reason | Long stay without reason | 1 | australia-visitor-visa |
| maintenance_funds_if_applicable | Maintenance funds (if applicable) | 1 | uk-skilled-worker |
| medical_if_required | Medical (if required) | 1 | nz-post-study-work |
| medical_and_police_certificates_as_required | Medical and police certificates as required | 1 | canada-tr-to-pr |
| medical_and_police_completed_after_ita | Medical and police completed after ITA | 1 | canada-express-entry-pr |
| medical_certificate | Medical certificate | 1 | Belgium-Student-Visa |
| medical_certificate_if_required | Medical certificate (if required) | 1 | nz-student-visa |
| medical_fitness | Medical fitness | 1 | uae-golden-visa |
| medical_fitness_singapore_panel | Medical fitness (Singapore panel) | 1 | singapore-employment-pass |
| medical_fitness_uae_panel | Medical fitness (UAE panel) | 1 | uae-work-permit |
| medical_fitness_test_uae_approved | Medical fitness test (UAE-approved) | 1 | uae-student-visa |
| medical_insurance_health_certificate | Medical insurance / health certificate | 1 | mbbs-synergy-university |
| medical_insurance_proof | Medical insurance proof | 6 | mbbs-avicenna-batumi, mbbs-georgian-national-university-seu, mbbs-international-black-sea-university, mbbs-medical-unive |
| medical_panel_hiv_hep_b_c_syphilis_tb_valid_4_mo | Medical panel (HIV, Hep B/C, Syphilis, TB — valid 4 months) | 1 | Cyprus-Student-Visa |
| meet_susom_admission_requirements | Meet SUSOM admission requirements | 1 | mbbs-saba-university |
| meet_university_academic_entry_requirements | Meet university academic entry requirements | 6 | mbbs-avicenna-batumi, mbbs-georgian-national-university-seu, mbbs-international-black-sea-university, mbbs-medical-unive |
| migration_pr_pathway_confirmed_gt_required_not_a | Migration / PR pathway confirmed — GT required (not Academic) | 1 | coaching-ielts-gt-regular |
| minimum_6_points_achieved | Minimum 6 points achieved | 1 | germany-opportunity-card |
| minimum_age_no_upper_limit_minors_need_guardian_ | Minimum age — no upper limit; minors need guardian consent per center | 1 | coaching-ielts-test-reference |
| misrepresentation_risk | Misrepresentation risk | 4 | canada-express-entry-pr, canada-oinp, canada-pnp-program, canada-tr-to-pr |
| missing_completion_letter | Missing completion letter | 1 | canada-pgwp |
| missing_medical_certificate_or_criminal_record_o | Missing medical certificate or criminal-record (over 21) | 1 | Belgium-Student-Visa |
| mohre_work_permit_pre_approval_obtained | MOHRE work permit / pre-approval obtained | 1 | uae-work-permit |
| mom_work_permit_pre_approval_obtained | MOM work permit / pre-approval obtained | 1 | singapore-employment-pass |
| motivation_letter_and_cv | Motivation letter and CV | 16 | germany-student-visa, italy-student-visa, lithuania-student-visa, malta-student-visa, netherlands-student-visa |
| multiple_previous_refusals_without_material_chan | Multiple previous refusals without material change | 1 | canada-student-visa |
| name_on_registration_matches_passport_exactly | Name on registration matches passport exactly | 1 | coaching-ielts-test-reference |
| neet_scorecard_indian_applicants_if_required_und | NEET scorecard (Indian applicants — if required under current NMC rules) | 7 | mbbs-avicenna-batumi, mbbs-georgian-national-university-seu, mbbs-international-black-sea-university, mbbs-medical-unive |
| nmc_list_not_verified | NMC list not verified | 7 | mbbs-avicenna-batumi, mbbs-georgian-national-university-seu, mbbs-international-black-sea-university, mbbs-medical-unive |
| no_health_insurance | No health insurance | 1 | australia-work-holiday |
| no_misrepresentation_or_undeclared_refusals | No misrepresentation or undeclared refusals | 1 | canada-oinp |
| no_prior_immigration_breaches_undisclosed | No prior immigration breaches undisclosed | 2 | ireland-visitor-visa, uk-visitor-visa |
| no_prior_singapore_overstay_or_ban | No prior Singapore overstay or ban | 1 | singapore-visitor-visa |
| no_prior_uae_overstay_or_ban | No prior UAE overstay or ban | 1 | uae-visitor-visa |
| no_prior_visa_fraud | No prior visa fraud | 1 | usa-visitor-visa |
| no_unauthorized_work_or_study_history | No unauthorized work or study history | 1 | canada-study-permit-extension |
| no_unauthorized_work_or_study_planned | No unauthorized work or study planned | 1 | canada-visitor-record |
| nomination_certificate_or_invitation_pathway_ide | Nomination certificate or invitation pathway identified | 1 | canada-pnp-program |
| non_immigrant_intent_ties_to_india | Non-immigrant intent / ties to India | 1 | usa-student-visa |
| not_accompanied_by_dependent_children_at_any_tim | Not accompanied by dependent children at any time during stay | 1 | australia-work-holiday |
| not_bringing_dependent_children | Not bringing dependent children | 1 | australia-work-holiday |
| not_previously_held_graduate_route | Not previously held Graduate Route | 1 | uk-graduate-route |
| not_previously_received_pgwp | Not previously received PGWP | 1 | canada-pgwp |
| nz_citizen_or_resident_partner | NZ citizen or resident partner | 1 | nz-spouse-visa |
| occupation_on_skilled_occupation_list | Occupation on skilled occupation list | 1 | australia-skilled-migration |
| offer_of_place_from_approved_provider | Offer of Place from approved provider | 1 | nz-student-visa |
| official_transcripts_10th_12th_bachelor_s_pre_me | Official transcripts (10th, 12th, bachelor's / pre-med as required) | 6 | mbbs-avicenna-batumi, mbbs-georgian-national-university-seu, mbbs-international-black-sea-university, mbbs-medical-unive |
| official_transcripts_10th_12th_bachelor_s_pre_me | Official transcripts (10th, 12th, bachelor's / pre-med) | 1 | mbbs-saba-university |
| oinp_eoi_submitted_or_invitation_received_where_ | OINP EOI submitted or invitation received where required | 1 | canada-oinp |
| onward_return_travel_plans | Onward/return travel plans | 1 | nz-visitor-visa |
| original_letter_of_acceptance_loa_program_name_s | Original Letter of Acceptance (LOA) — program name, start/end dates, tuition amount | 1 | canada-student-visa |
| outdated_consent_form | Outdated consent form | 1 | canada-caips-notes |
| outdated_tuition_quotes | Outdated tuition quotes | 6 | mbbs-avicenna-batumi, mbbs-georgian-national-university-seu, mbbs-international-black-sea-university, mbbs-medical-unive |
| over_documented_or_fake_papers | Over-documented or fake papers | 1 | usa-visitor-visa |
| over_rehearsed_or_argumentative_interview | Over-rehearsed or argumentative interview | 1 | usa-student-visa |
| overstated_stay_or_vague_itinerary | Overstated stay or vague itinerary | 1 | canada-visitor-visa |
| pal_tal_exemption_confirmed_master_s_or_phd_at_p | PAL/TAL exemption confirmed (Master's or PhD at public DLI, K–12, extension at same DLI) | 1 | canada-student-visa |
| parent_id_proof | Parent ID Proof | 0 | — |
| parent_or_sponsor_financial_documents_if_sponsor | Parent or sponsor financial documents (if sponsored) | 1 | canada-student-visa |
| partner_support_declaration | Partner support declaration | 1 | nz-spouse-visa |
| passport_expires_before_pgwp_length | Passport expires before PGWP length | 1 | canada-pgwp |
| passport_expires_soon | Passport expires soon | 1 | canada-study-permit-extension |
| passport_expiring | Passport expiring | 1 | canada-visitor-record |
| passport_not_meeting_france_visas_schengen_requi | Passport not meeting France-Visas/Schengen requirements | 1 | France-Student-Visa |
| passport_scan_and_photo_per_spec | Passport scan and photo per spec | 2 | singapore-visitor-visa, uae-visitor-visa |
| passport_valid | Passport valid | 1 | uk-graduate-route |
| passport_valid_6_months | Passport valid 6+ months | 9 | singapore-employment-pass, uae-golden-visa, uae-student-visa, uae-work-permit, mbbs-avicenna-batumi |
| passport_valid_6_months_beyond_stay | Passport valid 6+ months beyond stay | 1 | mbbs-synergy-university |
| passport_valid_beyond_requested_extension_period | Passport valid beyond requested extension period | 1 | canada-study-permit-extension |
| passport_valid_for_requested_stay_period | Passport valid for requested stay period | 1 | canada-visitor-record |
| passport_valid_for_requested_work_permit_period | Passport valid for requested work permit period | 1 | canada-bowp |
| passport_valid_through_desired_pgwp_period | Passport valid through desired PGWP period | 1 | canada-pgwp |
| passport_size_photographs_per_embassy_online_por | Passport-size photographs per embassy / online portal specifications | 122 | canada-spouse-dependent-visitor, Australia-Student-Visa, Austria-Student-Visa, Belgium-Student-Visa, Cyprus-Student-Visa |
| permit_lapse_from_being_abroad_6_months | Permit lapse from being abroad >6 months | 1 | Denmark-Student-Visa |
| personal_statement_essays_per_application | Personal statement / essays per application | 1 | mbbs-saba-university |
| personal_statement_motivation_letter | Personal statement / motivation letter | 6 | mbbs-avicenna-batumi, mbbs-georgian-national-university-seu, mbbs-international-black-sea-university, mbbs-medical-unive |
| points_meet_or_exceed_recent_selection_threshold | Points meet or exceed recent selection threshold | 1 | nz-skilled-migrant |
| police_certificate_if_required | Police certificate (if required) | 1 | nz-student-visa |
| police_certificate_s_each_country_lived_6_months | Police certificate(s) — each country lived 6+ months since age 18 | 1 | canada-student-visa |
| police_certificates_if_required | Police certificates (if required) | 1 | Australia-Student-Visa |
| police_certificates_as_required | Police certificates as required | 1 | canada-spouse-visa |
| police_certificates_from_countries_lived_12_mont | Police certificates from countries lived 12+ months since age 16 (if requested) | 1 | australia-work-holiday |
| positive_skills_assessment | Positive skills assessment | 1 | australia-skilled-migration |
| previous_post_study_work_visa_limits | Previous post-study work visa limits | 1 | nz-post-study-work |
| principal_applicant_has_clear_canadian_pathway_o | Principal applicant has clear Canadian pathway or status plan | 1 | canada-spouse-dependent-visitor |
| principal_applicant_holds_valid_status_or_approv | Principal applicant holds valid status or approved extension | 1 | canada-spouse-dependent-extension |
| principal_applicant_status_document_work_permit_ | Principal applicant status document (work permit / study permit / PR card copy) | 1 | canada-spouse-dependent-visitor |
| prior_immigration_violations | Prior immigration violations | 1 | usa-spouse-visa |
| prior_singapore_overstay | Prior Singapore overstay | 1 | singapore-student-visa |
| prior_status_history_and_refusals_disclosed | Prior status history and refusals disclosed | 1 | canada-visitor-record |
| prior_status_violations | Prior status violations | 1 | canada-work-permit |
| prior_uae_overstay | Prior UAE overstay | 1 | uae-student-visa |
| prior_whm_visa_held | Prior WHM visa held | 1 | australia-work-holiday |
| priority_date_current_visa_bulletin | Priority date current (Visa Bulletin) | 1 | usa-green-card |
| privacy_authorization_and_service_agreement_on_f | Privacy authorization and service agreement on file | 1 | canada-caips-notes |
| private_medical_insurance | Private medical insurance | 1 | Ireland-Student-Visa |
| program_start_date_allows_realistic_ircc_process | Program start date allows realistic IRCC processing time | 1 | canada-student-visa |
| proof_of_accommodation | Proof of accommodation | 1 | Hungary-Student-Visa |
| proof_of_accommodation_and_itinerary | Proof of accommodation and itinerary | 17 | austria-visitor-visa, belgium-visitor-visa, cyprus-visitor-visa, denmark-visitor-visa, finland-visitor-visa |
| proof_of_accommodation_in_cyprus | Proof of accommodation in Cyprus | 1 | Cyprus-Student-Visa |
| proof_of_enrolment_or_transcript_shows_active_st | Proof of enrolment or transcript shows active study progress | 1 | canada-study-permit-extension |
| proof_of_financial_means_age_linked_12_months | Proof of financial means (age-linked, 12 months) | 1 | Austria-Student-Visa |
| proof_of_financial_support | Proof of financial support | 1 | usa-student-visa |
| proof_of_financial_support_tuition_living_costs | Proof of financial support (tuition + living costs) | 1 | canada-student-visa |
| proof_of_first_year_tuition_payment_or_payment_a | Proof of first-year tuition payment (or payment arrangement with institution) | 1 | canada-student-visa |
| proof_of_genuine_relationship | Proof of genuine relationship | 5 | finland-spouse-visa, hungary-spouse-visa, latvia-spouse-visa, poland-spouse-visa, singapore-spouse-dependent-visa |
| proof_of_living_funds_at_least_cad_22_895_sep_20 | Proof of living funds: at least CAD $22,895 (Sep 2025 threshold) + first-year tuition + travel | 1 | canada-student-visa |
| proof_of_purpose_tourism_family_business | Proof of purpose (tourism / family / business) | 1 | canada-visitor-visa |
| proof_of_self_support_where_required | Proof of self-support where required | 1 | Denmark-Student-Visa |
| proof_of_subsistence | Proof of subsistence | 1 | Latvia-Student-Visa |
| proof_of_subsistence_funds | Proof of subsistence funds | 1 | Hungary-Student-Visa |
| proof_of_sufficient_funds_for_initial_stay_typic | Proof of sufficient funds for initial stay (typically AUD $5,000+ or equivalent) | 1 | australia-work-holiday |
| proof_of_sufficient_means | Proof of sufficient means | 1 | Finland-Student-Visa |
| proof_of_sufficient_means_of_subsistence | Proof of sufficient means of subsistence | 1 | Belgium-Student-Visa |
| proof_of_sufficient_resources | Proof of sufficient resources | 1 | France-Student-Visa |
| proof_of_tuition_payment_or_financial_guarantee | Proof of tuition payment or financial guarantee | 7 | mbbs-avicenna-batumi, mbbs-georgian-national-university-seu, mbbs-international-black-sea-university, mbbs-medical-unive |
| provincial_territorial_attestation_letter_pal_ta | Provincial / Territorial Attestation Letter (PAL/TAL) — 2026 rules | 1 | canada-student-visa |
| provincial_attestation_letter_pal_tal_if_require | Provincial Attestation Letter (PAL/TAL) if required | 1 | canada-student-visa |
| provincial_nomination_has_no_employment_restrict | Provincial nomination has no employment restriction, if PNP-based | 1 | canada-bowp |
| quebec_acceptance_certificate_caq_for_quebec_stu | Quebec Acceptance Certificate (CAQ) for Quebec studies | 1 | canada-student-visa |
| quoting_a_flat_20_h_week_work_limit_to_a_bachelo | Quoting a flat 20 h/week work limit to a bachelor student | 1 | Austria-Student-Visa |
| realistic_clb_band_target_vs_current_level | Realistic CLB / band target vs current level | 1 | coaching-ielts-gt-regular |
| realistic_target_band_vs_current_level | Realistic target band vs current level | 1 | coaching-ielts-academic-regular |
| realistic_target_vs_current_level | Realistic target vs current level | 25 | coaching-celpip-general, coaching-duolingo-english-test, coaching-french-language-a1, coaching-french-language-a2, coach |
| recognised_degree_or_it_experience_pathway | Recognised degree or IT experience pathway | 1 | germany-opportunity-card |
| relationship_evidence_marriage_certificate_photo | Relationship evidence — marriage certificate, photos, communication history | 14 | australia-spouse-visa, canada-spouse-dependent-extension, canada-spouse-dependent-owp, canada-spouse-visa, finland-spous |
| relationship_evidence_photos_communication_histo | Relationship evidence — photos, communication history, shared documents | 1 | canada-spouse-dependent-visitor |
| relationship_evidence_package | Relationship evidence package | 1 | nz-spouse-visa |
| relationship_proof | Relationship Proof | 0 | — |
| requester_eligibility_confirmed_for_atip_submiss | Requester eligibility confirmed for ATIP submission | 1 | canada-caips-notes |
| return_onward_travel_evidence_or_funds_to_purcha | Return/onward travel evidence or funds to purchase departure ticket | 1 | australia-work-holiday |
| return_onward_travel_plan | Return/onward travel plan | 2 | singapore-visitor-visa, uae-visitor-visa |
| salary_meets_threshold_for_occupation_region | Salary meets threshold for occupation/region | 2 | germany-skilled-worker, hungary-work-permit |
| salary_meets_threshold_going_rate | Salary meets threshold/going rate | 1 | uk-skilled-worker |
| salary_slips | Salary Slips | 0 | — |
| sample_4_week_study_plan_mock | Sample 4-week study plan (mock) | 1 | coaching-ielts-academic-regular |
| sample_academic_transcripts_mock | Sample academic transcripts (mock) | 6 | Australia-Student-Visa, Ireland-Student-Visa, canada-student-visa, nz-student-visa, uk-student-visa |
| sample_admission_decision_zulassungsbescheid_moc | Sample admission decision (Zulassungsbescheid, mock) | 1 | Austria-Student-Visa |
| sample_admission_documentation_mock | Sample admission documentation (mock) | 11 | Belgium-Student-Visa, italy-student-visa, lithuania-student-visa, malta-student-visa, netherlands-student-visa |
| sample_aps_certificate_mock | Sample APS certificate (mock) | 2 | germany-ausbildung, germany-student-visa |
| sample_atip_payment_receipt_mock | Sample ATIP payment receipt (mock) | 1 | canada-caips-notes |
| sample_bank_statement_mock | Sample bank statement (mock) | 70 | australia-skilled-migration, australia-spouse-visa, australia-subclass-485, australia-visitor-visa, australia-work-holid |
| sample_bank_statement_28_day_rule_mock | Sample bank statement / 28-day rule (mock) | 1 | uk-student-visa |
| sample_bank_statement_proof_of_funds_mock | Sample bank statement / proof of funds (mock) | 1 | Ireland-Student-Visa |
| sample_blocked_account_funds_proof_mock | Sample blocked account / funds proof (mock) | 5 | germany-job-seeker, germany-skilled-worker, hungary-work-permit, singapore-employment-pass, uae-work-permit |
| sample_blocked_account_confirmation_mock | Sample blocked account confirmation (mock) | 2 | germany-ausbildung, germany-student-visa |
| sample_campus_france_proof_of_resources_mock | Sample Campus France / proof-of-resources (mock) | 1 | France-Student-Visa |
| sample_cas_letter_mock | Sample CAS letter (mock) | 1 | uk-student-visa |
| sample_chat_communication_evidence_mock | Sample chat / communication evidence (mock) | 12 | australia-spouse-visa, canada-spouse-visa, finland-spouse-visa, germany-spouse-visa, hungary-spouse-visa |
| sample_child_income_proof_mock | Sample child income proof (mock) | 1 | canada-super-visa |
| sample_coe_mock | Sample CoE (mock) | 1 | Australia-Student-Visa |
| sample_completion_graduation_letter_mock | Sample completion / graduation letter (mock) | 4 | australia-subclass-485, canada-pgwp, nz-post-study-work, uk-graduate-route |
| sample_consent_parental_letter_mock | Sample consent / parental letter (mock) | 2 | Ireland-Student-Visa, uk-student-visa |
| sample_consent_form_mock | Sample consent form (mock) | 1 | canada-caips-notes |
| sample_current_study_permit_mock | Sample current study permit (mock) | 1 | canada-study-permit-extension |
| sample_current_work_permit_mock | Sample current work permit (mock) | 1 | canada-bowp |
| sample_cv_european_format_mock | Sample CV (European format mock) | 5 | germany-job-seeker, germany-skilled-worker, hungary-work-permit, singapore-employment-pass, uae-work-permit |
| sample_cv_motivation_letter_mock | Sample CV & motivation letter (mock) | 20 | Austria-Student-Visa, Belgium-Student-Visa, Cyprus-Student-Visa, Denmark-Student-Visa, Finland-Student-Visa |
| sample_degree_vocational_certificate_mock | Sample degree / vocational certificate (mock) | 5 | germany-job-seeker, germany-skilled-worker, hungary-work-permit, singapore-employment-pass, uae-work-permit |
| sample_diagnostic_score_sheet_mock | Sample diagnostic score sheet (mock) | 1 | coaching-ielts-academic-regular |
| sample_digital_photo_mock | Sample digital photo (mock) | 1 | canada-bowp |
| sample_ds_160_confirmation_mock | Sample DS-160 confirmation (mock) | 1 | usa-student-visa |
| sample_eca_report_mock | Sample ECA report (mock) | 12 | australia-skilled-migration, canada-express-entry-pr, canada-oinp, canada-pnp-program, canada-tr-to-pr |
| sample_employer_support_letter_mock | Sample employer support letter (mock) | 1 | canada-work-permit |
| sample_employment_noc_letter_mock | Sample employment / NOC letter (mock) | 25 | australia-visitor-visa, austria-visitor-visa, belgium-visitor-visa, canada-visitor-visa, cyprus-visitor-visa |
| sample_employment_letter_mock | Sample employment letter (mock) | 1 | canada-bowp |
| sample_employment_reference_letter_mock | Sample employment reference letter (mock) | 12 | australia-skilled-migration, canada-express-entry-pr, canada-oinp, canada-pnp-program, canada-tr-to-pr |
| sample_employment_ties_letter_mock | Sample employment ties letter (mock) | 1 | australia-work-holiday |
| sample_enrolment_letter_mock | Sample enrolment letter (mock) | 1 | canada-study-permit-extension |
| sample_entry_stamp_prior_permit_mock | Sample entry stamp / prior permit (mock) | 1 | canada-visitor-record |
| sample_explanation_letter_mock | Sample explanation letter (mock) | 2 | canada-bowp, canada-study-permit-extension |
| sample_final_transcript_mock | Sample final transcript (mock) | 4 | australia-subclass-485, canada-pgwp, nz-post-study-work, uk-graduate-route |
| sample_financial_affidavit_i_134_mock | Sample financial affidavit / I-134 (mock) | 1 | usa-student-visa |
| sample_financial_proof_7_000_10_000_illustrative | Sample financial proof (€7,000–€10,000 (illustrative working benchmark only — NOT an official minimum; verify with CRMD  | 1 | Cyprus-Student-Visa |
| sample_funds_proof_mock | Sample funds proof (mock) | 1 | nz-student-visa |
| sample_gcms_notes_release_mock | Sample GCMS notes release (mock) | 1 | canada-caips-notes |
| sample_gic_certificate_mock | Sample GIC certificate (mock) | 1 | canada-student-visa |
| sample_holiday_travel_plan_mock | Sample holiday / travel plan (mock) | 1 | australia-work-holiday |
| sample_host_invitation_letter_mock | Sample host invitation letter (mock) | 1 | canada-visitor-record |
| sample_host_proof_of_status_mock | Sample host proof of status (mock) | 1 | canada-visitor-record |
| sample_i_20_mock | Sample I-20 (mock) | 1 | usa-student-visa |
| sample_ielts_english_language_certificate_mock | Sample IELTS / English-language certificate (mock) | 2 | Ireland-Student-Visa, Latvia-Student-Visa |
| sample_ielts_ielts_toefl_certificate_mock | Sample IELTS / IELTS/TOEFL certificate (mock) | 4 | lithuania-student-visa, poland-student-visa, singapore-student-visa, uae-student-visa |
| sample_ielts_language_certificate_certificate_mo | Sample IELTS / language certificate certificate (mock) | 1 | Belgium-Student-Visa |
| sample_ielts_sd_german_certificate_mock | Sample IELTS / ÖSD (German) certificate (mock) | 1 | Austria-Student-Visa |
| sample_ielts_pte_trf_mock | Sample IELTS / PTE TRF (mock) | 3 | Australia-Student-Visa, canada-student-visa, nz-student-visa |
| sample_ielts_testdaf_certificate_mock | Sample IELTS / TestDaF certificate (mock) | 8 | germany-ausbildung, germany-student-visa, italy-student-visa, malta-student-visa, netherlands-student-visa |
| sample_ielts_toefl_certificate_mock | Sample IELTS / TOEFL certificate (mock) | 4 | Cyprus-Student-Visa, Denmark-Student-Visa, Finland-Student-Visa, Hungary-Student-Visa |
| sample_ielts_toefl_or_delf_dalf_certificate_mock | Sample IELTS / TOEFL or DELF/DALF certificate (mock) | 1 | France-Student-Visa |
| sample_ielts_toefl_score_report_mock | Sample IELTS / TOEFL score report (mock) | 1 | usa-student-visa |
| sample_ielts_ukvi_trf_mock | Sample IELTS UKVI TRF (mock) | 1 | uk-student-visa |
| sample_invitation_sponsor_letter_mock | Sample invitation / sponsor letter (mock) | 25 | australia-visitor-visa, austria-visitor-visa, belgium-visitor-visa, canada-visitor-visa, cyprus-visitor-visa |
| sample_invitation_letter_from_child_mock | Sample invitation letter from child (mock) | 1 | canada-super-visa |
| sample_ircc_portal_screenshot_mock | Sample IRCC portal screenshot (mock) | 1 | canada-caips-notes |
| sample_job_offer_lmia_letter_mock | Sample job offer / LMIA letter (mock) | 1 | canada-work-permit |
| sample_language_certificate_mock | Sample language certificate (mock) | 5 | germany-job-seeker, germany-skilled-worker, hungary-work-permit, singapore-employment-pass, uae-work-permit |
| sample_language_test_trf_mock | Sample language test TRF (mock) | 12 | australia-skilled-migration, canada-express-entry-pr, canada-oinp, canada-pnp-program, canada-tr-to-pr |
| sample_letter_of_acceptance_ilep_course_mock | Sample Letter of Acceptance (ILEP course) (mock) | 1 | Ireland-Student-Visa |
| sample_listening_section_1_form_completion | Sample Listening — Section 1 (form completion) | 1 | coaching-ielts-test-reference |
| sample_loa_dli_letter_mock | Sample LOA / DLI letter (mock) | 1 | canada-student-visa |
| sample_marriage_certificate_mock | Sample marriage certificate (mock) | 15 | australia-spouse-visa, canada-spouse-dependent-extension, canada-spouse-dependent-owp, canada-spouse-dependent-visitor,  |
| sample_medical_chest_x_ray_certificate_mock | Sample medical / chest X-ray certificate (mock) | 1 | nz-student-visa |
| sample_mock_test_feedback_form_mock | Sample mock test feedback form (mock) | 1 | coaching-ielts-academic-regular |
| sample_neet_scorecard_mock | Sample NEET scorecard (mock) | 7 | mbbs-avicenna-batumi, mbbs-georgian-national-university-seu, mbbs-international-black-sea-university, mbbs-medical-unive |
| sample_nomination_job_offer_letter_mock | Sample nomination / job offer letter (mock) | 12 | australia-skilled-migration, canada-express-entry-pr, canada-oinp, canada-pnp-program, canada-tr-to-pr |
| sample_offer_of_place_mock | Sample offer of place (mock) | 1 | nz-student-visa |
| sample_oshc_policy_mock | Sample OSHC policy (mock) | 1 | Australia-Student-Visa |
| sample_ovhc_policy_summary_mock | Sample OVHC policy summary (mock) | 1 | australia-work-holiday |
| sample_passport_bio_page | Sample passport bio page | 7 | mbbs-avicenna-batumi, mbbs-georgian-national-university-seu, mbbs-international-black-sea-university, mbbs-medical-unive |
| sample_passport_bio_page_mock | Sample passport bio page (mock) | 94 | Australia-Student-Visa, Austria-Student-Visa, Belgium-Student-Visa, Cyprus-Student-Visa, Denmark-Student-Visa |
| sample_photos_and_communication_log_mock | Sample photos and communication log (mock) | 3 | canada-spouse-dependent-extension, canada-spouse-dependent-owp, canada-spouse-dependent-visitor |
| sample_pnp_nomination_certificate_mock | Sample PNP nomination certificate (mock) | 1 | canada-bowp |
| sample_police_certificate_guide_mock | Sample police certificate guide (mock) | 1 | nz-student-visa |
| sample_police_clearance_certificate_pcc_apostill | Sample Police Clearance Certificate (PCC) — apostilled & attested (mock) | 1 | Cyprus-Student-Visa |
| sample_pr_aor_letter_mock | Sample PR AOR letter (mock) | 1 | canada-bowp |
| sample_pr_application_confirmation_mock | Sample PR application confirmation (mock) | 1 | canada-bowp |
| sample_principal_employment_letter_mock | Sample principal employment letter (mock) | 3 | canada-spouse-dependent-extension, canada-spouse-dependent-owp, canada-spouse-dependent-visitor |
| sample_principal_enrolment_letter_mock | Sample principal enrolment letter (mock) | 3 | canada-spouse-dependent-extension, canada-spouse-dependent-owp, canada-spouse-dependent-visitor |
| sample_principal_work_permit_study_permit_mock | Sample principal work permit / study permit (mock) | 3 | canada-spouse-dependent-extension, canada-spouse-dependent-owp, canada-spouse-dependent-visitor |
| sample_proof_of_funds_confirmation_mock | Sample proof of funds confirmation (mock) | 17 | Austria-Student-Visa, Belgium-Student-Visa, Denmark-Student-Visa, Finland-Student-Visa, France-Student-Visa |
| sample_proof_of_means_insurance_mock | Sample proof of means / insurance (mock) | 1 | Finland-Student-Visa |
| sample_proof_of_subsistence_mock | Sample proof of subsistence (mock) | 2 | Hungary-Student-Visa, Latvia-Student-Visa |
| sample_property_ties_document_mock | Sample property / ties document (mock) | 25 | australia-visitor-visa, austria-visitor-visa, belgium-visitor-visa, canada-visitor-visa, cyprus-visitor-visa |
| sample_reading_academic_passage | Sample Reading — Academic passage | 1 | coaching-ielts-test-reference |
| sample_refusal_analysis_memo_mock | Sample refusal analysis memo (mock) | 1 | canada-caips-notes |
| sample_refusal_letter_mock | Sample refusal letter (mock) | 1 | canada-caips-notes |
| sample_relationship_timeline_mock | Sample relationship timeline (mock) | 3 | canada-spouse-dependent-extension, canada-spouse-dependent-owp, canada-spouse-dependent-visitor |
| sample_relationship_timeline_photos_guide_mock | Sample relationship timeline & photos guide (mock) | 12 | australia-spouse-visa, canada-spouse-visa, finland-spouse-visa, germany-spouse-visa, hungary-spouse-visa |
| sample_requester_proof_of_status_mock | Sample requester proof of status (mock) | 1 | canada-caips-notes |
| sample_resume_cv_mock | Sample resume / CV (mock) | 12 | australia-skilled-migration, canada-express-entry-pr, canada-oinp, canada-pnp-program, canada-tr-to-pr |
| sample_return_plan_evidence_mock | Sample return plan evidence (mock) | 1 | canada-visitor-record |
| sample_return_onward_ticket_quote_mock | Sample return/onward ticket quote (mock) | 1 | australia-work-holiday |
| sample_self_support_evidence_mock | Sample self-support evidence (mock) | 1 | Denmark-Student-Visa |
| sample_sop_specimen_mock | Sample SOP specimen (mock) | 1 | canada-student-visa |
| sample_speaking_part_2_cue_card | Sample Speaking — Part 2 cue card | 1 | coaching-ielts-test-reference |
| sample_sponsor_undertaking_letter_mock | Sample sponsor / undertaking letter (mock) | 12 | australia-spouse-visa, canada-spouse-visa, finland-spouse-visa, germany-spouse-visa, hungary-spouse-visa |
| sample_sponsor_affidavit_mock | Sample sponsor affidavit (mock) | 2 | canada-student-visa, canada-study-permit-extension |
| sample_stay_plan_letter_mock | Sample stay plan letter (mock) | 1 | canada-visitor-record |
| sample_study_permit_visa_copy_mock | Sample study permit / visa copy (mock) | 4 | australia-subclass-485, canada-pgwp, nz-post-study-work, uk-graduate-route |
| sample_super_visa_insurance_policy_mock | Sample Super Visa insurance policy (mock) | 1 | canada-super-visa |
| sample_tb_test_certificate_mock | Sample TB test certificate (mock) | 2 | Ireland-Student-Visa, uk-student-visa |
| sample_transcript | Sample transcript | 7 | mbbs-avicenna-batumi, mbbs-georgian-national-university-seu, mbbs-international-black-sea-university, mbbs-medical-unive |
| sample_transcript_mock | Sample transcript (mock) | 1 | canada-study-permit-extension |
| sample_travel_health_insurance_mock | Sample travel health insurance (mock) | 20 | Austria-Student-Visa, Belgium-Student-Visa, Cyprus-Student-Visa, Denmark-Student-Visa, Finland-Student-Visa |
| sample_travel_insurance_mock | Sample travel insurance (mock) | 1 | canada-visitor-record |
| sample_travel_itinerary_mock | Sample travel itinerary (mock) | 25 | australia-visitor-visa, austria-visitor-visa, belgium-visitor-visa, canada-visitor-visa, cyprus-visitor-visa |
| sample_tuition_receipt_mock | Sample tuition receipt (mock) | 1 | canada-study-permit-extension |
| sample_university_admission_letter_mock | Sample university admission letter (mock) | 20 | Austria-Student-Visa, Belgium-Student-Visa, Cyprus-Student-Visa, Denmark-Student-Visa, Finland-Student-Visa |
| sample_writing_task_1_academic | Sample Writing — Task 1 (Academic) | 1 | coaching-ielts-test-reference |
| schengen_travel_misconception | Schengen travel misconception | 1 | Cyprus-Student-Visa |
| school_letter | School Letter | 0 | — |
| school_leaving_certificate_meets_entry_requireme | School-leaving certificate meets entry requirements | 1 | germany-ausbildung |
| security_clearance_gdrfa_approval | Security clearance / GDRFA approval | 1 | uae-student-visa |
| sevis_i_20_if_applicable_for_us_clinical_portion | SEVIS / I-20 if applicable for US clinical portion | 3 | mbbs-medical-university-americas, mbbs-saba-university, mbbs-st-matthews-university |
| signed_ausbildung_contract_with_approved_employe | Signed Ausbildung contract with approved employer | 1 | germany-ausbildung |
| signed_consent_from_applicant_or_authorized_pers | Signed consent from applicant or authorized person | 1 | canada-caips-notes |
| signed_offer_from_licensed_singapore_employer | Signed offer from licensed Singapore employer | 1 | singapore-employment-pass |
| signed_offer_from_licensed_uae_employer | Signed offer from licensed UAE employer | 1 | uae-work-permit |
| significant_unexplained_study_gap | Significant unexplained study gap | 1 | canada-student-visa |
| skilled_job_offer_or_current_skilled_employment_ | Skilled job offer or current skilled employment in NZ | 1 | nz-skilled-migrant |
| skills_assessment_graduate_work_stream | Skills assessment (Graduate Work Stream) | 1 | australia-subclass-485 |
| skills_assessment_incomplete | Skills assessment incomplete | 1 | australia-subclass-485 |
| sowp_filed_without_valid_temporary_status | SOWP filed without valid temporary status | 1 | canada-spouse-visa |
| sponsor_adequate_income_and_housing | Sponsor adequate income and housing | 5 | finland-spouse-visa, hungary-spouse-visa, latvia-spouse-visa, poland-spouse-visa, singapore-spouse-dependent-visa |
| sponsor_holds_valid_uae_residence_visa | Sponsor holds valid UAE residence visa | 1 | uae-spouse-dependent-visa |
| sponsor_income_solvency | Sponsor income/solvency | 1 | germany-spouse-visa |
| sponsor_is_british_citizen_or_settled_pre_settle | Sponsor is British citizen or settled/pre-settled | 1 | uk-spouse-visa |
| sponsor_is_canadian_citizen_or_pr_aged_18 | Sponsor is Canadian citizen or PR aged 18+ | 1 | canada-spouse-visa |
| sponsor_legal_status_in_destination_country | Sponsor legal status in destination country | 5 | finland-spouse-visa, hungary-spouse-visa, latvia-spouse-visa, poland-spouse-visa, singapore-spouse-dependent-visa |
| sponsor_meets_lico_minimum_income | Sponsor meets LICO minimum income | 1 | canada-super-visa |
| sponsor_not_in_default_of_prior_sponsorship_unde | Sponsor not in default of prior sponsorship undertakings | 1 | canada-spouse-visa |
| sponsor_or_authorised_agent_engaged | Sponsor or authorised agent engaged | 2 | singapore-visitor-visa, uae-visitor-visa |
| sponsor_permit_expiring | Sponsor permit expiring | 6 | finland-spouse-visa, germany-spouse-visa, hungary-spouse-visa, latvia-spouse-visa, poland-spouse-visa |
| sponsor_salary_meets_minimum_aed_4_000_typical | Sponsor salary meets minimum (AED 4,000+ typical) | 1 | uae-spouse-dependent-visa |
| sponsor_s_letter_of_financial_support_signed_not | Sponsor's letter of financial support — signed, notarized | 1 | canada-student-visa |
| sponsor_s_supporting_documents_id_itr_2_3_years_ | Sponsor's supporting documents — ID, ITR (2–3 years), salary slips, employment letter | 1 | canada-student-visa |
| sponsored_spouse_5_year_bar_overlooked | Sponsored-spouse 5-year bar overlooked | 1 | canada-spouse-visa |
| sponsorship_obligations_understood | Sponsorship obligations understood | 1 | australia-spouse-visa |
| spouse_partner_owp_eligibility_noted_limited_to_ | Spouse/partner OWP eligibility noted — limited to spouses of Master's and PhD students | 1 | canada-student-visa |
| state_approved_accredited_programme_for_work_job | State-approved / accredited programme (for work & job-seeking rights) | 1 | Denmark-Student-Visa |
| student_accepts_intensive_schedule_85_attendance | Student accepts intensive schedule (≥ 85% attendance) | 1 | coaching-ielts-academic-crash |
| student_not_progressing_academically_renewal_at_ | Student not progressing academically — renewal at risk | 1 | germany-student-visa |
| student_visa_permit_for_cayman_islands | Student visa / permit for Cayman Islands | 1 | mbbs-st-matthews-university |
| student_visa_permit_for_nevis | Student visa / permit for Nevis | 1 | mbbs-medical-university-americas |
| student_working_before_completing_first_semester | Student working before completing first semester / wrong sector | 1 | Cyprus-Student-Visa |
| studied_in_nz_required_duration | Studied in NZ required duration | 1 | nz-post-study-work |
| studied_in_uk_required_duration | Studied in UK required duration | 1 | uk-graduate-route |
| sufficient_funds_aud_5_000 | Sufficient funds (~AUD 5,000+) | 1 | australia-work-holiday |
| supporting_letter_on_choice_of_studies | Supporting letter on choice of studies | 1 | Belgium-Student-Visa |
| target_province_and_stream_confirmed_against_cur | Target province and stream confirmed against current program guide | 1 | canada-pnp-program |
| tax_file_number_tfn_and_superannuation_guidance_ | Tax File Number (TFN) and superannuation guidance provided after grant | 1 | australia-work-holiday |
| tb_test_if_from_listed_country | TB test (if from listed country) | 1 | uk-spouse-visa |
| tb_test_india | TB test (India) | 1 | uk-skilled-worker |
| tb_test_certificate_if_applicable | TB test certificate (if applicable) | 2 | uk-student-visa, Ireland-Student-Visa |
| test_date_allows_trf_before_visa_uni_deadline | Test date allows TRF before visa / uni deadline | 1 | coaching-ielts-test-reference |
| test_day_checklist_printable | Test day checklist (printable) | 1 | coaching-ielts-test-reference |
| ties_outside_canada_or_credible_departure_plan | Ties outside Canada or credible departure plan | 1 | canada-visitor-record |
| ties_to_home_country_india | Ties to home country (India) | 1 | canada-super-visa |
| travel_insurance_recommended | Travel insurance (recommended) | 3 | mbbs-avicenna-batumi, mbbs-georgian-national-university-seu, mbbs-international-black-sea-university |
| travel_medical_insurance_recommended | Travel medical insurance (recommended) | 1 | cyprus-visitor-visa |
| travel_medical_insurance_30_000 | Travel medical insurance €30,000+ | 16 | austria-visitor-visa, belgium-visitor-visa, denmark-visitor-visa, finland-visitor-visa, france-visitor-visa |
| trv_confusion | TRV confusion | 1 | canada-visitor-record |
| tuition_deposit_or_payment_receipt | Tuition deposit or payment receipt | 1 | uae-student-visa |
| tuition_deposit_paid_university_receipt | Tuition deposit paid (university receipt) | 1 | Cyprus-Student-Visa |
| tuition_paid_or_funds_for_it | Tuition paid or funds for it | 1 | Finland-Student-Visa |
| tuition_paid_per_current_isd_institution_policy | Tuition paid per current ISD/institution policy | 1 | Ireland-Student-Visa |
| unauthorized_work | Unauthorized work | 1 | canada-study-permit-extension |
| unconditional_offer_from_crmd_recognised_institu | Unconditional offer from CRMD-recognised institution | 1 | Cyprus-Student-Visa |
| underestimating_clinical_year_costs | Underestimating clinical-year costs | 1 | mbbs-saba-university |
| undergraduate_without_studienkolleg_equivalence_ | Undergraduate without Studienkolleg / equivalence where required | 1 | germany-student-visa |
| undisclosed_prior_relationships_or_refusals | Undisclosed prior relationships or refusals | 1 | canada-spouse-visa |
| unexplained_large_recent_deposits | Unexplained large recent deposits | 1 | canada-student-visa |
| university_admission_enrollment_letter | University admission / enrollment letter | 7 | mbbs-avicenna-batumi, mbbs-georgian-national-university-seu, mbbs-international-black-sea-university, mbbs-medical-unive |
| university_degree_recognised_in_germany | University degree recognised in Germany | 1 | germany-blue-card |
| university_degree_recognised_in_poland | University degree recognised in Poland | 1 | poland-eu-blue-card |
| unrecognised_institution_invalid_admission | Unrecognised institution / invalid admission | 1 | germany-student-visa |
| updated_financial_proof_for_us_rotation_city_liv | Updated financial proof for US rotation city living costs | 3 | mbbs-medical-university-americas, mbbs-saba-university, mbbs-st-matthews-university |
| upfront_medical_examination_ircc_designated_pane | Upfront medical examination — IRCC-designated panel physician where required | 1 | canada-student-visa |
| urgent_deadline_missed | Urgent deadline missed | 1 | canada-caips-notes |
| us_citizen_petitioner_not_green_card_holder_for_ | US citizen petitioner (not green card holder for K-1) | 1 | usa-spouse-visa |
| us_visa_strategy_documented_typically_f_1_or_as_ | US visa strategy documented (typically F-1 or as advised by university) | 3 | mbbs-medical-university-americas, mbbs-saba-university, mbbs-st-matthews-university |
| valid_job_offer_contract | Valid job offer / contract | 1 | canada-work-permit |
| valid_student_visa_at_application | Valid Student visa at application | 1 | uk-graduate-route |
| valid_student_visa_compliance_history | Valid student visa compliance history | 1 | australia-subclass-485 |
| valid_study_permit_at_completion | Valid study permit at completion | 1 | canada-pgwp |
| visa_application_per_dutch_caribbean_netherlands | Visa application per Dutch Caribbean / Netherlands consulate guidance | 1 | mbbs-saba-university |
| visa_application_per_russian_consulate_guidance | Visa application per Russian consulate guidance | 1 | mbbs-synergy-university |
| work_authorisation_route_confirmed_with_employer | Work authorisation route confirmed with employer | 2 | germany-blue-card, poland-eu-blue-card |
| work_experience_and_noc_teer_match_stream_criter | Work experience and NOC/TEER match stream criteria | 1 | canada-pnp-program |
| work_experience_documented_noc_teer | Work experience documented (NOC/TEER) | 1 | canada-express-entry-pr |
| work_experience_letter | Work Experience Letter | 0 | — |
| working_beyond_20_h_week_in_term_on_a_limited_ca | Working beyond 20 h/week in term on a 'limited' card | 1 | Belgium-Student-Visa |
| wrong_application_channel | Wrong application channel | 1 | cyprus-visitor-visa |
| wrong_degree_naming | Wrong degree naming | 6 | mbbs-avicenna-batumi, mbbs-georgian-national-university-seu, mbbs-international-black-sea-university, mbbs-medical-unive |
| wrong_department_selected | Wrong department selected | 1 | canada-caips-notes |
| wrong_embassy_application | Wrong embassy application | 16 | austria-visitor-visa, belgium-visitor-visa, denmark-visitor-visa, finland-visitor-visa, france-visitor-visa |
| wrong_relationship_proof | Wrong relationship proof | 1 | canada-super-visa |
| wrong_visa_category | Wrong visa category | 3 | germany-blue-card, germany-opportunity-card, poland-eu-blue-card |

## C. Duplicate labels (same document, multiple wordings)

### `medical_report` (22 variants)
- Health insurance
- Health insurance (if required)
- Health insurance (travel + statutory)
- Health insurance and accommodation plan
- Health insurance arranged
- Health insurance arrangement
- Health insurance coverage
- Health insurance coverage arranged
- Health insurance covering all risks
- Health insurance for US clinical sites
- Health insurance for dependants
- Health insurance for stay
- Health insurance for the entry/gap period
- Health insurance recommended
- Health insurance type decided (statutory vs private)
- Medical Report
- Medical exam (if required)
- Medical exam by panel physician
- Medical exam completed
- Medical exam completed if IRCC profile requires it
- Medical examination (if required)
- OSHC for study duration

### `financial_documents` (17 variants)
- Bank Statements
- Bank statements / sponsor affidavit
- Bank statements / sponsor affidavit (seasoned funds)
- Bank statements — minimum 4–6 months showing consistent balance & account holder name
- Proof of funds
- Proof of funds (FSW/ FST if applicable)
- Proof of funds (tuition + living)
- Proof of funds (€576/month × 12)
- Proof of funds covers tuition, living costs, and return transport
- Proof of funds for extended visit
- Proof of funds for living costs
- Proof of funds for study period
- Proof of funds for trip
- Proof of funds for trip duration
- Proof of funds for visit and return travel
- Proof of funds or financial proof
- Proof of funds where required

### `passport` (13 variants)
- Passport
- Passport copy — valid 6+ months beyond program
- Valid passport
- Valid passport (1+ year beyond arrival)
- Valid passport (3+ months beyond stay)
- Valid passport (6+ months beyond intended stay recommended)
- Valid passport (6+ months validity recommended)
- Valid passport 6+ months
- Valid passport bio page + previous Australian visa pages (if any)
- Valid passport for registration and test day
- Valid passport meeting current embassy/CRMD validity requirements
- Valid passport — bio data page + any previously issued Canadian visa pages
- Valid passport — bio page and relevant visa/stamp pages

### `gic_certificate` (6 variants)
- Blocked account (Sperrkonto) or alternative financial proof per embassy checklist
- Blocked account or financial proof
- Blocked account or financial proof for living costs
- Blocked account or job offer
- Blocked account underfunded or wrong provider
- GIC from participating Canadian financial institution — verify current amount

### `offer_letter` (4 variants)
- CoE from CRICOS provider
- Letter of acceptance (LOA) from a DLI
- Letter of acceptance / enrollment from recognised institution
- Letter of acceptance for a full-time ILEP-listed course

### `ielts_language_test` (4 variants)
- IELTS Scorecard
- Language test (CLB minimum per program)
- Language test meets provincial and federal minimums
- Language test result (TRF) — IELTS / CELPIP / PTE / TEF / DALF as required by institution

### `photograph` (4 variants)
- Passport photographs per consulate specs
- Passport-size photographs per embassy / online portal specifications
- Photograph
- Relationship evidence — photos, communication history, shared documents

### `academic_transcripts` (3 variants)
- Academic Transcripts
- Academic transcripts — all levels completed, official sealed copies
- Academic transcripts, degrees, and resume

### `affidavit_of_support` (3 variants)
- Affidavit of Support
- Invitation letter for Russian student visa (if applicable)
- Invitation letter from child/grandchild

### `marriage_certificate` (3 variants)
- Marriage certificate (spouse)
- Marriage certificate — civil proof with certified translation if needed
- Valid marriage certificate (apostilled/translated)

### `police_clearance` (3 variants)
- PCC apostilled (MEA) + Cyprus Embassy attested
- Police clearance (if required by consulate)
- Police clearance (if required)

### `birth_certificate` (2 variants)
- Birth Certificate
- Birth certificates (children)

### `official_transcripts_10th_12th_bachelor_s_pre_me` (2 variants)
- Official transcripts (10th, 12th, bachelor's / pre-med as required)
- Official transcripts (10th, 12th, bachelor's / pre-med)

## D. Recommended normalized master catalogue

### D.1 Keep (seeded)

- `passport` — Passport
- `birth_certificate` — Birth Certificate
- `sop` — SOP
- `resume` — Resume
- `academic_transcripts` — Academic Transcripts
- `financial_documents` — Financial Documents
- `visa_forms` — Visa Forms
- `offer_letter` — Offer Letter
- `gic_certificate` — GIC Certificate
- `tuition_fee_receipt` — Tuition Fee Receipt
- `medical_report` — Medical Report
- `ielts_language_test` — IELTS / Language Test
- `photograph` — Photograph
- `marriage_certificate` — Marriage Certificate
- `divorce_certificate` — Divorce Certificate
- `police_clearance` — Police Clearance
- `affidavit_of_support` — Affidavit of Support
- `sponsorship_letter` — Sponsorship Letter
- `property_documents` — Property Documents
- `employment_letter` — Employment Letter
- `experience_letter` — Experience Letter
- `noc` — No Objection Certificate
- `other` — Other

### D.2 Seed from metadata migration (referenced but not in base seed)

- `marksheet_10`
- `marksheet_12`
- `degree_certificate`
- `relationship_proof`
- `bank_statement`
- `salary_slips`
- `visa_refusal`
- `refusal_letter`
- `travel_history`
- `cover_letter`
- `statement_of_purpose`

### D.3 Propose consolidated catalogue (~50 codes)

| Code | Label | Category |
|------|-------|----------|
| `passport` | Passport | identity |
| `photograph` | Photograph | identity |
| `birth_certificate` | Birth Certificate | identity |
| `national_id` | National ID / Aadhaar / PAN | identity |
| `visa_forms` | Visa Application Form | forms |
| `cover_letter` | Cover Letter | forms |
| `statement_of_purpose` | Statement of Purpose / GS Statement | forms |
| `resume` | Resume / CV | forms |
| `academic_transcripts` | Academic Transcripts | academic |
| `marksheet_10` | 10th Marksheet | academic |
| `marksheet_12` | 12th Marksheet | academic |
| `degree_certificate` | Degree Certificate | academic |
| `offer_letter` | Offer Letter / LOA | academic |
| `coe` | Confirmation of Enrolment (CoE) | academic |
| `cas_letter` | CAS Letter (UK) | academic |
| `ielts_language_test` | IELTS / Language Test | academic |
| `ielts_trf` | IELTS TRF / Test Report | academic |
| `eca_report` | Educational Credential Assessment (ECA) | academic |
| `financial_documents` | Financial Documents (general) | financial |
| `bank_statement` | Bank Statement | financial |
| `gic_certificate` | GIC Certificate | financial |
| `tuition_fee_receipt` | Tuition Fee Receipt | financial |
| `blocked_account_proof` | Blocked Account / Sperrkonto Proof | financial |
| `salary_slips` | Salary Slips | financial |
| `itr_tax_returns` | ITR / Tax Returns | financial |
| `affidavit_of_support` | Affidavit of Support | financial |
| `sponsorship_letter` | Sponsorship / Invitation Letter | financial |
| `property_documents` | Property Documents | financial |
| `marriage_certificate` | Marriage Certificate | relationship |
| `divorce_certificate` | Divorce Certificate | relationship |
| `relationship_proof` | Relationship Evidence | relationship |
| `wedding_photos` | Wedding / Relationship Photos | relationship |
| `employment_letter` | Employment Letter | employment |
| `experience_letter` | Experience Letter | employment |
| `noc` | No Objection Certificate (NOC) | employment |
| `business_registration` | Business Registration | employment |
| `police_clearance` | Police Clearance Certificate | police |
| `medical_report` | Medical Report | medical |
| `oshc` | OSHC / Health Insurance Certificate | medical |
| `travel_health_insurance` | Travel Health Insurance | medical |
| `visa_refusal_letter` | Visa Refusal Letter | travel |
| `travel_history_record` | Travel History Record | travel |
| `travel_itinerary` | Travel Itinerary | travel |
| `accommodation_proof` | Accommodation Proof | travel |
| `principal_status_document` | Principal Applicant Status Document | relationship |
| `enrollment_agreement` | Enrollment Agreement (Coaching) | coaching |
| `diagnostic_score_report` | Diagnostic / Mock Test Score | coaching |
| `mbbs_admission_letter` | MBBS Admission Letter | mbbs |
| `mbbs_neet_scorecard` | NEET Scorecard | mbbs |
| `other` | Other | other |

### D.4 High-prevalence binder labels not yet in catalogue (top 50)

| passport_size_photographs_per_embassy_online_por | Passport-size photographs per embassy / online portal specifications | 122 |
| sample_passport_bio_page_mock | Sample passport bio page (mock) | 94 |
| sample_bank_statement_mock | Sample bank statement (mock) | 70 |
| enrollment_agreement_signed | Enrollment agreement signed | 28 |
| course_fee_collected | Course fee collected | 27 |
| batch_timing_suits_student_schedule | Batch timing suits student schedule | 26 |
| diagnostic_or_prior_score_on_file | Diagnostic or prior score on file | 26 |
| realistic_target_vs_current_level | Realistic target vs current level | 25 |
| sample_employment_noc_letter_mock | Sample employment / NOC letter (mock) | 25 |
| sample_invitation_sponsor_letter_mock | Sample invitation / sponsor letter (mock) | 25 |
| sample_property_ties_document_mock | Sample property / ties document (mock) | 25 |
| sample_travel_itinerary_mock | Sample travel itinerary (mock) | 25 |
| sample_cv_motivation_letter_mock | Sample CV & motivation letter (mock) | 20 |
| sample_travel_health_insurance_mock | Sample travel health insurance (mock) | 20 |
| sample_university_admission_letter_mock | Sample university admission letter (mock) | 20 |
| cover_letter_explaining_purpose | Cover letter explaining purpose | 17 |
| proof_of_accommodation_and_itinerary | Proof of accommodation and itinerary | 17 |
| sample_proof_of_funds_confirmation_mock | Sample proof of funds confirmation (mock) | 17 |
| biometrics_if_not_in_vis | Biometrics (if not in VIS) | 16 |
| language_proficiency_as_required | Language proficiency (as required) | 16 |
| motivation_letter_and_cv | Motivation letter and CV | 16 |
| travel_medical_insurance_30_000 | Travel medical insurance €30,000+ | 16 |
| wrong_embassy_application | Wrong embassy application | 16 |
| sample_marriage_certificate_mock | Sample marriage certificate (mock) | 15 |
| relationship_evidence_marriage_certificate_photo | Relationship evidence — marriage certificate, photos, communication history | 14 |
| sample_chat_communication_evidence_mock | Sample chat / communication evidence (mock) | 12 |
| sample_eca_report_mock | Sample ECA report (mock) | 12 |
| sample_employment_reference_letter_mock | Sample employment reference letter (mock) | 12 |
| sample_language_test_trf_mock | Sample language test TRF (mock) | 12 |
| sample_nomination_job_offer_letter_mock | Sample nomination / job offer letter (mock) | 12 |
| sample_relationship_timeline_photos_guide_mock | Sample relationship timeline & photos guide (mock) | 12 |
| sample_resume_cv_mock | Sample resume / CV (mock) | 12 |
| sample_sponsor_undertaking_letter_mock | Sample sponsor / undertaking letter (mock) | 12 |
| admission_documentation_india | admission documentation (India) | 11 |
| sample_admission_documentation_mock | Sample admission documentation (mock) | 11 |
| language_proof_missing | Language proof missing | 10 |
| passport_valid_6_months | Passport valid 6+ months | 9 |
| sample_ielts_testdaf_certificate_mock | Sample IELTS / TestDaF certificate (mock) | 8 |
| additional_funds_proof_for_dependants | Additional funds proof for dependants | 7 |
| application_fee_payment_proof_if_applicable | Application fee payment proof (if applicable) | 7 |
| dependant_visa_applications_per_jurisdiction | Dependant visa applications per jurisdiction | 7 |
| english_proficiency_if_required | English proficiency (if required) | 7 |
| family_relocation_without_visa_plan | Family relocation without visa plan | 7 |
| neet_scorecard_indian_applicants_if_required_und | NEET scorecard (Indian applicants — if required under current NMC rules) | 7 |
| nmc_list_not_verified | NMC list not verified | 7 |
| official_transcripts_10th_12th_bachelor_s_pre_me | Official transcripts (10th, 12th, bachelor's / pre-med as required) | 7 |
| proof_of_tuition_payment_or_financial_guarantee | Proof of tuition payment or financial guarantee | 7 |
| sample_neet_scorecard_mock | Sample NEET scorecard (mock) | 7 |
| sample_passport_bio_page | Sample passport bio page | 7 |
| sample_transcript | Sample transcript | 7 |

## E. Milestone / checklist labels (NOT documents)

- Application lodged; confirmation / reference number saved on file
- Application lodged; confirmation saved on client file
- Application lodged; ImmiAccount confirmation / TRN saved on client file
- Application submitted via IRCC online account; confirmation saved
- Biometrics completed
- Biometrics completed after BIL
- Biometrics completed if requested (VFS / ASC)
- Biometrics fee paid — CAD $85 / $170 family; receipt saved
- Client reviewed, signed, and dated this checklist
- Consultancy fee invoice separate from university payment
- Government visa fee paid; official receipt saved
- Government visa fee paid; official receipt saved on file
- Institution visa processing fee paid
- Medical exam or biometrics completed if required
- NMC foreign medical institutions list checked (Indian clients)
- Quality review / QA sign-off — all documents cross-checked
- Quality review / QA sign-off — documents cross-checked against IRCC requirements
- Quality review / QA sign-off — eligibility, funds, and forms cross-checked
- SEVIS I-901 fee paid
- SIRI application fee paid
- SOLAR application submitted by institution
- Study permit application fee paid — CAD $150; receipt saved
- Tuition quote verified on https://abmu.edu.ge/en/faculty/educational-programmes
- Tuition quote verified on https://ibsu.edu.ge/en/schools/medical-school/program/medical-program/
- Tuition quote verified on https://medicine.stmatthews.edu/admissions/tuition-and-fees
- Tuition quote verified on https://seu.edu.ge/en/admissions
- Tuition quote verified on https://synergy.ru/abiturientam/programmyi_obucheniya/medical_doctor
- Tuition quote verified on https://www.mua.edu/admissions/tuition-and-fees
- Tuition quote verified on saba.edu/admissions/tuition-and-fees/

## F. Non-upload labels — eligibility / red flags (NOT documents)

- 214(b) — immigrant intent signals
- 28-day funds rule breach
- Academic booked at IDP by mistake
- Academic gaps, program changes, or delayed completion explained
- Academic progress capacity (renewal)
- Accommodation inadequate
- Address not registered within 3 working days
- Admission not from a recognised institution / expired Zulassung
- Admission not from recognised institution
- Age and health requirements met
- Age over 55
- Age turning 45
- Age within limit at application
- Anabin recognition confirmed (institution + prior qualification)
- Annex 32 sponsor not properly executed
- Applicant age within limit (generally 18–30; up to 35 for select countries)
- Applicant has no inadmissibility, misrepresentation, or undisclosed refusal issue
- Applicant is spouse, common-law partner, or qualifying dependant under IRCC rules
- Applicant outside Canada
- Applied after 180-day deadline
- Applied after Student visa expired
- Applied outside timeframe
- Applied within 180 days of completion
- Applied within 6 months of completion
- Applied within allowed timeframe
- APS not completed
- Attestation incomplete
- Bachelor's degree or qualifying pre-med coursework
- Below 6 points
- Biometrics — booked within 30 days of Biometric Instruction Letter (BIL)
- Bona fide relationship not credible
- CAS / course mismatch
- Chronic absenteeism
- Client expects reversal
- CoE / provider issues
- Completed eligible Australian qualification
- Completed eligible NZ qualification
- Completed eligible UK degree
- Concrete job offer matching qualification (if required)
- Confirm program is PGWP-eligible — verify on IRCC list at canada.ca
- Confusing Belgian 'APS' with Germany's APS
- Contract duration and role details documented
- Course not CRICOS eligible for 485
- Course not on the ILEP
- Course or program mismatch
- Course/credential mismatch or unexplained 'step-down'
- CRS below recent draw cutoffs
- Current study permit is valid or client is within restoration period
- Current work permit expires within the allowed BOWP window or is already covered by maintained status
- Currently holds valid temporary resident status or is eligible to restore status
- De facto without 12 months cohabitation
- Degree not eligible
- Degree not recognised
- Degree skill mismatch
- DS-160 inconsistencies
- ECA not completed
- Eligible OINP stream identified for client profile
- Eligible PR program stream identified (CEC, spouse, PNP, etc.)
- Eligible program (FSW/CEC/FST)
- Employment / study ties to home country documented
- Employment on visitor visa
- English B1 not met
- English below requirement
- English scores below requirement
- Exam booked too early
- Exam or university deadline documented
- Exceeding the average 30-hour work limit
- Exceeding the work-hour limit
- Expired medical tests
- Expired status beyond restoration
- Fake job offer
- Fake offer letter
- Financial capacity
- Financial capacity for full program
- Financial requirement met
- Financial requirement not met
- Forgetting OFII/ANEF validation within 3 months
- Genuine Student (GS) requirement
- Genuine student / credible study plan
- Genuine student intent

_…and 230 more._

## Transition plan (locked)

| Phase | Action | Status |
|-------|--------|--------|
| **A** | Inventory + catalogue design | This report |
| **B** | Expand `document_types` | Pending review |
| **C** | Map services → valid codes via `document_manifest[]` | After B; pilot only until UAT |
| **D** | Enable strict validation on materialize | After C |
| **E** | Remove slug fallback in `fn_resolve_document_master_code` | After D |

**Do not convert additional services until this inventory is reviewed and Phase B catalogue is approved.**
