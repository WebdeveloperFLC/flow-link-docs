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

-- ── 5b. Commercial Relationships (party ↔ party — before agreements bind) ────
CREATE TABLE IF NOT EXISTS public.commercial_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_type text NOT NULL,
  party_a_id uuid NOT NULL REFERENCES public.financial_parties(id) ON DELETE RESTRICT,
  party_b_id uuid NOT NULL REFERENCES public.financial_parties(id) ON DELETE RESTRICT,
  company_entity_id uuid NULL REFERENCES public.firm_profile(id) ON DELETE SET NULL,
  branch_id uuid NULL REFERENCES public.branches(id) ON DELETE SET NULL,
  country_code text NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft','active','suspended','terminated','archived')),
  valid_from date NULL,
  valid_to date NULL,
  notice_period_days int NULL,
  relationship_manager_id uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  adapter_source_module text NULL,
  adapter_source_record_id text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commercial_relationships_adapter_unique
    UNIQUE NULLS NOT DISTINCT (adapter_source_module, adapter_source_record_id),
  CONSTRAINT commercial_relationships_distinct_parties CHECK (party_a_id <> party_b_id)
);

CREATE INDEX IF NOT EXISTS idx_commercial_relationships_parties
  ON public.commercial_relationships (party_a_id, party_b_id);

CREATE INDEX IF NOT EXISTS idx_commercial_relationships_active
  ON public.commercial_relationships (status, valid_from, valid_to)
  WHERE status = 'active';

ALTER TABLE public.commercial_agreements
  ADD COLUMN IF NOT EXISTS relationship_id uuid NULL
    REFERENCES public.commercial_relationships(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_commercial_agreements_relationship
  ON public.commercial_agreements (relationship_id)
  WHERE relationship_id IS NOT NULL;

-- ── 5c. Temporary Commercial Offer Overlays (never modify master agreement) ───
CREATE TABLE IF NOT EXISTS public.commercial_offer_overlays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_agreement_id uuid NOT NULL REFERENCES public.commercial_agreements(id) ON DELETE CASCADE,
  relationship_id uuid NULL REFERENCES public.commercial_relationships(id) ON DELETE SET NULL,
  offer_type text NOT NULL,
  name text NOT NULL,
  description text NULL,
  financial_impact jsonb NOT NULL DEFAULT '{}'::jsonb,
  valid_from date NOT NULL,
  valid_until date NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','active','expiring_soon','expired','suspended','cancelled')),
  supporting_document_paths jsonb NOT NULL DEFAULT '[]'::jsonb,
  approval_reference text NULL,
  budget_amount numeric NULL,
  budget_currency text NULL DEFAULT 'INR',
  target_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  adapter_source_module text NULL,
  adapter_source_record_id text NULL,
  business_event_id uuid NULL REFERENCES public.foe_business_events(id) ON DELETE SET NULL,
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commercial_offer_overlays_adapter_unique
    UNIQUE NULLS NOT DISTINCT (adapter_source_module, adapter_source_record_id),
  CONSTRAINT commercial_offer_overlays_valid_range CHECK (valid_until >= valid_from)
);

CREATE INDEX IF NOT EXISTS idx_commercial_offer_overlays_agreement
  ON public.commercial_offer_overlays (master_agreement_id, valid_from, valid_until);

CREATE INDEX IF NOT EXISTS idx_commercial_offer_overlays_active
  ON public.commercial_offer_overlays (status)
  WHERE status IN ('active','expiring_soon');

-- ── 5d. Validity helper (constitutional: no settlement outside validity) ────
CREATE OR REPLACE FUNCTION public.fn_cae_commercial_item_validity_status(
  p_valid_from date,
  p_valid_until date,
  p_as_of date DEFAULT CURRENT_DATE,
  p_expiring_soon_days int DEFAULT 30
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_valid_from IS NOT NULL AND p_as_of < p_valid_from THEN
    RETURN 'upcoming';
  END IF;
  IF p_valid_until IS NOT NULL AND p_as_of > p_valid_until THEN
    RETURN 'expired';
  END IF;
  IF p_valid_until IS NOT NULL AND p_as_of >= (p_valid_until - p_expiring_soon_days) THEN
    RETURN 'expiring_soon';
  END IF;
  RETURN 'active';
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_cae_commercial_item_validity_status(date, date, date, int)
  TO authenticated, service_role;

-- ── 5f. Commercial Relationship governance (roles, ownership, classification, contacts) ──
CREATE TABLE IF NOT EXISTS public.commercial_relationship_classifications (
  code text PRIMARY KEY,
  label text NOT NULL,
  description text NULL,
  default_notice_period_days int NULL,
  active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.commercial_relationship_classifications (code, label, description, default_notice_period_days)
VALUES
  ('standard', 'Standard', 'Default commercial relationship', 30),
  ('strategic_partner', 'Strategic Partner', 'Long-term strategic commercial partner', 90),
  ('university_partnership', 'University Partnership', 'Institution commission / partnership route', 60),
  ('aggregator', 'Aggregator', 'Aggregator or sub-agent channel', 30),
  ('referral_channel', 'Referral Channel', 'Referral or introducer relationship', 30),
  ('vendor', 'Vendor', 'Vendor or supplier relationship', 30),
  ('internal', 'Internal', 'Intra-group or internal entity link', NULL),
  ('trial', 'Trial / Pilot', 'Time-boxed pilot relationship', 15)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE public.commercial_relationships
  ADD COLUMN IF NOT EXISTS relationship_classification_code text NOT NULL DEFAULT 'standard'
    REFERENCES public.commercial_relationship_classifications(code) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS external_reference text NULL,
  ADD COLUMN IF NOT EXISTS health_score int NULL CHECK (health_score IS NULL OR (health_score >= 0 AND health_score <= 100)),
  ADD COLUMN IF NOT EXISTS renewal_date date NULL;

CREATE INDEX IF NOT EXISTS idx_commercial_relationships_classification
  ON public.commercial_relationships (relationship_classification_code);

-- Party roles within a relationship (governance — who plays what part)
CREATE TABLE IF NOT EXISTS public.commercial_relationship_party_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id uuid NOT NULL REFERENCES public.commercial_relationships(id) ON DELETE CASCADE,
  financial_party_id uuid NOT NULL REFERENCES public.financial_parties(id) ON DELETE RESTRICT,
  role_code text NOT NULL
    CHECK (role_code IN (
      'principal','counterparty','referrer','beneficiary','subject_client',
      'relationship_owner','guarantor','introducer','payee','payer'
    )),
  is_primary boolean NOT NULL DEFAULT false,
  valid_from date NULL,
  valid_to date NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (relationship_id, financial_party_id, role_code)
);

CREATE INDEX IF NOT EXISTS idx_cae_relationship_party_roles_rel
  ON public.commercial_relationship_party_roles (relationship_id);

CREATE INDEX IF NOT EXISTS idx_cae_relationship_party_roles_party
  ON public.commercial_relationship_party_roles (financial_party_id);

-- Customer ownership protection scoped to a commercial relationship
CREATE TABLE IF NOT EXISTS public.commercial_relationship_ownership (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id uuid NOT NULL REFERENCES public.commercial_relationships(id) ON DELETE CASCADE,
  subject_financial_party_id uuid NOT NULL REFERENCES public.financial_parties(id) ON DELETE RESTRICT,
  ownership_status text NOT NULL DEFAULT 'assigned_future_link'
    CHECK (ownership_status IN (
      'unassigned','assigned_future_link','protected','shared','contested','override_pending','override_approved'
    )),
  protection_level text NOT NULL DEFAULT 'block_settlement'
    CHECK (protection_level IN ('block_settlement','require_override','audit_only')),
  ownership_rule_code text NULL,
  valid_from date NULL,
  valid_to date NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft','active','suspended','expired','archived')),
  business_event_id uuid NULL REFERENCES public.foe_business_events(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (relationship_id, subject_financial_party_id, ownership_rule_code)
);

CREATE INDEX IF NOT EXISTS idx_cae_relationship_ownership_subject
  ON public.commercial_relationship_ownership (subject_financial_party_id, status);

CREATE INDEX IF NOT EXISTS idx_cae_relationship_ownership_active
  ON public.commercial_relationship_ownership (relationship_id, status)
  WHERE status = 'active';

-- Operational / legal contacts for a relationship
CREATE TABLE IF NOT EXISTS public.commercial_relationship_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id uuid NOT NULL REFERENCES public.commercial_relationships(id) ON DELETE CASCADE,
  contact_type text NOT NULL DEFAULT 'commercial'
    CHECK (contact_type IN ('commercial','legal','finance','operations','escalation','relationship_manager')),
  full_name text NOT NULL,
  email text NULL,
  phone text NULL,
  job_title text NULL,
  profile_id uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_primary boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  notes text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cae_relationship_contacts_rel
  ON public.commercial_relationship_contacts (relationship_id)
  WHERE active;

-- ── 5g. Overlay precedence (constitutional stack — never modifies master version) ──
ALTER TABLE public.commercial_offer_overlays
  ADD COLUMN IF NOT EXISTS precedence_rank int NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS stack_layer text NOT NULL DEFAULT 'overlay'
    CHECK (stack_layer IN (
      'constitution','customer_ownership','commercial_agreement',
      'overlay','promotion','incentive','settlement_rules','workflow','accounting'
    )),
  ADD COLUMN IF NOT EXISTS supersedes_overlay_id uuid NULL
    REFERENCES public.commercial_offer_overlays(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS applies_to_json jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_commercial_offer_overlays_precedence
  ON public.commercial_offer_overlays (master_agreement_id, stack_layer, precedence_rank, valid_from DESC);

-- ── 5h. Effective commercial position (as-of resolver for settlement + summary) ──
CREATE OR REPLACE FUNCTION public.fn_cae_resolve_effective_commercial_position(
  p_relationship_id uuid,
  p_agreement_id uuid DEFAULT NULL,
  p_as_of date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rel public.commercial_relationships%ROWTYPE;
  v_agreement_id uuid;
  v_version_id uuid;
  v_overlays jsonb;
  v_roles jsonb;
  v_ownership jsonb;
  v_contacts jsonb;
  v_settlement_allowed boolean := true;
  v_block_reasons text[] := ARRAY[]::text[];
BEGIN
  SELECT * INTO v_rel FROM public.commercial_relationships WHERE id = p_relationship_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false, 'as_of', p_as_of);
  END IF;

  v_agreement_id := COALESCE(
    p_agreement_id,
    (
      SELECT a.id FROM public.commercial_agreements a
       WHERE a.relationship_id = p_relationship_id
         AND a.status IN ('active','approved')
         AND (a.valid_from IS NULL OR a.valid_from <= p_as_of)
         AND (a.valid_to IS NULL OR a.valid_to >= p_as_of)
       ORDER BY a.priority DESC, a.created_at DESC
       LIMIT 1
    )
  );

  IF v_agreement_id IS NOT NULL THEN
    v_version_id := public.fn_cae_resolve_agreement_version(v_agreement_id, p_as_of);
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(r)::jsonb ORDER BY r.precedence_rank, r.valid_from), '[]'::jsonb)
    INTO v_overlays
    FROM (
      SELECT o.*,
        public.fn_cae_commercial_item_validity_status(o.valid_from, o.valid_until, p_as_of, 30) AS validity_status
      FROM public.commercial_offer_overlays o
      WHERE o.master_agreement_id = v_agreement_id
         OR o.relationship_id = p_relationship_id
      ORDER BY
        CASE o.stack_layer
          WHEN 'constitution' THEN 1
          WHEN 'customer_ownership' THEN 2
          WHEN 'commercial_agreement' THEN 3
          WHEN 'overlay' THEN 4
          WHEN 'promotion' THEN 5
          WHEN 'incentive' THEN 6
          WHEN 'settlement_rules' THEN 7
          WHEN 'workflow' THEN 8
          WHEN 'accounting' THEN 9
          ELSE 10
        END,
        o.precedence_rank,
        o.valid_from DESC
    ) r;

  SELECT COALESCE(jsonb_agg(row_to_json(pr)::jsonb), '[]'::jsonb)
    INTO v_roles
    FROM public.commercial_relationship_party_roles pr
   WHERE pr.relationship_id = p_relationship_id
     AND (pr.valid_from IS NULL OR pr.valid_from <= p_as_of)
     AND (pr.valid_to IS NULL OR pr.valid_to >= p_as_of);

  SELECT COALESCE(jsonb_agg(row_to_json(ow)::jsonb), '[]'::jsonb)
    INTO v_ownership
    FROM public.commercial_relationship_ownership ow
   WHERE ow.relationship_id = p_relationship_id
     AND ow.status = 'active'
     AND (ow.valid_from IS NULL OR ow.valid_from <= p_as_of)
     AND (ow.valid_to IS NULL OR ow.valid_to >= p_as_of);

  SELECT COALESCE(jsonb_agg(row_to_json(c)::jsonb), '[]'::jsonb)
    INTO v_contacts
    FROM public.commercial_relationship_contacts c
   WHERE c.relationship_id = p_relationship_id AND c.active;

  IF EXISTS (
    SELECT 1 FROM public.commercial_relationship_ownership ow
     WHERE ow.relationship_id = p_relationship_id
       AND ow.status = 'active'
       AND ow.protection_level = 'block_settlement'
       AND ow.ownership_status NOT IN ('override_approved')
       AND (ow.valid_from IS NULL OR ow.valid_from <= p_as_of)
       AND (ow.valid_to IS NULL OR ow.valid_to >= p_as_of)
  ) THEN
    v_settlement_allowed := false;
    v_block_reasons := array_append(v_block_reasons, 'relationship_ownership_protection');
  END IF;

  IF v_version_id IS NULL AND v_agreement_id IS NOT NULL THEN
    v_settlement_allowed := false;
    v_block_reasons := array_append(v_block_reasons, 'no_active_agreement_version');
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'as_of', p_as_of,
    'relationship', row_to_json(v_rel)::jsonb,
    'agreement_id', v_agreement_id,
    'agreement_version_id', v_version_id,
    'party_roles', v_roles,
    'ownership', v_ownership,
    'contacts', v_contacts,
    'overlays', v_overlays,
    'settlement_allowed', v_settlement_allowed,
    'block_reasons', to_jsonb(v_block_reasons)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_cae_resolve_effective_commercial_position(uuid, uuid, date)
  TO authenticated, service_role;

CREATE OR REPLACE VIEW public.v_cae_effective_commercial_position AS
SELECT
  r.id AS relationship_id,
  (pos->>'agreement_id')::uuid AS agreement_id,
  (pos->>'agreement_version_id')::uuid AS agreement_version_id,
  CURRENT_DATE AS as_of_date,
  (pos->>'settlement_allowed')::boolean AS settlement_allowed,
  pos->'block_reasons' AS block_reasons,
  pos->'overlays' AS overlays,
  pos->'ownership' AS ownership,
  pos->'party_roles' AS party_roles,
  pos->'contacts' AS contacts
FROM public.commercial_relationships r
CROSS JOIN LATERAL public.fn_cae_resolve_effective_commercial_position(r.id, NULL, CURRENT_DATE) AS pos
WHERE r.status = 'active';

COMMENT ON FUNCTION public.fn_cae_resolve_effective_commercial_position IS
  'As-of effective commercial position: relationship + active agreement version + overlays (precedence order) + ownership gate.';
COMMENT ON VIEW public.v_cae_effective_commercial_position IS
  'Read-only today-snapshot of effective commercial position per active relationship.';

-- ── 5i. Institution Application Fee Waiver — read-only SSOT view ─────────────
-- Sourced from institution_fee_schedule (Institution Master). Not editable on agreement.
CREATE OR REPLACE VIEW public.v_cae_institution_application_fee_waiver AS
SELECT
  ifs.upi_institution_id AS institution_id,
  ui.name AS institution_name,
  ifs.id AS fee_schedule_id,
  ifs.amount,
  ifs.currency,
  ifs.effective_from AS valid_from,
  ifs.effective_to AS valid_until,
  ifs.program_id,
  ifs.partnership_route_id,
  ifs.status AS master_status,
  public.fn_cae_commercial_item_validity_status(
    ifs.effective_from, ifs.effective_to, CURRENT_DATE, 30
  ) AS validity_status,
  CASE
    WHEN ifs.amount = 0 THEN true
    WHEN ifs.notes ILIKE '%waiver%' THEN true
    ELSE false
  END AS is_waiver,
  ifs.notes,
  ifs.updated_at AS master_updated_at
FROM public.institution_fee_schedule ifs
JOIN public.upi_institutions ui ON ui.id = ifs.upi_institution_id
WHERE ifs.fee_type = 'APPLICATION'
  AND ifs.status = 'ACTIVE';

COMMENT ON VIEW public.v_cae_institution_application_fee_waiver IS
  'Read-only SSOT for Agreement Summary Tab 7. Never maintained on commercial agreements.';

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
    ),
    'relationshipClassifications', jsonb_build_array(
      'standard','strategic_partner','university_partnership','aggregator',
      'referral_channel','vendor','internal','trial'
    ),
    'relationshipRoleCodes', jsonb_build_array(
      'principal','counterparty','referrer','beneficiary','subject_client',
      'relationship_owner','guarantor','introducer','payee','payer'
    ),
    'overlayStackLayers', jsonb_build_array(
      'constitution','customer_ownership','commercial_agreement',
      'overlay','promotion','incentive','settlement_rules','workflow','accounting'
    ),
    'overlayPrecedenceDefault', 100
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
ALTER TABLE public.commercial_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_offer_overlays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_relationship_party_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_relationship_ownership ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_relationship_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_relationship_classifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cae_relationship_classifications_select ON public.commercial_relationship_classifications;
CREATE POLICY cae_relationship_classifications_select ON public.commercial_relationship_classifications
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS cae_relationship_party_roles_select ON public.commercial_relationship_party_roles;
CREATE POLICY cae_relationship_party_roles_select ON public.commercial_relationship_party_roles FOR SELECT TO authenticated
  USING (public.is_accounting_user(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS cae_relationship_party_roles_write ON public.commercial_relationship_party_roles;
CREATE POLICY cae_relationship_party_roles_write ON public.commercial_relationship_party_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_accounting_admin(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_accounting_admin(auth.uid()));

DROP POLICY IF EXISTS cae_relationship_ownership_select ON public.commercial_relationship_ownership;
CREATE POLICY cae_relationship_ownership_select ON public.commercial_relationship_ownership FOR SELECT TO authenticated
  USING (public.is_accounting_user(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS cae_relationship_ownership_write ON public.commercial_relationship_ownership;
CREATE POLICY cae_relationship_ownership_write ON public.commercial_relationship_ownership FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_accounting_admin(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_accounting_admin(auth.uid()));

DROP POLICY IF EXISTS cae_relationship_contacts_select ON public.commercial_relationship_contacts;
CREATE POLICY cae_relationship_contacts_select ON public.commercial_relationship_contacts FOR SELECT TO authenticated
  USING (public.is_accounting_user(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS cae_relationship_contacts_write ON public.commercial_relationship_contacts;
CREATE POLICY cae_relationship_contacts_write ON public.commercial_relationship_contacts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_accounting_admin(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_accounting_admin(auth.uid()));

DROP POLICY IF EXISTS cae_relationships_select ON public.commercial_relationships;
CREATE POLICY cae_relationships_select ON public.commercial_relationships FOR SELECT TO authenticated
  USING (public.is_accounting_user(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS cae_relationships_write ON public.commercial_relationships;
CREATE POLICY cae_relationships_write ON public.commercial_relationships FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_accounting_admin(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_accounting_admin(auth.uid()));

DROP POLICY IF EXISTS cae_offer_overlays_select ON public.commercial_offer_overlays;
CREATE POLICY cae_offer_overlays_select ON public.commercial_offer_overlays FOR SELECT TO authenticated
  USING (public.is_accounting_user(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS cae_offer_overlays_write ON public.commercial_offer_overlays;
CREATE POLICY cae_offer_overlays_write ON public.commercial_offer_overlays FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_accounting_admin(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_accounting_admin(auth.uid()));

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
COMMENT ON TABLE public.commercial_relationships IS
  'Party-to-party commercial link. Agreements bind to a relationship; built before agreement overlays.';
COMMENT ON TABLE public.commercial_offer_overlays IS
  'Temporary commercial offers — overlays only. Never modifies commercial_agreement_versions.';
COMMENT ON TABLE public.commercial_relationship_party_roles IS
  'Governance roles for parties within a commercial relationship (principal, referrer, subject_client, etc.).';
COMMENT ON TABLE public.commercial_relationship_ownership IS
  'Customer ownership protection scoped to a relationship — blocks settlement unless override_approved.';
COMMENT ON TABLE public.commercial_relationship_contacts IS
  'Operational and legal contacts for a commercial relationship.';
COMMENT ON TABLE public.commercial_relationship_classifications IS
  'Taxonomy for relationship classification (standard, strategic_partner, university_partnership, etc.).';
