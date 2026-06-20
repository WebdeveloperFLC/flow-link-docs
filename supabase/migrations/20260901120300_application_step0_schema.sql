-- Application Foundation Step 0: snapshot/provenance columns, offer, milestones
-- No deposit/tuition track changes; legacy tables remain.

DO $$ BEGIN
  CREATE TYPE public.application_offer_type AS ENUM (
    'CONDITIONAL_OFFER', 'UNCONDITIONAL_OFFER', 'LOA', 'I20', 'CAS', 'COE', 'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.application_offer_status AS ENUM (
    'NONE', 'PENDING', 'RECEIVED', 'ACCEPTED', 'DECLINED', 'EXPIRED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.application_source AS ENUM ('MANUAL', 'MARK_FINAL', 'IMPORT', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.client_institution_qualifications
  ADD COLUMN IF NOT EXISTS program_code text,
  ADD COLUMN IF NOT EXISTS campus_name text,
  ADD COLUMN IF NOT EXISTS intake_year integer,
  ADD COLUMN IF NOT EXISTS study_level text,
  ADD COLUMN IF NOT EXISTS duration_months integer,
  ADD COLUMN IF NOT EXISTS tuition_fee numeric(14, 2),
  ADD COLUMN IF NOT EXISTS tuition_currency text,
  ADD COLUMN IF NOT EXISTS destination_country text,
  ADD COLUMN IF NOT EXISTS institution_name_snapshot text,
  ADD COLUMN IF NOT EXISTS institution_city_snapshot text,
  ADD COLUMN IF NOT EXISTS cf_client_program_id uuid REFERENCES public.cf_client_programs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cf_course_id uuid REFERENCES public.cf_courses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS application_source public.application_source NOT NULL DEFAULT 'MANUAL';

CREATE INDEX IF NOT EXISTS idx_client_institution_qualifications_cf_program
  ON public.client_institution_qualifications (cf_client_program_id)
  WHERE cf_client_program_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_client_institution_qualifications_cf_course
  ON public.client_institution_qualifications (cf_course_id)
  WHERE cf_course_id IS NOT NULL;

COMMENT ON TABLE public.client_institution_qualifications IS
  'Application Foundation anchor: student application identity, snapshots, workflow — not commission eligibility.';

CREATE TABLE IF NOT EXISTS public.qualification_application_offer (
  qualification_id uuid PRIMARY KEY REFERENCES public.client_institution_qualifications(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  offer_type public.application_offer_type,
  offer_status public.application_offer_status NOT NULL DEFAULT 'NONE',
  offer_number text,
  offer_date date,
  offer_expiry_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qualification_application_offer_client
  ON public.qualification_application_offer (client_id);

CREATE TABLE IF NOT EXISTS public.qualification_application_milestones (
  qualification_id uuid PRIMARY KEY REFERENCES public.client_institution_qualifications(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  application_created_at timestamptz NOT NULL,
  application_submitted_date date,
  submitted_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  offer_received_at date,
  visa_filed_at date,
  visa_approved_at date,
  enrollment_at date,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qualification_application_milestones_client
  ON public.qualification_application_milestones (client_id);

DROP TRIGGER IF EXISTS qualification_application_offer_touch ON public.qualification_application_offer;
CREATE TRIGGER qualification_application_offer_touch
  BEFORE UPDATE ON public.qualification_application_offer
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS qualification_application_milestones_touch ON public.qualification_application_milestones;
CREATE TRIGGER qualification_application_milestones_touch
  BEFORE UPDATE ON public.qualification_application_milestones
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.qualification_application_offer ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualification_application_milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS qualification_application_offer_select ON public.qualification_application_offer;
CREATE POLICY qualification_application_offer_select ON public.qualification_application_offer
  FOR SELECT TO authenticated
  USING (public.can_view_client(auth.uid(), client_id));

DROP POLICY IF EXISTS qualification_application_milestones_select ON public.qualification_application_milestones;
CREATE POLICY qualification_application_milestones_select ON public.qualification_application_milestones
  FOR SELECT TO authenticated
  USING (public.can_view_client(auth.uid(), client_id));

GRANT SELECT ON public.qualification_application_offer TO authenticated;
GRANT SELECT ON public.qualification_application_milestones TO authenticated;
