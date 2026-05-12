
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Occupations
CREATE TABLE IF NOT EXISTS public.noc_occupations (
  noc_code text PRIMARY KEY,
  title text NOT NULL,
  teer smallint NOT NULL CHECK (teer BETWEEN 0 AND 5),
  broad_category text,
  keywords text[] NOT NULL DEFAULT '{}',
  search_tsv tsvector,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.noc_occupations_tsv_refresh()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.search_tsv :=
    setweight(to_tsvector('simple', coalesce(NEW.title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(NEW.keywords,' '),'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.noc_code,'')), 'C');
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS noc_occupations_tsv ON public.noc_occupations;
CREATE TRIGGER noc_occupations_tsv
  BEFORE INSERT OR UPDATE ON public.noc_occupations
  FOR EACH ROW EXECUTE FUNCTION public.noc_occupations_tsv_refresh();

CREATE INDEX IF NOT EXISTS noc_occupations_search_idx ON public.noc_occupations USING gin(search_tsv);
CREATE INDEX IF NOT EXISTS noc_occupations_title_trgm ON public.noc_occupations USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS noc_occupations_teer_idx ON public.noc_occupations(teer);

ALTER TABLE public.noc_occupations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "noc_occupations_select_active" ON public.noc_occupations
  FOR SELECT TO authenticated USING (is_active OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "noc_occupations_admin_write" ON public.noc_occupations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- 2. Category mappings
CREATE TABLE IF NOT EXISTS public.noc_category_mappings (
  noc_code text NOT NULL REFERENCES public.noc_occupations(noc_code) ON DELETE CASCADE,
  category text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (noc_code, category)
);
CREATE INDEX IF NOT EXISTS noc_category_mappings_cat_idx ON public.noc_category_mappings(category);
ALTER TABLE public.noc_category_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "noc_cat_select" ON public.noc_category_mappings FOR SELECT TO authenticated USING (true);
CREATE POLICY "noc_cat_admin_write" ON public.noc_category_mappings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- 3. Pathway rules
CREATE TABLE IF NOT EXISTS public.pathway_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pathway text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  min_teer smallint,
  allowed_teers smallint[],
  min_foreign_experience_years numeric,
  min_canadian_experience_years numeric,
  min_clb smallint,
  requires_job_offer boolean NOT NULL DEFAULT false,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS pathway_rules_touch ON public.pathway_rules;
CREATE TRIGGER pathway_rules_touch BEFORE UPDATE ON public.pathway_rules
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
ALTER TABLE public.pathway_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pathway_rules_select" ON public.pathway_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "pathway_rules_admin_write" ON public.pathway_rules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- 4. Provincial targets
CREATE TABLE IF NOT EXISTS public.provincial_noc_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  province_code text NOT NULL,
  province_name text NOT NULL,
  stream_name text NOT NULL,
  noc_code text REFERENCES public.noc_occupations(noc_code) ON DELETE CASCADE,
  teer smallint,
  category text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pnt_noc_idx ON public.provincial_noc_targets(noc_code);
CREATE INDEX IF NOT EXISTS pnt_province_idx ON public.provincial_noc_targets(province_code);
DROP TRIGGER IF EXISTS provincial_noc_targets_touch ON public.provincial_noc_targets;
CREATE TRIGGER provincial_noc_targets_touch BEFORE UPDATE ON public.provincial_noc_targets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
ALTER TABLE public.provincial_noc_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pnt_select" ON public.provincial_noc_targets FOR SELECT TO authenticated USING (true);
CREATE POLICY "pnt_admin_write" ON public.provincial_noc_targets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- 5. Seed pathway rules
INSERT INTO public.pathway_rules (pathway, label, description, allowed_teers, min_foreign_experience_years, min_canadian_experience_years, min_clb, sort_order) VALUES
  ('express_entry','Express Entry (umbrella)','Federal points-based PR pathway for skilled workers.', ARRAY[0,1,2,3]::smallint[], 1, NULL, 7, 10),
  ('fsw','Federal Skilled Worker','For skilled foreign workers with at least 1 year of continuous skilled work experience.', ARRAY[0,1,2,3]::smallint[], 1, NULL, 7, 20),
  ('cec','Canadian Experience Class','For applicants with at least 1 year of skilled Canadian work experience.', ARRAY[0,1,2,3]::smallint[], NULL, 1, 7, 30),
  ('fst','Federal Skilled Trades','For qualified skilled trades workers (TEER 2/3 trades).', ARRAY[2,3]::smallint[], 2, NULL, 5, 40),
  ('pnp_generic','Provincial Nominee Program','Province-nominated PR streams; varies by province.', ARRAY[0,1,2,3,4]::smallint[], NULL, NULL, 5, 50)
ON CONFLICT (pathway) DO NOTHING;

-- 6. Seed NOC occupations
INSERT INTO public.noc_occupations (noc_code, title, teer, broad_category, keywords) VALUES
  ('00010','Senior government managers and officials',0,'Management',ARRAY['executive','director general','deputy minister']),
  ('00011','Senior managers - financial, communications, business',0,'Management',ARRAY['CEO','CFO','COO','executive director']),
  ('00012','Senior managers - trade, broadcasting and other services',0,'Management',ARRAY['senior manager','general manager']),
  ('00013','Senior managers - construction, transportation, production',0,'Management',ARRAY['vp operations','plant director']),
  ('10010','Financial managers',0,'Business, finance and administration',ARRAY['finance manager','treasurer','controller']),
  ('10011','Human resources managers',0,'Business, finance and administration',ARRAY['HR manager','people manager','talent manager']),
  ('10019','Other administrative services managers',0,'Business, finance and administration',ARRAY['office manager','admin manager']),
  ('10020','Insurance, real estate and financial brokerage managers',0,'Business, finance and administration',ARRAY['insurance manager','real estate manager']),
  ('10021','Banking, credit and other investment managers',0,'Business, finance and administration',ARRAY['bank manager','credit manager']),
  ('10022','Advertising, marketing and public relations managers',0,'Business, finance and administration',ARRAY['marketing manager','PR manager','brand manager']),
  ('10029','Other business services managers',0,'Business, finance and administration',ARRAY['consulting manager']),
  ('10030','Telecommunication carriers managers',0,'Business, finance and administration',ARRAY['telecom manager']),
  ('20010','Engineering managers',0,'Natural and applied sciences',ARRAY['engineering director','head of engineering']),
  ('20011','Architecture and science managers',0,'Natural and applied sciences',ARRAY['architecture manager','science manager']),
  ('20012','Computer and information systems managers',0,'Natural and applied sciences',ARRAY['IT manager','CIO','head of IT','engineering manager software']),
  ('30010','Managers in health care',0,'Health',ARRAY['hospital manager','clinic manager','nursing manager']),
  ('40010','Government managers - health and social policy',0,'Education, law and government',ARRAY['policy manager']),
  ('40020','Administrators - post-secondary education',0,'Education, law and government',ARRAY['university dean','college dean']),
  ('40021','School principals and administrators',0,'Education, law and government',ARRAY['principal','vice principal']),
  ('60010','Corporate sales managers',0,'Sales and service',ARRAY['sales director','head of sales','VP sales']),
  ('60020','Retail and wholesale trade managers',0,'Sales and service',ARRAY['store manager','retail manager']),
  ('60030','Restaurant and food service managers',0,'Sales and service',ARRAY['restaurant manager','F&B manager']),
  ('60031','Accommodation service managers',0,'Sales and service',ARRAY['hotel manager','lodging manager']),
  ('70010','Construction managers',0,'Trades, transport and equipment operators',ARRAY['site manager','project manager construction']),
  ('70020','Transportation managers',0,'Trades, transport and equipment operators',ARRAY['logistics manager','fleet manager']),
  ('80010','Managers in agriculture',0,'Natural resources, agriculture',ARRAY['farm manager']),
  ('90010','Manufacturing managers',0,'Manufacturing and utilities',ARRAY['plant manager','factory manager']),
  ('11100','Financial auditors and accountants',1,'Business, finance and administration',ARRAY['CPA','CA','accountant','auditor']),
  ('11101','Financial and investment analysts',1,'Business, finance and administration',ARRAY['financial analyst','investment analyst']),
  ('11102','Financial advisors',1,'Business, finance and administration',ARRAY['financial advisor','wealth advisor']),
  ('11200','Human resources professionals',1,'Business, finance and administration',ARRAY['HR business partner','HRBP','recruiter','talent acquisition']),
  ('11201','Business management consulting professionals',1,'Business, finance and administration',ARRAY['management consultant','business consultant']),
  ('11202','Professional occupations in advertising, marketing and public relations',1,'Business, finance and administration',ARRAY['marketing specialist','PR specialist','SEO','content marketing']),
  ('21100','Physicists and astronomers',1,'Natural and applied sciences',ARRAY['physicist']),
  ('21101','Chemists',1,'Natural and applied sciences',ARRAY['chemist']),
  ('21102','Geoscientists and oceanographers',1,'Natural and applied sciences',ARRAY['geologist','geophysicist']),
  ('21200','Architects',1,'Natural and applied sciences',ARRAY['architect']),
  ('21210','Mathematicians, statisticians and actuaries',1,'Natural and applied sciences',ARRAY['statistician','actuary']),
  ('21211','Data scientists',1,'Natural and applied sciences',ARRAY['data scientist','ML engineer','machine learning']),
  ('21220','Cybersecurity specialists',1,'Natural and applied sciences',ARRAY['cybersecurity','security analyst','infosec']),
  ('21221','Business systems specialists',1,'Natural and applied sciences',ARRAY['business analyst','BA']),
  ('21222','Information systems specialists',1,'Natural and applied sciences',ARRAY['systems analyst','IT analyst']),
  ('21223','Database analysts and data administrators',1,'Natural and applied sciences',ARRAY['DBA','database administrator']),
  ('21230','Computer systems developers and programmers',1,'Natural and applied sciences',ARRAY['software developer','programmer','systems developer']),
  ('21231','Software engineers and designers',1,'Natural and applied sciences',ARRAY['software engineer','SDE','backend','frontend','full stack']),
  ('21232','Software developers and programmers',1,'Natural and applied sciences',ARRAY['software developer','app developer']),
  ('21233','Web designers',1,'Natural and applied sciences',ARRAY['web designer','UI designer','UX designer']),
  ('21234','Web developers and programmers',1,'Natural and applied sciences',ARRAY['web developer','frontend developer']),
  ('21300','Civil engineers',1,'Natural and applied sciences',ARRAY['civil engineer','structural engineer']),
  ('21301','Mechanical engineers',1,'Natural and applied sciences',ARRAY['mechanical engineer','ME']),
  ('21310','Electrical and electronics engineers',1,'Natural and applied sciences',ARRAY['electrical engineer','electronics engineer','EE']),
  ('21311','Computer engineers (except software engineers and designers)',1,'Natural and applied sciences',ARRAY['computer engineer','hardware engineer']),
  ('21321','Industrial and manufacturing engineers',1,'Natural and applied sciences',ARRAY['industrial engineer','manufacturing engineer']),
  ('21322','Metallurgical and materials engineers',1,'Natural and applied sciences',ARRAY['materials engineer']),
  ('21330','Mining engineers',1,'Natural and applied sciences',ARRAY['mining engineer']),
  ('21331','Geological engineers',1,'Natural and applied sciences',ARRAY['geological engineer']),
  ('21332','Petroleum engineers',1,'Natural and applied sciences',ARRAY['petroleum engineer','oil and gas engineer']),
  ('21390','Aerospace engineers',1,'Natural and applied sciences',ARRAY['aerospace engineer']),
  ('31100','Specialists in clinical and laboratory medicine',1,'Health',ARRAY['pathologist','laboratory physician']),
  ('31101','Specialists in surgery',1,'Health',ARRAY['surgeon','cardiac surgeon','neurosurgeon']),
  ('31102','General practitioners and family physicians',1,'Health',ARRAY['family doctor','GP','family physician','MD']),
  ('31103','Veterinarians',1,'Health',ARRAY['veterinarian','vet']),
  ('31110','Dentists',1,'Health',ARRAY['dentist']),
  ('31111','Optometrists',1,'Health',ARRAY['optometrist']),
  ('31112','Audiologists and speech-language pathologists',1,'Health',ARRAY['audiologist','SLP']),
  ('31120','Pharmacists',1,'Health',ARRAY['pharmacist']),
  ('31121','Dietitians and nutritionists',1,'Health',ARRAY['dietitian','nutritionist']),
  ('31200','Psychologists',1,'Health',ARRAY['psychologist']),
  ('31203','Occupational therapists',1,'Health',ARRAY['occupational therapist','OT']),
  ('31204','Physiotherapists',1,'Health',ARRAY['physiotherapist','physical therapist','PT']),
  ('31300','Nursing coordinators and supervisors',1,'Health',ARRAY['nursing supervisor']),
  ('31301','Registered nurses and registered psychiatric nurses',1,'Health',ARRAY['RN','registered nurse','staff nurse','ICU nurse']),
  ('31302','Nurse practitioners',1,'Health',ARRAY['nurse practitioner','NP']),
  ('41101','Lawyers and Quebec notaries',1,'Education, law and government',ARRAY['lawyer','attorney','solicitor','notary']),
  ('41200','University professors and lecturers',1,'Education, law and government',ARRAY['professor','university lecturer','academic']),
  ('41220','Secondary school teachers',1,'Education, law and government',ARRAY['high school teacher','secondary teacher']),
  ('41221','Elementary school and kindergarten teachers',1,'Education, law and government',ARRAY['elementary teacher','primary teacher','kindergarten teacher']),
  ('41300','Social workers',1,'Education, law and government',ARRAY['social worker','MSW']),
  ('41301','Therapists in counselling and related specialized therapies',1,'Education, law and government',ARRAY['counsellor','therapist']),
  ('22220','Computer network and web technicians',2,'Natural and applied sciences',ARRAY['network technician','sysadmin','devops']),
  ('22221','User support technicians',2,'Natural and applied sciences',ARRAY['IT support','helpdesk','desktop support']),
  ('22222','Information systems testing technicians',2,'Natural and applied sciences',ARRAY['QA','tester','SDET','quality assurance']),
  ('22300','Civil engineering technologists and technicians',2,'Natural and applied sciences',ARRAY['civil tech','CAD technician']),
  ('22301','Mechanical engineering technologists and technicians',2,'Natural and applied sciences',ARRAY['mechanical technologist']),
  ('22310','Electrical and electronics engineering technologists and technicians',2,'Natural and applied sciences',ARRAY['electronics technician','EE technologist']),
  ('32101','Licensed practical nurses',2,'Health',ARRAY['LPN','practical nurse']),
  ('32102','Paramedical occupations',2,'Health',ARRAY['paramedic','EMT','ambulance']),
  ('32103','Respiratory therapists and cardiopulmonary technologists',2,'Health',ARRAY['respiratory therapist','RT']),
  ('32104','Animal health technologists and veterinary technicians',2,'Health',ARRAY['vet tech']),
  ('32111','Dental hygienists and dental therapists',2,'Health',ARRAY['dental hygienist']),
  ('32120','Medical laboratory technologists',2,'Health',ARRAY['lab tech','MLT']),
  ('32121','Medical radiation technologists',2,'Health',ARRAY['radiation tech','MRT']),
  ('72010','Contractors and supervisors - machining, metal forming trades',2,'Trades, transport and equipment operators',ARRAY['machining supervisor']),
  ('72100','Machinists and machining and tooling inspectors',2,'Trades, transport and equipment operators',ARRAY['machinist','CNC operator']),
  ('72200','Electricians (except industrial and power system)',2,'Trades, transport and equipment operators',ARRAY['electrician','residential electrician']),
  ('72201','Industrial electricians',2,'Trades, transport and equipment operators',ARRAY['industrial electrician']),
  ('72300','Plumbers',2,'Trades, transport and equipment operators',ARRAY['plumber']),
  ('72301','Steamfitters, pipefitters and sprinkler system installers',2,'Trades, transport and equipment operators',ARRAY['pipefitter','steamfitter']),
  ('72310','Carpenters',2,'Trades, transport and equipment operators',ARRAY['carpenter']),
  ('72320','Brick and stone masons',2,'Trades, transport and equipment operators',ARRAY['mason','bricklayer']),
  ('72400','Construction millwrights and industrial mechanics',2,'Trades, transport and equipment operators',ARRAY['millwright','industrial mechanic']),
  ('72401','Heavy-duty equipment mechanics',2,'Trades, transport and equipment operators',ARRAY['heavy duty mechanic']),
  ('72410','Automotive service technicians, truck and bus mechanics',2,'Trades, transport and equipment operators',ARRAY['auto mechanic','truck mechanic']),
  ('72500','Crane operators',2,'Trades, transport and equipment operators',ARRAY['crane operator']),
  ('72602','Heavy equipment operators',2,'Trades, transport and equipment operators',ARRAY['excavator operator','heavy equipment']),
  ('73300','Transport truck drivers',3,'Trades, transport and equipment operators',ARRAY['truck driver','long haul driver','class A driver']),
  ('33100','Dental assistants and dental laboratory assistants',3,'Health',ARRAY['dental assistant']),
  ('33101','Medical laboratory assistants and related technical occupations',3,'Health',ARRAY['lab assistant']),
  ('33102','Nurse aides, orderlies and patient service associates',3,'Health',ARRAY['nurse aide','PSW','orderly','PCA']),
  ('33103','Pharmacy technical assistants and pharmacy assistants',3,'Health',ARRAY['pharmacy assistant','pharmacy tech']),
  ('33109','Other assisting occupations in support of health services',3,'Health',ARRAY['health care aide','HCA']),
  ('43100','Elementary and secondary school teacher assistants',3,'Education, law and government',ARRAY['teacher aide','EA']),
  ('44100','Home child care providers',3,'Sales and service',ARRAY['nanny','babysitter','child caregiver']),
  ('44101','Home support workers, caregivers and related occupations',3,'Sales and service',ARRAY['home support worker','caregiver','HSW']),
  ('64314','Hotel front desk clerks',4,'Sales and service',ARRAY['hotel clerk','front desk','receptionist hotel']),
  ('64320','Store shelf stockers, clerks and order fillers',4,'Sales and service',ARRAY['shelf stocker','clerk']),
  ('65100','Cashiers',4,'Sales and service',ARRAY['cashier']),
  ('65200','Food and beverage servers',4,'Sales and service',ARRAY['server','waiter','waitress']),
  ('65201','Food counter attendants, kitchen helpers and related support',4,'Sales and service',ARRAY['kitchen helper']),
  ('65310','Light duty cleaners',4,'Sales and service',ARRAY['cleaner','housekeeper','janitor']),
  ('75110','Construction trades helpers and labourers',5,'Trades, transport and equipment operators',ARRAY['construction labourer','helper construction']),
  ('85100','Livestock labourers',5,'Natural resources, agriculture',ARRAY['farm labourer','livestock worker']),
  ('85101','Harvesting labourers',5,'Natural resources, agriculture',ARRAY['harvester','farm worker']),
  ('95100','Labourers in food and beverage processing',5,'Manufacturing and utilities',ARRAY['food processing worker'])
ON CONFLICT (noc_code) DO NOTHING;

-- 7. Category mappings
INSERT INTO public.noc_category_mappings (noc_code, category)
SELECT noc_code, 'healthcare' FROM public.noc_occupations
WHERE noc_code IN ('30010','31100','31101','31102','31103','31110','31111','31112','31120','31121','31200','31203','31204','31300','31301','31302','32101','32102','32103','32104','32111','32120','32121','33100','33101','33102','33103','33109')
ON CONFLICT DO NOTHING;

INSERT INTO public.noc_category_mappings (noc_code, category)
SELECT noc_code, 'stem' FROM public.noc_occupations
WHERE noc_code IN ('20010','20012','21100','21101','21102','21200','21210','21211','21220','21221','21222','21223','21230','21231','21232','21233','21234','21300','21301','21310','21311','21321','21322','21330','21331','21332','21390')
ON CONFLICT DO NOTHING;

INSERT INTO public.noc_category_mappings (noc_code, category)
SELECT noc_code, 'trades' FROM public.noc_occupations
WHERE noc_code IN ('72010','72100','72200','72201','72300','72301','72310','72320','72400','72401','72410','72500','72602','75110')
ON CONFLICT DO NOTHING;

INSERT INTO public.noc_category_mappings (noc_code, category)
SELECT noc_code, 'transport' FROM public.noc_occupations
WHERE noc_code IN ('73300','70020')
ON CONFLICT DO NOTHING;

INSERT INTO public.noc_category_mappings (noc_code, category)
SELECT noc_code, 'agriculture' FROM public.noc_occupations
WHERE noc_code IN ('80010','85100','85101','95100')
ON CONFLICT DO NOTHING;

INSERT INTO public.noc_category_mappings (noc_code, category)
SELECT noc_code, 'education' FROM public.noc_occupations
WHERE noc_code IN ('40020','40021','41200','41220','41221','43100')
ON CONFLICT DO NOTHING;

-- 8. Replace TEER select question with occupation_search
UPDATE public.assessment_questions
   SET q_type = 'occupation_search',
       label = 'What is your occupation?',
       help_text = 'Type your job title — we will auto-detect the NOC code and TEER.',
       options = NULL
 WHERE code = 'noc_teer';
