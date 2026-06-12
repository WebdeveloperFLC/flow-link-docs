-- Phase 0: Incentive platform foundation (FX buffer, plan versioning, events ledger, closer attribution)
-- Deploy via Lovable (GitHub → Lovable publish). Not applied from local repo alone.

-- ── FX buffer on fx_rates ─────────────────────────────────────────────────────
ALTER TABLE public.fx_rates
  ADD COLUMN IF NOT EXISTS base_rate_to_inr numeric,
  ADD COLUMN IF NOT EXISTS buffer_fixed numeric NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS buffer_pct numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.fx_rates.base_rate_to_inr IS
  'Market/manual base rate. effective = base + buffer_fixed OR base * (1 + buffer_pct/100).';
COMMENT ON COLUMN public.fx_rates.buffer_fixed IS
  'Fixed add-on to base (default +2 INR per unit foreign currency). V1 sign-off default.';

-- Backfill base from existing rate_to_inr where missing
UPDATE public.fx_rates
SET base_rate_to_inr = rate_to_inr
WHERE base_rate_to_inr IS NULL;

-- Effective rate helper (single FX purpose for V1)
CREATE OR REPLACE FUNCTION public.fn_effective_fx_rate_to_inr(
  _currency text,
  _period_key text DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cur text := upper(trim(coalesce(_currency, 'INR')));
  v_row public.fx_rates%ROWTYPE;
  v_base numeric;
  v_eff numeric;
BEGIN
  IF v_cur = 'INR' THEN
    RETURN 1;
  END IF;

  SELECT * INTO v_row
  FROM public.fx_rates r
  WHERE upper(r.currency) = v_cur
    AND (_period_key IS NULL OR r.period_key <= _period_key)
  ORDER BY r.period_key DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_base := coalesce(v_row.base_rate_to_inr, v_row.rate_to_inr);
  IF coalesce(v_row.buffer_pct, 0) > 0 THEN
    v_eff := v_base * (1 + v_row.buffer_pct / 100);
  ELSE
    v_eff := v_base + coalesce(v_row.buffer_fixed, 0);
  END IF;
  RETURN round(v_eff, 4);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_effective_fx_rate_to_inr(text, text) TO authenticated;

-- Keep rate_to_inr in sync on write (effective rate stored for legacy readers)
CREATE OR REPLACE FUNCTION public.trg_fx_rates_sync_effective()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_base numeric;
  v_eff numeric;
BEGIN
  v_base := coalesce(NEW.base_rate_to_inr, NEW.rate_to_inr, 1);
  NEW.base_rate_to_inr := v_base;
  IF coalesce(NEW.buffer_pct, 0) > 0 THEN
    v_eff := v_base * (1 + NEW.buffer_pct / 100);
  ELSE
    v_eff := v_base + coalesce(NEW.buffer_fixed, 0);
  END IF;
  NEW.rate_to_inr := round(v_eff, 4);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fx_rates_sync_effective ON public.fx_rates;
CREATE TRIGGER trg_fx_rates_sync_effective
  BEFORE INSERT OR UPDATE ON public.fx_rates
  FOR EACH ROW EXECUTE FUNCTION public.trg_fx_rates_sync_effective();

-- ── Closer-wins attribution on clients ────────────────────────────────────────
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS closing_counselor_id uuid,
  ADD COLUMN IF NOT EXISTS closing_branch_id uuid,
  ADD COLUMN IF NOT EXISTS closing_at timestamptz,
  ADD COLUMN IF NOT EXISTS incentive_attribution_locked boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.clients.closing_counselor_id IS
  'Set on first verified payment — earns incentive credit (closer-wins policy).';
COMMENT ON COLUMN public.clients.incentive_attribution_locked IS
  'When true, closing_counselor_id only changes via admin adjustment.';

CREATE OR REPLACE FUNCTION public.fn_payment_is_verified(p public.client_invoice_payments)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT coalesce(p.is_refund, false) = false
     AND p.archived_at IS NULL
     AND (
       coalesce(p.payment_status, '') = 'verified'
       OR coalesce(p.payment_proof_status, '') = 'verified'
     )
     AND coalesce(p.payment_status, '') NOT IN ('rejected', 'cancelled');
$$;

CREATE OR REPLACE FUNCTION public.trg_set_closing_counselor_on_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client public.clients%ROWTYPE;
  v_closer uuid;
  v_branch uuid;
BEGIN
  IF NOT public.fn_payment_is_verified(NEW) THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_client FROM public.clients c WHERE c.id = NEW.client_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF v_client.incentive_attribution_locked AND v_client.closing_counselor_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF v_client.closing_counselor_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_closer := coalesce(v_client.assigned_counselor_id, v_client.owner_id);
  IF v_closer IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT b.id INTO v_branch
  FROM public.branches b
  WHERE b.id::text = v_client.branch OR lower(b.name) = lower(v_client.branch)
  LIMIT 1;

  UPDATE public.clients
  SET closing_counselor_id = v_closer,
      closing_branch_id = v_branch,
      closing_at = coalesce(NEW.paid_at, NEW.verified_at, now()),
      incentive_attribution_locked = true
  WHERE id = NEW.client_id
    AND closing_counselor_id IS NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_closing_counselor_on_payment ON public.client_invoice_payments;
CREATE TRIGGER trg_set_closing_counselor_on_payment
  AFTER INSERT OR UPDATE OF payment_status, payment_proof_status, is_refund, archived_at
  ON public.client_invoice_payments
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_closing_counselor_on_payment();

-- ── Plan versioning (snapshot at lock) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.incentive_plan_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.incentive_plans(id) ON DELETE CASCADE,
  version_number int NOT NULL DEFAULT 1,
  plan_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  slabs_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  targets_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  fx_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (plan_id, version_number)
);

ALTER TABLE public.incentive_runs
  ADD COLUMN IF NOT EXISTS plan_version_id uuid REFERENCES public.incentive_plan_versions(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.fn_snapshot_incentive_plan_version(
  _plan_id uuid,
  _period_key text,
  _created_by uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ver int;
  v_id uuid;
  v_fx jsonb;
BEGIN
  SELECT coalesce(max(version_number), 0) + 1 INTO v_ver
  FROM public.incentive_plan_versions WHERE plan_id = _plan_id;

  SELECT coalesce(jsonb_object_agg(upper(r.currency), public.fn_effective_fx_rate_to_inr(r.currency, _period_key)), '{}'::jsonb)
  INTO v_fx
  FROM (
    SELECT DISTINCT ON (upper(currency)) currency
    FROM public.fx_rates
    ORDER BY upper(currency), period_key DESC
  ) r;

  INSERT INTO public.incentive_plan_versions (
    plan_id, version_number, plan_snapshot, slabs_snapshot, targets_snapshot, fx_snapshot, created_by
  )
  SELECT
    _plan_id,
    v_ver,
    to_jsonb(p.*),
    coalesce((SELECT jsonb_agg(to_jsonb(s.*) ORDER BY s.sort_order) FROM public.incentive_slabs s WHERE s.plan_id = _plan_id), '[]'::jsonb),
    coalesce((SELECT jsonb_agg(to_jsonb(t.*)) FROM public.incentive_targets t WHERE t.plan_id = _plan_id AND t.period_key = _period_key), '[]'::jsonb),
    v_fx,
    _created_by
  FROM public.incentive_plans p
  WHERE p.id = _plan_id
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_snapshot_incentive_plan_version(uuid, text, uuid) TO authenticated;

-- ── Qualifying events ledger ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.incentive_qualifying_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  event_date date NOT NULL,
  period_key text NOT NULL,
  counselor_id uuid NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  source_type public.incentive_source_type,
  dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_table text,
  source_id uuid,
  run_id uuid REFERENCES public.incentive_runs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incentive_qe_period_counselor
  ON public.incentive_qualifying_events (period_key, counselor_id);
CREATE INDEX IF NOT EXISTS idx_incentive_qe_source
  ON public.incentive_qualifying_events (source_table, source_id);

ALTER TABLE public.incentive_qualifying_events ENABLE ROW LEVEL SECURITY;

DO $pol$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'incentive_qe_staff' AND tablename = 'incentive_qualifying_events'
  ) THEN
    CREATE POLICY incentive_qe_staff ON public.incentive_qualifying_events FOR SELECT TO authenticated
      USING (
        counselor_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
        OR public.user_has_module(auth.uid(), 'incentives', 'view')
      );
  END IF;
END
$pol$;

-- ── Clawback adjustments helper ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_incentive_clawback_on_refund()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_line record;
  v_counselor uuid;
BEGIN
  IF NEW.is_refund IS DISTINCT FROM true AND coalesce(OLD.is_refund, false) = false THEN
    RETURN NEW;
  END IF;
  IF NOT (NEW.is_refund = true OR NEW.payment_status = 'rejected') THEN
    RETURN NEW;
  END IF;

  FOR v_line IN
    SELECT li.*, ir.period_key
    FROM public.incentive_line_items li
    JOIN public.incentive_runs ir ON ir.id = li.run_id
    WHERE li.source_payment_id = NEW.id
      AND ir.locked = true
      AND li.earned_amount > 0
  LOOP
    INSERT INTO public.incentive_adjustments (
      run_id, counselor_id, adjustment_type, amount, currency, reason, source_payment_id, created_by
    )
    VALUES (
      v_line.run_id,
      v_line.counselor_id,
      'clawback_refund',
      -abs(v_line.earned_amount),
      coalesce(v_line.settlement_currency, 'INR'),
      'Auto clawback: payment refunded/rejected after locked run ' || v_line.period_key,
      NEW.id,
      NEW.verified_by
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_incentive_clawback_on_refund ON public.client_invoice_payments;
CREATE TRIGGER trg_incentive_clawback_on_refund
  AFTER UPDATE OF is_refund, payment_status, archived_at
  ON public.client_invoice_payments
  FOR EACH ROW EXECUTE FUNCTION public.fn_incentive_clawback_on_refund();

-- RLS for plan versions (staff)
ALTER TABLE public.incentive_plan_versions ENABLE ROW LEVEL SECURITY;
DO $pol$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'incentive_plan_versions_staff' AND tablename = 'incentive_plan_versions'
  ) THEN
    CREATE POLICY incentive_plan_versions_staff ON public.incentive_plan_versions FOR SELECT TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
        OR public.user_has_module(auth.uid(), 'incentives', 'view')
      );
  END IF;
END
$pol$;
