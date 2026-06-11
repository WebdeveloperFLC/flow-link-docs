-- Cyprus + Lithuania FAQ seeds
-- Regenerate: node scripts/generate-cyprus-lithuania-artifacts.mjs

-- Cyprus – Student Visa (Entry Permit + Pink Slip) — 30 FAQs
UPDATE public.service_library
SET academy_metadata = jsonb_set(
  COALESCE(academy_metadata, '{}'::jsonb),
  '{faqs}',
  '[{"q":"Can we guarantee student visa approval?","a":"No. Embassy decides based on admission, funds, and credibility. Never promise approval."},{"q":"What is PCC apostille?","a":"Police Clearance Certificate (PCC) from India with MEA apostille and Cyprus Embassy attestation — mandatory for Cyprus student visa applicants."},{"q":"Proof of funds amount for 2026?","a":"Benchmark €7,000–€10,000 bank balance with 3–6 months history. No official published minimum — verify with university and VFS."},{"q":"Can spouse accompany?","a":"Dependants may apply separately; prove additional funds and accommodation. Assess case-by-case."},{"q":"English-taught programs need Cypriot?","a":"Depends on program—follow admission and embassy requirements."},{"q":"How long to convert to residence permit?","a":"Apply at CRMD district office soon after arrival and registration."},{"q":"Can I work on student visa?","a":"Limited working hours permitted—verify current rules for students in Cyprus."},{"q":"What after graduation?","a":"Discuss 12-month post-study permit (Master''s/PhD only) residence permit or Post-Study Residence Permit separately."},{"q":"What is Description for this service?","a":"Two-stage route: Entry Permit via VFS India before travel, then Temporary Residence Permit (Pink Slip) at CRMD within 7–10 days of arrival."},{"q":"What is Eligible applicants for this service?","a":"Unconditional offer from CRMD-recognised institution · PCC apostilled + Cyprus Embassy attested · Medical panel · Financial proof €7,000–€10,000+ · Health insurance · Motivation letter"},{"q":"What is Proof of funds for this service?","a":"€7,000–€10,000 bank balance benchmark (no official minimum published) typically required unless scholarship or sponsor alternative applies."},{"q":"Important note on Proof of funds?","a":"€7,000–€10,000 bank balance benchmark (no official minimum published) typically required unless scholarship or sponsor alternative applies."},{"q":"What is Key authority for this service?","a":"CRMD Cyprus (crmd.moi.gov.cy) · VFS Global Cyprus India · Cyprus Embassy in India (PCC attestation)"},{"q":"What is After approval for this service?","a":"Travel on Entry Permit; register at university; apply for Pink Slip at CRMD within 7–10 days; register with GHS (gesy.org.cy)."},{"q":"Is Unconditional offer from CRMD-recognised institution required?","a":"Unconditional offer from CRMD-recognised institution is typically required."},{"q":"Is PCC apostilled + Cyprus Embassy attested required?","a":"Apply early—processing takes weeks"},{"q":"Is Proof of funds or financial proof required?","a":"€7,000–€10,000+ with 3–6 month bank history"},{"q":"Is Health insurance (travel + statutory) required?","a":"Assess whether Health insurance (travel + statutory) is satisfied for this case."},{"q":"Is Motivation letter and CV required?","a":"Motivation letter and CV is typically required."},{"q":"Is Language proficiency (as required) required?","a":"English per program (IELTS 5.5–6.5 typical; some waive)"},{"q":"Is Valid passport required?","a":"Valid passport is typically required."},{"q":"What is the Processing time?","a":"4–8w — After complete file + PCC apostille"},{"q":"What is the Government fee?","a":"€60–90 — + financial proof €7,000–€10,000+"},{"q":"What is the Our approval rate?","a":"88% — ~74% benchmark"},{"q":"What is the Required docs?","a":"18 — + PCC apostille & medical panel"},{"q":"What is the Consultancy fee?","a":"See fee tab — + govt & third-party"},{"q":"What if the client has PCC apostille not completed?","a":"Start PCC → MEA apostille → Cyprus Embassy attestation immediately; allow 4–6 weeks"},{"q":"Why is PCC apostille not completed a problem?","a":"PCC submitted without MEA apostille or Cyprus Embassy attestation."},{"q":"What if the client has Insufficient financial proof (€7,000–€10,000+)?","a":"Open financial proof (€7,000–€10,000+) at approved bank for full required amount"},{"q":"Why is Insufficient financial proof (€7,000–€10,000+) a problem?","a":"Bank balance below €7,000 or inconsistent 3–6 month history."}]'::jsonb
), updated_at = now()
WHERE id = 'b2000001-0001-4000-8000-0000000000c8'::uuid;

-- Cyprus – National Visitor Visa (Short Stay) — 30 FAQs
UPDATE public.service_library
SET academy_metadata = jsonb_set(
  COALESCE(academy_metadata, '{}'::jsonb),
  '{faqs}',
  '[{"q":"Can we guarantee Cyprus visitor visa approval?","a":"No. Consulate decides each application individually."},{"q":"Which embassy to apply?","a":"Apply via Cyprus Embassy in India or VFS Global (visa.vfsglobal.com/cyprus/india). Cyprus is the sole destination."},{"q":"How much travel insurance?","a":"Minimum €30,000 medical coverage for the entire stay in Cyprus."},{"q":"Can I visit Schengen countries on this Cyprus visa?","a":"No. This visa is valid for the Republic of Cyprus only. A separate Schengen visa is required for France, Germany, Italy, etc."},{"q":"How long processing?","a":"Typically 2–4 weeks; apply well before travel date."},{"q":"Does prior UK/US refusal affect a Cyprus visitor visa application?","a":"Must disclose; consulate considers overall immigration history."},{"q":"Can visitor work?","a":"No. Employment not permitted on Cyprus short-stay visitor visa."},{"q":"Reapply after refusal?","a":"Yes when circumstances improve; address prior refusal grounds."},{"q":"What is Description for this service?","a":"National short-stay visa for tourism, family visits, or business trips to the Republic of Cyprus via VFS India. Cyprus is EU but NOT Schengen — this visa does NOT allow travel to other Schengen countries."},{"q":"What is Eligible applicants for this service?","a":"Temporary visit purpose · Travel insurance €30,000+ · Funds for trip · Strong ties to India · Clean immigration history"},{"q":"What is Main destination rule for this service?","a":"Apply at embassy of Cyprus Embassy/VFS India. If Cyprus is primary stay, apply via Cypriot mission."},{"q":"Important note on Main destination rule?","a":"Apply at embassy of Cyprus Embassy/VFS India. If Cyprus is primary stay, apply via Cypriot mission."},{"q":"What is Key authority for this service?","a":"Cypriot Embassy/Consulate · VFS Global (appointment partner in India)"},{"q":"What is After approval for this service?","a":"Respect visa validity and visa validity dates. Overstay affects future Cyprus visa applications."},{"q":"Is Valid passport (3+ months beyond stay) required?","a":"Valid passport (3+ months beyond stay) is typically required."},{"q":"Is Travel medical insurance €30,000+ required?","a":"Recommended €30,000+ coverage for entire trip"},{"q":"Is Proof of accommodation and itinerary required?","a":"Proof of accommodation and itinerary is typically required."},{"q":"Is Proof of funds required?","a":"Proof of funds is typically required."},{"q":"Is Strong ties to India required?","a":"Strong ties to India is typically required."},{"q":"Is Cover letter explaining purpose required?","a":"Cover letter explaining purpose is typically required."},{"q":"Is Biometrics (if not in VIS) required?","a":"Assess whether Biometrics (if not in VIS) is satisfied for this case."},{"q":"What is the Processing time?","a":"2–4w — VFS Cyprus India"},{"q":"What is the Government fee?","a":"€60–90 — Adult Cyprus visitor visa"},{"q":"What is the Our approval rate?","a":"76% — ~64% benchmark"},{"q":"What is the Required docs?","a":"10 — + travel insurance"},{"q":"What is the Consultancy fee?","a":"See fee tab — + govt & insurance"},{"q":"What if the client has Weak ties to India?","a":"Employment letter, business proof, property, family obligations"},{"q":"Why is Weak ties to India a problem?","a":"Unemployed, no assets, vague return plan."},{"q":"What if the client has Insufficient travel insurance?","a":"Purchase adequate travel insurance for full trip dates"},{"q":"Why is Insufficient travel insurance a problem?","a":"Coverage below €30,000 or wrong dates."}]'::jsonb
), updated_at = now()
WHERE id = 'b2000001-0001-4000-8000-0000000000c9'::uuid;

-- Lithuania – Student Visa (National D Visa) — 30 FAQs
UPDATE public.service_library
SET academy_metadata = jsonb_set(
  COALESCE(academy_metadata, '{}'::jsonb),
  '{faqs}',
  '[{"q":"Can we guarantee student visa approval?","a":"No. Embassy decides based on admission, funds, and credibility. Never promise approval."},{"q":"What is proof of funds for Lithuania?","a":"Typically €576/month × 12 months (€6,912/year) living funds or equivalent. Verify current amount on migracija.lt before quoting."},{"q":"Proof of funds amount for 2026?","a":"Typically €576/month × 12 (€6,912/year). Verify current amount on migracija.lt before quoting."},{"q":"Can spouse accompany?","a":"Dependants may apply separately; prove additional funds and accommodation. Assess case-by-case."},{"q":"English-taught programs need Lithuanian?","a":"Depends on program—follow admission and embassy requirements."},{"q":"How long to convert to residence permit?","a":"Apply at Migration Department (migracija.lt) soon after arrival and university registration."},{"q":"Can I work on student visa?","a":"Limited working hours permitted—verify current rules for students in Lithuania."},{"q":"What after graduation?","a":"Discuss Graduate job-search temporary residence permit (verify on migracija.lt) separately."},{"q":"What is Description for this service?","a":"National visa (Type D) for study at a recognised Lithuanian university. After entry, apply for temporary residence permit at Migration Department (migracija.lt)."},{"q":"What is Eligible applicants for this service?","a":"University admission letter · Proof of funds (€576/month × 12) · Health insurance · Motivation letter · Valid passport · Language proficiency as required"},{"q":"What is Proof of funds for this service?","a":"€576/month × 12 months (€6,912/year) typically required unless scholarship or sponsor alternative applies."},{"q":"Important note on Proof of funds?","a":"€576/month × 12 months (€6,912/year) typically required unless scholarship or sponsor alternative applies."},{"q":"What is Key authority for this service?","a":"Lithuanian Embassy/Consulate in India · VFS Global Lithuania · Migration Department (migracija.lt) after arrival"},{"q":"What is After approval for this service?","a":"Enter Lithuania; register address; apply for temporary residence permit at Migration Department (migracija.lt) within visa validity."},{"q":"Is Admission from recognised Lithuanian institution required?","a":"Admission from recognised Lithuanian institution is typically required."},{"q":"Is Proof of funds (€576/month × 12) required?","a":"Apply early—processing takes weeks"},{"q":"Is Proof of funds or financial proof required?","a":"€6,912/year or equivalent with 3–6 month bank history"},{"q":"Is Health insurance (travel + statutory) required?","a":"Assess whether Health insurance (travel + statutory) is satisfied for this case."},{"q":"Is Motivation letter and CV required?","a":"Motivation letter and CV is typically required."},{"q":"Is Language proficiency (as required) required?","a":"Lithuanian or English per program"},{"q":"Is Valid passport required?","a":"Valid passport is typically required."},{"q":"What is the Processing time?","a":"6–12w — After complete file complete"},{"q":"What is the Government fee?","a":"€75 — + proof of funds required living funds"},{"q":"What is the Our approval rate?","a":"88% — ~74% benchmark"},{"q":"What is the Required docs?","a":"15 — + proof of funds €6,912"},{"q":"What is the Consultancy fee?","a":"See fee tab — + govt & third-party"},{"q":"What if the client has Proof of funds insufficient?","a":"Open blocked account or show €6,912 equivalent with 3–6 month bank history before embassy slot"},{"q":"Why is Proof of funds insufficient a problem?","a":"Proof of funds below €576/month × 12 or inconsistent bank history."},{"q":"What if the client has Insufficient proof of funds?","a":"Open proof of funds at approved bank for full required amount"},{"q":"Why is Insufficient proof of funds a problem?","a":"Amount below required monthly sum or not from recognised provider."}]'::jsonb
), updated_at = now()
WHERE id = 'b2000001-0001-4000-8000-0000000000cd'::uuid;

-- Lithuania – Schengen Visitor Visa (Type C) — 30 FAQs
UPDATE public.service_library
SET academy_metadata = jsonb_set(
  COALESCE(academy_metadata, '{}'::jsonb),
  '{faqs}',
  '[{"q":"Can we guarantee Schengen approval?","a":"No. Consulate decides each application individually."},{"q":"Which embassy to apply?","a":"Country of main destination or first entry if equal stays—follow Schengen rules."},{"q":"How much travel insurance?","a":"Minimum €30,000 medical coverage valid across Schengen for entire trip."},{"q":"Can I visit multiple Schengen countries?","a":"Yes on single visa if main destination rule followed; respect 90/180 limit."},{"q":"How long processing?","a":"Typically 2–4 weeks; apply well before travel date."},{"q":"Does prior UK/US refusal affect Schengen?","a":"Must disclose; consulate considers overall immigration history."},{"q":"Can visitor work?","a":"No. Employment not permitted on Schengen short-stay visa."},{"q":"Reapply after refusal?","a":"Yes when circumstances improve; address prior refusal grounds."},{"q":"What is Description for this service?","a":"Schengen Type C short-stay visa for tourism, family visits, or business trips to Lithuania up to 90 days per 180-day period."},{"q":"What is Eligible applicants for this service?","a":"Temporary visit purpose · Travel insurance €30,000+ · Funds for trip · Strong ties to India · Clean Schengen history"},{"q":"What is Main destination rule for this service?","a":"Apply at embassy of main Schengen destination. If Lithuania is primary stay, apply via Lithuanian mission."},{"q":"Important note on Main destination rule?","a":"Apply at embassy of main Schengen destination. If Lithuania is primary stay, apply via Lithuanian mission."},{"q":"What is Key authority for this service?","a":"Lithuanian Embassy/Consulate · VFS Global (appointment partner in India)"},{"q":"What is After approval for this service?","a":"Respect visa validity and 90/180 rule. Overstay affects future Schengen applications."},{"q":"Is Valid passport (3+ months beyond stay) required?","a":"Valid passport (3+ months beyond stay) is typically required."},{"q":"Is Travel medical insurance €30,000+ required?","a":"Valid for entire Schengen stay"},{"q":"Is Proof of accommodation and itinerary required?","a":"Proof of accommodation and itinerary is typically required."},{"q":"Is Proof of funds required?","a":"Proof of funds is typically required."},{"q":"Is Strong ties to India required?","a":"Strong ties to India is typically required."},{"q":"Is Cover letter explaining purpose required?","a":"Cover letter explaining purpose is typically required."},{"q":"Is Biometrics (if not in VIS) required?","a":"Assess whether Biometrics (if not in VIS) is satisfied for this case."},{"q":"What is the Processing time?","a":"2–4w — Schengen standard"},{"q":"What is the Government fee?","a":"€90 — Adult Schengen visa"},{"q":"What is the Our approval rate?","a":"76% — ~64% benchmark"},{"q":"What is the Required docs?","a":"10 — + travel insurance"},{"q":"What is the Consultancy fee?","a":"See fee tab — + govt & insurance"},{"q":"What if the client has Weak ties to India?","a":"Employment letter, business proof, property, family obligations"},{"q":"Why is Weak ties to India a problem?","a":"Unemployed, no assets, vague return plan."},{"q":"What if the client has Insufficient travel insurance?","a":"Purchase Schengen-compliant insurance for full trip dates"},{"q":"Why is Insufficient travel insurance a problem?","a":"Coverage below €30,000 or wrong dates."}]'::jsonb
), updated_at = now()
WHERE id = 'b2000001-0001-4000-8000-0000000000ce'::uuid;

-- Cyprus + Lithuania submission checklist seeds

-- Cyprus – Student Visa (Entry Permit + Pink Slip) — 12 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000c8'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('unconditional_offer_from_crmd_recognised_institu', 'Unconditional offer from CRMD-recognised institution', true, 1),
  ('pcc_apostilled_mea_cyprus_embassy_attested', 'PCC apostilled (MEA) + Cyprus Embassy attested', true, 2),
  ('medical_panel_hiv_hep_b_c_syphilis_tb_valid_4_mo', 'Medical panel (HIV, Hep B/C, Syphilis, TB — valid 4 months)', true, 3),
  ('financial_proof_7_000_10_000', 'Financial proof €7,000–€10,000+', true, 4),
  ('proof_of_accommodation_in_cyprus', 'Proof of accommodation in Cyprus', true, 5),
  ('tuition_deposit_paid_university_receipt', 'Tuition deposit paid (university receipt)', true, 6),
  ('valid_passport_1_year_beyond_arrival', 'Valid passport (1+ year beyond arrival)', true, 7),
  ('english_proficiency_or_university_waiver', 'English proficiency or university waiver', true, 8),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 9),
  ('client_approval_received', 'Client approval on final file', true, 10),
  ('quality_review_completed', 'Quality review sign-off', true, 11),
  ('submission_approved', 'Submission approved & lodged', true, 12)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000c8'::uuid AND c.item_key = x.item_key
);

-- Cyprus – National Visitor Visa (Short Stay) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000c9'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('valid_passport_3_months_beyond_stay', 'Valid passport (3+ months beyond stay)', true, 1),
  ('travel_medical_insurance_recommended', 'Travel medical insurance (recommended)', true, 2),
  ('proof_of_accommodation_and_itinerary', 'Proof of accommodation and itinerary', true, 3),
  ('proof_of_funds_for_trip', 'Proof of funds for trip', true, 4),
  ('strong_ties_to_india', 'Strong ties to India', true, 5),
  ('cover_letter_explaining_purpose', 'Cover letter explaining purpose', true, 6),
  ('biometrics_at_vfs_if_required', 'Biometrics at VFS (if required)', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000c9'::uuid AND c.item_key = x.item_key
);

-- Lithuania – Student Visa (National D Visa) — 10 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000cd'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('admission_from_recognised_lithuanian_institution', 'Admission from recognised Lithuanian institution', true, 1),
  ('proof_of_funds_576_month_12', 'Proof of funds (€576/month × 12)', true, 2),
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
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000cd'::uuid AND c.item_key = x.item_key
);

-- Lithuania – Schengen Visitor Visa (Type C) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000ce'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
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
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000ce'::uuid AND c.item_key = x.item_key
);

-- Link checklist HTML specimens
INSERT INTO public.service_library_checklist_files
  (library_id, file_name, file_path, mime_type, size_bytes, version, is_current, notes)
SELECT v.library_id, v.file_name, v.file_path, v.mime_type, v.size_bytes, v.version, v.is_current, v.notes
FROM (VALUES
  ('b2000001-0001-4000-8000-0000000000c8'::uuid, 'Cyprus – Student Visa (Entry Permit + Pink Slip) — Document Checklist.html', '/specimens/checklists/cyprus-student-visa.html', 'text/html', 109761, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client'),
  ('b2000001-0001-4000-8000-0000000000c9'::uuid, 'Cyprus – National Visitor Visa (Short Stay) — Document Checklist.html', '/specimens/checklists/cyprus-visitor-visa.html', 'text/html', 108830, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client'),
  ('b2000001-0001-4000-8000-0000000000cd'::uuid, 'Lithuania – Student Visa (National D Visa) — Document Checklist.html', '/specimens/checklists/lithuania-student-visa.html', 'text/html', 108828, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client'),
  ('b2000001-0001-4000-8000-0000000000ce'::uuid, 'Lithuania – Schengen Visitor Visa (Type C) — Document Checklist.html', '/specimens/checklists/lithuania-visitor-visa.html', 'text/html', 108816, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client')
) AS v(library_id, file_name, file_path, mime_type, size_bytes, version, is_current, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_checklist_files c
  WHERE c.library_id = v.library_id
    AND c.file_path = v.file_path
    AND c.is_current = true
);
