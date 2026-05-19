
-- ==========================================================================
-- BRANCHES
-- ==========================================================================
CREATE TABLE public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  city text,
  country text DEFAULT 'IN',
  is_virtual boolean DEFAULT false,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "branches readable by authenticated" ON public.branches FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage branches" ON public.branches FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER touch_branches_updated_at BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.branches (name, city, country, is_virtual, display_order) VALUES
  ('Genda Circle','Vadodara','IN',false,1),
  ('Karelibaug','Vadodara','IN',false,2),
  ('Atlantis','Vadodara','IN',false,3),
  ('Bhayli','Vadodara','IN',false,4),
  ('Ajwa','Vadodara','IN',false,5),
  ('Manjalpur','Vadodara','IN',false,6),
  ('Anand','Gujarat','IN',false,7),
  ('Bharuch','Gujarat','IN',false,8),
  ('Canada','Toronto','CA',false,9),
  ('India — Remote','Pan India','IN',true,10);

-- ==========================================================================
-- DEPARTMENTS
-- ==========================================================================
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  handles_services text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "departments readable by authenticated" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage departments" ON public.departments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER touch_departments_updated_at BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.departments (name, handles_services, display_order) VALUES
  ('Immigration', ARRAY['visa_immigration'], 1),
  ('Education / Admissions', ARRAY['admission_services'], 2),
  ('Coaching', ARRAY['coaching_services'], 3),
  ('Accounts', ARRAY[]::text[], 4),
  ('Telecalling', ARRAY[]::text[], 5),
  ('Travel & Forex', ARRAY['travel_financial'], 6),
  ('Application Assistance', ARRAY['admission_services','allied_services'], 7),
  ('Management', ARRAY[]::text[], 8);

-- ==========================================================================
-- SERVICE CATALOGUE
-- ==========================================================================
CREATE TABLE public.service_catalogue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_key text NOT NULL,
  sub_category text,
  service_name text NOT NULL,
  service_code text UNIQUE,
  pricing_type text NOT NULL DEFAULT 'FIXED'
    CHECK (pricing_type IN ('FIXED','FLEXIBLE','FREE','ON_REQUEST')),
  fee_inr numeric,
  fee_cad numeric,
  fee_gbp numeric,
  fee_aud numeric,
  min_fee_inr numeric DEFAULT 0,
  max_fee_inr numeric,
  suggested_fee_inr numeric DEFAULT 0,
  gst_applicable boolean DEFAULT true,
  gst_rate numeric DEFAULT 18,
  country_tag text,
  is_active boolean DEFAULT true,
  is_bundled boolean DEFAULT false,
  bundle_note text,
  display_order integer DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.service_catalogue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_catalogue readable by authenticated" ON public.service_catalogue FOR SELECT TO authenticated USING (true);
CREATE POLICY "accounting admins manage service_catalogue" ON public.service_catalogue FOR ALL TO authenticated
  USING (public.is_accounting_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.is_accounting_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER touch_service_catalogue_updated_at BEFORE UPDATE ON public.service_catalogue
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_service_catalogue_master_key ON public.service_catalogue(master_key, display_order);
CREATE INDEX idx_service_catalogue_country ON public.service_catalogue(country_tag) WHERE country_tag IS NOT NULL;

-- Seed: VISA & IMMIGRATION
INSERT INTO public.service_catalogue (master_key, sub_category, service_name, service_code, pricing_type, fee_inr, fee_cad, fee_gbp, fee_aud, gst_applicable, gst_rate, country_tag, is_bundled, bundle_note, display_order, notes) VALUES
('visa_immigration','Canada','Canada — Student Visa (Study Permit)','VIS-CA-STUD','FIXED',7500,150,NULL,NULL,true,18,'Canada',false,NULL,10,NULL),
('visa_immigration','Canada','Canada — Visitor Visa (TRV)','VIS-CA-VISIT','FIXED',6500,200,NULL,NULL,true,18,'Canada',false,NULL,20,NULL),
('visa_immigration','Canada','Canada — Tourist Visa','VIS-CA-TOUR','FIXED',6500,200,NULL,NULL,true,18,'Canada',false,NULL,21,NULL),
('visa_immigration','Canada','Canada — Super Visa','VIS-CA-SUPER','FIXED',30000,565,NULL,NULL,true,18,'Canada',false,NULL,30,NULL),
('visa_immigration','Canada','Canada — Spousal Sponsorship','VIS-CA-SPOUS','FIXED',30000,565,NULL,NULL,true,18,'Canada',false,NULL,40,NULL),
('visa_immigration','Canada','Canada — Express Entry / PR','VIS-CA-PR','FIXED',120000,3000,NULL,NULL,true,18,'Canada',false,NULL,50,NULL),
('visa_immigration','Canada','Canada — Work Permit','VIS-CA-WORK','ON_REQUEST',NULL,NULL,NULL,NULL,true,18,'Canada',false,NULL,60,NULL),
('visa_immigration','Canada','Canada — Study Permit Extension','VIS-CA-STEXT','ON_REQUEST',NULL,NULL,NULL,NULL,true,18,'Canada',false,NULL,70,NULL),
('visa_immigration','Canada','Canada — PGWP','VIS-CA-PGWP','ON_REQUEST',NULL,NULL,NULL,NULL,true,18,'Canada',false,NULL,80,NULL),
('visa_immigration','Canada','Canada — PNP','VIS-CA-PNP','ON_REQUEST',NULL,NULL,NULL,NULL,true,18,'Canada',false,NULL,90,NULL),
('visa_immigration','Canada','Canada — PAL Letter','VIS-CA-PAL','ON_REQUEST',NULL,NULL,NULL,NULL,true,18,'Canada',false,NULL,100,NULL),
('visa_immigration','Canada','Canada — BOWP','VIS-CA-BOWP','ON_REQUEST',NULL,NULL,NULL,NULL,true,18,'Canada',false,NULL,110,NULL),
('visa_immigration','Canada','Canada — CAIPS Notes','VIS-CA-CAIPS','ON_REQUEST',NULL,NULL,NULL,NULL,true,18,'Canada',false,NULL,120,NULL),
('visa_immigration','United Kingdom','UK — Student Visa','VIS-UK-STUD','FIXED',5000,NULL,75,NULL,true,18,'United Kingdom',false,NULL,200,NULL),
('visa_immigration','United Kingdom','UK — Visitor Visa','VIS-UK-VISIT','ON_REQUEST',NULL,NULL,NULL,NULL,true,18,'United Kingdom',false,NULL,210,NULL),
('visa_immigration','Australia','Australia — Student Visa','VIS-AU-STUD','FIXED',10000,NULL,NULL,NULL,true,18,'Australia',false,NULL,300,NULL),
('visa_immigration','Australia','Australia — Visitor Visa','VIS-AU-VISIT','ON_REQUEST',NULL,NULL,NULL,NULL,true,18,'Australia',false,NULL,310,NULL),
('visa_immigration','Germany','Germany — Student Visa + Admission Package','VIS-DE-STUD','FIXED',45000,NULL,NULL,NULL,true,18,'Germany',true,'Includes admission + visa',400,'Bundled service'),
('visa_immigration','Germany','Germany — Job Seeker Visa','VIS-DE-JOB','FIXED',65000,NULL,NULL,NULL,true,18,'Germany',false,NULL,410,NULL),
('visa_immigration','Germany','Germany — Opportunity Card','VIS-DE-OPP','FIXED',65000,NULL,NULL,NULL,true,18,'Germany',false,NULL,420,NULL),
('visa_immigration','USA','USA — Student Visa F-1','VIS-US-STUD','ON_REQUEST',NULL,NULL,NULL,NULL,true,18,'USA',false,NULL,500,NULL),
('visa_immigration','USA','USA — Visitor Visa B1/B2','VIS-US-VISIT','ON_REQUEST',NULL,NULL,NULL,NULL,true,18,'USA',false,NULL,510,NULL),
('visa_immigration','Schengen','Schengen — Tourist Visa','VIS-SCH-TOUR','ON_REQUEST',NULL,NULL,NULL,NULL,true,18,'Schengen',false,NULL,600,NULL),
('visa_immigration','New Zealand','New Zealand — Student Visa','VIS-NZ-STUD','ON_REQUEST',NULL,NULL,NULL,NULL,true,18,'New Zealand',false,NULL,700,NULL),
('visa_immigration','UAE','UAE — Visit Visa','VIS-AE-VISIT','ON_REQUEST',NULL,NULL,NULL,NULL,true,18,'UAE',false,NULL,800,NULL),
('visa_immigration','Other','Spouse / Dependent Visa','VIS-OTH-SPOU','ON_REQUEST',NULL,NULL,NULL,NULL,true,18,NULL,false,NULL,900,NULL),
('visa_immigration','Other','Work & Holiday Visa','VIS-OTH-WHV','ON_REQUEST',NULL,NULL,NULL,NULL,true,18,NULL,false,NULL,910,NULL);

-- Seed: COACHING
INSERT INTO public.service_catalogue (master_key, sub_category, service_name, service_code, pricing_type, fee_inr, fee_cad, fee_gbp, fee_aud, gst_applicable, gst_rate, country_tag, is_bundled, bundle_note, display_order, notes) VALUES
('coaching_services','IELTS','IELTS Academic Regular (without books)','COACH-IELTS-AC-NB','FIXED',11000,NULL,NULL,NULL,true,18,NULL,false,NULL,10,NULL),
('coaching_services','IELTS','IELTS Academic Regular (with books)','COACH-IELTS-AC-WB','FIXED',15000,NULL,NULL,NULL,true,18,NULL,false,NULL,20,NULL),
('coaching_services','IELTS','IELTS Academic Crash Course','COACH-IELTS-AC-CC','FIXED',15000,NULL,NULL,NULL,true,18,NULL,false,NULL,30,NULL),
('coaching_services','IELTS','IELTS General Regular (without books)','COACH-IELTS-GN-NB','FIXED',12000,NULL,NULL,NULL,true,18,NULL,false,NULL,40,NULL),
('coaching_services','IELTS','IELTS General Regular (with books)','COACH-IELTS-GN-WB','ON_REQUEST',NULL,NULL,NULL,NULL,true,18,NULL,false,NULL,50,NULL),
('coaching_services','IELTS','IELTS General Crash Course','COACH-IELTS-GN-CC','ON_REQUEST',NULL,NULL,NULL,NULL,true,18,NULL,false,NULL,60,NULL),
('coaching_services','English Proficiency','PTE Academic','COACH-PTE','ON_REQUEST',NULL,NULL,NULL,NULL,true,18,NULL,false,NULL,70,NULL),
('coaching_services','English Proficiency','TOEFL iBT','COACH-TOEFL','ON_REQUEST',NULL,NULL,NULL,NULL,true,18,NULL,false,NULL,80,NULL),
('coaching_services','English Proficiency','CELPIP General','COACH-CELPIP','ON_REQUEST',NULL,NULL,NULL,NULL,true,18,NULL,false,NULL,90,NULL),
('coaching_services','English Proficiency','Duolingo English Test','COACH-DUOLINGO','ON_REQUEST',NULL,NULL,NULL,NULL,true,18,NULL,false,NULL,100,NULL),
('coaching_services','English Proficiency','Spoken English (with books)','COACH-SPOKEN','ON_REQUEST',NULL,NULL,NULL,NULL,true,18,NULL,false,NULL,110,NULL),
('coaching_services','Graduate Admissions','GRE','COACH-GRE','ON_REQUEST',NULL,NULL,NULL,NULL,true,18,NULL,false,NULL,120,NULL),
('coaching_services','Graduate Admissions','GMAT','COACH-GMAT','ON_REQUEST',NULL,NULL,NULL,NULL,true,18,NULL,false,NULL,130,NULL),
('coaching_services','Graduate Admissions','SAT','COACH-SAT','ON_REQUEST',NULL,NULL,NULL,NULL,true,18,NULL,false,NULL,140,NULL),
('coaching_services','European Languages','French Language','COACH-FRENCH','ON_REQUEST',NULL,NULL,NULL,NULL,true,18,NULL,false,NULL,150,NULL),
('coaching_services','European Languages','German A2 Regular (with books)','COACH-DE-A2-WB','ON_REQUEST',NULL,NULL,NULL,NULL,true,18,NULL,false,NULL,160,NULL),
('coaching_services','European Languages','German A2 Crash (with books)','COACH-DE-A2-CC','ON_REQUEST',NULL,NULL,NULL,NULL,true,18,NULL,false,NULL,170,NULL),
('coaching_services','European Languages','German B1 Speaking','COACH-DE-B1-SP','ON_REQUEST',NULL,NULL,NULL,NULL,true,18,NULL,false,NULL,180,NULL),
('coaching_services','European Languages','German B1 Regular (with books)','COACH-DE-B1-WB','ON_REQUEST',NULL,NULL,NULL,NULL,true,18,NULL,false,NULL,190,NULL);

-- Seed: ADMISSION
INSERT INTO public.service_catalogue (master_key, sub_category, service_name, service_code, pricing_type, fee_inr, fee_cad, fee_gbp, fee_aud, gst_applicable, gst_rate, country_tag, is_bundled, bundle_note, display_order, notes) VALUES
('admission_services','Shortlisting','University Shortlisting (up to 5)','ADM-SHORT-5','ON_REQUEST',NULL,NULL,NULL,NULL,true,18,NULL,false,NULL,10,NULL),
('admission_services','Shortlisting','University Shortlisting (up to 10)','ADM-SHORT-10','ON_REQUEST',NULL,NULL,NULL,NULL,true,18,NULL,false,NULL,20,NULL),
('admission_services','Application','Application to 1 University','ADM-APP-1','ON_REQUEST',NULL,NULL,NULL,NULL,true,18,NULL,false,NULL,30,NULL),
('admission_services','Application','Application Package — 3 Universities','ADM-APP-3','ON_REQUEST',NULL,NULL,NULL,NULL,true,18,NULL,false,NULL,40,NULL),
('admission_services','Application','Application Package — 5 Universities','ADM-APP-5','ON_REQUEST',NULL,NULL,NULL,NULL,true,18,NULL,false,NULL,50,NULL),
('admission_services','Documents','SOP Writing — Undergraduate','ADM-SOP-UG','ON_REQUEST',NULL,NULL,NULL,NULL,true,18,NULL,false,NULL,60,NULL),
('admission_services','Documents','SOP Writing — Graduate / Masters','ADM-SOP-PG','ON_REQUEST',NULL,NULL,NULL,NULL,true,18,NULL,false,NULL,70,NULL),
('admission_services','Documents','LOR Guidance (per letter)','ADM-LOR','ON_REQUEST',NULL,NULL,NULL,NULL,true,18,NULL,false,NULL,80,NULL),
('admission_services','Offer Management','Offer Letter Review & Advice','ADM-OFFER-REV','ON_REQUEST',NULL,NULL,NULL,NULL,true,18,NULL,false,NULL,90,NULL),
('admission_services','Offer Management','LOA / CoE / CAS / I-20 Follow-up','ADM-DOC-FOLLOWUP','ON_REQUEST',NULL,NULL,NULL,NULL,true,18,NULL,false,NULL,100,NULL),
('admission_services','Financial','GIC Setup — Canada','ADM-GIC','ON_REQUEST',NULL,NULL,NULL,NULL,true,18,'Canada',false,NULL,110,NULL),
('admission_services','Financial','UCAS Application — UK','ADM-UCAS','ON_REQUEST',NULL,NULL,NULL,NULL,true,18,'United Kingdom',false,NULL,120,NULL);

-- Seed: ALLIED
INSERT INTO public.service_catalogue (master_key, sub_category, service_name, service_code, pricing_type, fee_inr, fee_cad, fee_gbp, fee_aud, gst_applicable, gst_rate, country_tag, is_bundled, bundle_note, display_order, notes) VALUES
('allied_services','Documentation','Notary Service','ALLIED-NOTARY','FLEXIBLE',NULL,NULL,NULL,NULL,true,18,NULL,false,NULL,10,NULL),
('allied_services','Documentation','Document Attestation','ALLIED-ATTEST','FLEXIBLE',NULL,NULL,NULL,NULL,true,18,NULL,false,NULL,20,NULL),
('allied_services','Documentation','Translation Service (per page)','ALLIED-TRANS','FLEXIBLE',NULL,NULL,NULL,NULL,true,18,NULL,false,NULL,30,NULL),
('allied_services','Documentation','Photocopy / Scanning / Printing','ALLIED-PHOTO','FLEXIBLE',NULL,NULL,NULL,NULL,true,18,NULL,false,NULL,40,NULL),
('allied_services','Documentation','Courier / Document Dispatch','ALLIED-COURIER','FLEXIBLE',NULL,NULL,NULL,NULL,true,18,NULL,false,NULL,50,NULL),
('allied_services','Financial','Education Loan Assistance','ALLIED-LOAN','FLEXIBLE',NULL,NULL,NULL,NULL,true,18,NULL,false,NULL,60,NULL),
('allied_services','Communication','SIM Card Assistance','ALLIED-SIM','FLEXIBLE',NULL,NULL,NULL,NULL,true,18,NULL,false,NULL,70,NULL),
('allied_services','Interview','Mock Interview (per session)','ALLIED-MOCK','FLEXIBLE',NULL,NULL,NULL,NULL,true,18,NULL,false,NULL,80,NULL),
('allied_services','Appointments','Biometrics Appointment Booking','ALLIED-BIO','FLEXIBLE',NULL,NULL,NULL,NULL,true,18,NULL,false,NULL,90,NULL),
('allied_services','Appointments','VFS / TLS Appointment Assistance','ALLIED-VFS','FLEXIBLE',NULL,NULL,NULL,NULL,true,18,NULL,false,NULL,100,NULL);

-- Seed: SETTLEMENT
INSERT INTO public.service_catalogue (master_key, sub_category, service_name, service_code, pricing_type, fee_inr, fee_cad, fee_gbp, fee_aud, gst_applicable, gst_rate, country_tag, is_bundled, bundle_note, display_order, notes) VALUES
('settlement_services','Pre-departure','Pre-departure Briefing Session','SETT-PREDEP-BRIEF','FREE',0,NULL,NULL,NULL,false,0,NULL,false,NULL,10,NULL),
('settlement_services','Pre-departure','Pre-departure Document Checklist','SETT-PREDEP-CHECK','FREE',0,NULL,NULL,NULL,false,0,NULL,false,NULL,20,NULL),
('settlement_services','Post-arrival','Airport Pickup Coordination','SETT-POST-AIRPORT','FREE',0,NULL,NULL,NULL,false,0,NULL,false,NULL,30,NULL),
('settlement_services','Post-arrival','Bank Account Opening Guidance','SETT-POST-BANK','FREE',0,NULL,NULL,NULL,false,0,NULL,false,NULL,40,NULL),
('settlement_services','Post-arrival','Post-arrival Follow-up Call (Day 1)','SETT-POST-CALL1','FREE',0,NULL,NULL,NULL,false,0,NULL,false,NULL,50,NULL),
('settlement_services','Post-arrival','Post-arrival Follow-up Call (Week 1)','SETT-POST-CALL7','FREE',0,NULL,NULL,NULL,false,0,NULL,false,NULL,60,NULL),
('settlement_services','Post-arrival','Accommodation Research','SETT-POST-ACCOM','FREE',0,NULL,NULL,NULL,false,0,NULL,false,NULL,70,NULL);

-- Seed: TRAVEL & FINANCIAL
INSERT INTO public.service_catalogue (master_key, sub_category, service_name, service_code, pricing_type, fee_inr, fee_cad, fee_gbp, fee_aud, gst_applicable, gst_rate, country_tag, is_bundled, bundle_note, display_order, notes) VALUES
('travel_financial','Ticketing','Flight Booking — One Way (service fee)','TRVL-FLT-OW','FLEXIBLE',NULL,NULL,NULL,NULL,true,18,NULL,false,NULL,10,NULL),
('travel_financial','Ticketing','Flight Booking — Return (service fee)','TRVL-FLT-RT','FLEXIBLE',NULL,NULL,NULL,NULL,true,18,NULL,false,NULL,20,NULL),
('travel_financial','Travel Insurance','Travel Insurance — Student','TRVL-INS-STUD','FLEXIBLE',NULL,NULL,NULL,NULL,true,18,NULL,false,NULL,30,NULL),
('travel_financial','Travel Insurance','Super Visa Insurance — Canada','TRVL-INS-SUPER','FLEXIBLE',NULL,NULL,NULL,NULL,true,18,'Canada',false,NULL,40,NULL),
('travel_financial','Medical Insurance','Medical Insurance — International Student','TRVL-MED-STUD','FLEXIBLE',NULL,NULL,NULL,NULL,true,18,NULL,false,NULL,50,NULL),
('travel_financial','Forex & Financial','Forex Card — Student','TRVL-FX-STUD','FLEXIBLE',NULL,NULL,NULL,NULL,true,18,NULL,false,NULL,60,NULL),
('travel_financial','Forex & Financial','Forex Card — Travel','TRVL-FX-TRVL','FLEXIBLE',NULL,NULL,NULL,NULL,true,18,NULL,false,NULL,70,NULL),
('travel_financial','Forex & Financial','Blocked Account Setup — Germany','TRVL-FX-BLOCKED','FLEXIBLE',NULL,NULL,NULL,NULL,true,18,'Germany',false,NULL,80,NULL),
('travel_financial','Tour Packages','Study Tour Package — Canada','TRVL-TOUR-CA','ON_REQUEST',NULL,NULL,NULL,NULL,true,18,'Canada',false,NULL,90,NULL),
('travel_financial','Tour Packages','Educational Tour Package — Custom','TRVL-TOUR-CUSTOM','ON_REQUEST',NULL,NULL,NULL,NULL,true,18,NULL,false,NULL,100,NULL);

-- ==========================================================================
-- SERVICE OFFERS
-- ==========================================================================
CREATE TABLE public.service_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_name text NOT NULL,
  offer_code text UNIQUE,
  offer_type text NOT NULL CHECK (offer_type IN ('PERCENT','FIXED_INR','COMBO')),
  discount_percent numeric,
  discount_amount_inr numeric,
  applicable_services uuid[],
  min_services_for_combo integer DEFAULT 1,
  valid_from date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date,
  applicable_branches text[],
  max_uses integer,
  uses_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  is_hidden boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.service_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "counselors and admins view offers" ON public.service_offers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'counselor'::app_role)
      OR public.is_accounting_admin(auth.uid()));
CREATE POLICY "accounting admins manage offers" ON public.service_offers FOR ALL TO authenticated
  USING (public.is_accounting_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.is_accounting_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

-- ==========================================================================
-- LEAD NUMBER SEQUENCES + GENERATOR
-- ==========================================================================
CREATE TABLE public.lead_number_sequences (
  year integer NOT NULL,
  lead_type text NOT NULL,
  last_number integer DEFAULT 0,
  PRIMARY KEY (year, lead_type)
);
ALTER TABLE public.lead_number_sequences ENABLE ROW LEVEL SECURITY;
-- no policies = only SECURITY DEFINER functions can read/write

CREATE OR REPLACE FUNCTION public.generate_lead_number(p_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year integer := EXTRACT(YEAR FROM now())::int;
  v_next integer;
BEGIN
  INSERT INTO public.lead_number_sequences (year, lead_type, last_number)
  VALUES (v_year, p_type, 1)
  ON CONFLICT (year, lead_type) DO UPDATE
    SET last_number = public.lead_number_sequences.last_number + 1
  RETURNING last_number INTO v_next;
  RETURN 'FL-' || p_type || '-' || v_year::text || '-' || LPAD(v_next::text, 4, '0');
END;
$$;

-- ==========================================================================
-- LEADS
-- ==========================================================================
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_number text UNIQUE NOT NULL,
  lead_type text NOT NULL CHECK (lead_type IN ('warm','hot','cold')),
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','contacted','qualified','converted','unqualified','lost')),

  first_name text NOT NULL,
  middle_name text,
  last_name text NOT NULL,
  email text,
  phone text,
  phone_country_code text,
  gender text CHECK (gender IN ('male','female','other','prefer_not_to_say')),
  marital_status text CHECK (marital_status IN ('single','married','divorced','widowed','separated')),
  country_of_citizenship text,
  country_of_residence text,

  coaching_services text[] DEFAULT '{}',
  visa_services text[] DEFAULT '{}',
  admission_services text[] DEFAULT '{}',
  allied_services text[] DEFAULT '{}',
  interested_countries text[] DEFAULT '{}',
  visa_locked boolean DEFAULT false,
  visa_lock_reason text,

  last_education text CHECK (last_education IN ('10th','12th','under_graduate','graduate','other')),
  last_education_other text,

  start_timeline text CHECK (start_timeline IN ('immediately','within_week','within_month','not_sure')),

  lead_source text,
  lead_temperature text NOT NULL DEFAULT 'warm' CHECK (lead_temperature IN ('hot','warm','cold')),

  branch text,
  department text,
  assigned_counselor_id uuid REFERENCES auth.users(id),

  is_cold_pool boolean DEFAULT false,
  cold_pool_campaign text,

  b2b_partner_id uuid,

  notes text,
  notes_locked boolean DEFAULT false,
  notes_locked_by uuid REFERENCES auth.users(id),
  notes_locked_at timestamptz,

  priority text DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  source text,
  created_by uuid REFERENCES auth.users(id),
  converted_to_client_id uuid,
  converted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Auto-generate lead_number if not provided
CREATE OR REPLACE FUNCTION public.fn_assign_lead_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_type text;
BEGIN
  IF NEW.lead_number IS NULL OR NEW.lead_number = '' THEN
    v_type := CASE
      WHEN NEW.is_cold_pool OR NEW.lead_type = 'cold' THEN 'C'
      WHEN NEW.b2b_partner_id IS NOT NULL THEN 'B'
      ELSE 'L'
    END;
    NEW.lead_number := public.generate_lead_number(v_type);
  END IF;
  IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_assign_lead_number BEFORE INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.fn_assign_lead_number();

CREATE TRIGGER touch_leads_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "leads select" ON public.leads FOR SELECT TO authenticated
  USING (
    auth.uid() = created_by
    OR auth.uid() = assigned_counselor_id
    OR public.is_accounting_admin(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'counselor'::app_role)
  );

CREATE POLICY "leads insert" ON public.leads FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "leads update" ON public.leads FOR UPDATE TO authenticated
  USING (
    auth.uid() = created_by
    OR auth.uid() = assigned_counselor_id
    OR public.is_accounting_admin(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'counselor'::app_role)
  );

CREATE POLICY "leads delete" ON public.leads FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_temperature ON public.leads(lead_temperature);
CREATE INDEX idx_leads_cold_pool ON public.leads(is_cold_pool);
CREATE INDEX idx_leads_counselor ON public.leads(assigned_counselor_id);
CREATE INDEX idx_leads_created_by ON public.leads(created_by);

-- ==========================================================================
-- MASTER LISTS: Lead Sources + Work Modes
-- ==========================================================================
INSERT INTO public.master_lists (key, label, description) VALUES
  ('lead_sources','Lead Sources','Where did the lead hear about us'),
  ('work_modes','Work Modes','Work mode options for staff and assignments')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.master_items (list_key, code, label, sort_order, is_active) VALUES
  ('lead_sources','seminar','Seminar',10,true),
  ('lead_sources','social_media','Social Media',20,true),
  ('lead_sources','online_ad','Online Advertisement',30,true),
  ('lead_sources','newspaper_magazine_ad','Newspaper/Magazine Ad',40,true),
  ('lead_sources','radio_tv_ad','Radio/TV Ad',50,true),
  ('lead_sources','world_education_expo','World Education Expo',60,true),
  ('lead_sources','website','Website',70,true),
  ('lead_sources','university_college_referral','University/College Referral',80,true),
  ('lead_sources','walk_in','Walk-in',90,true),
  ('lead_sources','google_search','Google Search',100,true),
  ('lead_sources','flc_event','FLC Event',110,true),
  ('lead_sources','hoarding','Hoarding',120,true),
  ('lead_sources','flyers','Flyers',130,true),
  ('lead_sources','reference','Reference',140,true),
  ('lead_sources','facebook','Facebook',150,true),
  ('lead_sources','agent_reference','Agent Reference',160,true),
  ('lead_sources','other','Other',170,true),
  ('work_modes','on_site','On-site',10,true),
  ('work_modes','remote','Remote',20,true),
  ('work_modes','night_shift','Night Shift',30,true),
  ('work_modes','hybrid','Hybrid',40,true);
