-- Commission Phase 1: billing profiles, agreement versioning, eligibility config,
-- hold/period masters, commission structure extensions, route linker.

-- ---------------------------------------------------------------------------
-- Billing profiles (institution + optional aggregator)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.upi_billing_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.upi_institutions(id) ON DELETE CASCADE,
  aggregator_id uuid REFERENCES public.upi_aggregators(id) ON DELETE SET NULL,
  profile_name text NOT NULL,
  legal_entity_name text,
  billing_address text,
  billing_email text,
  billing_phone text,
  tax_registration_number text,
  default_invoice_currency text NOT NULL DEFAULT 'CAD',
  default_receipt_currency text NOT NULL DEFAULT 'CAD',
  payment_terms_days int DEFAULT 30,
  remittance_instructions text,
  is_default boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_upi_billing_profiles_inst
  ON public.upi_billing_profiles (institution_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_upi_billing_profiles_default_inst
  ON public.upi_billing_profiles (institution_id)
  WHERE is_default = true AND aggregator_id IS NULL AND status = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS idx_upi_billing_profiles_default_agg
  ON public.upi_billing_profiles (institution_id, aggregator_id)
  WHERE is_default = true AND aggregator_id IS NOT NULL AND status = 'active';

DROP TRIGGER IF EXISTS trg_upi_billing_profiles_updated_at ON public.upi_billing_profiles;
CREATE TRIGGER trg_upi_billing_profiles_updated_at
  BEFORE UPDATE ON public.upi_billing_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Agreement version effective dating
-- ---------------------------------------------------------------------------
ALTER TABLE public.upi_agreement_versions
  ADD COLUMN IF NOT EXISTS effective_from date,
  ADD COLUMN IF NOT EXISTS effective_to date,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft'
    CHECK (status IS NULL OR status IN ('draft', 'published', 'superseded', 'archived'));

UPDATE public.upi_agreement_versions
SET status = COALESCE(status, 'published')
WHERE status IS NULL;

-- ---------------------------------------------------------------------------
-- Commission eligibility configuration (student eligibility — not claim rules)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.upi_commission_eligibility_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.upi_institutions(id) ON DELETE CASCADE,
  aggregator_id uuid REFERENCES public.upi_aggregators(id) ON DELETE SET NULL,
  partnership_route_id uuid REFERENCES public.upi_partnership_routes(id) ON DELETE SET NULL,
  agreement_version_id uuid REFERENCES public.upi_agreement_versions(id) ON DELETE SET NULL,
  config_name text NOT NULL,
  version_number int NOT NULL DEFAULT 1,
  effective_from date,
  effective_to date,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'superseded', 'archived')),
  trigger_type text NOT NULL DEFAULT 'deposit'
    CHECK (trigger_type IN (
      'deposit', 'visa', 'enrolled', 'registered', 'started_classes', 'custom'
    )),
  trigger_params jsonb NOT NULL DEFAULT '{}',
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_upi_eligibility_configs_inst
  ON public.upi_commission_eligibility_configs (institution_id, status, effective_from DESC);

DROP TRIGGER IF EXISTS trg_upi_eligibility_configs_updated_at ON public.upi_commission_eligibility_configs;
CREATE TRIGGER trg_upi_eligibility_configs_updated_at
  BEFORE UPDATE ON public.upi_commission_eligibility_configs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Hold reason master (11 codes — transfer is an event, not a hold type)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.upi_commission_hold_reasons (
  code text PRIMARY KEY,
  label text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.upi_commission_hold_reasons (code, label, description, sort_order) VALUES
  ('missing_consent', 'Missing consent', 'Consent form not on file', 10),
  ('tuition_pending', 'Tuition pending', 'Required tuition payment not confirmed', 20),
  ('enrollment_unconfirmed', 'Enrollment unconfirmed', 'Institution has not confirmed enrollment', 30),
  ('visa_pending', 'Visa pending', 'Study permit / visa not yet approved', 40),
  ('visa_refusal', 'Visa refusal', 'Visa refused — commission may be cancelled', 50),
  ('document_pending', 'Document pending', 'Required documents missing', 60),
  ('institution_audit', 'Institution audit', 'Awaiting institution internal review', 70),
  ('duplicate_review', 'Duplicate review', 'Possible duplicate claim under review', 80),
  ('transfer_under_review', 'Transfer under review', 'Student transfer event open', 90),
  ('agency_dispute', 'Agency dispute', 'Agency or routing dispute', 100),
  ('other', 'Other', 'Other deferral reason', 110)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Commission period master
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.upi_commission_periods (
  code text PRIMARY KEY,
  label text NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

INSERT INTO public.upi_commission_periods (code, label, description, sort_order) VALUES
  ('application', 'Application', 'Application-stage commission', 10),
  ('visa', 'Visa', 'Visa / study permit stage', 20),
  ('enrollment', 'Enrollment', 'Enrollment confirmation stage', 30),
  ('semester_1', 'Semester 1', 'First semester payout', 40),
  ('semester_2', 'Semester 2', 'Second semester payout', 50),
  ('year_1', 'Year 1', 'First academic year payout', 60),
  ('custom', 'Custom', 'Custom period label in metadata', 70)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Commission + rules extensions
-- ---------------------------------------------------------------------------
ALTER TABLE public.upi_commissions
  ADD COLUMN IF NOT EXISTS agreement_version_id uuid
    REFERENCES public.upi_agreement_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_by uuid,
  ADD COLUMN IF NOT EXISTS base_rate_percent numeric(7,4);

ALTER TABLE public.upi_commission_rules
  ADD COLUMN IF NOT EXISTS precedence_rank int DEFAULT 100,
  ADD COLUMN IF NOT EXISTS scope_country text,
  ADD COLUMN IF NOT EXISTS scope_campus text,
  ADD COLUMN IF NOT EXISTS scope_program_category text,
  ADD COLUMN IF NOT EXISTS scope_program_code text,
  ADD COLUMN IF NOT EXISTS scope_intake text,
  ADD COLUMN IF NOT EXISTS scope_promotion_id uuid;

ALTER TABLE public.upi_partnership_routes
  ADD COLUMN IF NOT EXISTS default_commission_id uuid
    REFERENCES public.upi_commissions(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- RLS: new tables (confidential tier)
-- ---------------------------------------------------------------------------
ALTER TABLE public.upi_billing_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upi_commission_eligibility_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upi_commission_hold_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upi_commission_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS upi_billing_profiles_confidential ON public.upi_billing_profiles;
CREATE POLICY upi_billing_profiles_confidential ON public.upi_billing_profiles
  FOR ALL TO authenticated
  USING (public.can_view_upi_confidential(auth.uid()))
  WITH CHECK (public.can_view_upi_confidential(auth.uid()));

DROP POLICY IF EXISTS upi_eligibility_configs_confidential ON public.upi_commission_eligibility_configs;
CREATE POLICY upi_eligibility_configs_confidential ON public.upi_commission_eligibility_configs
  FOR ALL TO authenticated
  USING (public.can_view_upi_confidential(auth.uid()))
  WITH CHECK (public.can_view_upi_confidential(auth.uid()));

DROP POLICY IF EXISTS upi_hold_reasons_read ON public.upi_commission_hold_reasons;
CREATE POLICY upi_hold_reasons_read ON public.upi_commission_hold_reasons
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS upi_commission_periods_read ON public.upi_commission_periods;
CREATE POLICY upi_commission_periods_read ON public.upi_commission_periods
  FOR SELECT TO authenticated USING (true);

GRANT SELECT ON public.upi_commission_hold_reasons TO authenticated;
GRANT SELECT ON public.upi_commission_periods TO authenticated;
