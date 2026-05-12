
-- 1. countries
CREATE TABLE IF NOT EXISTS public.countries (
  code text PRIMARY KEY,
  name text NOT NULL,
  flag_emoji text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','coming_soon')),
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "countries_public_read" ON public.countries FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "countries_admin_write" ON public.countries FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_countries_touch BEFORE UPDATE ON public.countries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.countries (code, name, flag_emoji, status, order_index) VALUES
  ('CA','Canada','🇨🇦','active',1),
  ('DE','Germany','🇩🇪','active',2),
  ('UK','United Kingdom','🇬🇧','coming_soon',3),
  ('AU','Australia','🇦🇺','coming_soon',4),
  ('US','United States','🇺🇸','coming_soon',5),
  ('NZ','New Zealand','🇳🇿','coming_soon',6),
  ('AE','United Arab Emirates','🇦🇪','coming_soon',7),
  ('EU','Europe (other)','🇪🇺','coming_soon',8)
ON CONFLICT (code) DO NOTHING;

-- 2. country_pathways
CREATE TABLE IF NOT EXISTS public.country_pathways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL REFERENCES public.countries(code) ON DELETE CASCADE,
  pathway_code text NOT NULL,
  label text NOT NULL,
  description text,
  icon text,
  is_active boolean NOT NULL DEFAULT true,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country_code, pathway_code)
);
ALTER TABLE public.country_pathways ENABLE ROW LEVEL SECURITY;
CREATE POLICY "country_pathways_public_read" ON public.country_pathways FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "country_pathways_admin_write" ON public.country_pathways FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_country_pathways_touch BEFORE UPDATE ON public.country_pathways
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Canada pathways
INSERT INTO public.country_pathways (country_code, pathway_code, label, description, icon, order_index) VALUES
  ('CA','permanent_residence','Express Entry','Federal Skilled Worker, CEC, FST and category-based draws','leaf',1),
  ('CA','pnp','Provincial Nominee Program','Provincial nominations across BC, ON, AB, SK and more','map',2),
  ('CA','study_permit','Study Permit','College, university, SDS pathway','graduation-cap',3),
  ('CA','work_permit','Work Permit','Open, employer-specific, LMIA, pilots','briefcase',4),
  ('CA','visitor_visa','Visitor Visa','Tourist, family visit, Super Visa','plane',5),
  ('CA','business_investment','Business Immigration','Start-up Visa, entrepreneur, investor','building-2',6)
ON CONFLICT (country_code, pathway_code) DO NOTHING;

-- Germany pathways
INSERT INTO public.country_pathways (country_code, pathway_code, label, description, icon, order_index) VALUES
  ('DE','de_chancenkarte','Opportunity Card (Chancenkarte)','Points-based job-seeker card for skilled workers','sparkles',1),
  ('DE','de_job_seeker','Job Seeker Visa','6-month visa to find qualified employment','search',2),
  ('DE','de_ausbildung','Ausbildung','Vocational training pathway','graduation-cap',3),
  ('DE','de_skilled_worker','Skilled Worker Visa','§18a/§18b — recognised qualification + job offer','briefcase',4),
  ('DE','de_blue_card','EU Blue Card','For highly qualified professionals with a salary offer','badge-check',5)
ON CONFLICT (country_code, pathway_code) DO NOTHING;

-- 3. Germany questions (assessment_questions reuses existing schema; goal = pathway_code)
-- Use a function-style insert that's idempotent on code.
INSERT INTO public.assessment_questions (code, section, q_type, label, help_text, options, required, conditional_on, order_index, country, goal) VALUES
  -- Personal (shared across DE pathways)
  ('de_age','personal','number','Age','Your age in years',NULL,true,NULL,10,'Germany','de_chancenkarte'),
  ('de_marital','personal','select','Marital status',NULL,'["single","married","common_law","separated","divorced","widowed"]'::jsonb,false,NULL,20,'Germany','de_chancenkarte'),
  ('de_partner_join','personal','boolean','Will your partner accompany you?',NULL,NULL,false,'{"de_marital":["married","common_law"]}'::jsonb,30,'Germany','de_chancenkarte'),

  -- Education
  ('de_highest_education','education','select','Highest education',NULL,'["secondary","vocational_2yr","vocational_3yr","bachelor","master","phd"]'::jsonb,true,NULL,100,'Germany','de_chancenkarte'),
  ('de_zab_recognised','education','select','Is your qualification recognised by ZAB / Anabin?','ZAB / Anabin database equivalence check','["fully_equivalent","partially","not_recognised","not_checked"]'::jsonb,true,NULL,110,'Germany','de_chancenkarte'),
  ('de_regulated_profession','education','boolean','Is your profession regulated in Germany?','Doctors, nurses, teachers, lawyers, etc.',NULL,false,NULL,120,'Germany','de_chancenkarte'),

  -- Language
  ('de_german_level','language','select','German language level (CEFR)','Goethe / telc / ÖSD / TestDaF','["none","a1","a2","b1","b2","c1","c2"]'::jsonb,true,NULL,200,'Germany','de_chancenkarte'),
  ('de_english_level','language','select','English language level (CEFR)','IELTS / TOEFL / native','["none","a1","a2","b1","b2","c1","c2"]'::jsonb,false,NULL,210,'Germany','de_chancenkarte'),

  -- Work
  ('de_work_experience_years','work','number','Years of qualified work experience',NULL,NULL,true,NULL,300,'Germany','de_chancenkarte'),
  ('de_work_in_shortage','work','boolean','Is your occupation on the German shortage / bottleneck list?','Engelpassberufe / Mangelberufe',NULL,false,NULL,310,'Germany','de_chancenkarte'),
  ('de_germany_experience_years','work','number','Years of work experience already in Germany',NULL,NULL,false,NULL,320,'Germany','de_chancenkarte'),

  -- Connection
  ('de_previous_germany_stay','personal','boolean','Have you previously lived in Germany legally?',NULL,NULL,false,NULL,330,'Germany','de_chancenkarte'),

  -- Finances
  ('de_proof_of_funds','funds','boolean','Can you show proof of funds for living costs?','Blocked account (Sperrkonto) of ~€11 904 / year',NULL,true,NULL,400,'Germany','de_chancenkarte'),

  -- Compliance
  ('de_health_insurance','compliance','boolean','Will you have valid German health insurance?',NULL,NULL,false,NULL,500,'Germany','de_chancenkarte'),
  ('de_criminal_history','compliance','boolean','Any criminal history to disclose?',NULL,NULL,false,NULL,510,'Germany','de_chancenkarte'),
  ('de_refusal_history','compliance','boolean','Prior visa refusal?',NULL,NULL,false,NULL,520,'Germany','de_chancenkarte'),

  -- Job Seeker specifics
  ('de_js_plan','work','select','Your job search plan',NULL,'["have_employer_leads","need_to_network","unsure"]'::jsonb,false,NULL,600,'Germany','de_job_seeker'),

  -- Ausbildung specifics
  ('de_ausbildung_offer','work','boolean','Do you have a confirmed Ausbildung (apprenticeship) contract?',NULL,NULL,false,NULL,700,'Germany','de_ausbildung'),
  ('de_ausbildung_field','education','text','Field / industry of Ausbildung',NULL,NULL,false,NULL,710,'Germany','de_ausbildung'),

  -- Skilled Worker specifics
  ('de_job_offer','work','boolean','Do you have a qualified job offer in Germany?',NULL,NULL,false,NULL,800,'Germany','de_skilled_worker'),
  ('de_employer_name','work','text','Employer name',NULL,NULL,false,'{"de_job_offer":true}'::jsonb,810,'Germany','de_skilled_worker'),
  ('de_annual_salary_eur','work','number','Annual gross salary offered (EUR)',NULL,NULL,false,'{"de_job_offer":true}'::jsonb,820,'Germany','de_skilled_worker'),

  -- Blue Card specifics
  ('de_bluecard_salary_eur','work','number','Annual gross salary offered (EUR)','Blue Card requires ≥ €48 300, or ≥ €43 759.80 in shortage occupations',NULL,false,NULL,830,'Germany','de_blue_card'),
  ('de_bluecard_contract_months','work','number','Contract duration (months)','EU Blue Card requires ≥ 6 months',NULL,false,NULL,840,'Germany','de_blue_card'),

  -- Documents
  ('de_passport_valid','documents','boolean','Do you have a valid passport (≥ 12 months)?',NULL,NULL,true,NULL,900,'Germany','de_chancenkarte')
ON CONFLICT (code) DO NOTHING;

-- Make most DE personal/education/language/funds/compliance/documents questions visible across all DE pathways
-- by registering pathway-specific aliases for the shared codes via additional rows? Simpler: leave goal column to filter,
-- and let the frontend show all DE country questions whose goal matches active pathway OR is "common". We treat
-- 'de_chancenkarte' as the canonical "common" goal for the shared questions above; the frontend will display
-- all questions where country='Germany' AND (goal=pathway OR goal='de_chancenkarte') for non-chancenkarte pathways.

-- 4. Germany pathway match rules
INSERT INTO public.assessment_programs (code, label, description, country, goal, match_rules, order_index) VALUES
  ('de_chancenkarte','Opportunity Card (Chancenkarte)','Points-based 1-year card to seek work in Germany','Germany','de_chancenkarte',
   '{"requires":["de_proof_of_funds","de_passport_valid"],"chancenkarte_points":true}'::jsonb,1),
  ('de_job_seeker','Job Seeker Visa','6-month visa to find qualified employment','Germany','de_job_seeker',
   '{"requires":["de_proof_of_funds","de_passport_valid"],"min_education_level":"bachelor"}'::jsonb,2),
  ('de_ausbildung','Ausbildung','Vocational training pathway','Germany','de_ausbildung',
   '{"requires":["de_passport_valid"],"min_german":"b1"}'::jsonb,3),
  ('de_skilled_worker','Skilled Worker (§18a/§18b)','Recognised qualification + qualified job offer','Germany','de_skilled_worker',
   '{"requires":["de_job_offer","de_passport_valid"],"min_german":"b1","zab_required":true}'::jsonb,4),
  ('de_blue_card','EU Blue Card','High-skilled workers with salary threshold','Germany','de_blue_card',
   '{"requires":["de_passport_valid"],"min_salary_eur":43759.80,"standard_salary_eur":48300,"min_contract_months":6}'::jsonb,5)
ON CONFLICT (code) DO NOTHING;
