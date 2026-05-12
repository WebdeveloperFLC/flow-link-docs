
-- ============ Germany Chancenkarte rules ============
CREATE TABLE public.de_chancenkarte_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  factor TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  tiers JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{ when:{...}, points:number, label:string }]
  max_points INTEGER NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.de_chancenkarte_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "de_chancenkarte_rules_public_read" ON public.de_chancenkarte_rules FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "de_chancenkarte_rules_admin_write" ON public.de_chancenkarte_rules
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_de_chancenkarte_rules_touch BEFORE UPDATE ON public.de_chancenkarte_rules
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ Germany shortage occupations ============
CREATE TABLE public.de_shortage_occupations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  category TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.de_shortage_occupations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "de_shortage_occupations_public_read" ON public.de_shortage_occupations FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "de_shortage_occupations_admin_write" ON public.de_shortage_occupations
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_de_shortage_occupations_touch BEFORE UPDATE ON public.de_shortage_occupations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ Seed default Chancenkarte rules ============
INSERT INTO public.de_chancenkarte_rules (factor, label, description, tiers, max_points, order_index) VALUES
('qualification', 'Qualification recognition', 'Recognition of foreign qualification by ZAB / Anabin or recognised vocational training.',
 '[
   { "when": { "de_recognition_status": "full" }, "points": 4, "label": "Fully recognised degree" },
   { "when": { "de_anabin_status": "H+" }, "points": 4, "label": "Anabin H+ degree" },
   { "when": { "de_recognition_status": "partial" }, "points": 3, "label": "Partially recognised degree" },
   { "when": { "de_anabin_status": "H+-" }, "points": 3, "label": "Anabin H+/-" },
   { "when": { "de_vocational_qualification": true, "de_vocational_duration_years_gte": 2 }, "points": 3, "label": "Recognised vocational training ≥ 2y" }
 ]'::jsonb, 4, 10),
('german_language', 'German language', 'CEFR level of German.',
 '[
   { "when": { "de_german_level_in": ["B2","C1","C2"] }, "points": 3, "label": "German B2 or higher" },
   { "when": { "de_german_level": "B1" }, "points": 2, "label": "German B1" },
   { "when": { "de_german_level_in": ["A1","A2"] }, "points": 1, "label": "German A1/A2" }
 ]'::jsonb, 3, 20),
('english_language', 'English language', 'English at B2/C1 level (or IELTS ≥ 6.0).',
 '[
   { "when": { "de_english_cefr_in": ["B2","C1","C2"] }, "points": 1, "label": "English B2 or higher" },
   { "when": { "de_english_score_gte": 6 }, "points": 1, "label": "IELTS 6.0+ / PTE 59+" }
 ]'::jsonb, 1, 30),
('work_experience', 'Skilled work experience', 'Years of qualified work experience in the last 7 years.',
 '[
   { "when": { "de_skilled_experience_years_gte": 5 }, "points": 3, "label": "≥ 5 years in last 7" },
   { "when": { "de_skilled_experience_years_gte": 2 }, "points": 2, "label": "≥ 2 years in last 7" }
 ]'::jsonb, 3, 40),
('age', 'Age', 'Younger applicants score higher.',
 '[
   { "when": { "de_age_lte": 34 }, "points": 2, "label": "Age 35 or under" },
   { "when": { "de_age_lte": 39 }, "points": 1, "label": "Age 36–39" }
 ]'::jsonb, 2, 50),
('shortage_occupation', 'Shortage occupation', 'Occupation appears on the Germany shortage/bottleneck list.',
 '[
   { "when": { "de_demand_occupation": true }, "points": 1, "label": "On shortage list" }
 ]'::jsonb, 1, 60),
('germany_ties', 'Germany connection', 'Previous legal stay ≥ 6 months, study in Germany, or close family in Germany.',
 '[
   { "when": { "de_studied_in_germany": true }, "points": 1, "label": "Studied in Germany" },
   { "when": { "de_previous_stay": true, "de_previous_stay_months_gte": 6 }, "points": 1, "label": "Previous stay ≥ 6 months" },
   { "when": { "de_family_in_germany": true }, "points": 1, "label": "Close family in Germany" }
 ]'::jsonb, 1, 70),
('spouse', 'Spouse / partner qualification', 'Accompanying spouse also meets Chancenkarte basic conditions.',
 '[
   { "when": { "de_spouse_qualification": true, "de_partner_join": true }, "points": 1, "label": "Spouse joint application" }
 ]'::jsonb, 1, 80),
('pass_threshold', 'Pass threshold', 'Minimum points required to be eligible for the Opportunity Card.',
 '[ { "threshold": 6 } ]'::jsonb, 0, 999)
ON CONFLICT (factor) DO NOTHING;

-- ============ Seed Germany shortage occupations (starter list) ============
INSERT INTO public.de_shortage_occupations (label, keywords, category) VALUES
('Software developer / engineer', ARRAY['software','developer','engineer','programmer','full stack','backend','frontend'], 'IT'),
('Data scientist / analyst', ARRAY['data scientist','data analyst','machine learning','ml engineer','data engineer'], 'IT'),
('Cyber security specialist', ARRAY['cyber','security','infosec','soc','penetration'], 'IT'),
('IT system administrator', ARRAY['sysadmin','system administrator','devops','sre'], 'IT'),
('Mechatronics / mechanical engineer', ARRAY['mechatronics','mechanical engineer','mechanical'], 'Engineering'),
('Electrical / electronics engineer', ARRAY['electrical','electronics','electrical engineer'], 'Engineering'),
('Civil / structural engineer', ARRAY['civil engineer','structural engineer'], 'Engineering'),
('Registered nurse', ARRAY['nurse','registered nurse','rn','nursing'], 'Healthcare'),
('Geriatric / elder care nurse', ARRAY['geriatric','elder care','altenpflege'], 'Healthcare'),
('Medical doctor / physician', ARRAY['doctor','physician','medical doctor','md'], 'Healthcare'),
('Pharmacist', ARRAY['pharmacist','pharmacy'], 'Healthcare'),
('Physiotherapist', ARRAY['physiotherapist','physical therapist','physio'], 'Healthcare'),
('STEM teacher (maths/science)', ARRAY['teacher','math teacher','science teacher','physics teacher','chemistry teacher'], 'Education'),
('Skilled construction trade', ARRAY['carpenter','plumber','electrician','mason','welder','roofer'], 'Trades'),
('Bus / truck / lorry driver', ARRAY['bus driver','truck driver','lorry','hgv','lkw'], 'Transport'),
('Chef / professional cook', ARRAY['chef','cook','sous chef'], 'Hospitality'),
('Hotel / restaurant specialist', ARRAY['hotel','restaurant','hospitality'], 'Hospitality');

-- ============ Top up Germany assessment questions ============
-- All inserts use codes that don't exist yet; safe with ON CONFLICT.
INSERT INTO public.assessment_questions (code, section, q_type, label, help_text, options, required, order_index, country, goal) VALUES
-- Personal
('de_nationality', 'personal', 'text', 'Nationality (passport country)', NULL, NULL, false, 1, 'Germany', 'de_chancenkarte'),
('de_current_country', 'personal', 'text', 'Country you currently live in', NULL, NULL, false, 2, 'Germany', 'de_chancenkarte'),
-- Education
('de_education_country', 'education', 'text', 'Country where you obtained your highest qualification', NULL, NULL, false, 12, 'Germany', 'de_chancenkarte'),
('de_degree_duration_years', 'education', 'number', 'Degree duration (years of full-time study)', NULL, NULL, false, 13, 'Germany', 'de_chancenkarte'),
('de_recognition_status', 'education', 'select', 'Qualification recognition status (ZAB / professional body)', 'Use ZAB Statement of Comparability for university degrees, or the relevant chamber for regulated professions.',
 '["full","partial","not_started","not_required"]'::jsonb, false, 14, 'Germany', 'de_chancenkarte'),
('de_anabin_status', 'education', 'select', 'Anabin database equivalency for your institution / degree', NULL,
 '["H+","H+-","H-","unknown"]'::jsonb, false, 15, 'Germany', 'de_chancenkarte'),
('de_vocational_qualification', 'education', 'boolean', 'Do you hold a vocational qualification (Ausbildung-equivalent)?', NULL, NULL, false, 16, 'Germany', 'de_chancenkarte'),
('de_vocational_duration_years', 'education', 'number', 'Vocational training duration (years)', NULL, NULL, false, 17, 'Germany', 'de_chancenkarte'),
-- Language
('de_german_test_provider', 'language', 'select', 'German test provider (if any)', NULL,
 '["Goethe","telc","ÖSD","TestDaF","DSH","none"]'::jsonb, false, 22, 'Germany', 'de_chancenkarte'),
('de_english_test', 'language', 'select', 'English test taken', NULL,
 '["IELTS","PTE","TOEFL","Duolingo","none"]'::jsonb, false, 23, 'Germany', 'de_chancenkarte'),
('de_english_score', 'language', 'number', 'English test overall score', 'IELTS overall, PTE overall, TOEFL iBT total, etc.', NULL, false, 24, 'Germany', 'de_chancenkarte'),
('de_english_cefr', 'language', 'select', 'English CEFR level', NULL,
 '["A1","A2","B1","B2","C1","C2"]'::jsonb, false, 25, 'Germany', 'de_chancenkarte'),
-- Work
('de_occupation', 'work', 'text', 'Your current occupation / job title', NULL, NULL, false, 30, 'Germany', 'de_chancenkarte'),
('de_skilled_experience_years', 'work', 'number', 'Years of skilled work in the last 7 years', NULL, NULL, false, 31, 'Germany', 'de_chancenkarte'),
('de_currently_employed', 'work', 'boolean', 'Are you currently employed?', NULL, NULL, false, 32, 'Germany', 'de_chancenkarte'),
('de_european_experience_years', 'work', 'number', 'Years of work experience inside the EU', NULL, NULL, false, 33, 'Germany', 'de_chancenkarte'),
('de_management_experience_years', 'work', 'number', 'Years of management / leadership experience', NULL, NULL, false, 34, 'Germany', 'de_chancenkarte'),
('de_demand_occupation', 'work', 'boolean', 'Is your occupation on the German shortage / demand list?', 'See the admin-managed list of shortage occupations.', NULL, false, 35, 'Germany', 'de_chancenkarte'),
-- Germany ties
('de_previous_stay_months', 'personal', 'number', 'How many months did you previously stay in Germany?', NULL, NULL, false, 5, 'Germany', 'de_chancenkarte'),
('de_family_in_germany', 'personal', 'boolean', 'Do you have close family in Germany?', NULL, NULL, false, 6, 'Germany', 'de_chancenkarte'),
('de_studied_in_germany', 'personal', 'boolean', 'Have you studied in Germany?', NULL, NULL, false, 7, 'Germany', 'de_chancenkarte'),
('de_employer_contact', 'work', 'select', 'Stage of employer communication', NULL,
 '["none","early talks","interview stage","verbal offer","signed contract"]'::jsonb, false, 36, 'Germany', 'de_skilled_worker'),
-- Finance
('de_blocked_account_eur', 'funds', 'number', 'Funds available in a blocked account (€)', 'Sperrkonto. ~€12 324/year required for Opportunity Card / Job Seeker as of 2025.', NULL, false, 40, 'Germany', 'de_chancenkarte'),
('de_sponsor_support', 'funds', 'boolean', 'Do you have a formal sponsor (Verpflichtungserklärung)?', NULL, NULL, false, 41, 'Germany', 'de_chancenkarte'),
('de_monthly_budget_eur', 'funds', 'number', 'Monthly maintenance budget (€)', NULL, NULL, false, 42, 'Germany', 'de_chancenkarte'),
-- Misc
('de_spouse_qualification', 'personal', 'boolean', 'Does your spouse / partner also meet Chancenkarte basic conditions?', NULL, NULL, false, 4, 'Germany', 'de_chancenkarte'),
('de_marital_status', 'personal', 'select', 'Marital status (detailed)', NULL,
 '["single","married","common-law","separated","divorced","widowed"]'::jsonb, false, 3, 'Germany', 'de_chancenkarte')
ON CONFLICT (code) DO NOTHING;

-- ============ Update Germany pathway match rules to canonical keys ============
UPDATE public.assessment_programs SET match_rules =
  '{"requires":["de_passport_valid"],"chancenkarte_points":true,"min_points":6,"base":{"any_of":["de_recognition_status:full","de_recognition_status:partial","de_anabin_status:H+","de_vocational_qualification:true"],"funds_any_of":["de_blocked_account_eur_gte:12324","de_sponsor_support:true"],"language_any_of":["de_german_level:A1","de_english_cefr:B2"]}}'::jsonb
 WHERE code = 'de_chancenkarte';

UPDATE public.assessment_programs SET match_rules =
  '{"requires":["de_passport_valid"],"min_education_level":"bachelor","recognition_any_of":["de_recognition_status:full","de_recognition_status:partial","de_anabin_status:H+"],"funds_any_of":["de_blocked_account_eur_gte:12324","de_sponsor_support:true"]}'::jsonb
 WHERE code = 'de_job_seeker';

UPDATE public.assessment_programs SET match_rules =
  '{"requires":["de_passport_valid"],"min_german":"B1","needs_any_of":["de_ausbildung_offer:true"],"max_age":35}'::jsonb
 WHERE code = 'de_ausbildung';

UPDATE public.assessment_programs SET match_rules =
  '{"requires":["de_job_offer","de_passport_valid"],"min_german":"B1","zab_required":true,"recognition_any_of":["de_recognition_status:full","de_recognition_status:partial","de_vocational_qualification:true"]}'::jsonb
 WHERE code = 'de_skilled_worker';

UPDATE public.assessment_programs SET match_rules =
  '{"requires":["de_passport_valid"],"min_salary_eur":43759.80,"min_contract_months":6,"standard_salary_eur":48300,"recognition_any_of":["de_recognition_status:full","de_anabin_status:H+"]}'::jsonb
 WHERE code = 'de_blue_card';
