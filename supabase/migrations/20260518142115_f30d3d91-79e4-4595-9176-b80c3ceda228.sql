
-- =====================================================================
-- Personal Wealth: owner_profiles + financial_accounts
-- =====================================================================

CREATE TABLE public.owner_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  category text NOT NULL CHECK (category IN ('BUSINESS','PERSONAL','FAMILY_OFFICE')),
  personal_type text CHECK (personal_type IN ('INDIVIDUAL','HUF','TRUST','NRI','MINOR')),
  business_type text,
  brand_name text,
  legal_name text,
  first_name text,
  last_name text,
  relationship text,
  date_of_birth date,
  pan_number text,
  aadhar_last4 text,
  gst_number text,
  tax_id text,
  sin text,
  email text,
  phone text,
  address text,
  country text NOT NULL DEFAULT 'IN',
  tags text[] NOT NULL DEFAULT '{}',
  notes text,
  avatar_initials text,
  avatar_color text,
  is_active boolean NOT NULL DEFAULT true,
  karta_name text,
  linked_individual_id uuid,
  linked_entity_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_owner_profiles_category ON public.owner_profiles(category);
CREATE INDEX idx_owner_profiles_tenant ON public.owner_profiles(tenant_id);

CREATE TRIGGER trg_owner_profiles_touch
  BEFORE UPDATE ON public.owner_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.owner_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_profiles_select"
  ON public.owner_profiles FOR SELECT
  USING (auth.uid() = tenant_id OR public.is_accounting_user(auth.uid()));

CREATE POLICY "owner_profiles_insert"
  ON public.owner_profiles FOR INSERT
  WITH CHECK (public.is_accounting_user(auth.uid()));

CREATE POLICY "owner_profiles_update"
  ON public.owner_profiles FOR UPDATE
  USING (public.is_accounting_user(auth.uid()));

CREATE POLICY "owner_profiles_delete"
  ON public.owner_profiles FOR DELETE
  USING (public.is_accounting_user(auth.uid()));

-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE public.financial_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  owner_profile_id uuid NOT NULL REFERENCES public.owner_profiles(id) ON DELETE CASCADE,
  linked_entity_id uuid,
  gl_account_id uuid,
  account_type text NOT NULL,
  category text NOT NULL,
  nickname text NOT NULL,
  institution_name text NOT NULL,
  account_number text,
  policy_number text,
  folio_number text,
  dp_id text,
  maturity_date date,
  premium_amount numeric,
  premium_frequency text CHECK (premium_frequency IN ('MONTHLY','QUARTERLY','HALF_YEARLY','YEARLY','SINGLE')),
  next_premium_date date,
  sum_assured numeric,
  currency text NOT NULL DEFAULT 'INR',
  current_balance numeric,
  interest_rate numeric,
  emi_amount numeric,
  emi_day int,
  country text NOT NULL DEFAULT 'IN',
  branch text,
  ifsc_code text,
  swift_code text,
  status text NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','INACTIVE','MATURED','CLOSED','SURRENDERED')),
  opened_date date,
  closed_date date,
  tags text[] NOT NULL DEFAULT '{}',
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_financial_accounts_owner ON public.financial_accounts(owner_profile_id);
CREATE INDEX idx_financial_accounts_tenant_status ON public.financial_accounts(tenant_id, status);

CREATE TRIGGER trg_financial_accounts_touch
  BEFORE UPDATE ON public.financial_accounts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financial_accounts_select"
  ON public.financial_accounts FOR SELECT
  USING (auth.uid() = tenant_id OR public.is_accounting_user(auth.uid()));

CREATE POLICY "financial_accounts_insert"
  ON public.financial_accounts FOR INSERT
  WITH CHECK (public.is_accounting_user(auth.uid()));

CREATE POLICY "financial_accounts_update"
  ON public.financial_accounts FOR UPDATE
  USING (public.is_accounting_user(auth.uid()));

CREATE POLICY "financial_accounts_delete"
  ON public.financial_accounts FOR DELETE
  USING (public.is_accounting_user(auth.uid()));

-- =====================================================================
-- Seed: 6 owner profiles (no financial accounts)
-- =====================================================================
INSERT INTO public.owner_profiles
  (category, personal_type, legal_name, first_name, last_name, country, tags, karta_name, is_active)
VALUES
  ('PERSONAL','INDIVIDUAL','Santosh D Ramrakhiani','Santosh','D Ramrakhiani','IN', ARRAY['NRI'], NULL, true),
  ('PERSONAL','INDIVIDUAL','Krishaa S Ramrakhiani','Krishaa','S Ramrakhiani','IN', ARRAY['NRI'], NULL, true),
  ('PERSONAL','INDIVIDUAL','Viven S Ramrakhiani','Viven','S Ramrakhiani','IN', ARRAY['NRI'], NULL, true),
  ('PERSONAL','MINOR','Krish Ramrakhiani','Krish','Ramrakhiani','IN', ARRAY[]::text[], NULL, true),
  ('PERSONAL','INDIVIDUAL','Nirmala Ramrakhiani','Nirmala','Ramrakhiani','IN', ARRAY[]::text[], NULL, true),
  ('PERSONAL','HUF','Santosh Ramrakhiani HUF',NULL,NULL,'IN', ARRAY[]::text[], 'Santosh D Ramrakhiani', true);
