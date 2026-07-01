-- FLEOS Phase A+B platform foundation (PROPOSED — apply via Lovable Publish after review)

CREATE TABLE IF NOT EXISTS public.foe_business_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL,
  event_type text NOT NULL,
  entity_id uuid NULL,
  branch_id uuid NULL,
  source_module text NOT NULL,
  source_record_id text NOT NULL,
  created_by uuid NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_foe_business_events_source
  ON public.foe_business_events (source_module, source_record_id);

CREATE TABLE IF NOT EXISTS public.foe_business_event_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_event_id uuid NOT NULL REFERENCES public.foe_business_events(id) ON DELETE CASCADE,
  link_type text NOT NULL,
  record_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_event_id, link_type, record_id)
);

CREATE TABLE IF NOT EXISTS public.platform_workflow_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id text NOT NULL,
  business_event_id uuid NOT NULL REFERENCES public.foe_business_events(id) ON DELETE CASCADE,
  domain text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  current_step_index int NOT NULL DEFAULT 0,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  step_states jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_work_queue_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_domain text NOT NULL,
  kind text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  title text NOT NULL,
  subtitle text NULL,
  business_event_id uuid NULL REFERENCES public.foe_business_events(id) ON DELETE SET NULL,
  source_module text NULL,
  source_record_id text NULL,
  entity_id uuid NULL,
  branch_id uuid NULL,
  assigned_to_user_id uuid NULL REFERENCES auth.users(id),
  priority int NOT NULL DEFAULT 0,
  link text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_platform_work_queue_open
  ON public.platform_work_queue_items (queue_domain, kind, status);

CREATE TABLE IF NOT EXISTS public.foe_cash_registers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_id, branch_id, code)
);

ALTER TABLE public.client_invoice_payments
  ADD COLUMN IF NOT EXISTS business_status text,
  ADD COLUMN IF NOT EXISTS workflow_status text,
  ADD COLUMN IF NOT EXISTS accounting_status text,
  ADD COLUMN IF NOT EXISTS business_event_id uuid NULL REFERENCES public.foe_business_events(id),
  ADD COLUMN IF NOT EXISTS lock_state text NOT NULL DEFAULT 'submitted',
  ADD COLUMN IF NOT EXISTS cash_register_id uuid NULL REFERENCES public.foe_cash_registers(id);

CREATE OR REPLACE FUNCTION public.trg_enforce_payment_sod_on_verify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.payment_status IS DISTINCT FROM OLD.payment_status
     AND NEW.payment_status = 'verified'
     AND NEW.posted_by IS NOT NULL
     AND NEW.verified_by IS NOT NULL
     AND NEW.posted_by = NEW.verified_by THEN
    RAISE EXCEPTION 'SOD_VIOLATION: the user who recorded this payment cannot verify it';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_payment_sod_on_verify ON public.client_invoice_payments;
CREATE TRIGGER trg_enforce_payment_sod_on_verify
  BEFORE UPDATE ON public.client_invoice_payments
  FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_payment_sod_on_verify();

ALTER TABLE public.foe_business_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_work_queue_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS foe_events_select ON public.foe_business_events;
CREATE POLICY foe_events_select ON public.foe_business_events FOR SELECT TO authenticated
  USING (public.is_accounting_user(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS foe_events_insert ON public.foe_business_events;
CREATE POLICY foe_events_insert ON public.foe_business_events FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() OR public.is_accounting_user(auth.uid()));

DROP POLICY IF EXISTS work_queue_select ON public.platform_work_queue_items;
CREATE POLICY work_queue_select ON public.platform_work_queue_items FOR SELECT TO authenticated
  USING (public.is_accounting_user(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS work_queue_insert ON public.platform_work_queue_items;
CREATE POLICY work_queue_insert ON public.platform_work_queue_items FOR INSERT TO authenticated
  WITH CHECK (public.is_accounting_user(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS work_queue_update ON public.platform_work_queue_items;
CREATE POLICY work_queue_update ON public.platform_work_queue_items FOR UPDATE TO authenticated
  USING (public.is_accounting_user(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

-- FLEOS Phase C — production hardening

CREATE TABLE IF NOT EXISTS public.platform_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text NOT NULL UNIQUE,
  config_json jsonb NOT NULL,
  domain text NOT NULL DEFAULT 'platform',
  version int NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_config_select ON public.platform_config;
CREATE POLICY platform_config_select ON public.platform_config FOR SELECT TO authenticated
  USING (public.is_accounting_user(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS platform_config_admin ON public.platform_config;
CREATE POLICY platform_config_admin ON public.platform_config FOR ALL TO authenticated
  USING (public.is_accounting_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.is_accounting_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.platform_config (config_key, config_json, domain)
VALUES
  ('payment_method_configs', '[]'::jsonb, 'money_in'),
  ('workflow_definitions', '[]'::jsonb, 'platform'),
  ('notification_rules', '[]'::jsonb, 'platform'),
  ('sod_rules', '[]'::jsonb, 'platform')
ON CONFLICT (config_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.platform_foe_pipeline_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL DEFAULT 'money_in_post_verify',
  payment_id uuid NOT NULL REFERENCES public.client_invoice_payments(id) ON DELETE CASCADE,
  business_event_id uuid NULL REFERENCES public.foe_business_events(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts int NOT NULL DEFAULT 0,
  last_error text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz NULL,
  UNIQUE (job_type, payment_id)
);

CREATE INDEX IF NOT EXISTS idx_foe_pipeline_jobs_pending
  ON public.platform_foe_pipeline_jobs (status, created_at)
  WHERE status IN ('pending', 'failed');

ALTER TABLE public.platform_foe_pipeline_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS foe_pipeline_jobs_select ON public.platform_foe_pipeline_jobs;
CREATE POLICY foe_pipeline_jobs_select ON public.platform_foe_pipeline_jobs FOR SELECT TO authenticated
  USING (public.is_accounting_user(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS foe_pipeline_jobs_service ON public.platform_foe_pipeline_jobs;
CREATE POLICY foe_pipeline_jobs_service ON public.platform_foe_pipeline_jobs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.trg_enqueue_foe_pipeline_on_verify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.payment_status IS DISTINCT FROM OLD.payment_status
     AND NEW.payment_status = 'verified'
     AND COALESCE(NEW.is_refund, false) = false THEN
    INSERT INTO public.platform_foe_pipeline_jobs (job_type, payment_id, business_event_id, status)
    VALUES ('money_in_post_verify', NEW.id, NEW.business_event_id, 'pending')
    ON CONFLICT (job_type, payment_id) DO UPDATE
      SET status = CASE
            WHEN platform_foe_pipeline_jobs.status = 'completed' THEN 'completed'
            ELSE 'pending'
          END,
          business_event_id = EXCLUDED.business_event_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_foe_pipeline_on_verify ON public.client_invoice_payments;
CREATE TRIGGER trg_enqueue_foe_pipeline_on_verify
  AFTER UPDATE ON public.client_invoice_payments
  FOR EACH ROW EXECUTE FUNCTION public.trg_enqueue_foe_pipeline_on_verify();

CREATE OR REPLACE FUNCTION public.trg_enforce_journal_sod_on_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_verified_by uuid;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status = 'POSTED'
     AND NEW.source_module = 'CRM_AR'
     AND NEW.source_record_id IS NOT NULL
     AND NEW.posted_by IS NOT NULL THEN
    SELECT verified_by INTO v_verified_by
      FROM public.client_invoice_payments
     WHERE id = NEW.source_record_id;
    IF v_verified_by IS NOT NULL AND v_verified_by = NEW.posted_by THEN
      RAISE EXCEPTION 'SOD_VIOLATION: the user who verified this payment cannot approve its journal';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_journal_sod_on_post ON public.accounting_journals;
CREATE TRIGGER trg_enforce_journal_sod_on_post
  BEFORE UPDATE ON public.accounting_journals
  FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_journal_sod_on_post();

CREATE OR REPLACE FUNCTION public.fn_seed_foe_cash_registers()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
  r record;
BEGIN
  FOR r IN
    SELECT fp.id AS entity_id, b.id AS branch_id, 'INR'::text AS currency
      FROM public.firm_profile fp
      CROSS JOIN public.branches b
     WHERE fp.id IS NOT NULL AND b.id IS NOT NULL
  LOOP
    INSERT INTO public.foe_cash_registers (entity_id, branch_id, code, name, currency, active)
    VALUES (r.entity_id, r.branch_id, 'MAIN', 'Main cash register', r.currency, true)
    ON CONFLICT (entity_id, branch_id, code) DO NOTHING;
    IF FOUND THEN v_count := v_count + 1; END IF;
  END LOOP;
  RETURN v_count;
END;
$$;

SELECT public.fn_seed_foe_cash_registers();

CREATE OR REPLACE FUNCTION public.trg_platform_workflow_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_platform_workflow_updated_at ON public.platform_workflow_instances;
CREATE TRIGGER trg_platform_workflow_updated_at
  BEFORE UPDATE ON public.platform_workflow_instances
  FOR EACH ROW EXECUTE FUNCTION public.trg_platform_workflow_updated_at();

COMMENT ON TABLE public.platform_config IS
  'DB-driven workflow/notification/SoD configuration.';
COMMENT ON TABLE public.platform_foe_pipeline_jobs IS
  'Durable FOE pipeline reconciliation queue after payment verification.';

-- Commercial Agreement Engine — customer ownership protection

CREATE TABLE IF NOT EXISTS public.cae_eligibility_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  settlement_type text NOT NULL,
  source_module text NOT NULL,
  source_record_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('eligible','not_eligible','override_pending','override_approved')),
  reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  ownership_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  business_event_id uuid NULL REFERENCES public.foe_business_events(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cae_eligibility_client
  ON public.cae_eligibility_decisions (client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cae_eligibility_blocked
  ON public.cae_eligibility_decisions (status)
  WHERE status = 'not_eligible';

CREATE OR REPLACE FUNCTION public.trg_cae_decisions_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'CAE eligibility decisions are immutable';
END;
$$;

DROP TRIGGER IF EXISTS trg_cae_decisions_no_update ON public.cae_eligibility_decisions;
CREATE TRIGGER trg_cae_decisions_no_update
  BEFORE UPDATE OR DELETE ON public.cae_eligibility_decisions
  FOR EACH ROW EXECUTE FUNCTION public.trg_cae_decisions_immutable();

CREATE TABLE IF NOT EXISTS public.cae_override_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  settlement_type text NOT NULL,
  source_module text NOT NULL,
  source_record_id text NOT NULL,
  agreement_id uuid NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','released')),
  business_reason text NOT NULL,
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  approved_by uuid NULL REFERENCES auth.users(id),
  rejected_by uuid NULL REFERENCES auth.users(id),
  approved_at timestamptz NULL,
  rejected_at timestamptz NULL,
  business_event_id uuid NULL REFERENCES public.foe_business_events(id),
  workflow_instance_id uuid NULL,
  ownership_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  supporting_document_paths jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cae_override_pending
  ON public.cae_override_requests (status)
  WHERE status = 'pending';

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
      'commission_partner','acquisition_bonus','revenue_share','partner_fee'
    ),
    'enabledOwnershipRules', jsonb_build_array(
      'existing_customer_prior_payment','continuing_relationship',
      'active_commercial_agreement','referral_existing_client',
      'duplicate_referral','ownership_conflict'
    )
  ),
  'commercial_agreement'
)
ON CONFLICT (config_key) DO UPDATE
  SET config_json = EXCLUDED.config_json,
      domain = EXCLUDED.domain,
      updated_at = now();

CREATE OR REPLACE FUNCTION public.fn_cae_evaluate_settlement_eligibility(
  p_settlement_type text,
  p_client_id uuid,
  p_source_module text,
  p_source_record_id text,
  p_as_of timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prior boolean := false;
  v_prior_before boolean := false;
  v_comm_agreement boolean := false;
  v_override_status text := null;
  v_reasons jsonb := '[]'::jsonb;
  v_eligible boolean := true;
  v_status text := 'eligible';
  v_decision_id uuid;
  v_event_id uuid;
BEGIN
  SELECT status INTO v_override_status
    FROM public.cae_override_requests
   WHERE client_id = p_client_id
     AND settlement_type = p_settlement_type
     AND source_module = p_source_module
     AND source_record_id = p_source_record_id
     AND status IN ('approved','released')
   ORDER BY created_at DESC
   LIMIT 1;

  IF v_override_status IS NOT NULL THEN
    RETURN jsonb_build_object(
      'eligible', true,
      'status', 'override_approved',
      'reasons', '[]'::jsonb
    );
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.client_invoice_payments p
     WHERE p.client_id = p_client_id
       AND COALESCE(p.is_refund, false) = false
       AND p.archived_at IS NULL
       AND (p.payment_status = 'verified' OR p.payment_proof_status = 'verified')
  ) INTO v_prior;

  SELECT EXISTS (
    SELECT 1 FROM public.client_invoice_payments p
     WHERE p.client_id = p_client_id
       AND COALESCE(p.is_refund, false) = false
       AND p.archived_at IS NULL
       AND p.paid_at < p_as_of
       AND (p.payment_status = 'verified' OR p.payment_proof_status = 'verified')
  ) INTO v_prior_before;

  SELECT EXISTS (
    SELECT 1 FROM public.upi_commission_students u
     WHERE u.client_id = p_client_id
       AND u.agreement_id IS NOT NULL
  ) INTO v_comm_agreement;

  IF v_prior THEN
    v_reasons := v_reasons || jsonb_build_array('existing_customer_prior_payment');
  END IF;
  IF v_prior_before THEN
    v_reasons := v_reasons || jsonb_build_array('continuing_relationship');
  END IF;
  IF v_comm_agreement THEN
    v_reasons := v_reasons || jsonb_build_array('active_commercial_agreement');
  END IF;

  IF jsonb_array_length(v_reasons) > 0 THEN
    v_eligible := false;
    v_status := 'not_eligible';
  END IF;

  INSERT INTO public.foe_business_events (
    domain, event_type, source_module, source_record_id, metadata
  ) VALUES (
    'generic',
    CASE WHEN v_eligible THEN 'cae_settlement_eligible' ELSE 'cae_settlement_blocked' END,
    p_source_module,
    p_source_record_id,
    jsonb_build_object(
      'client_id', p_client_id,
      'settlement_type', p_settlement_type,
      'reasons', v_reasons
    )
  )
  RETURNING id INTO v_event_id;

  INSERT INTO public.cae_eligibility_decisions (
    client_id, settlement_type, source_module, source_record_id,
    status, reasons, ownership_snapshot, business_event_id
  ) VALUES (
    p_client_id, p_settlement_type, p_source_module, p_source_record_id,
    v_status, v_reasons,
    jsonb_build_object(
      'hasPriorVerifiedPayment', v_prior,
      'hasPriorVerifiedPaymentBeforeEvent', v_prior_before,
      'hasActiveCommissionAgreement', v_comm_agreement
    ),
    v_event_id
  )
  RETURNING id INTO v_decision_id;

  RETURN jsonb_build_object(
    'eligible', v_eligible,
    'status', v_status,
    'reasons', v_reasons,
    'decision_id', v_decision_id,
    'business_event_id', v_event_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_cae_evaluate_settlement_eligibility(text, uuid, text, text, timestamptz)
  TO authenticated, service_role;

ALTER TABLE public.cae_eligibility_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cae_override_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cae_decisions_select ON public.cae_eligibility_decisions;
CREATE POLICY cae_decisions_select ON public.cae_eligibility_decisions FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_accounting_admin(auth.uid())
    OR public.is_accounting_user(auth.uid())
  );

DROP POLICY IF EXISTS cae_override_select ON public.cae_override_requests;
CREATE POLICY cae_override_select ON public.cae_override_requests FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_accounting_admin(auth.uid())
    OR requested_by = auth.uid()
  );

DROP POLICY IF EXISTS cae_override_insert ON public.cae_override_requests;
CREATE POLICY cae_override_insert ON public.cae_override_requests FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_accounting_admin(auth.uid())
  );

DROP POLICY IF EXISTS cae_override_update ON public.cae_override_requests;
CREATE POLICY cae_override_update ON public.cae_override_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_accounting_admin(auth.uid()));

COMMENT ON FUNCTION public.fn_cae_evaluate_settlement_eligibility IS
  'Commercial Agreement Engine — ownership gate before any settlement.';

-- CAE Foundation Phase 2

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

ALTER TABLE public.cae_eligibility_decisions
  ADD COLUMN IF NOT EXISTS financial_party_id uuid NULL REFERENCES public.financial_parties(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS agreement_id uuid NULL REFERENCES public.commercial_agreements(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS agreement_version_id uuid NULL REFERENCES public.commercial_agreement_versions(id) ON DELETE SET NULL;

ALTER TABLE public.cae_override_requests
  DROP CONSTRAINT IF EXISTS cae_override_requests_agreement_id_fkey;

ALTER TABLE public.cae_override_requests
  ADD COLUMN IF NOT EXISTS agreement_version_id uuid NULL
    REFERENCES public.commercial_agreement_versions(id) ON DELETE SET NULL;

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
    )
  ),
  'commercial_agreement'
)
ON CONFLICT (config_key) DO UPDATE
  SET config_json = EXCLUDED.config_json,
      domain = EXCLUDED.domain,
      updated_at = now();

ALTER TABLE public.financial_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_agreement_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_agreement_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_agreement_parties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cae_financial_parties_select ON public.financial_parties;
CREATE POLICY cae_financial_parties_select ON public.financial_parties FOR SELECT TO authenticated
  USING (public.is_accounting_user(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS cae_financial_parties_write ON public.financial_parties;
CREATE POLICY cae_financial_parties_write ON public.financial_parties FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_accounting_admin(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_accounting_admin(auth.uid()));

DROP POLICY IF EXISTS cae_agreements_select ON public.commercial_agreements;
CREATE POLICY cae_agreements_select ON public.commercial_agreements FOR SELECT TO authenticated
  USING (public.is_accounting_user(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS cae_agreements_write ON public.commercial_agreements;
CREATE POLICY cae_agreements_write ON public.commercial_agreements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_accounting_admin(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_accounting_admin(auth.uid()));

DROP POLICY IF EXISTS cae_agreement_versions_select ON public.commercial_agreement_versions;
CREATE POLICY cae_agreement_versions_select ON public.commercial_agreement_versions FOR SELECT TO authenticated
  USING (public.is_accounting_user(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS cae_agreement_versions_write ON public.commercial_agreement_versions;
CREATE POLICY cae_agreement_versions_write ON public.commercial_agreement_versions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_accounting_admin(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_accounting_admin(auth.uid()));

DROP POLICY IF EXISTS cae_agreement_templates_select ON public.commercial_agreement_templates;
CREATE POLICY cae_agreement_templates_select ON public.commercial_agreement_templates FOR SELECT TO authenticated
  USING (public.is_accounting_user(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS cae_agreement_templates_write ON public.commercial_agreement_templates;
CREATE POLICY cae_agreement_templates_write ON public.commercial_agreement_templates FOR ALL TO authenticated
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
  'CAE universal party registry.';
COMMENT ON TABLE public.commercial_agreements IS
  'CAE enterprise source of truth for commercial relationships.';
COMMENT ON TABLE public.commercial_agreement_versions IS
  'Immutable contract versions.';

-- D6/D8: explicit GRANTs for new public tables
DO $grants$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'cae_eligibility_decisions','cae_override_requests',
    'commercial_agreement_parties','commercial_agreement_templates',
    'commercial_agreement_versions','commercial_agreements',
    'financial_parties',
    'foe_business_event_links','foe_business_events','foe_cash_registers',
    'platform_config','platform_foe_pipeline_jobs',
    'platform_work_queue_items','platform_workflow_instances'
  ]
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $grants$;