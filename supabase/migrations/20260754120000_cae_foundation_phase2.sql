-- FLEOS Sprint 4 — CAE Foundation Phase 2
-- Universal financial party registry + commercial agreement registry + versioning
-- Extends 20260753120000 (ownership gate). Does NOT replace UPI/Incentive tables.

-- ── 1. Financial Party Registry ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.financial_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_type text NOT NULL,
  display_name text NOT NULL,
  source_module text NULL,
  source_record_id text NULL,
  company_entity_id uuid NULL REFERENCES public.firm_profile(id) ON DELETE SET NULL,
  branch_id uuid NULL REFERENCES public.branches(id) ON DELETE SET NULL,
  country_code text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT financial_parties_source_unique
    UNIQUE NULLS NOT DISTINCT (source_module, source_record_id)
);

CREATE INDEX IF NOT EXISTS idx_financial_parties_type
  ON public.financial_parties (party_type) WHERE active;

CREATE INDEX IF NOT EXISTS idx_financial_parties_source
  ON public.financial_parties (source_module, source_record_id)
  WHERE source_record_id IS NOT NULL;

-- ── 2. Agreement Templates (configuration-driven) ───────────────────────────
CREATE TABLE IF NOT EXISTS public.commercial_agreement_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code text NOT NULL UNIQUE,
  name text NOT NULL,
  agreement_type text NOT NULL,
  description text NULL,
  default_currency text NOT NULL DEFAULT 'INR',
  default_payment_basis text NULL,
  default_settlement_cycle text NULL,
  default_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  default_tax_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  default_payment_method text NULL,
  workflow_definition_id text NULL,
  priority int NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── 3. Commercial Agreements (header — never edit terms on active row) ───────
CREATE TABLE IF NOT EXISTS public.commercial_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_number text NULL UNIQUE,
  template_id uuid NULL REFERENCES public.commercial_agreement_templates(id) ON DELETE SET NULL,
  agreement_type text NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft','submitted','approved','active','suspended','expired','superseded','archived'
    )),
  current_version_id uuid NULL,
  priority int NOT NULL DEFAULT 100,
  company_entity_id uuid NULL REFERENCES public.firm_profile(id) ON DELETE SET NULL,
  branch_id uuid NULL REFERENCES public.branches(id) ON DELETE SET NULL,
  country_code text NULL,
  currency text NOT NULL DEFAULT 'INR',
  valid_from date NULL,
  valid_to date NULL,
  adapter_source_module text NULL,
  adapter_source_record_id text NULL,
  business_event_id uuid NULL REFERENCES public.foe_business_events(id) ON DELETE SET NULL,
  workflow_instance_id uuid NULL,
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commercial_agreements_adapter_unique
    UNIQUE NULLS NOT DISTINCT (adapter_source_module, adapter_source_record_id)
);

CREATE INDEX IF NOT EXISTS idx_commercial_agreements_status
  ON public.commercial_agreements (status, agreement_type);

CREATE INDEX IF NOT EXISTS idx_commercial_agreements_active
  ON public.commercial_agreements (valid_from, valid_to)
  WHERE status = 'active';

-- ── 4. Agreement Versions (immutable contract terms) ────────────────────────
CREATE TABLE IF NOT EXISTS public.commercial_agreement_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL REFERENCES public.commercial_agreements(id) ON DELETE CASCADE,
  version_number int NOT NULL CHECK (version_number > 0),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','approved','active','superseded')),
  payment_basis text NULL,
  settlement_cycle text NULL,
  rules_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  tax_rules_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  payment_method text NULL,
  workflow_definition_id text NULL,
  effective_from date NOT NULL,
  effective_to date NULL,
  change_summary text NULL,
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz NULL,
  business_event_id uuid NULL REFERENCES public.foe_business_events(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agreement_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_cae_agreement_versions_active
  ON public.commercial_agreement_versions (agreement_id, effective_from DESC);

ALTER TABLE public.commercial_agreements
  DROP CONSTRAINT IF EXISTS commercial_agreements_current_version_fk;

ALTER TABLE public.commercial_agreements
  ADD CONSTRAINT commercial_agreements_current_version_fk
  FOREIGN KEY (current_version_id)
  REFERENCES public.commercial_agreement_versions(id) ON DELETE SET NULL;

-- ── 5. Agreement ↔ Party (many-to-many) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.commercial_agreement_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL REFERENCES public.commercial_agreements(id) ON DELETE CASCADE,
  financial_party_id uuid NOT NULL REFERENCES public.financial_parties(id) ON DELETE CASCADE,
  party_role text NOT NULL DEFAULT 'counterparty'
    CHECK (party_role IN ('payee','payer','beneficiary','counterparty','referrer','subject')),
  share_pct numeric NULL CHECK (share_pct IS NULL OR (share_pct > 0 AND share_pct <= 100)),
  is_primary boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agreement_id, financial_party_id, party_role)
);

CREATE INDEX IF NOT EXISTS idx_cae_agreement_parties_party
  ON public.commercial_agreement_parties (financial_party_id);

-- ── 6. Extend CAE audit tables ──────────────────────────────────────────────
ALTER TABLE public.cae_eligibility_decisions
  ADD COLUMN IF NOT EXISTS financial_party_id uuid NULL REFERENCES public.financial_parties(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS agreement_id uuid NULL REFERENCES public.commercial_agreements(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS agreement_version_id uuid NULL REFERENCES public.commercial_agreement_versions(id) ON DELETE SET NULL;

ALTER TABLE public.cae_override_requests
  DROP CONSTRAINT IF EXISTS cae_override_requests_agreement_id_fkey;

ALTER TABLE public.cae_override_requests
  ADD COLUMN IF NOT EXISTS agreement_version_id uuid NULL
    REFERENCES public.commercial_agreement_versions(id) ON DELETE SET NULL;

-- agreement_id on override_requests remains uuid without FK (legacy); add FK if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'cae_override_requests' AND column_name = 'agreement_id'
  ) THEN
    ALTER TABLE public.cae_override_requests
      DROP CONSTRAINT IF EXISTS cae_override_requests_agreement_fk;
    ALTER TABLE public.cae_override_requests
      ADD CONSTRAINT cae_override_requests_agreement_fk
      FOREIGN KEY (agreement_id) REFERENCES public.commercial_agreements(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ── 7. Version immutability (non-draft versions) ────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_cae_version_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status <> 'draft' THEN
    RAISE EXCEPTION 'Commercial agreement versions are immutable once approved';
  END IF;
  IF TG_OP = 'DELETE' AND OLD.status <> 'draft' THEN
    RAISE EXCEPTION 'Commercial agreement versions cannot be deleted once approved';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_cae_version_immutable ON public.commercial_agreement_versions;
CREATE TRIGGER trg_cae_version_immutable
  BEFORE UPDATE OR DELETE ON public.commercial_agreement_versions
  FOR EACH ROW EXECUTE FUNCTION public.trg_cae_version_immutable();

-- ── 8. Resolve active agreement version at a point in time ──────────────────
CREATE OR REPLACE FUNCTION public.fn_cae_resolve_agreement_version(
  p_agreement_id uuid,
  p_as_of date DEFAULT CURRENT_DATE
)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.id
    FROM public.commercial_agreement_versions v
    JOIN public.commercial_agreements a ON a.id = v.agreement_id
   WHERE v.agreement_id = p_agreement_id
     AND v.status IN ('active','approved')
     AND v.effective_from <= p_as_of
     AND (v.effective_to IS NULL OR v.effective_to >= p_as_of)
     AND a.status IN ('active','approved')
   ORDER BY v.version_number DESC
   LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.fn_cae_resolve_agreement_version(uuid, date) TO authenticated, service_role;

-- ── 9. Platform config — expanded CAE foundation ────────────────────────────
INSERT INTO public.platform_config (config_key, config_json, domain)
VALUES (
  'commercial_agreement_config',
  jsonb_build_object(
    'overrideAuthority', jsonb_build_object(
      'roles', jsonb_build_array('super_admin'),
      'allowFinanceAdmin', false
    ),
    'protectedSettlementTypes', jsonb_build_array(
      'incentive_counselor','incentive_line_item','referral_bonus','referral_points',
      'commission_partner','acquisition_bonus','revenue_share','partner_fee',
      'freelancer_payment','consultant_payment','aggregator_settlement'
    ),
    'enabledOwnershipRules', jsonb_build_array(
      'existing_customer_prior_payment','continuing_relationship',
      'active_commercial_agreement','referral_existing_client',
      'duplicate_referral','ownership_conflict','assigned_to_future_link'
    ),
    'partyTypes', jsonb_build_array(
      'student','parent','client','university','aggregator','partner',
      'freelancer','consultant','employee','vendor','contractor',
      'government','bank','trust','broker','internal_company'
    ),
    'agreementTypes', jsonb_build_array(
      'referral','commission','freelancer','consultant','vendor_contract',
      'revenue_share','incentive','bonus','marketing_retainer','university_commission',
      'aggregator_commission','custom'
    ),
    'settlementCycles', jsonb_build_array(
      'immediate','weekly','fortnightly','monthly','quarterly',
      'on_collection','on_university_payment','on_visa_approval','on_course_start','custom'
    ),
    'paymentBasisOptions', jsonb_build_array(
      'fixed_amount','percentage','hourly','daily','weekly','monthly',
      'per_student','per_visa','per_admission','per_project','per_milestone',
      'revenue_share','profit_share','retainer'
    ),
    'existingCustomerRules', jsonb_build_array(
      jsonb_build_object('code','existing_client','label','Existing Client','enabled',true,'signals',jsonb_build_array('hasPriorVerifiedPayment','hasCrmRecord')),
      jsonb_build_object('code','existing_student','label','Existing Student','enabled',true,'signals',jsonb_build_array('hasActiveProgram')),
      jsonb_build_object('code','existing_parent','label','Existing Parent','enabled',true,'signals',jsonb_build_array('hasCrmRecord')),
      jsonb_build_object('code','existing_immigration_client','label','Existing Immigration Client','enabled',true,'signals',jsonb_build_array('hasPriorVerifiedPayment','hasActiveProgram')),
      jsonb_build_object('code','existing_coaching_student','label','Existing Coaching Student','enabled',true,'signals',jsonb_build_array('hasActiveProgram')),
      jsonb_build_object('code','existing_corporate_client','label','Existing Corporate Client','enabled',true,'signals',jsonb_build_array('hasCrmRecord')),
      jsonb_build_object('code','continuing_student','label','Continuing Student','enabled',true,'signals',jsonb_build_array('hasPriorVerifiedPaymentBeforeEvent')),
      jsonb_build_object('code','additional_services','label','Additional Services','enabled',true,'signals',jsonb_build_array('hasPriorVerifiedPayment')),
      jsonb_build_object('code','further_studies','label','Further Studies','enabled',true,'signals',jsonb_build_array('hasPriorVerifiedPayment','hasActiveProgram'))
    ),
    'fraudChecks', jsonb_build_array(
      jsonb_build_object('code','existing_future_link_customer','enabled',true),
      jsonb_build_object('code','duplicate_referral','enabled',true),
      jsonb_build_object('code','self_referral','enabled',true),
      jsonb_build_object('code','multiple_referral_claims','enabled',true),
      jsonb_build_object('code','counselor_own_student','enabled',true),
      jsonb_build_object('code','freelancer_existing_student','enabled',true),
      jsonb_build_object('code','partner_existing_customer','enabled',true),
      jsonb_build_object('code','continuing_student_referral','enabled',true),
      jsonb_build_object('code','duplicate_commercial_agreement','enabled',true)
    ),
    'priorityStack', jsonb_build_array(
      'constitution','customer_ownership','commercial_agreement','settlement_rules','workflow','accounting'
    )
  ),
  'commercial_agreement'
)
ON CONFLICT (config_key) DO UPDATE
  SET config_json = EXCLUDED.config_json,
      domain = EXCLUDED.domain,
      updated_at = now();

-- ── 10. Seed agreement templates ────────────────────────────────────────────
INSERT INTO public.commercial_agreement_templates (
  template_code, name, agreement_type, default_payment_basis, default_settlement_cycle, priority
) VALUES
  ('university_commission', 'University Commission', 'university_commission', 'percentage', 'on_university_payment', 200),
  ('aggregator_commission', 'Aggregator Commission', 'aggregator_commission', 'percentage', 'on_collection', 200),
  ('referral_agreement', 'Referral Agreement', 'referral', 'fixed_amount', 'on_collection', 150),
  ('freelancer_referral', 'Freelancer Referral', 'freelancer', 'fixed_amount', 'monthly', 150),
  ('freelancer_hourly', 'Freelancer Hourly', 'freelancer', 'hourly', 'monthly', 150),
  ('freelancer_project', 'Freelancer Project', 'freelancer', 'per_project', 'on_milestone', 150),
  ('marketing_retainer', 'Marketing Retainer', 'marketing_retainer', 'retainer', 'monthly', 120),
  ('vendor_contract', 'Vendor Contract', 'vendor_contract', 'fixed_amount', 'monthly', 100),
  ('revenue_share', 'Revenue Share', 'revenue_share', 'revenue_share', 'monthly', 180),
  ('bonus', 'Bonus Agreement', 'bonus', 'fixed_amount', 'immediate', 130),
  ('incentive', 'Incentive Agreement', 'incentive', 'percentage', 'monthly', 170)
ON CONFLICT (template_code) DO NOTHING;

-- ── 11. RLS ─────────────────────────────────────────────────────────────────
ALTER TABLE public.financial_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_agreement_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_agreement_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_agreement_parties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS financial_parties_select ON public.financial_parties;
CREATE POLICY financial_parties_select ON public.financial_parties FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_accounting_admin(auth.uid())
    OR public.is_accounting_user(auth.uid())
  );

DROP POLICY IF EXISTS financial_parties_write ON public.financial_parties;
CREATE POLICY financial_parties_write ON public.financial_parties FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_accounting_admin(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_accounting_admin(auth.uid()));

DROP POLICY IF EXISTS cae_templates_select ON public.commercial_agreement_templates;
CREATE POLICY cae_templates_select ON public.commercial_agreement_templates FOR SELECT TO authenticated
  USING (public.is_accounting_user(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS cae_templates_admin ON public.commercial_agreement_templates;
CREATE POLICY cae_templates_admin ON public.commercial_agreement_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_accounting_admin(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_accounting_admin(auth.uid()));

DROP POLICY IF EXISTS cae_agreements_select ON public.commercial_agreements;
CREATE POLICY cae_agreements_select ON public.commercial_agreements FOR SELECT TO authenticated
  USING (public.is_accounting_user(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS cae_agreements_write ON public.commercial_agreements;
CREATE POLICY cae_agreements_write ON public.commercial_agreements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_accounting_admin(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_accounting_admin(auth.uid()));

DROP POLICY IF EXISTS cae_versions_select ON public.commercial_agreement_versions;
CREATE POLICY cae_versions_select ON public.commercial_agreement_versions FOR SELECT TO authenticated
  USING (public.is_accounting_user(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS cae_versions_write ON public.commercial_agreement_versions;
CREATE POLICY cae_versions_write ON public.commercial_agreement_versions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_accounting_admin(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_accounting_admin(auth.uid()));

DROP POLICY IF EXISTS cae_agreement_parties_select ON public.commercial_agreement_parties;
CREATE POLICY cae_agreement_parties_select ON public.commercial_agreement_parties FOR SELECT TO authenticated
  USING (public.is_accounting_user(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS cae_agreement_parties_write ON public.commercial_agreement_parties;
CREATE POLICY cae_agreement_parties_write ON public.commercial_agreement_parties FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_accounting_admin(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_accounting_admin(auth.uid()));

COMMENT ON TABLE public.financial_parties IS
  'CAE universal party registry. party_type is metadata only — never drives payment logic.';
COMMENT ON TABLE public.commercial_agreements IS
  'CAE enterprise source of truth for commercial relationships. Terms live in versions.';
COMMENT ON TABLE public.commercial_agreement_versions IS
  'Immutable contract versions. Historical settlements reference the version active at event time.';
