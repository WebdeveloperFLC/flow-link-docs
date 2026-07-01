-- Commission Phase 1: billing profiles, agreement versioning, eligibility config,
-- hold/period masters, commission structure extensions, route linker.

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

CREATE INDEX IF NOT EXISTS idx_upi_billing_profiles_inst ON public.upi_billing_profiles (institution_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_upi_billing_profiles_default_inst ON public.upi_billing_profiles (institution_id) WHERE is_default = true AND aggregator_id IS NULL AND status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS idx_upi_billing_profiles_default_agg ON public.upi_billing_profiles (institution_id, aggregator_id) WHERE is_default = true AND aggregator_id IS NOT NULL AND status = 'active';

DROP TRIGGER IF EXISTS trg_upi_billing_profiles_updated_at ON public.upi_billing_profiles;
CREATE TRIGGER trg_upi_billing_profiles_updated_at BEFORE UPDATE ON public.upi_billing_profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.upi_agreement_versions
  ADD COLUMN IF NOT EXISTS effective_from date,
  ADD COLUMN IF NOT EXISTS effective_to date,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft' CHECK (status IS NULL OR status IN ('draft', 'published', 'superseded', 'archived'));

UPDATE public.upi_agreement_versions SET status = COALESCE(status, 'published') WHERE status IS NULL;

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
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'superseded', 'archived')),
  trigger_type text NOT NULL DEFAULT 'deposit' CHECK (trigger_type IN ('deposit', 'visa', 'enrolled', 'registered', 'started_classes', 'custom')),
  trigger_params jsonb NOT NULL DEFAULT '{}',
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_upi_eligibility_configs_inst ON public.upi_commission_eligibility_configs (institution_id, status, effective_from DESC);

DROP TRIGGER IF EXISTS trg_upi_eligibility_configs_updated_at ON public.upi_commission_eligibility_configs;
CREATE TRIGGER trg_upi_eligibility_configs_updated_at BEFORE UPDATE ON public.upi_commission_eligibility_configs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

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

ALTER TABLE public.upi_commissions
  ADD COLUMN IF NOT EXISTS agreement_version_id uuid REFERENCES public.upi_agreement_versions(id) ON DELETE SET NULL,
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
  ADD COLUMN IF NOT EXISTS default_commission_id uuid REFERENCES public.upi_commissions(id) ON DELETE SET NULL;

ALTER TABLE public.upi_billing_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upi_commission_eligibility_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upi_commission_hold_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upi_commission_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS upi_billing_profiles_confidential ON public.upi_billing_profiles;
CREATE POLICY upi_billing_profiles_confidential ON public.upi_billing_profiles FOR ALL TO authenticated USING (public.can_view_upi_confidential(auth.uid())) WITH CHECK (public.can_view_upi_confidential(auth.uid()));

DROP POLICY IF EXISTS upi_eligibility_configs_confidential ON public.upi_commission_eligibility_configs;
CREATE POLICY upi_eligibility_configs_confidential ON public.upi_commission_eligibility_configs FOR ALL TO authenticated USING (public.can_view_upi_confidential(auth.uid())) WITH CHECK (public.can_view_upi_confidential(auth.uid()));

DROP POLICY IF EXISTS upi_hold_reasons_read ON public.upi_commission_hold_reasons;
CREATE POLICY upi_hold_reasons_read ON public.upi_commission_hold_reasons FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS upi_commission_periods_read ON public.upi_commission_periods;
CREATE POLICY upi_commission_periods_read ON public.upi_commission_periods FOR SELECT TO authenticated USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.upi_billing_profiles TO authenticated;
GRANT ALL ON public.upi_billing_profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.upi_commission_eligibility_configs TO authenticated;
GRANT ALL ON public.upi_commission_eligibility_configs TO service_role;
GRANT SELECT ON public.upi_commission_hold_reasons TO authenticated;
GRANT ALL ON public.upi_commission_hold_reasons TO service_role;
GRANT SELECT ON public.upi_commission_periods TO authenticated;
GRANT ALL ON public.upi_commission_periods TO service_role;

-- ==== 20260723120100: lifecycle + snapshots + transfer events + invoice ext ====

ALTER TABLE public.upi_commission_students
  ADD COLUMN IF NOT EXISTS eligibility_status text DEFAULT 'pending' CHECK (eligibility_status IN ('pending', 'eligible', 'ineligible', 'cancelled')),
  ADD COLUMN IF NOT EXISTS claim_status text DEFAULT 'not_ready' CHECK (claim_status IN ('not_ready', 'ready', 'submitted', 'approved', 'rejected', 'carried_forward')),
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partially_paid', 'paid', 'written_off')),
  ADD COLUMN IF NOT EXISTS expected_amount numeric(14,2),
  ADD COLUMN IF NOT EXISTS amended_expected_amount numeric(14,2),
  ADD COLUMN IF NOT EXISTS approved_amount numeric(14,2),
  ADD COLUMN IF NOT EXISTS snapshot_currency text DEFAULT 'CAD',
  ADD COLUMN IF NOT EXISTS invoice_currency text DEFAULT 'CAD',
  ADD COLUMN IF NOT EXISTS receipt_currency text DEFAULT 'CAD',
  ADD COLUMN IF NOT EXISTS base_currency text DEFAULT 'CAD',
  ADD COLUMN IF NOT EXISTS eligibility_date date,
  ADD COLUMN IF NOT EXISTS agreement_version_id uuid REFERENCES public.upi_agreement_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS eligibility_config_id uuid REFERENCES public.upi_commission_eligibility_configs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS hold_status text DEFAULT 'none' CHECK (hold_status IN ('none', 'active', 'released')),
  ADD COLUMN IF NOT EXISTS hold_reason text REFERENCES public.upi_commission_hold_reasons(code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS hold_notes text,
  ADD COLUMN IF NOT EXISTS expected_claim_date date,
  ADD COLUMN IF NOT EXISTS commission_period_code text DEFAULT 'enrollment' REFERENCES public.upi_commission_periods(code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS commission_period_label text,
  ADD COLUMN IF NOT EXISTS clawback_amount numeric(14,2),
  ADD COLUMN IF NOT EXISTS clawback_status text CHECK (clawback_status IS NULL OR clawback_status IN ('none', 'pending', 'applied', 'waived')),
  ADD COLUMN IF NOT EXISTS institution_reference_number text,
  ADD COLUMN IF NOT EXISTS remittance_reference_number text,
  ADD COLUMN IF NOT EXISTS matched_rule_id uuid REFERENCES public.upi_commission_rules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS billing_profile_id uuid REFERENCES public.upi_billing_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ucs_lifecycle ON public.upi_commission_students (institution_id, eligibility_status, claim_status, payment_status);
CREATE INDEX IF NOT EXISTS idx_ucs_period ON public.upi_commission_students (institution_id, commission_period_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ucs_student_route_period ON public.upi_commission_students (COALESCE(client_id, id), COALESCE(partnership_route_id, '00000000-0000-0000-0000-000000000000'::uuid), commission_period_code) WHERE client_id IS NOT NULL AND commission_period_code IS NOT NULL;

UPDATE public.upi_commission_students SET
  eligibility_status = CASE
    WHEN commission_status IN ('eligible', 'paid', 'partially_paid') THEN 'eligible'
    WHEN commission_status = 'rejected' THEN 'cancelled'
    WHEN commission_status = 'blocked' THEN 'ineligible'
    ELSE 'pending'
  END,
  claim_status = CASE
    WHEN is_carried_forward OR commission_status = 'carried_forward' THEN 'carried_forward'
    WHEN commission_status IN ('eligible', 'paid', 'partially_paid') THEN 'ready'
    ELSE 'not_ready'
  END,
  payment_status = CASE
    WHEN commission_status = 'paid' THEN 'paid'
    WHEN commission_status = 'partially_paid' THEN 'partially_paid'
    ELSE 'unpaid'
  END,
  expected_amount = COALESCE(expected_amount, commission_amount),
  snapshot_currency = COALESCE(snapshot_currency, tuition_currency, 'CAD'),
  invoice_currency = COALESCE(invoice_currency, tuition_currency, 'CAD'),
  receipt_currency = COALESCE(receipt_currency, tuition_currency, 'CAD'),
  base_currency = COALESCE(base_currency, tuition_currency, 'CAD')
WHERE eligibility_status IS NULL OR eligibility_status = 'pending';

CREATE OR REPLACE FUNCTION public.sync_ucs_legacy_commission_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.commission_status := CASE
    WHEN NEW.payment_status = 'paid' THEN 'paid'
    WHEN NEW.payment_status = 'partially_paid' THEN 'partially_paid'
    WHEN NEW.claim_status = 'carried_forward' THEN 'carried_forward'
    WHEN NEW.eligibility_status = 'cancelled' OR NEW.eligibility_status = 'ineligible' THEN 'blocked'
    WHEN NEW.eligibility_status = 'eligible' THEN 'eligible'
    ELSE 'pending'
  END;
  NEW.commission_amount := COALESCE(NEW.amended_expected_amount, NEW.expected_amount, NEW.commission_amount);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_ucs_legacy_status ON public.upi_commission_students;
CREATE TRIGGER trg_sync_ucs_legacy_status BEFORE INSERT OR UPDATE OF eligibility_status, claim_status, payment_status, expected_amount, amended_expected_amount ON public.upi_commission_students FOR EACH ROW EXECUTE FUNCTION public.sync_ucs_legacy_commission_status();

ALTER TABLE public.upi_commission_snapshots
  ADD COLUMN IF NOT EXISTS student_commission_id uuid REFERENCES public.upi_commission_students(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS agreement_version_id uuid REFERENCES public.upi_agreement_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS matched_rule_id uuid REFERENCES public.upi_commission_rules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS campus text,
  ADD COLUMN IF NOT EXISTS program_name text,
  ADD COLUMN IF NOT EXISTS program_category text,
  ADD COLUMN IF NOT EXISTS intake_term text,
  ADD COLUMN IF NOT EXISTS expected_amount numeric(14,2),
  ADD COLUMN IF NOT EXISTS eligibility_date date,
  ADD COLUMN IF NOT EXISTS snapshot_payload jsonb NOT NULL DEFAULT '{}';

CREATE OR REPLACE FUNCTION public.block_commission_snapshot_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'upi_commission_snapshots are immutable'; END;
$$;

DROP TRIGGER IF EXISTS trg_block_snapshot_update ON public.upi_commission_snapshots;
CREATE TRIGGER trg_block_snapshot_update BEFORE UPDATE OR DELETE ON public.upi_commission_snapshots FOR EACH ROW EXECUTE FUNCTION public.block_commission_snapshot_mutation();

DROP POLICY IF EXISTS upi_commission_snapshots_confidential_update ON public.upi_commission_snapshots;
DROP POLICY IF EXISTS upi_commission_snapshots_confidential_delete ON public.upi_commission_snapshots;

CREATE TABLE IF NOT EXISTS public.upi_commission_transfer_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.upi_institutions(id) ON DELETE CASCADE,
  source_student_commission_id uuid NOT NULL REFERENCES public.upi_commission_students(id) ON DELETE CASCADE,
  replacement_student_commission_id uuid REFERENCES public.upi_commission_students(id) ON DELETE SET NULL,
  from_route_id uuid REFERENCES public.upi_partnership_routes(id) ON DELETE SET NULL,
  to_route_id uuid REFERENCES public.upi_partnership_routes(id) ON DELETE SET NULL,
  from_institution_id uuid REFERENCES public.upi_institutions(id) ON DELETE SET NULL,
  to_institution_id uuid REFERENCES public.upi_institutions(id) ON DELETE SET NULL,
  event_status text NOT NULL DEFAULT 'open' CHECK (event_status IN ('open', 'resolved', 'cancelled')),
  outcome text CHECK (outcome IS NULL OR outcome IN ('unchanged', 'amended', 'cancelled', 'replaced', 'under_review')),
  transfer_reason text,
  notes text,
  initiated_by uuid,
  initiated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transfer_events_source ON public.upi_commission_transfer_events (source_student_commission_id, event_status);

DROP TRIGGER IF EXISTS trg_transfer_events_updated_at ON public.upi_commission_transfer_events;
CREATE TRIGGER trg_transfer_events_updated_at BEFORE UPDATE ON public.upi_commission_transfer_events FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.upi_commission_transfer_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS upi_transfer_events_confidential ON public.upi_commission_transfer_events;
CREATE POLICY upi_transfer_events_confidential ON public.upi_commission_transfer_events FOR ALL TO authenticated USING (public.can_view_upi_confidential(auth.uid())) WITH CHECK (public.can_view_upi_confidential(auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.upi_commission_transfer_events TO authenticated;
GRANT ALL ON public.upi_commission_transfer_events TO service_role;

ALTER TABLE public.upi_commission_invoices
  ADD COLUMN IF NOT EXISTS billing_profile_id uuid REFERENCES public.upi_billing_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invoice_currency text DEFAULT 'CAD',
  ADD COLUMN IF NOT EXISTS receipt_currency text DEFAULT 'CAD',
  ADD COLUMN IF NOT EXISTS base_currency text DEFAULT 'CAD';

ALTER TABLE public.upi_invoice_line_items
  ADD COLUMN IF NOT EXISTS commission_period_code text REFERENCES public.upi_commission_periods(code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS snapshot_id uuid REFERENCES public.upi_commission_snapshots(id) ON DELETE SET NULL;

-- ==== 20260723120200: Commission Phase 1 RPCs ====

CREATE OR REPLACE FUNCTION public.fn_resolve_commission_rule(
  p_institution_id uuid,
  p_partnership_route_id uuid DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_campus text DEFAULT NULL,
  p_program_category text DEFAULT NULL,
  p_program_code text DEFAULT NULL,
  p_intake text DEFAULT NULL,
  p_promotion_id uuid DEFAULT NULL,
  p_as_of date DEFAULT CURRENT_DATE
)
RETURNS TABLE (commission_id uuid, matched_rule_id uuid, commission_name text, base_rate_percent numeric, currency text, agreement_version_id uuid, match_level text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_commission_id uuid;
BEGIN
  IF p_partnership_route_id IS NOT NULL THEN
    SELECT r.default_commission_id INTO v_commission_id FROM public.upi_partnership_routes r WHERE r.id = p_partnership_route_id;
  END IF;
  IF v_commission_id IS NULL THEN
    SELECT c.id INTO v_commission_id FROM public.upi_commissions c
    WHERE c.institution_id = p_institution_id AND c.is_active = true
      AND (c.effective_from IS NULL OR c.effective_from <= p_as_of)
      AND (c.effective_to IS NULL OR c.effective_to >= p_as_of)
    ORDER BY c.effective_from DESC NULLS LAST, c.created_at DESC LIMIT 1;
  END IF;
  IF v_commission_id IS NULL THEN RETURN; END IF;
  RETURN QUERY
  WITH ranked AS (
    SELECT c.id AS commission_id, r.id AS matched_rule_id, c.name AS commission_name,
      c.base_rate_percent, c.currency, c.agreement_version_id,
      CASE
        WHEN r.scope_promotion_id IS NOT NULL AND r.scope_promotion_id = p_promotion_id THEN 'promotion'
        WHEN r.scope_intake IS NOT NULL AND lower(r.scope_intake) = lower(COALESCE(p_intake, '')) THEN 'intake'
        WHEN r.scope_program_code IS NOT NULL AND lower(r.scope_program_code) = lower(COALESCE(p_program_code, '')) THEN 'program'
        WHEN r.scope_program_category IS NOT NULL AND lower(r.scope_program_category) = lower(COALESCE(p_program_category, '')) THEN 'category'
        WHEN r.scope_campus IS NOT NULL AND lower(r.scope_campus) = lower(COALESCE(p_campus, '')) THEN 'campus'
        WHEN r.scope_country IS NOT NULL AND lower(r.scope_country) = lower(COALESCE(p_country, '')) THEN 'country'
        WHEN r.rule_type = 'base' OR (r.scope_promotion_id IS NULL AND r.scope_intake IS NULL AND r.scope_program_code IS NULL AND r.scope_program_category IS NULL AND r.scope_campus IS NULL AND r.scope_country IS NULL) THEN 'default'
        ELSE NULL
      END AS match_level,
      CASE
        WHEN r.scope_promotion_id IS NOT NULL AND r.scope_promotion_id = p_promotion_id THEN 1
        WHEN r.scope_intake IS NOT NULL AND lower(r.scope_intake) = lower(COALESCE(p_intake, '')) THEN 2
        WHEN r.scope_program_code IS NOT NULL AND lower(r.scope_program_code) = lower(COALESCE(p_program_code, '')) THEN 3
        WHEN r.scope_program_category IS NOT NULL AND lower(r.scope_program_category) = lower(COALESCE(p_program_category, '')) THEN 4
        WHEN r.scope_campus IS NOT NULL AND lower(r.scope_campus) = lower(COALESCE(p_campus, '')) THEN 5
        WHEN r.scope_country IS NOT NULL AND lower(r.scope_country) = lower(COALESCE(p_country, '')) THEN 6
        WHEN r.rule_type = 'base' OR (r.scope_promotion_id IS NULL AND r.scope_intake IS NULL AND r.scope_program_code IS NULL AND r.scope_program_category IS NULL AND r.scope_campus IS NULL AND r.scope_country IS NULL) THEN 7
        ELSE 99
      END AS rank_order
    FROM public.upi_commissions c LEFT JOIN public.upi_commission_rules r ON r.commission_id = c.id
    WHERE c.id = v_commission_id
  )
  SELECT ranked.commission_id, ranked.matched_rule_id, ranked.commission_name, ranked.base_rate_percent, ranked.currency, ranked.agreement_version_id, ranked.match_level
  FROM ranked WHERE ranked.match_level IS NOT NULL ORDER BY ranked.rank_order LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_resolve_commission_rule(uuid, uuid, text, text, text, text, text, uuid, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_evaluate_eligibility(p_student_commission_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s public.upi_commission_students%ROWTYPE;
  cfg public.upi_commission_eligibility_configs%ROWTYPE;
  v_eligible boolean := false;
  v_reason text := 'pending';
BEGIN
  SELECT * INTO s FROM public.upi_commission_students WHERE id = p_student_commission_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible', false, 'reason', 'not_found'); END IF;
  IF s.eligibility_config_id IS NOT NULL THEN
    SELECT * INTO cfg FROM public.upi_commission_eligibility_configs WHERE id = s.eligibility_config_id;
  ELSE
    SELECT * INTO cfg FROM public.upi_commission_eligibility_configs c
    WHERE c.institution_id = s.institution_id AND c.status = 'published'
      AND (c.partnership_route_id IS NULL OR c.partnership_route_id = s.partnership_route_id)
      AND (c.effective_from IS NULL OR c.effective_from <= CURRENT_DATE)
      AND (c.effective_to IS NULL OR c.effective_to >= CURRENT_DATE)
    ORDER BY CASE WHEN c.partnership_route_id IS NOT NULL THEN 0 ELSE 1 END, c.version_number DESC LIMIT 1;
  END IF;
  IF NOT FOUND THEN
    v_eligible := s.tuition_paid_date IS NOT NULL OR (s.tuition_paid_amount IS NOT NULL AND s.tuition_paid_amount > 0);
    v_reason := CASE WHEN v_eligible THEN 'deposit_paid_fallback' ELSE 'no_config' END;
  ELSE
    CASE cfg.trigger_type
      WHEN 'deposit' THEN v_eligible := s.tuition_paid_date IS NOT NULL OR COALESCE(s.tuition_paid_amount, 0) > 0; v_reason := 'deposit';
      WHEN 'visa' THEN v_eligible := s.study_permit_approved_date IS NOT NULL; v_reason := 'visa';
      WHEN 'enrolled' THEN v_eligible := s.enrollment_status = 'enrolled' AND s.enrollment_confirmed_date IS NOT NULL; v_reason := 'enrolled';
      WHEN 'registered' THEN v_eligible := COALESCE(s.registered_credits, 0) > 0; v_reason := 'registered';
      WHEN 'started_classes' THEN v_eligible := s.enrollment_status = 'enrolled'; v_reason := 'started_classes';
      ELSE v_eligible := false; v_reason := 'custom_not_implemented';
    END CASE;
  END IF;
  RETURN jsonb_build_object('eligible', v_eligible, 'reason', v_reason, 'config_id', cfg.id, 'trigger_type', COALESCE(cfg.trigger_type, 'fallback'));
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_evaluate_eligibility(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_create_commission_snapshot(
  p_student_commission_id uuid, p_breakdown jsonb DEFAULT '{}', p_rules jsonb DEFAULT '[]', p_input jsonb DEFAULT '{}', p_expected_amount numeric DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.upi_commission_students%ROWTYPE; snap_id uuid; v_total numeric;
BEGIN
  SELECT * INTO s FROM public.upi_commission_students WHERE id = p_student_commission_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'student commission not found'; END IF;
  v_total := COALESCE(p_expected_amount, s.amended_expected_amount, s.expected_amount, s.commission_amount, 0);
  INSERT INTO public.upi_commission_snapshots (
    partnership_route_id, commission_id, institution_id, aggregator_id, channel_type,
    student_commission_id, agreement_version_id, matched_rule_id,
    country, campus, program_name, program_category, intake_term,
    expected_amount, eligibility_date, currency, total_amount,
    rules_json, input_json, breakdown_json, snapshot_payload
  ) VALUES (
    s.partnership_route_id, s.commission_id, s.institution_id, s.aggregator_id, s.channel_type,
    s.id, s.agreement_version_id, s.matched_rule_id,
    s.country_of_origin, s.campus, s.program_name, s.program_level, s.intake_term,
    v_total, s.eligibility_date, COALESCE(s.snapshot_currency, s.tuition_currency, 'CAD'), v_total,
    COALESCE(p_rules, '[]'::jsonb), COALESCE(p_input, '{}'::jsonb), COALESCE(p_breakdown, '{}'::jsonb),
    jsonb_build_object('student_commission_id', s.id, 'commission_id', s.commission_id, 'agreement_version_id', s.agreement_version_id, 'matched_rule_id', s.matched_rule_id, 'expected_amount', v_total, 'currency', COALESCE(s.snapshot_currency, s.tuition_currency, 'CAD'), 'eligibility_date', s.eligibility_date)
  ) RETURNING id INTO snap_id;
  UPDATE public.upi_commission_students SET commission_snapshot_id = snap_id, expected_amount = v_total WHERE id = s.id;
  RETURN snap_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_create_commission_snapshot(uuid, jsonb, jsonb, jsonb, numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_mark_student_eligible(p_student_commission_id uuid, p_eligibility_date date DEFAULT CURRENT_DATE)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE eval jsonb; snap_id uuid;
BEGIN
  eval := public.fn_evaluate_eligibility(p_student_commission_id);
  IF NOT (eval->>'eligible')::boolean THEN RAISE EXCEPTION 'Student not eligible: %', eval->>'reason'; END IF;
  UPDATE public.upi_commission_students
  SET eligibility_status = 'eligible', eligibility_date = p_eligibility_date,
      claim_status = CASE WHEN hold_status = 'active' THEN claim_status ELSE 'ready' END
  WHERE id = p_student_commission_id;
  SELECT commission_snapshot_id INTO snap_id FROM public.upi_commission_students WHERE id = p_student_commission_id;
  IF snap_id IS NULL THEN snap_id := public.fn_create_commission_snapshot(p_student_commission_id); END IF;
  RETURN snap_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_mark_student_eligible(uuid, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_publish_commission_rules(p_commission_id uuid, p_published_by uuid DEFAULT auth.uid())
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.upi_commissions SET is_active = true, is_proposed = false, published_at = now(), published_by = p_published_by WHERE id = p_commission_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'commission not found'; END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_publish_commission_rules(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_apply_commission_hold(p_student_commission_id uuid, p_hold_reason text, p_hold_notes text DEFAULT NULL, p_expected_claim_date date DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.upi_commission_hold_reasons WHERE code = p_hold_reason AND is_active) THEN
    RAISE EXCEPTION 'invalid hold reason: %', p_hold_reason;
  END IF;
  UPDATE public.upi_commission_students SET hold_status = 'active', hold_reason = p_hold_reason, hold_notes = p_hold_notes, expected_claim_date = p_expected_claim_date,
    claim_status = CASE WHEN claim_status = 'ready' THEN 'not_ready' ELSE claim_status END
  WHERE id = p_student_commission_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_apply_commission_hold(uuid, text, text, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_release_commission_hold(p_student_commission_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.upi_commission_students SET hold_status = 'released', hold_reason = NULL, hold_notes = NULL,
    claim_status = CASE WHEN eligibility_status = 'eligible' THEN 'ready' ELSE claim_status END
  WHERE id = p_student_commission_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_release_commission_hold(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_initiate_commission_transfer(
  p_source_student_commission_id uuid, p_to_route_id uuid DEFAULT NULL, p_to_institution_id uuid DEFAULT NULL, p_transfer_reason text DEFAULT NULL, p_notes text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.upi_commission_students%ROWTYPE; event_id uuid;
BEGIN
  SELECT * INTO s FROM public.upi_commission_students WHERE id = p_source_student_commission_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'source not found'; END IF;
  INSERT INTO public.upi_commission_transfer_events (institution_id, source_student_commission_id, from_route_id, to_route_id, from_institution_id, to_institution_id, event_status, outcome, transfer_reason, notes, initiated_by)
  VALUES (s.institution_id, s.id, s.partnership_route_id, p_to_route_id, s.institution_id, p_to_institution_id, 'open', 'under_review', p_transfer_reason, p_notes, auth.uid())
  RETURNING id INTO event_id;
  PERFORM public.fn_apply_commission_hold(s.id, 'transfer_under_review', p_transfer_reason, NULL);
  RETURN event_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_initiate_commission_transfer(uuid, uuid, uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_process_transfer_outcome(p_event_id uuid, p_outcome text, p_replacement_student_commission_id uuid DEFAULT NULL, p_amended_amount numeric DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ev public.upi_commission_transfer_events%ROWTYPE;
BEGIN
  IF p_outcome NOT IN ('unchanged', 'amended', 'cancelled', 'replaced', 'under_review') THEN RAISE EXCEPTION 'invalid outcome'; END IF;
  SELECT * INTO ev FROM public.upi_commission_transfer_events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'event not found'; END IF;
  UPDATE public.upi_commission_transfer_events
  SET event_status = CASE WHEN p_outcome = 'under_review' THEN 'open' ELSE 'resolved' END,
      outcome = p_outcome, replacement_student_commission_id = p_replacement_student_commission_id,
      resolved_at = CASE WHEN p_outcome = 'under_review' THEN NULL ELSE now() END
  WHERE id = p_event_id;
  CASE p_outcome
    WHEN 'unchanged' THEN PERFORM public.fn_release_commission_hold(ev.source_student_commission_id);
    WHEN 'amended' THEN
      UPDATE public.upi_commission_students SET amended_expected_amount = COALESCE(p_amended_amount, amended_expected_amount) WHERE id = ev.source_student_commission_id;
      PERFORM public.fn_release_commission_hold(ev.source_student_commission_id);
    WHEN 'cancelled' THEN
      UPDATE public.upi_commission_students SET eligibility_status = 'cancelled', claim_status = 'rejected' WHERE id = ev.source_student_commission_id;
      PERFORM public.fn_release_commission_hold(ev.source_student_commission_id);
    WHEN 'replaced' THEN
      UPDATE public.upi_commission_students SET eligibility_status = 'cancelled', claim_status = 'rejected' WHERE id = ev.source_student_commission_id;
      PERFORM public.fn_release_commission_hold(ev.source_student_commission_id);
    ELSE NULL;
  END CASE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_process_transfer_outcome(uuid, text, uuid, numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_create_replacement_commission(p_source_student_commission_id uuid, p_claim_cycle_id uuid, p_partnership_route_id uuid DEFAULT NULL, p_commission_period_code text DEFAULT 'enrollment')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE src public.upi_commission_students%ROWTYPE; new_id uuid;
BEGIN
  SELECT * INTO src FROM public.upi_commission_students WHERE id = p_source_student_commission_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'source not found'; END IF;
  INSERT INTO public.upi_commission_students (
    claim_cycle_id, institution_id, commission_id, client_id,
    student_name, student_email, passport_number, nationality, country_of_origin,
    program_name, program_level, campus, intake_term, intake_month, intake_year,
    tuition_amount, tuition_currency,
    partnership_route_id, aggregator_id, channel_type,
    commission_period_code, eligibility_status, claim_status, payment_status
  ) VALUES (
    p_claim_cycle_id, src.institution_id, src.commission_id, src.client_id,
    src.student_name, src.student_email, src.passport_number, src.nationality, src.country_of_origin,
    src.program_name, src.program_level, src.campus, src.intake_term, src.intake_month, src.intake_year,
    src.tuition_amount, src.tuition_currency,
    COALESCE(p_partnership_route_id, src.partnership_route_id), src.aggregator_id, src.channel_type,
    p_commission_period_code, 'pending', 'not_ready', 'unpaid'
  ) RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_create_replacement_commission(uuid, uuid, uuid, text) TO authenticated;

CREATE OR REPLACE VIEW public.v_client_commission_status AS
SELECT ucs.client_id, ucs.id AS student_commission_id, ucs.institution_id, i.name AS institution_name,
  ucs.program_name, ucs.intake_term, ucs.commission_period_code,
  ucs.eligibility_status, ucs.claim_status, ucs.payment_status,
  ucs.hold_status, ucs.hold_reason, ucs.eligibility_date, ucs.expected_claim_date,
  ucs.commission_status AS legacy_status
FROM public.upi_commission_students ucs
LEFT JOIN public.upi_institutions i ON i.id = ucs.institution_id
WHERE ucs.client_id IS NOT NULL;

GRANT SELECT ON public.v_client_commission_status TO authenticated;

-- ==== 20260723120300 + 20260723120400: counselor view redefinition + hotfix (idempotent) ====

ALTER TABLE public.upi_commission_students
  ADD COLUMN IF NOT EXISTS eligibility_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS claim_status text DEFAULT 'not_ready',
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS hold_status text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS hold_reason text,
  ADD COLUMN IF NOT EXISTS eligibility_date date,
  ADD COLUMN IF NOT EXISTS expected_claim_date date,
  ADD COLUMN IF NOT EXISTS commission_period_code text DEFAULT 'enrollment';

DROP VIEW IF EXISTS public.v_client_commission_status;

CREATE VIEW public.v_client_commission_status
WITH (security_invoker = false) AS
SELECT ucs.client_id, ucs.id AS student_commission_id, ucs.institution_id, i.name AS institution_name,
  ucs.program_name, ucs.intake_term, ucs.commission_period_code,
  ucs.eligibility_status, ucs.claim_status, ucs.payment_status,
  ucs.hold_status, ucs.hold_reason, ucs.eligibility_date, ucs.expected_claim_date,
  ucs.commission_status AS legacy_status
FROM public.upi_commission_students ucs
LEFT JOIN public.upi_institutions i ON i.id = ucs.institution_id
WHERE ucs.client_id IS NOT NULL;

GRANT SELECT ON public.v_client_commission_status TO authenticated;

COMMENT ON VIEW public.v_client_commission_status IS
  'Counselor-safe commission lifecycle status (no amounts). security_invoker=false for read through confidential RLS.';