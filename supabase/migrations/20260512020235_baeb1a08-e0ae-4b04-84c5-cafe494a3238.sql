
-- =========================================================
-- Germany question pack — UX rewrite (v2)
--   * friendly labels for all enum options
--   * remove duplicate questions
--   * reorder Section 2 (Education)
--   * add new questions across sections 2–7
-- All answer values (enum codes) are preserved so the
-- existing chancenkarte / pathway engine keeps scoring.
-- =========================================================

-- ---- 1. Deactivate duplicates / replaced questions
UPDATE public.assessment_questions
   SET is_active = false, updated_at = now()
 WHERE country = 'Germany'
   AND code IN (
     'de_zab_recognised',
     'de_english_level',
     'de_work_experience_years',
     'de_work_in_shortage',
     'de_demand_occupation',
     'de_currently_employed',
     'de_bluecard_salary_eur',
     'de_degree_duration_years',
     'de_documents_ready'
   );

-- ---- 2. Update existing rows with friendly labels + reorder
-- de_marital
UPDATE public.assessment_questions SET
  label = 'Marital status',
  options = '[
    {"value":"single","label":"Single"},
    {"value":"married","label":"Married"},
    {"value":"common_law","label":"Common-law"},
    {"value":"separated","label":"Separated"},
    {"value":"divorced","label":"Divorced"},
    {"value":"widowed","label":"Widowed"}
  ]'::jsonb,
  updated_at = now()
 WHERE country='Germany' AND code='de_marital';

-- de_highest_education
UPDATE public.assessment_questions SET
  label = 'Highest qualification achieved',
  order_index = 100,
  options = '[
    {"value":"secondary","label":"Secondary school"},
    {"value":"vocational_2yr","label":"Vocational qualification (2 yr)"},
    {"value":"vocational_3yr","label":"Vocational qualification (3 yr+)"},
    {"value":"bachelor","label":"Bachelor''s degree"},
    {"value":"master","label":"Master''s degree"},
    {"value":"phd","label":"PhD"}
  ]'::jsonb,
  updated_at = now()
 WHERE country='Germany' AND code='de_highest_education';

-- de_education_country (reorder)
UPDATE public.assessment_questions SET
  label = 'Country where qualification was obtained',
  order_index = 107,
  updated_at = now()
 WHERE country='Germany' AND code='de_education_country';

-- de_recognition_status (single recognition question kept)
UPDATE public.assessment_questions SET
  label = 'Qualification recognition status in Germany',
  help_text = 'Recognition by Germany''s central office for foreign education (ZAB) or relevant professional body.',
  order_index = 120,
  options = '[
    {"value":"full","label":"Fully recognized"},
    {"value":"partial","label":"Partially recognized"},
    {"value":"not_started","label":"Recognition not started"},
    {"value":"not_required","label":"Not required"},
    {"value":"unsure","label":"Unsure"}
  ]'::jsonb,
  updated_at = now()
 WHERE country='Germany' AND code='de_recognition_status';

-- de_anabin_status
UPDATE public.assessment_questions SET
  label = 'Have you checked your qualification on the Anabin database?',
  help_text = 'Anabin is Germany''s public database of foreign qualifications.',
  order_index = 115,
  options = '[
    {"value":"H+","label":"Yes — Fully recognized (H+)"},
    {"value":"H+-","label":"Yes — Partially recognized (H+/-)"},
    {"value":"H-","label":"Yes — Not recognized (H-)"},
    {"value":"unknown","label":"No, not checked"},
    {"value":"unsure","label":"Unsure"}
  ]'::jsonb,
  updated_at = now()
 WHERE country='Germany' AND code='de_anabin_status';

-- de_regulated_profession
UPDATE public.assessment_questions SET
  label = 'Is your profession regulated in Germany?',
  help_text = 'Examples: doctor, nurse, pharmacist, lawyer, teacher, engineer (in some states).',
  order_index = 125,
  updated_at = now()
 WHERE country='Germany' AND code='de_regulated_profession';

-- de_vocational_qualification
UPDATE public.assessment_questions SET
  label = 'Do you hold a vocational qualification or trade certification?',
  order_index = 130,
  updated_at = now()
 WHERE country='Germany' AND code='de_vocational_qualification';

-- de_vocational_duration_years
UPDATE public.assessment_questions SET
  label = 'Vocational training duration (years)',
  order_index = 132,
  conditional_on = '{"de_vocational_qualification": true}'::jsonb,
  updated_at = now()
 WHERE country='Germany' AND code='de_vocational_duration_years';

-- de_german_level (kept; relabel + uppercase)
UPDATE public.assessment_questions SET
  label = 'Your German language level',
  order_index = 200,
  conditional_on = '{"de_speaks_german": true}'::jsonb,
  options = '[
    {"value":"none","label":"None"},
    {"value":"a1","label":"A1"},
    {"value":"a2","label":"A2"},
    {"value":"b1","label":"B1"},
    {"value":"b2","label":"B2"},
    {"value":"c1","label":"C1"},
    {"value":"c2","label":"C2"}
  ]'::jsonb,
  updated_at = now()
 WHERE country='Germany' AND code='de_german_level';

-- de_german_test_provider
UPDATE public.assessment_questions SET
  label = 'German test provider',
  order_index = 201,
  conditional_on = '{"de_speaks_german": true}'::jsonb,
  options = '[
    {"value":"Goethe","label":"Goethe-Institut"},
    {"value":"telc","label":"telc"},
    {"value":"ÖSD","label":"ÖSD"},
    {"value":"TestDaF","label":"TestDaF"},
    {"value":"DSH","label":"DSH"},
    {"value":"none","label":"Other / not tested"}
  ]'::jsonb,
  updated_at = now()
 WHERE country='Germany' AND code='de_german_test_provider';

-- de_english_test
UPDATE public.assessment_questions SET
  label = 'English test taken',
  order_index = 221,
  conditional_on = '{"de_took_english_test": true}'::jsonb,
  options = '[
    {"value":"IELTS","label":"IELTS"},
    {"value":"PTE","label":"PTE Academic"},
    {"value":"TOEFL","label":"TOEFL iBT"},
    {"value":"Duolingo","label":"Duolingo English Test"},
    {"value":"none","label":"Other"}
  ]'::jsonb,
  updated_at = now()
 WHERE country='Germany' AND code='de_english_test';

-- de_english_score
UPDATE public.assessment_questions SET
  label = 'Overall English test score',
  help_text = 'We auto-calculate your CEFR band from this score.',
  order_index = 222,
  conditional_on = '{"de_took_english_test": true}'::jsonb,
  updated_at = now()
 WHERE country='Germany' AND code='de_english_score';

-- de_english_cefr (kept; relabel)
UPDATE public.assessment_questions SET
  label = 'English CEFR level',
  order_index = 224,
  conditional_on = '{"de_took_english_test": true}'::jsonb,
  options = '[
    {"value":"A1","label":"A1 — Basic"},
    {"value":"A2","label":"A2 — Elementary"},
    {"value":"B1","label":"B1 — Intermediate"},
    {"value":"B2","label":"B2 — Upper-intermediate"},
    {"value":"C1","label":"C1 — Advanced"},
    {"value":"C2","label":"C2 — Proficient"}
  ]'::jsonb,
  updated_at = now()
 WHERE country='Germany' AND code='de_english_cefr';

-- de_partner_language
UPDATE public.assessment_questions SET
  label = 'Spouse / partner language ability',
  options = '[
    {"value":"none","label":"None"},
    {"value":"german_a1","label":"German A1"},
    {"value":"german_b1","label":"German B1"},
    {"value":"english_b2","label":"English B2"},
    {"value":"both","label":"Both German & English"}
  ]'::jsonb,
  updated_at = now()
 WHERE country='Germany' AND code='de_partner_language';

-- de_previous_stay_duration
UPDATE public.assessment_questions SET
  label = 'Total duration you stayed in Germany',
  options = '[
    {"value":"lt_3m","label":"Less than 3 months"},
    {"value":"3_6m","label":"3 – 6 months"},
    {"value":"6_12m","label":"6 – 12 months"},
    {"value":"gt_1y","label":"More than 1 year"}
  ]'::jsonb,
  updated_at = now()
 WHERE country='Germany' AND code='de_previous_stay_duration';

-- de_germany_study_duration
UPDATE public.assessment_questions SET
  label = 'Have you ever studied in Germany?',
  options = '[
    {"value":"no","label":"Never studied in Germany"},
    {"value":"lt_6m","label":"Less than 6 months"},
    {"value":"6_12m","label":"6 – 12 months"},
    {"value":"gt_1y","label":"More than 1 year"}
  ]'::jsonb,
  updated_at = now()
 WHERE country='Germany' AND code='de_germany_study_duration';

-- de_family_relations
UPDATE public.assessment_questions SET
  label = 'Immediate family members living in Germany',
  options = '[
    {"value":"parent","label":"Parent"},
    {"value":"sibling","label":"Sibling"},
    {"value":"spouse","label":"Spouse"},
    {"value":"child","label":"Child"},
    {"value":"other","label":"Other relative"},
    {"value":"none","label":"None"}
  ]'::jsonb,
  updated_at = now()
 WHERE country='Germany' AND code='de_family_relations';

-- de_move_intent
UPDATE public.assessment_questions SET
  label = 'When are you planning to move to Germany?',
  options = '[
    {"value":"immediately","label":"Immediately"},
    {"value":"within_6_months","label":"Within 6 months"},
    {"value":"within_1_year","label":"Within 1 year"},
    {"value":"exploring","label":"Just exploring"}
  ]'::jsonb,
  updated_at = now()
 WHERE country='Germany' AND code='de_move_intent';

-- de_employer_contact
UPDATE public.assessment_questions SET
  label = 'Stage of employer communication',
  options = '[
    {"value":"none","label":"Not started"},
    {"value":"early talks","label":"Early conversations"},
    {"value":"interview stage","label":"Interview stage"},
    {"value":"verbal offer","label":"Verbal offer"},
    {"value":"signed contract","label":"Signed contract"}
  ]'::jsonb,
  updated_at = now()
 WHERE country='Germany' AND code='de_employer_contact';

-- de_js_plan
UPDATE public.assessment_questions SET
  label = 'Your job search plan',
  options = '[
    {"value":"have_employer_leads","label":"I already have employer leads"},
    {"value":"need_to_network","label":"I need to network"},
    {"value":"unsure","label":"Not sure yet"}
  ]'::jsonb,
  updated_at = now()
 WHERE country='Germany' AND code='de_js_plan';

-- de_blocked_account_eur (strip hardcoded number)
UPDATE public.assessment_questions SET
  label = 'Funds available in a blocked account (€)',
  help_text = 'Germany generally requires proof of sufficient living funds through a blocked account or equivalent financial support.',
  order_index = 400,
  updated_at = now()
 WHERE country='Germany' AND code='de_blocked_account_eur';

-- de_sponsor_support
UPDATE public.assessment_questions SET
  label = 'Do you have a formal financial sponsor in Germany?',
  help_text = 'Known in German as a Verpflichtungserklärung.',
  order_index = 402,
  updated_at = now()
 WHERE country='Germany' AND code='de_sponsor_support';

-- de_monthly_budget_eur
UPDATE public.assessment_questions SET
  label = 'How much monthly living budget can you support for Germany? (€)',
  order_index = 403,
  updated_at = now()
 WHERE country='Germany' AND code='de_monthly_budget_eur';

-- de_proof_of_funds
UPDATE public.assessment_questions SET
  label = 'Can you provide proof of sufficient living funds?',
  order_index = 404,
  updated_at = now()
 WHERE country='Germany' AND code='de_proof_of_funds';

-- Compliance softening
UPDATE public.assessment_questions SET
  label = 'Have you ever been charged with or convicted of a criminal offence?',
  q_type = 'select',
  help_text = 'Your information is kept confidential and is only used to assess pathway suitability.',
  options = '[
    {"value":"no","label":"No"},
    {"value":"yes","label":"Yes"},
    {"value":"prefer_private","label":"Prefer to discuss with counselor"}
  ]'::jsonb,
  updated_at = now()
 WHERE country='Germany' AND code='de_criminal_history';

UPDATE public.assessment_questions SET
  label = 'Have you ever received a visa refusal from any country?',
  order_index = 500,
  updated_at = now()
 WHERE country='Germany' AND code='de_refusal_history';

UPDATE public.assessment_questions SET
  label = 'Do you already have health insurance arrangements for Germany?',
  order_index = 513,
  updated_at = now()
 WHERE country='Germany' AND code='de_health_insurance';

-- Documents — passport
UPDATE public.assessment_questions SET
  label = 'Does your passport have at least 12 months validity remaining?',
  order_index = 900,
  updated_at = now()
 WHERE country='Germany' AND code='de_passport_valid';

-- ---- 3. Insert new questions

INSERT INTO public.assessment_questions
  (code, section, q_type, label, help_text, options, required, conditional_on, order_index, is_active, country, goal)
VALUES
  -- Section 2 — Education
  ('de_field_of_study','education','text','Field of study / specialization',
   'e.g. Computer Science, Mechanical Engineering, Nursing, Hospitality, Business Administration.',
   NULL, false, NULL, 105, true, 'Germany', 'de_chancenkarte'),
  ('de_institution_name','education','text','Institution / university name',
   NULL, NULL, false, NULL, 106, true, 'Germany', 'de_chancenkarte'),
  ('de_graduation_year','education','number','Year of graduation',
   NULL, NULL, false, NULL, 108, true, 'Germany', 'de_chancenkarte'),
  ('de_study_mode','education','select','Mode of education',
   'Distance learning may affect German recognition.',
   '[{"value":"full_time","label":"Full-time"},{"value":"part_time","label":"Part-time"},{"value":"distance","label":"Distance learning"},{"value":"hybrid","label":"Hybrid"}]'::jsonb,
   false, NULL, 109, true, 'Germany', 'de_chancenkarte'),
  ('de_degree_duration_band','education','select','Total duration of your qualification',
   NULL,
   '[{"value":"1","label":"1 year"},{"value":"2","label":"2 years"},{"value":"3","label":"3 years"},{"value":"4","label":"4 years"},{"value":"5","label":"5+ years"}]'::jsonb,
   false, NULL, 110, true, 'Germany', 'de_chancenkarte'),
  ('de_vocational_field','education','text','Trade / specialization',
   NULL, NULL, false, '{"de_vocational_qualification": true}'::jsonb, 131, true, 'Germany', 'de_chancenkarte'),
  ('de_apprenticeship_completed','education','boolean','Apprenticeship completed?',
   NULL, NULL, false, '{"de_vocational_qualification": true}'::jsonb, 133, true, 'Germany', 'de_chancenkarte'),
  ('de_vocational_certificate_available','education','boolean','Certificate available?',
   NULL, NULL, false, '{"de_vocational_qualification": true}'::jsonb, 134, true, 'Germany', 'de_chancenkarte'),

  -- Section 3 — Language
  ('de_speaks_german','language','boolean','Do you speak German?',
   NULL, NULL, false, NULL, 199, true, 'Germany', 'de_chancenkarte'),
  ('de_german_test_year','language','number','Year German test was taken',
   NULL, NULL, false, '{"de_speaks_german": true}'::jsonb, 202, true, 'Germany', 'de_chancenkarte'),
  ('de_currently_learning_german','language','boolean','Are you currently learning German?',
   NULL, NULL, false, NULL, 203, true, 'Germany', 'de_chancenkarte'),
  ('de_german_target_level','language','select','Target German level',
   NULL,
   '[{"value":"A1","label":"A1"},{"value":"A2","label":"A2"},{"value":"B1","label":"B1"},{"value":"B2","label":"B2"},{"value":"C1","label":"C1"},{"value":"C2","label":"C2"}]'::jsonb,
   false, '{"de_currently_learning_german": true}'::jsonb, 204, true, 'Germany', 'de_chancenkarte'),
  ('de_took_english_test','language','boolean','Have you taken an English language test?',
   NULL, NULL, false, NULL, 220, true, 'Germany', 'de_chancenkarte'),
  ('de_english_self_assessed','language','select','Self-assessed English level',
   NULL,
   '[{"value":"basic","label":"Basic"},{"value":"intermediate","label":"Intermediate"},{"value":"advanced","label":"Advanced"},{"value":"fluent","label":"Fluent"}]'::jsonb,
   false, '{"de_took_english_test": false}'::jsonb, 223, true, 'Germany', 'de_chancenkarte'),
  ('de_native_language','language','text','Native / primary language',
   NULL, NULL, false, NULL, 230, true, 'Germany', 'de_chancenkarte'),

  -- Section 4 — Work
  ('de_employment_status','work','select','Employment status',
   NULL,
   '[{"value":"employed","label":"Employed"},{"value":"self_employed","label":"Self-employed"},{"value":"student","label":"Student"},{"value":"unemployed","label":"Unemployed"}]'::jsonb,
   false, NULL, 302, true, 'Germany', 'de_chancenkarte'),
  ('de_employment_type','work','select','Employment type',
   NULL,
   '[{"value":"full_time","label":"Full-time"},{"value":"part_time","label":"Part-time"},{"value":"contract","label":"Contract"},{"value":"internship","label":"Internship"}]'::jsonb,
   false, '{"de_employment_status": ["employed","self_employed"]}'::jsonb, 303, true, 'Germany', 'de_chancenkarte'),
  ('de_industry','work','select','Industry',
   NULL,
   '[{"value":"it","label":"IT"},{"value":"healthcare","label":"Healthcare"},{"value":"engineering","label":"Engineering"},{"value":"hospitality","label":"Hospitality"},{"value":"logistics","label":"Logistics"},{"value":"finance","label":"Finance"},{"value":"education","label":"Education"},{"value":"manufacturing","label":"Manufacturing"},{"value":"construction","label":"Construction"},{"value":"other","label":"Other"}]'::jsonb,
   false, NULL, 301, true, 'Germany', 'de_chancenkarte'),
  ('de_skilled_experience_band','work','select','Total skilled work experience',
   NULL,
   '[{"value":"lt_1","label":"Less than 1 year"},{"value":"1_2","label":"1 – 2 years"},{"value":"3_5","label":"3 – 5 years"},{"value":"gt_5","label":"5+ years"}]'::jsonb,
   false, NULL, 304, true, 'Germany', 'de_chancenkarte'),
  ('de_work_education_match','work','select','Is your work experience related to your education?',
   NULL,
   '[{"value":"full","label":"Fully related"},{"value":"partial","label":"Partially related"},{"value":"none","label":"Not related"}]'::jsonb,
   false, NULL, 307, true, 'Germany', 'de_chancenkarte'),
  ('de_has_management_role','work','boolean','Do you have a management / leadership role?',
   NULL, NULL, false, NULL, 308, true, 'Germany', 'de_chancenkarte'),
  ('de_current_salary_eur','work','number','Current annual salary (optional, €)',
   NULL, NULL, false, NULL, 310, true, 'Germany', 'de_chancenkarte'),
  ('de_resume_ready','work','multiselect','Do you currently have:',
   NULL,
   '[{"value":"resume","label":"Updated CV / resume"},{"value":"linkedin","label":"LinkedIn profile"},{"value":"german_cv","label":"German-style CV"},{"value":"experience_letters","label":"Experience letters"}]'::jsonb,
   false, NULL, 311, true, 'Germany', 'de_chancenkarte'),
  ('de_applying_to_germany_jobs','work','boolean','Are you actively applying for jobs in Germany?',
   NULL, NULL, false, NULL, 312, true, 'Germany', 'de_chancenkarte'),

  -- Section 5 — Funds
  ('de_funds_source','funds','multiselect','Primary source of settlement funds',
   NULL,
   '[{"value":"savings","label":"Personal savings"},{"value":"family","label":"Family support"},{"value":"sponsor","label":"Sponsor support"},{"value":"loan","label":"Education loan"},{"value":"business","label":"Business income"},{"value":"salary","label":"Salary income"},{"value":"other","label":"Other"}]'::jsonb,
   false, NULL, 401, true, 'Germany', 'de_chancenkarte'),
  ('de_funds_liquid','funds','select','Are your funds immediately accessible / liquid?',
   NULL,
   '[{"value":"yes","label":"Yes"},{"value":"no","label":"No"},{"value":"partial","label":"Partially"}]'::jsonb,
   false, NULL, 405, true, 'Germany', 'de_chancenkarte'),
  ('de_dependents_join','funds','boolean','Will family members accompany you to Germany?',
   NULL, NULL, false, NULL, 406, true, 'Germany', 'de_chancenkarte'),
  ('de_dependents_spouse','funds','boolean','Will your spouse accompany you?',
   NULL, NULL, false, '{"de_dependents_join": true}'::jsonb, 407, true, 'Germany', 'de_chancenkarte'),
  ('de_dependents_children_count','funds','number','Number of children accompanying',
   NULL, NULL, false, '{"de_dependents_join": true}'::jsonb, 408, true, 'Germany', 'de_chancenkarte'),
  ('de_financial_readiness','funds','select','How financially prepared do you feel for relocation?',
   NULL,
   '[{"value":"fully","label":"Fully prepared"},{"value":"partial","label":"Partially prepared"},{"value":"needs_help","label":"Need financial planning guidance"}]'::jsonb,
   false, NULL, 409, true, 'Germany', 'de_chancenkarte'),
  ('de_financial_docs_ready','funds','multiselect','Can you provide:',
   NULL,
   '[{"value":"bank_statements","label":"Recent bank statements"},{"value":"income_proof","label":"Income proof"},{"value":"sponsor_docs","label":"Sponsor documents"},{"value":"tax_returns","label":"Tax returns"}]'::jsonb,
   false, NULL, 410, true, 'Germany', 'de_chancenkarte'),

  -- Section 6 — Compliance
  ('de_refusal_countries','compliance','multiselect','Country / countries that refused',
   NULL,
   '[{"value":"germany","label":"Germany"},{"value":"canada","label":"Canada"},{"value":"uk","label":"UK"},{"value":"usa","label":"USA"},{"value":"schengen","label":"Schengen"},{"value":"australia","label":"Australia"},{"value":"other","label":"Other"}]'::jsonb,
   false, '{"de_refusal_history": true}'::jsonb, 501, true, 'Germany', 'de_chancenkarte'),
  ('de_refusal_reason','compliance','text','Reason for refusal (optional)',
   NULL, NULL, false, '{"de_refusal_history": true}'::jsonb, 502, true, 'Germany', 'de_chancenkarte'),
  ('de_immigration_violations','compliance','select','Have you ever overstayed a visa, been deported, or received a removal order?',
   NULL,
   '[{"value":"no","label":"No"},{"value":"yes","label":"Yes"},{"value":"prefer_private","label":"Prefer private discussion"}]'::jsonb,
   false, NULL, 503, true, 'Germany', 'de_chancenkarte'),
  ('de_medical_condition','compliance','select','Do you have any medical condition that may affect long-term relocation?',
   NULL,
   '[{"value":"no","label":"No"},{"value":"yes","label":"Yes"},{"value":"prefer_private","label":"Prefer private consultation"}]'::jsonb,
   false, NULL, 511, true, 'Germany', 'de_chancenkarte'),
  ('de_passport_validity_known','compliance','select','Does your passport have sufficient validity remaining?',
   NULL,
   '[{"value":"yes","label":"Yes"},{"value":"no","label":"No"},{"value":"unsure","label":"Unsure"}]'::jsonb,
   false, NULL, 512, true, 'Germany', 'de_chancenkarte'),
  ('de_document_readiness_compliance','compliance','multiselect','Can you provide:',
   NULL,
   '[{"value":"pcc","label":"Police clearance certificate"},{"value":"edu","label":"Educational documents"},{"value":"work_refs","label":"Work reference letters"},{"value":"financial","label":"Financial documents"}]'::jsonb,
   false, NULL, 514, true, 'Germany', 'de_chancenkarte'),
  ('de_identity_consistency','compliance','select','Do all your official documents have matching names and details?',
   NULL,
   '[{"value":"yes","label":"Yes"},{"value":"no","label":"No"},{"value":"unsure","label":"Unsure"}]'::jsonb,
   false, NULL, 515, true, 'Germany', 'de_chancenkarte'),

  -- Section 7 — Documents
  ('de_passport_expiry','documents','date','Passport expiry date',
   NULL, NULL, false, NULL, 901, true, 'Germany', 'de_chancenkarte'),
  ('de_education_docs_ready','documents','multiselect','Education documents you currently have',
   NULL,
   '[{"value":"degree","label":"Degree certificates"},{"value":"transcripts","label":"Transcripts / marksheets"},{"value":"vocational","label":"Vocational certificates"}]'::jsonb,
   false, NULL, 902, true, 'Germany', 'de_chancenkarte'),
  ('de_experience_docs_ready','documents','multiselect','Work experience documents you currently have',
   NULL,
   '[{"value":"experience_letters","label":"Experience letters"},{"value":"contracts","label":"Employment contracts"},{"value":"salary_slips","label":"Salary slips"}]'::jsonb,
   false, NULL, 903, true, 'Germany', 'de_chancenkarte'),
  ('de_language_docs_ready','documents','multiselect','Language documents you currently have',
   NULL,
   '[{"value":"english_test","label":"IELTS / PTE / TOEFL result"},{"value":"german_test","label":"Goethe / telc / TestDaF certificate"}]'::jsonb,
   false, NULL, 904, true, 'Germany', 'de_chancenkarte'),
  ('de_financial_docs_uploadable','documents','multiselect','Financial documents you can provide',
   NULL,
   '[{"value":"bank_statements","label":"Bank statements"},{"value":"savings_proof","label":"Savings proof"},{"value":"sponsor_docs","label":"Sponsor documents"}]'::jsonb,
   false, NULL, 905, true, 'Germany', 'de_chancenkarte'),
  ('de_identity_docs_ready','documents','multiselect','Identity documents you currently have',
   NULL,
   '[{"value":"birth","label":"Birth certificate"},{"value":"marriage","label":"Marriage certificate"},{"value":"pcc","label":"Police clearance certificate"}]'::jsonb,
   false, NULL, 906, true, 'Germany', 'de_chancenkarte'),
  ('de_docs_digital_ready','documents','select','Are your documents available in digital / scanned format?',
   NULL,
   '[{"value":"yes","label":"Yes"},{"value":"no","label":"No"},{"value":"partial","label":"Partially"}]'::jsonb,
   false, NULL, 907, true, 'Germany', 'de_chancenkarte'),
  ('de_translation_needed','documents','select','Do any of your documents require certified translation?',
   NULL,
   '[{"value":"yes","label":"Yes"},{"value":"no","label":"No"},{"value":"unsure","label":"Unsure"}]'::jsonb,
   false, NULL, 908, true, 'Germany', 'de_chancenkarte'),
  ('de_ocr_opt_in','documents','boolean','Would you like uploaded documents to be auto-analyzed for assessment assistance?',
   NULL, NULL, false, NULL, 909, true, 'Germany', 'de_chancenkarte')
ON CONFLICT (code) DO NOTHING;
