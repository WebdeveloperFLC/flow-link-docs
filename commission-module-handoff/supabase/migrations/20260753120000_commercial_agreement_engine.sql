-- Commercial Agreement Engine — customer ownership protection (constitutional)
--
-- Prerequisites (idempotent): FOE business events + platform_config may not exist yet
-- if earlier platform migrations were not published in Lovable.

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

CREATE TABLE IF NOT EXISTS public.platform_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text NOT NULL UNIQUE,
  config_json jsonb NOT NULL,
  domain text NOT NULL DEFAULT 'platform',
  version int NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── Immutable eligibility audit ─────────────────────────────────────────────
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

-- Append-only guard
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

-- ── Override requests ───────────────────────────────────────────────────────
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

-- ── Platform config seed ────────────────────────────────────────────────────
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

-- ── CAE eligibility RPC (Settlement Engine entry point) ─────────────────────
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
  -- Approved override for this exact settlement source
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
  'Commercial Agreement Engine — ownership gate before any settlement. Default: existing FL customers NOT ELIGIBLE.';
