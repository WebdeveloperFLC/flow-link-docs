-- UAE FAQ seeds + submission checklists + checklist HTML links
-- PREREQUISITE: run 20260613100000_seed_uae_visa_services.sql first

-- UAE visa FAQ seeds
-- Regenerate: node scripts/generate-uae-artifacts.mjs

-- United Arab Emirates – Student Residence Visa — 30 FAQs
UPDATE public.service_library
SET academy_metadata = jsonb_set(
  COALESCE(academy_metadata, '{}'::jsonb),
  '{faqs}',
  '[{"q":"Can we guarantee UAE student visa approval?","a":"No. GDRFA/ICP decides based on sponsor file and security checks. Never promise approval."},{"q":"Which emirate authority for Dubai students?","a":"GDRFA Dubai with KHDA-licensed institution sponsorship."},{"q":"Can students work part-time?","a":"Limited part-time work with university NOC — verify current MOHRE rules; not full-time employment."},{"q":"How to apply from India?","a":"Institution-sponsored entry permit via GDRFA/ICP channels; VFS or embassy attestation for documents as required."},{"q":"What after arrival?","a":"Medical test, Emirates ID biometrics, residence visa stamping, university registration."},{"q":"What is Description for this service?","a":"Student residence visa for full-time study at a UAE-licensed university or college in Dubai, Sharjah, or Abu Dhabi. Institution acts as sponsor; entry permit issued from India, then Emirates ID and residence stamping after arrival and medical."},{"q":"What is Eligible applicants for this service?","a":"Unconditional admission from licensed institution · Tuition/deposit paid per offer · Passport 6+ months validity · Medical fitness · Security clearance · Indian documents attested (MOFA UAE where required)"},{"q":"What is Emirate authorities for this service?","a":"Dubai: GDRFA Dubai + KHDA · Sharjah: GDRFA Sharjah + SPEA · Abu Dhabi: ICP / ADEK — route depends on campus location"},{"q":"What is Proof of funds for this service?","a":"Tuition payment receipt + living support per institution guidelines; sponsor may require bank statements or sponsor undertaking."},{"q":"What is Key authority for this service?","a":"ICP UAE (u.ae/en/icp) · GDRFA (emirate) · VFS Global UAE India · Licensed university/college"},{"q":"What is After approval for this service?","a":"Enter UAE on entry permit; complete medical; apply Emirates ID; residence visa stamping; register with institution. Part-time work may require university NOC (typically max 15 hrs/week in term)."},{"q":"Is Admission from KHDA/SPEA/ADEK-licensed institution required?","a":"Admission from KHDA/SPEA/ADEK-licensed institution is typically required."},{"q":"Is Tuition deposit or payment receipt required?","a":"Required before visa processing"},{"q":"Is Passport valid 6+ months required?","a":"Passport valid 6+ months is typically required."},{"q":"Is Indian documents attested (MOFA UAE as required) required?","a":"Allow 2–4 weeks"},{"q":"Is Medical fitness test (UAE-approved) required?","a":"After arrival or as directed"},{"q":"Is Institution visa processing fee paid required?","a":"Institution visa processing fee paid is typically required."},{"q":"Is Security clearance / GDRFA approval required?","a":"Institution submits"},{"q":"Is Accommodation proof in UAE required?","a":"Accommodation proof in UAE is typically required."},{"q":"Can Future Link guarantee approval?","a":"No. Government authorities decide each case. Never promise approval."},{"q":"What documents should we collect first?","a":"Passport, application forms, fees, and the service checklist in the Checklist tab."},{"q":"How long does processing take?","a":"See KPI processing time — always verify current GDRFA/ICP timelines before quoting."},{"q":"What are government fees?","a":"Confirm latest fees on the official portal in the Resources section before quoting."},{"q":"Can the client apply from India?","a":"Yes — standard route for Indian nationals via sponsor, VFS, or ICP e-visa as applicable."},{"q":"What if the client was refused before?","a":"Disclose all refusals, overstays, and bans; address GDRFA fines before reapply."},{"q":"Can the client work on this visa?","a":"Work rights depend on visa type — employment visa required for full-time work."},{"q":"United Arab Emirates – Student Residence Visa: counselor verification point 27?","a":"Confirm eligibility, checklist sign-off, current fees, and client consent before submission."},{"q":"United Arab Emirates – Student Residence Visa: counselor verification point 28?","a":"Confirm eligibility, checklist sign-off, current fees, and client consent before submission."},{"q":"United Arab Emirates – Student Residence Visa: counselor verification point 29?","a":"Confirm eligibility, checklist sign-off, current fees, and client consent before submission."},{"q":"United Arab Emirates – Student Residence Visa: counselor verification point 30?","a":"Confirm eligibility, checklist sign-off, current fees, and client consent before submission."}]'::jsonb
), updated_at = now()
WHERE id = 'b2000001-0001-4000-8000-0000000000cf'::uuid;

-- United Arab Emirates – Spouse / Dependent Visa — 30 FAQs
UPDATE public.service_library
SET academy_metadata = jsonb_set(
  COALESCE(academy_metadata, '{}'::jsonb),
  '{faqs}',
  '[{"q":"Can a student sponsor spouse?","a":"Depends on institution and emirate — many students cannot sponsor until employment visa; assess case-by-case."},{"q":"What salary is required?","a":"Typically AED 4,000+ for spouse — verify current GDRFA Dubai/Sharjah/Abu Dhabi rule."},{"q":"Can dependent work?","a":"May apply for work permit separately if eligible — not automatic on dependent visa."},{"q":"What is Description for this service?","a":"Residence visa for spouse or eligible dependants of a UAE resident sponsor in Dubai, Sharjah, or Abu Dhabi. Applied from India with attested relationship documents."},{"q":"What is Eligible applicants for this service?","a":"Legally married spouse or eligible dependants · Sponsor with valid UAE residence · Minimum salary threshold · Ejari-registered tenancy · Attested marriage/birth certificates"},{"q":"What is Sponsor salary rule for this service?","a":"Minimum salary typically AED 4,000+ for spouse sponsorship — verify current GDRFA/ICP emirate rule before filing."},{"q":"What is Key authority for this service?","a":"GDRFA (emirate) · ICP UAE · Sponsor employer PRO or typing centre"},{"q":"What is After approval for this service?","a":"Dependent enters on entry permit; completes medical; Emirates ID; residence stamping."},{"q":"Is Sponsor holds valid UAE residence visa required?","a":"Sponsor holds valid UAE residence visa is typically required."},{"q":"Is Sponsor salary meets minimum (AED 4,000+ typical) required?","a":"Verify emirate rule"},{"q":"Is Ejari-registered accommodation required?","a":"Ejari-registered accommodation is typically required."},{"q":"Is Attested marriage certificate (MOFA UAE) required?","a":"MEA → UAE Embassy → MOFA UAE"},{"q":"Is Dependent passport 6+ months valid required?","a":"Dependent passport 6+ months valid is typically required."},{"q":"Is Relationship proof genuine and documented required?","a":"Relationship proof genuine and documented is typically required."},{"q":"Can Future Link guarantee approval?","a":"No. Government authorities decide each case. Never promise approval."},{"q":"What documents should we collect first?","a":"Passport, application forms, fees, and the service checklist in the Checklist tab."},{"q":"How long does processing take?","a":"See KPI processing time — always verify current GDRFA/ICP timelines before quoting."},{"q":"What are government fees?","a":"Confirm latest fees on the official portal in the Resources section before quoting."},{"q":"Can the client apply from India?","a":"Yes — standard route for Indian nationals via sponsor, VFS, or ICP e-visa as applicable."},{"q":"What if the client was refused before?","a":"Disclose all refusals, overstays, and bans; address GDRFA fines before reapply."},{"q":"Can the client work on this visa?","a":"Work rights depend on visa type — employment visa required for full-time work."},{"q":"United Arab Emirates – Spouse / Dependent Visa: counselor verification point 22?","a":"Confirm eligibility, checklist sign-off, current fees, and client consent before submission."},{"q":"United Arab Emirates – Spouse / Dependent Visa: counselor verification point 23?","a":"Confirm eligibility, checklist sign-off, current fees, and client consent before submission."},{"q":"United Arab Emirates – Spouse / Dependent Visa: counselor verification point 24?","a":"Confirm eligibility, checklist sign-off, current fees, and client consent before submission."},{"q":"United Arab Emirates – Spouse / Dependent Visa: counselor verification point 25?","a":"Confirm eligibility, checklist sign-off, current fees, and client consent before submission."},{"q":"United Arab Emirates – Spouse / Dependent Visa: counselor verification point 26?","a":"Confirm eligibility, checklist sign-off, current fees, and client consent before submission."},{"q":"United Arab Emirates – Spouse / Dependent Visa: counselor verification point 27?","a":"Confirm eligibility, checklist sign-off, current fees, and client consent before submission."},{"q":"United Arab Emirates – Spouse / Dependent Visa: counselor verification point 28?","a":"Confirm eligibility, checklist sign-off, current fees, and client consent before submission."},{"q":"United Arab Emirates – Spouse / Dependent Visa: counselor verification point 29?","a":"Confirm eligibility, checklist sign-off, current fees, and client consent before submission."},{"q":"United Arab Emirates – Spouse / Dependent Visa: counselor verification point 30?","a":"Confirm eligibility, checklist sign-off, current fees, and client consent before submission."}]'::jsonb
), updated_at = now()
WHERE id = 'b2000001-0001-4000-8000-0000000000d8'::uuid;

-- United Arab Emirates – Visitor Visa (Tourist / Short Stay) — 30 FAQs
UPDATE public.service_library
SET academy_metadata = jsonb_set(
  COALESCE(academy_metadata, '{}'::jsonb),
  '{faqs}',
  '[{"q":"Difference between single and multiple entry?","a":"Single allows one entry during validity; multiple allows re-entries within validity period — confirm sponsor terms."},{"q":"Can visitor visa be extended?","a":"Extensions may be possible in UAE through sponsor — verify current GDRFA/ICP rules; do not overstay."},{"q":"Dubai vs Sharjah visa?","a":"Must match intended emirate of stay and sponsor; not interchangeable for all purposes."},{"q":"What is Description for this service?","a":"Short-stay visitor/tourist visa for UAE via Dubai, Sharjah, or Abu Dhabi routes from India. Available in 30, 60, and 90-day durations with single or multiple entry. Applied through authorised sponsor/typing centre or ICP e-visa where eligible."},{"q":"What is Eligible applicants for this service?","a":"Tourism, family visit, or short business trip · Valid passport · Sponsor or authorised agent · Return travel plan · No UAE employment intent on visitor visa"},{"q":"What is Dubai variants for this service?","a":"30/60/90 days — single entry and multiple entry (see Fees tab for Future Link consultancy by variant)."},{"q":"What is Sharjah & Abu Dhabi for this service?","a":"Separate emirate sponsor routes with comparable duration tiers — consultancy from ₹4,500–7,500."},{"q":"What is Key authority for this service?","a":"ICP UAE · GDRFA Dubai · Sharjah / Abu Dhabi immigration · Authorised UAE sponsor or agent"},{"q":"What is After approval for this service?","a":"Travel within visa validity; respect entry type and duration; overstay fines apply (AED 50/day approx. — verify current rate)."},{"q":"Is Valid passport (6+ months) required?","a":"Valid passport (6+ months) is typically required."},{"q":"Is Passport scan and photo per spec required?","a":"Passport scan and photo per spec is typically required."},{"q":"Is Confirmed duration and entry type (30/60/90, single/multiple) required?","a":"Confirmed duration and entry type (30/60/90, single/multiple) is typically required."},{"q":"Is Emirate route selected (Dubai / Sharjah / Abu Dhabi) required?","a":"Emirate route selected (Dubai / Sharjah / Abu Dhabi) is typically required."},{"q":"Is Return/onward travel plan required?","a":"Return/onward travel plan is typically required."},{"q":"Is No prior UAE overstay or ban required?","a":"GDRFA history check"},{"q":"Is Sponsor or authorised agent engaged required?","a":"Sponsor or authorised agent engaged is typically required."},{"q":"Can Future Link guarantee approval?","a":"No. Government authorities decide each case. Never promise approval."},{"q":"What documents should we collect first?","a":"Passport, application forms, fees, and the service checklist in the Checklist tab."},{"q":"How long does processing take?","a":"See KPI processing time — always verify current GDRFA/ICP timelines before quoting."},{"q":"What are government fees?","a":"Confirm latest fees on the official portal in the Resources section before quoting."},{"q":"Can the client apply from India?","a":"Yes — standard route for Indian nationals via sponsor, VFS, or ICP e-visa as applicable."},{"q":"What if the client was refused before?","a":"Disclose all refusals, overstays, and bans; address GDRFA fines before reapply."},{"q":"Can the client work on this visa?","a":"Work rights depend on visa type — employment visa required for full-time work."},{"q":"United Arab Emirates – Visitor Visa (Tourist / Short Stay): counselor verification point 24?","a":"Confirm eligibility, checklist sign-off, current fees, and client consent before submission."},{"q":"United Arab Emirates – Visitor Visa (Tourist / Short Stay): counselor verification point 25?","a":"Confirm eligibility, checklist sign-off, current fees, and client consent before submission."},{"q":"United Arab Emirates – Visitor Visa (Tourist / Short Stay): counselor verification point 26?","a":"Confirm eligibility, checklist sign-off, current fees, and client consent before submission."},{"q":"United Arab Emirates – Visitor Visa (Tourist / Short Stay): counselor verification point 27?","a":"Confirm eligibility, checklist sign-off, current fees, and client consent before submission."},{"q":"United Arab Emirates – Visitor Visa (Tourist / Short Stay): counselor verification point 28?","a":"Confirm eligibility, checklist sign-off, current fees, and client consent before submission."},{"q":"United Arab Emirates – Visitor Visa (Tourist / Short Stay): counselor verification point 29?","a":"Confirm eligibility, checklist sign-off, current fees, and client consent before submission."},{"q":"United Arab Emirates – Visitor Visa (Tourist / Short Stay): counselor verification point 30?","a":"Confirm eligibility, checklist sign-off, current fees, and client consent before submission."}]'::jsonb
), updated_at = now()
WHERE id = 'b2000001-0001-4000-8000-0000000000d9'::uuid;

-- United Arab Emirates – Employment / Work Permit — 30 FAQs
UPDATE public.service_library
SET academy_metadata = jsonb_set(
  COALESCE(academy_metadata, '{}'::jsonb),
  '{faqs}',
  '[{"q":"Who pays employment visa costs?","a":"Typically employer per UAE labour law for standard hires — confirm contract terms."},{"q":"Can visitor convert to employment?","a":"May require exit and re-entry on employment visa — verify GDRFA status change rules."},{"q":"Free-zone vs mainland?","a":"Different sponsoring authorities — confirm zone before starting attestation."},{"q":"What is Description for this service?","a":"Employment residence visa for skilled workers sponsored by a UAE mainland (MOHRE) employer or free-zone company. Includes work permit approval, entry permit from India, medical, and Emirates ID."},{"q":"What is Eligible applicants for this service?","a":"Valid job offer from licensed UAE employer · MOHRE work permit approval · Education/experience match to role · Medical fitness · Security clearance"},{"q":"What is Free-zone route for this service?","a":"Free-zone companies use zone authority instead of MOHRE — verify zone-specific process (DMCC, JAFZA, ADGM, etc.)."},{"q":"What is Key authority for this service?","a":"MOHRE · GDRFA/ICP (emirate) · Employer PRO · UAE Embassy India (attestation)"},{"q":"What is After approval for this service?","a":"Enter UAE; medical; Emirates ID; labour card (MOHRE); sign employment contract in UAE."},{"q":"Is Signed offer from licensed UAE employer required?","a":"Signed offer from licensed UAE employer is typically required."},{"q":"Is MOHRE work permit / pre-approval obtained required?","a":"Employer initiates"},{"q":"Is Degree/experience attested for UAE required?","a":"4–6 weeks"},{"q":"Is Passport valid 6+ months required?","a":"Passport valid 6+ months is typically required."},{"q":"Is Medical fitness (UAE panel) required?","a":"Medical fitness (UAE panel) is typically required."},{"q":"Is Role matches qualification (skill level) required?","a":"Role matches qualification (skill level) is typically required."},{"q":"Can Future Link guarantee approval?","a":"No. Government authorities decide each case. Never promise approval."},{"q":"What documents should we collect first?","a":"Passport, application forms, fees, and the service checklist in the Checklist tab."},{"q":"How long does processing take?","a":"See KPI processing time — always verify current GDRFA/ICP timelines before quoting."},{"q":"What are government fees?","a":"Confirm latest fees on the official portal in the Resources section before quoting."},{"q":"Can the client apply from India?","a":"Yes — standard route for Indian nationals via sponsor, VFS, or ICP e-visa as applicable."},{"q":"What if the client was refused before?","a":"Disclose all refusals, overstays, and bans; address GDRFA fines before reapply."},{"q":"Can the client work on this visa?","a":"Work rights depend on visa type — employment visa required for full-time work."},{"q":"United Arab Emirates – Employment / Work Permit: counselor verification point 22?","a":"Confirm eligibility, checklist sign-off, current fees, and client consent before submission."},{"q":"United Arab Emirates – Employment / Work Permit: counselor verification point 23?","a":"Confirm eligibility, checklist sign-off, current fees, and client consent before submission."},{"q":"United Arab Emirates – Employment / Work Permit: counselor verification point 24?","a":"Confirm eligibility, checklist sign-off, current fees, and client consent before submission."},{"q":"United Arab Emirates – Employment / Work Permit: counselor verification point 25?","a":"Confirm eligibility, checklist sign-off, current fees, and client consent before submission."},{"q":"United Arab Emirates – Employment / Work Permit: counselor verification point 26?","a":"Confirm eligibility, checklist sign-off, current fees, and client consent before submission."},{"q":"United Arab Emirates – Employment / Work Permit: counselor verification point 27?","a":"Confirm eligibility, checklist sign-off, current fees, and client consent before submission."},{"q":"United Arab Emirates – Employment / Work Permit: counselor verification point 28?","a":"Confirm eligibility, checklist sign-off, current fees, and client consent before submission."},{"q":"United Arab Emirates – Employment / Work Permit: counselor verification point 29?","a":"Confirm eligibility, checklist sign-off, current fees, and client consent before submission."},{"q":"United Arab Emirates – Employment / Work Permit: counselor verification point 30?","a":"Confirm eligibility, checklist sign-off, current fees, and client consent before submission."}]'::jsonb
), updated_at = now()
WHERE id = 'b2000001-0001-4000-8000-0000000000da'::uuid;

-- United Arab Emirates – Golden Visa (Long-Term Residence) — 30 FAQs
UPDATE public.service_library
SET academy_metadata = jsonb_set(
  COALESCE(academy_metadata, '{}'::jsonb),
  '{faqs}',
  '[{"q":"Can Golden Visa holder work anywhere?","a":"Many categories allow self-sponsorship; verify work rights for specific Golden Visa type."},{"q":"Can family be included?","a":"Spouse and children often sponsored under main holder — verify category rules."},{"q":"Property off-plan eligible?","a":"Rules vary — fully paid and handover status matter; verify ICP current policy."},{"q":"What is Description for this service?","a":"Long-term UAE residence visa (typically 5 or 10 years) for investors, property owners, entrepreneurs, talented professionals, scientists, and outstanding students without employer sponsorship requirement in many categories."},{"q":"What is Eligible categories for this service?","a":"Investor/partner · Real estate (AED 2M+ property) · Entrepreneur · Talented professional (salary AED 30k+/15k+ with conditions) · Scientist/researcher · Outstanding student (95%+ / top graduates)"},{"q":"What is Property route for this service?","a":"Own fully paid property worth AED 2 million+ (mortgage rules apply — verify ICP current criteria)."},{"q":"What is Key authority for this service?","a":"ICP UAE Golden Visa services · Emirate-specific nomination (GDRFA, ADRO, etc.)"},{"q":"What is After approval for this service?","a":"Medical, Emirates ID, long-term residence stamping; sponsor self or family dependants per category rules."},{"q":"Is Qualifying category identified (investor/talent/property/etc.) required?","a":"Qualifying category identified (investor/talent/property/etc.) is typically required."},{"q":"Is Threshold investment/salary/achievement met required?","a":"Category-specific"},{"q":"Is Passport valid 6+ months required?","a":"Passport valid 6+ months is typically required."},{"q":"Is Clean UAE immigration history required?","a":"Clean UAE immigration history is typically required."},{"q":"Is Medical fitness required?","a":"Medical fitness is typically required."},{"q":"Is Category-specific evidence bundle complete required?","a":"Bank letters, title deed, salary certs, awards"},{"q":"Can Future Link guarantee approval?","a":"No. Government authorities decide each case. Never promise approval."},{"q":"What documents should we collect first?","a":"Passport, application forms, fees, and the service checklist in the Checklist tab."},{"q":"How long does processing take?","a":"See KPI processing time — always verify current GDRFA/ICP timelines before quoting."},{"q":"What are government fees?","a":"Confirm latest fees on the official portal in the Resources section before quoting."},{"q":"Can the client apply from India?","a":"Yes — standard route for Indian nationals via sponsor, VFS, or ICP e-visa as applicable."},{"q":"What if the client was refused before?","a":"Disclose all refusals, overstays, and bans; address GDRFA fines before reapply."},{"q":"Can the client work on this visa?","a":"Work rights depend on visa type — employment visa required for full-time work."},{"q":"United Arab Emirates – Golden Visa (Long-Term Residence): counselor verification point 22?","a":"Confirm eligibility, checklist sign-off, current fees, and client consent before submission."},{"q":"United Arab Emirates – Golden Visa (Long-Term Residence): counselor verification point 23?","a":"Confirm eligibility, checklist sign-off, current fees, and client consent before submission."},{"q":"United Arab Emirates – Golden Visa (Long-Term Residence): counselor verification point 24?","a":"Confirm eligibility, checklist sign-off, current fees, and client consent before submission."},{"q":"United Arab Emirates – Golden Visa (Long-Term Residence): counselor verification point 25?","a":"Confirm eligibility, checklist sign-off, current fees, and client consent before submission."},{"q":"United Arab Emirates – Golden Visa (Long-Term Residence): counselor verification point 26?","a":"Confirm eligibility, checklist sign-off, current fees, and client consent before submission."},{"q":"United Arab Emirates – Golden Visa (Long-Term Residence): counselor verification point 27?","a":"Confirm eligibility, checklist sign-off, current fees, and client consent before submission."},{"q":"United Arab Emirates – Golden Visa (Long-Term Residence): counselor verification point 28?","a":"Confirm eligibility, checklist sign-off, current fees, and client consent before submission."},{"q":"United Arab Emirates – Golden Visa (Long-Term Residence): counselor verification point 29?","a":"Confirm eligibility, checklist sign-off, current fees, and client consent before submission."},{"q":"United Arab Emirates – Golden Visa (Long-Term Residence): counselor verification point 30?","a":"Confirm eligibility, checklist sign-off, current fees, and client consent before submission."}]'::jsonb
), updated_at = now()
WHERE id = 'b2000001-0001-4000-8000-0000000000db'::uuid;

-- UAE submission checklist seeds

-- United Arab Emirates – Student Residence Visa — 12 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000cf'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('admission_from_khda_spea_adek_licensed_instituti', 'Admission from KHDA/SPEA/ADEK-licensed institution', true, 1),
  ('tuition_deposit_or_payment_receipt', 'Tuition deposit or payment receipt', true, 2),
  ('passport_valid_6_months', 'Passport valid 6+ months', true, 3),
  ('indian_documents_attested_mofa_uae_as_required', 'Indian documents attested (MOFA UAE as required)', true, 4),
  ('medical_fitness_test_uae_approved', 'Medical fitness test (UAE-approved)', true, 5),
  ('institution_visa_processing_fee_paid', 'Institution visa processing fee paid', true, 6),
  ('security_clearance_gdrfa_approval', 'Security clearance / GDRFA approval', true, 7),
  ('accommodation_proof_in_uae', 'Accommodation proof in UAE', true, 8),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 9),
  ('client_approval_received', 'Client approval on final file', true, 10),
  ('quality_review_completed', 'Quality review sign-off', true, 11),
  ('submission_approved', 'Submission approved & lodged', true, 12)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000cf'::uuid AND c.item_key = x.item_key
);

-- United Arab Emirates – Spouse / Dependent Visa — 10 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000d8'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('sponsor_holds_valid_uae_residence_visa', 'Sponsor holds valid UAE residence visa', true, 1),
  ('sponsor_salary_meets_minimum_aed_4_000_typical', 'Sponsor salary meets minimum (AED 4,000+ typical)', true, 2),
  ('ejari_registered_accommodation', 'Ejari-registered accommodation', true, 3),
  ('attested_marriage_certificate_mofa_uae', 'Attested marriage certificate (MOFA UAE)', true, 4),
  ('dependent_passport_6_months_valid', 'Dependent passport 6+ months valid', true, 5),
  ('relationship_proof_genuine_and_documented', 'Relationship proof genuine and documented', true, 6),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 7),
  ('client_approval_received', 'Client approval on final file', true, 8),
  ('quality_review_completed', 'Quality review sign-off', true, 9),
  ('submission_approved', 'Submission approved & lodged', true, 10)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000d8'::uuid AND c.item_key = x.item_key
);

-- United Arab Emirates – Visitor Visa (Tourist / Short Stay) — 11 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000d9'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('valid_passport_6_months', 'Valid passport (6+ months)', true, 1),
  ('passport_scan_and_photo_per_spec', 'Passport scan and photo per spec', true, 2),
  ('confirmed_duration_and_entry_type_30_60_90_singl', 'Confirmed duration and entry type (30/60/90, single/multiple)', true, 3),
  ('emirate_route_selected_dubai_sharjah_abu_dhabi', 'Emirate route selected (Dubai / Sharjah / Abu Dhabi)', true, 4),
  ('return_onward_travel_plan', 'Return/onward travel plan', true, 5),
  ('no_prior_uae_overstay_or_ban', 'No prior UAE overstay or ban', true, 6),
  ('sponsor_or_authorised_agent_engaged', 'Sponsor or authorised agent engaged', true, 7),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 8),
  ('client_approval_received', 'Client approval on final file', true, 9),
  ('quality_review_completed', 'Quality review sign-off', true, 10),
  ('submission_approved', 'Submission approved & lodged', true, 11)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000d9'::uuid AND c.item_key = x.item_key
);

-- United Arab Emirates – Employment / Work Permit — 10 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000da'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('signed_offer_from_licensed_uae_employer', 'Signed offer from licensed UAE employer', true, 1),
  ('mohre_work_permit_pre_approval_obtained', 'MOHRE work permit / pre-approval obtained', true, 2),
  ('degree_experience_attested_for_uae', 'Degree/experience attested for UAE', true, 3),
  ('passport_valid_6_months', 'Passport valid 6+ months', true, 4),
  ('medical_fitness_uae_panel', 'Medical fitness (UAE panel)', true, 5),
  ('role_matches_qualification_skill_level', 'Role matches qualification (skill level)', true, 6),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 7),
  ('client_approval_received', 'Client approval on final file', true, 8),
  ('quality_review_completed', 'Quality review sign-off', true, 9),
  ('submission_approved', 'Submission approved & lodged', true, 10)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000da'::uuid AND c.item_key = x.item_key
);

-- United Arab Emirates – Golden Visa (Long-Term Residence) — 10 checklist items
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000db'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('qualifying_category_identified_investor_talent_p', 'Qualifying category identified (investor/talent/property/etc.)', true, 1),
  ('threshold_investment_salary_achievement_met', 'Threshold investment/salary/achievement met', true, 2),
  ('passport_valid_6_months', 'Passport valid 6+ months', true, 3),
  ('clean_uae_immigration_history', 'Clean UAE immigration history', true, 4),
  ('medical_fitness', 'Medical fitness', true, 5),
  ('category_specific_evidence_bundle_complete', 'Category-specific evidence bundle complete', true, 6),
  ('fees_collected', 'Fees collected (consultancy + government)', true, 7),
  ('client_approval_received', 'Client approval on final file', true, 8),
  ('quality_review_completed', 'Quality review sign-off', true, 9),
  ('submission_approved', 'Submission approved & lodged', true, 10)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000db'::uuid AND c.item_key = x.item_key
);

-- Link checklist HTML specimens
INSERT INTO public.service_library_checklist_files
  (library_id, file_name, file_path, mime_type, size_bytes, version, is_current, notes)
SELECT v.library_id, v.file_name, v.file_path, v.mime_type, v.size_bytes, v.version, v.is_current, v.notes
FROM (VALUES
  ('b2000001-0001-4000-8000-0000000000cf'::uuid, 'United Arab Emirates – Student Residence Visa — Document Checklist.html', '/specimens/checklists/uae-student-visa.html', 'text/html', 109517, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client'),
  ('b2000001-0001-4000-8000-0000000000d8'::uuid, 'United Arab Emirates – Spouse / Dependent Visa — Document Checklist.html', '/specimens/checklists/uae-spouse-dependent-visa.html', 'text/html', 108652, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client'),
  ('b2000001-0001-4000-8000-0000000000d9'::uuid, 'United Arab Emirates – Visitor Visa (Tourist / Short Stay) — Document Checklist.html', '/specimens/checklists/uae-visitor-visa.html', 'text/html', 108515, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client'),
  ('b2000001-0001-4000-8000-0000000000da'::uuid, 'United Arab Emirates – Employment / Work Permit — Document Checklist.html', '/specimens/checklists/uae-work-permit.html', 'text/html', 107951, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client'),
  ('b2000001-0001-4000-8000-0000000000db'::uuid, 'United Arab Emirates – Golden Visa (Long-Term Residence) — Document Checklist.html', '/specimens/checklists/uae-golden-visa.html', 'text/html', 108021, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client')
) AS v(library_id, file_name, file_path, mime_type, size_bytes, version, is_current, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_checklist_files c
  WHERE c.library_id = v.library_id
    AND c.file_path = v.file_path
    AND c.is_current = true
);
