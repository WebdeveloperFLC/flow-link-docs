-- Master lists registry + items
CREATE TABLE public.master_lists (
  key text PRIMARY KEY,
  label text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.master_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_key text NOT NULL REFERENCES public.master_lists(key) ON DELETE CASCADE,
  code text NOT NULL,
  label text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (list_key, code)
);

CREATE INDEX master_items_list_active_idx
  ON public.master_items (list_key, is_active, sort_order);

ALTER TABLE public.master_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_items ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read (dropdowns)
CREATE POLICY "master_lists readable by authenticated"
  ON public.master_lists FOR SELECT TO authenticated USING (true);

CREATE POLICY "master_items readable by authenticated"
  ON public.master_items FOR SELECT TO authenticated USING (true);

-- Only admins manage
CREATE POLICY "admins manage master_lists"
  ON public.master_lists FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins manage master_items"
  ON public.master_items FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_master_items_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER master_items_touch
  BEFORE UPDATE ON public.master_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_master_items_updated_at();

-- Seed lists
INSERT INTO public.master_lists (key, label, description) VALUES
  ('countries', 'Countries', 'Destination countries available across the app.'),
  ('application_types', 'Application Types', 'Visa categories / application types.'),
  ('document_types', 'Document Types', 'Document categories used in checklists and uploads.'),
  ('relationships', 'Relationships', 'Relationship presets for co-applicants and dependants.'),
  ('qualification_levels', 'Qualification Levels', 'Education qualification levels.'),
  ('client_statuses', 'Client Statuses', 'Lifecycle states for client applications.');

-- Seed countries
INSERT INTO public.master_items (list_key, code, label, sort_order) VALUES
  ('countries','canada','Canada',10),
  ('countries','united_kingdom','United Kingdom',20),
  ('countries','united_states','United States',30),
  ('countries','germany','Germany',40),
  ('countries','australia','Australia',50),
  ('countries','new_zealand','New Zealand',60),
  ('countries','ireland','Ireland',70),
  ('countries','france','France',80),
  ('countries','netherlands','Netherlands',90),
  ('countries','italy','Italy',100);

-- Seed application types
INSERT INTO public.master_items (list_key, code, label, sort_order) VALUES
  ('application_types','student_sds','Student Visa (SDS)',10),
  ('application_types','student_non_sds','Student Visa (Non-SDS)',20),
  ('application_types','permanent_residency','Permanent Residency',30),
  ('application_types','university_admission','University Admission',40),
  ('application_types','work_permit','Work Permit',50),
  ('application_types','visitor_visa','Visitor Visa',60),
  ('application_types','spousal_sponsorship','Spousal Sponsorship',70);

-- Seed document types
INSERT INTO public.master_items (list_key, code, label, sort_order) VALUES
  ('document_types','passport','Passport',10),
  ('document_types','birth_certificate','Birth Certificate',20),
  ('document_types','sop','SOP',30),
  ('document_types','resume','Resume',40),
  ('document_types','academic_transcripts','Academic Transcripts',50),
  ('document_types','financial_documents','Financial Documents',60),
  ('document_types','visa_forms','Visa Forms',70),
  ('document_types','offer_letter','Offer Letter',80),
  ('document_types','gic_certificate','GIC Certificate',90),
  ('document_types','tuition_fee_receipt','Tuition Fee Receipt',100),
  ('document_types','medical_report','Medical Report',110),
  ('document_types','ielts_language_test','IELTS / Language Test',120),
  ('document_types','photograph','Photograph',130),
  ('document_types','marriage_certificate','Marriage Certificate',140),
  ('document_types','divorce_certificate','Divorce Certificate',150),
  ('document_types','police_clearance','Police Clearance',160),
  ('document_types','affidavit_of_support','Affidavit of Support',170),
  ('document_types','sponsorship_letter','Sponsorship Letter',180),
  ('document_types','property_documents','Property Documents',190),
  ('document_types','employment_letter','Employment Letter',200),
  ('document_types','experience_letter','Experience Letter',210),
  ('document_types','noc','No Objection Certificate',220),
  ('document_types','other','Other',999);

-- Seed relationships
INSERT INTO public.master_items (list_key, code, label, sort_order) VALUES
  ('relationships','spouse','Spouse',10),
  ('relationships','son','Son',20),
  ('relationships','daughter','Daughter',30),
  ('relationships','father','Father',40),
  ('relationships','mother','Mother',50),
  ('relationships','brother','Brother',60),
  ('relationships','sister','Sister',70),
  ('relationships','partner','Partner',80),
  ('relationships','guardian','Guardian',90);

-- Seed qualification levels
INSERT INTO public.master_items (list_key, code, label, sort_order) VALUES
  ('qualification_levels','high_school','High School',10),
  ('qualification_levels','diploma','Diploma',20),
  ('qualification_levels','bachelors','Bachelor''s Degree',30),
  ('qualification_levels','masters','Master''s Degree',40),
  ('qualification_levels','doctorate','Doctorate / PhD',50),
  ('qualification_levels','postgraduate_diploma','Postgraduate Diploma',60),
  ('qualification_levels','certificate','Certificate',70);

-- Seed client statuses
INSERT INTO public.master_items (list_key, code, label, sort_order) VALUES
  ('client_statuses','in_progress','In Progress',10),
  ('client_statuses','submitted','Submitted',20),
  ('client_statuses','approved','Approved',30),
  ('client_statuses','rejected','Rejected',40),
  ('client_statuses','on_hold','On Hold',50);
