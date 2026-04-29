-- 1. Add extra_items to clients for ad-hoc document requirements
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS extra_items jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2. Create client_profile table
CREATE TABLE IF NOT EXISTS public.client_profile (
  client_id uuid PRIMARY KEY,
  -- Identity
  date_of_birth date,
  gender text,
  nationality text,
  place_of_birth text,
  -- Passport
  passport_number text,
  passport_issue_date date,
  passport_expiry date,
  passport_country text,
  -- Civil
  marital_status text,
  spouse_name text,
  -- Address
  address_line1 text,
  address_city text,
  address_state text,
  address_country text,
  address_postal text,
  -- Contact
  phone_alt text,
  email_alt text,
  -- Language test
  ielts_overall numeric,
  ielts_listening numeric,
  ielts_reading numeric,
  ielts_writing numeric,
  ielts_speaking numeric,
  ielts_test_date date,
  -- Education
  highest_qualification text,
  institution_name text,
  graduation_year int,
  gpa_or_percentage text,
  -- Employment
  employer_name text,
  job_title text,
  annual_income numeric,
  currency text,
  -- Finance
  bank_name text,
  account_balance numeric,
  gic_amount numeric,
  tuition_paid numeric,
  -- Emergency
  emergency_contact_name text,
  emergency_contact_phone text,
  -- Meta
  source_documents jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes_extracted text,
  last_extracted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_profile readable by authenticated"
  ON public.client_profile FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "team upserts client_profile"
  ON public.client_profile FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'counselor'::app_role)
    OR has_role(auth.uid(), 'documentation'::app_role)
  );

CREATE POLICY "team updates client_profile"
  ON public.client_profile FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'counselor'::app_role)
    OR has_role(auth.uid(), 'documentation'::app_role)
  );

CREATE POLICY "admins delete client_profile"
  ON public.client_profile FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_client_profile_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_client_profile ON public.client_profile;
CREATE TRIGGER trg_touch_client_profile
  BEFORE UPDATE ON public.client_profile
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_client_profile_updated_at();