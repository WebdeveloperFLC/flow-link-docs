-- Phase 1+2: incentive rules, scope, qualifying events, payout/adjustment RLS

-- ── Rules (scope + pay config) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.incentive_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.incentive_plans(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  scope_preset text,
  scope_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_type public.incentive_source_type NOT NULL DEFAULT 'service_revenue',
  metric text NOT NULL DEFAULT 'net_revenue',
  rate_type public.incentive_rate_type NOT NULL DEFAULT 'percent',
  rate_value numeric NOT NULL DEFAULT 0,
  stacking_mode text NOT NULL DEFAULT 'additive' CHECK (stacking_mode IN ('additive', 'exclusive', 'cap')),
  cap_amount numeric,
  settlement_currency text,
  milestone text CHECK (milestone IS NULL OR milestone IN ('first_payment', 'commission_paid', 'visa_lodged', 'offer_received')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incentive_rules_plan ON public.incentive_rules (plan_id, sort_order);

ALTER TABLE public.incentive_slabs
  ADD COLUMN IF NOT EXISTS rule_id uuid REFERENCES public.incentive_rules(id) ON DELETE CASCADE;

ALTER TABLE public.incentive_line_items
  ADD COLUMN IF NOT EXISTS rule_id uuid REFERENCES public.incentive_rules(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_incentive_slabs_rule ON public.incentive_slabs (rule_id);
CREATE INDEX IF NOT EXISTS idx_incentive_qe_dimensions ON public.incentive_qualifying_events USING gin (dimensions);

-- ── Qualifying event on verified payment (enrolment / first payment) ───────────
CREATE OR REPLACE FUNCTION public.fn_incentive_record_payment_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client record;
  v_counselor uuid;
  v_branch uuid;
  v_period text;
  v_dims jsonb := '{}'::jsonb;
  v_master text;
  v_code text;
  v_line jsonb;
  v_inv record;
  v_sub text;
  v_comm record;
  v_prior int;
BEGIN
  IF NEW.is_refund = true OR NEW.archived_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF NOT (
    NEW.payment_status = 'verified'
    OR NEW.payment_proof_status = 'verified'
  ) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE'
    AND coalesce(OLD.payment_status, '') = coalesce(NEW.payment_status, '')
    AND coalesce(OLD.payment_proof_status, '') = coalesce(NEW.payment_proof_status, '')
  THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.incentive_qualifying_events qe
    WHERE qe.source_table = 'client_invoice_payments' AND qe.source_id = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_client FROM public.clients WHERE id = NEW.client_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  v_counselor := coalesce(v_client.closing_counselor_id, v_client.assigned_counselor_id, v_client.owner_id);
  IF v_counselor IS NULL THEN RETURN NEW; END IF;

  SELECT b.id INTO v_branch
  FROM public.branches b
  WHERE b.id::text = v_client.branch OR lower(b.name) = lower(v_client.branch)
  LIMIT 1;

  v_period := to_char(coalesce(NEW.paid_at, NEW.verified_at, now()) AT TIME ZONE 'UTC', 'YYYY-MM');

  v_dims := jsonb_build_object(
    'event_subtype', 'first_payment',
    'is_first_payment', false,
    'master_key', null,
    'service_code', null,
    'sub_category', null,
    'country_code', null,
    'country_tag', null,
    'institution_id', null,
    'intake', null,
    'program_name', null
  );

  IF NEW.invoice_id IS NOT NULL THEN
    SELECT id, line_items INTO v_inv FROM public.client_invoices WHERE id = NEW.invoice_id;
    IF v_inv.line_items IS NOT NULL AND jsonb_array_length(v_inv.line_items) > 0 THEN
      v_line := v_inv.line_items->0;
      v_code := coalesce(v_line->>'service_code', v_line->>'service_id');
      IF v_code IS NOT NULL THEN
        SELECT sl.service_category, sl.sub_service INTO v_master, v_sub
        FROM public.service_library sl
        WHERE sl.id::text = split_part(v_code, '::', 1) OR sl.id::text = v_code
        LIMIT 1;
        v_dims := v_dims || jsonb_build_object(
          'master_key', v_master,
          'service_code', v_code,
          'sub_category', v_sub
        );
      END IF;
    END IF;
  END IF;

  SELECT cp.country_code INTO v_sub
  FROM public.cf_client_programs cp
  WHERE cp.client_id = NEW.client_id AND cp.is_primary = true
  ORDER BY cp.updated_at DESC NULLS LAST
  LIMIT 1;
  IF FOUND AND v_sub IS NOT NULL THEN
    v_dims := v_dims || jsonb_build_object('country_code', v_sub);
  END IF;

  SELECT u.institution_id, u.program_name, u.intake_term, u.intake_year
  INTO v_comm
  FROM public.upi_commission_students u
  WHERE u.client_id = NEW.client_id
  ORDER BY u.updated_at DESC NULLS LAST
  LIMIT 1;
  IF FOUND THEN
    v_dims := v_dims || jsonb_strip_nulls(jsonb_build_object(
      'institution_id', v_comm.institution_id,
      'program_name', v_comm.program_name,
      'intake', nullif(trim(both from coalesce(v_comm.intake_term, '') ||
        case when v_comm.intake_year is not null then '-' || v_comm.intake_year::text else '' end), '')
    ));
  END IF;

  SELECT count(*) INTO v_prior
  FROM public.client_invoice_payments p
  WHERE p.client_id = NEW.client_id
    AND p.id <> NEW.id
    AND p.is_refund IS DISTINCT FROM true
    AND p.archived_at IS NULL
    AND (p.payment_status = 'verified' OR p.payment_proof_status = 'verified');

  v_dims := v_dims || jsonb_build_object('is_first_payment', v_prior = 0);

  INSERT INTO public.incentive_qualifying_events (
    event_type, event_date, period_key, counselor_id, client_id, branch_id,
    amount, currency, source_type, dimensions, source_table, source_id
  ) VALUES (
    'first_verified_payment',
    (coalesce(NEW.paid_at, NEW.verified_at, now()) AT TIME ZONE 'UTC')::date,
    v_period,
    v_counselor,
    NEW.client_id,
    v_branch,
    coalesce(NEW.amount, 0),
    coalesce(NEW.currency, 'INR'),
    'service_revenue',
    v_dims,
    'client_invoice_payments',
    NEW.id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_incentive_record_payment_event ON public.client_invoice_payments;
CREATE TRIGGER trg_incentive_record_payment_event
  AFTER INSERT OR UPDATE OF payment_status, payment_proof_status, is_refund, archived_at
  ON public.client_invoice_payments
  FOR EACH ROW EXECUTE FUNCTION public.fn_incentive_record_payment_event();

-- ── RLS: rules, payouts write, adjustments write ───────────────────────────────
ALTER TABLE public.incentive_rules ENABLE ROW LEVEL SECURITY;

DO $pol$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'incentive_rules_admin' AND tablename = 'incentive_rules') THEN
    CREATE POLICY incentive_rules_admin ON public.incentive_rules FOR ALL TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
        OR public.user_has_module(auth.uid(), 'incentives', 'edit')
      )
      WITH CHECK (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
        OR public.user_has_module(auth.uid(), 'incentives', 'edit')
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'incentive_rules_view' AND tablename = 'incentive_rules') THEN
    CREATE POLICY incentive_rules_view ON public.incentive_rules FOR SELECT TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'incentive_payouts_admin' AND tablename = 'incentive_payouts') THEN
    CREATE POLICY incentive_payouts_admin ON public.incentive_payouts FOR ALL TO authenticated
      USING (
        counselor_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
        OR public.user_has_module(auth.uid(), 'incentives', 'edit')
      )
      WITH CHECK (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
        OR public.user_has_module(auth.uid(), 'incentives', 'edit')
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'incentive_adjustments_admin' AND tablename = 'incentive_adjustments') THEN
    CREATE POLICY incentive_adjustments_admin ON public.incentive_adjustments FOR ALL TO authenticated
      USING (
        counselor_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
        OR public.user_has_module(auth.uid(), 'incentives', 'edit')
      )
      WITH CHECK (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
        OR public.user_has_module(auth.uid(), 'incentives', 'edit')
      );
  END IF;
END
$pol$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_incentive_rules_touch') THEN
    CREATE TRIGGER trg_incentive_rules_touch
      BEFORE UPDATE ON public.incentive_rules
      FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
  END IF;
END $$;
