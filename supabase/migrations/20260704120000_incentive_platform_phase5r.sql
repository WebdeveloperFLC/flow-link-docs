-- Phase 5R — O11 offer A/B experiments · X8 period context helpers

-- ── O11: A/B experiment tables ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.offer_ab_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'running', 'completed', 'cancelled')),
  winner_variant_id uuid,
  min_conversions int NOT NULL DEFAULT 5 CHECK (min_conversions >= 1),
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.offer_ab_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid NOT NULL REFERENCES public.offer_ab_experiments(id) ON DELETE CASCADE,
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  variant_code text NOT NULL CHECK (variant_code IN ('A', 'B')),
  label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (experiment_id, variant_code),
  UNIQUE (experiment_id, offer_id)
);

ALTER TABLE public.offer_ab_experiments
  DROP CONSTRAINT IF EXISTS offer_ab_experiments_winner_fkey;

ALTER TABLE public.offer_ab_experiments
  ADD CONSTRAINT offer_ab_experiments_winner_fkey
  FOREIGN KEY (winner_variant_id) REFERENCES public.offer_ab_variants(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.offer_ab_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid NOT NULL REFERENCES public.offer_ab_experiments(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES public.offer_ab_variants(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  counselor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT offer_ab_assignments_target_chk CHECK (client_id IS NOT NULL OR lead_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_offer_ab_assign_client
  ON public.offer_ab_assignments (experiment_id, client_id)
  WHERE client_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_offer_ab_assign_lead
  ON public.offer_ab_assignments (experiment_id, lead_id)
  WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_offer_ab_variants_experiment
  ON public.offer_ab_variants (experiment_id);

ALTER TABLE public.offer_ab_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_ab_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_ab_assignments ENABLE ROW LEVEL SECURITY;

DO $pol$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'offer_ab_experiments_staff' AND tablename = 'offer_ab_experiments'
  ) THEN
    CREATE POLICY offer_ab_experiments_staff ON public.offer_ab_experiments FOR ALL TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
        OR public.user_has_module(auth.uid(), 'offers', 'view')
      )
      WITH CHECK (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
        OR public.user_has_module(auth.uid(), 'offers', 'edit')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'offer_ab_variants_staff' AND tablename = 'offer_ab_variants'
  ) THEN
    CREATE POLICY offer_ab_variants_staff ON public.offer_ab_variants FOR ALL TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
        OR public.user_has_module(auth.uid(), 'offers', 'view')
      )
      WITH CHECK (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
        OR public.user_has_module(auth.uid(), 'offers', 'edit')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'offer_ab_assignments_staff' AND tablename = 'offer_ab_assignments'
  ) THEN
    CREATE POLICY offer_ab_assignments_staff ON public.offer_ab_assignments FOR ALL TO authenticated
      USING (
        counselor_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
        OR public.user_has_module(auth.uid(), 'offers', 'view')
      )
      WITH CHECK (
        counselor_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
        OR public.user_has_module(auth.uid(), 'offers', 'edit')
      );
  END IF;
END
$pol$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.offer_ab_experiments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offer_ab_variants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offer_ab_assignments TO authenticated;

-- ── O11 RPCs ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_create_offer_ab_experiment(
  _name text,
  _offer_id_a uuid,
  _offer_id_b uuid,
  _description text DEFAULT NULL,
  _min_conversions int DEFAULT 5
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_exp_id uuid;
BEGIN
  IF NOT (
    public.has_role(v_uid, 'admin'::public.app_role)
    OR public.has_role(v_uid, 'administrator'::public.app_role)
    OR public.has_role(v_uid, 'manager'::public.app_role)
    OR public.user_has_module(v_uid, 'offers', 'edit')
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF _offer_id_a = _offer_id_b THEN
    RAISE EXCEPTION 'Variant A and B must be different offers';
  END IF;

  INSERT INTO public.offer_ab_experiments (name, description, min_conversions, created_by)
  VALUES (trim(_name), nullif(trim(_description), ''), greatest(_min_conversions, 1), v_uid)
  RETURNING id INTO v_exp_id;

  INSERT INTO public.offer_ab_variants (experiment_id, offer_id, variant_code, label)
  VALUES
    (v_exp_id, _offer_id_a, 'A', 'Variant A'),
    (v_exp_id, _offer_id_b, 'B', 'Variant B');

  RETURN v_exp_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_create_offer_ab_experiment(text, uuid, uuid, text, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_start_offer_ab_experiment(_experiment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF NOT (
    public.has_role(v_uid, 'admin'::public.app_role)
    OR public.has_role(v_uid, 'administrator'::public.app_role)
    OR public.has_role(v_uid, 'manager'::public.app_role)
    OR public.user_has_module(v_uid, 'offers', 'edit')
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.offer_ab_experiments
     SET status = 'running', started_at = coalesce(started_at, now()), updated_at = now()
   WHERE id = _experiment_id AND status IN ('draft', 'running');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Experiment not found or not startable';
  END IF;

  RETURN jsonb_build_object('ok', true, 'experiment_id', _experiment_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_start_offer_ab_experiment(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_assign_offer_ab_variant(
  _experiment_id uuid,
  _client_id uuid DEFAULT NULL,
  _lead_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_exp public.offer_ab_experiments%ROWTYPE;
  v_existing public.offer_ab_assignments%ROWTYPE;
  v_variant public.offer_ab_variants%ROWTYPE;
  v_counts record;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  IF _client_id IS NULL AND _lead_id IS NULL THEN RAISE EXCEPTION 'client or lead required'; END IF;

  SELECT * INTO v_exp FROM public.offer_ab_experiments
   WHERE id = _experiment_id AND status = 'running';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('assigned', false, 'reason', 'experiment_not_running');
  END IF;

  SELECT * INTO v_existing FROM public.offer_ab_assignments a
   WHERE a.experiment_id = _experiment_id
     AND ((_client_id IS NOT NULL AND a.client_id = _client_id)
       OR (_lead_id IS NOT NULL AND a.lead_id = _lead_id))
   LIMIT 1;

  IF FOUND THEN
    SELECT * INTO v_variant FROM public.offer_ab_variants WHERE id = v_existing.variant_id;
    RETURN jsonb_build_object(
      'assigned', true,
      'experiment_id', _experiment_id,
      'variant_id', v_variant.id,
      'variant_code', v_variant.variant_code,
      'offer_id', v_variant.offer_id
    );
  END IF;

  SELECT v.variant_code, count(*) AS c
    INTO v_counts
    FROM public.offer_ab_assignments a
    JOIN public.offer_ab_variants v ON v.id = a.variant_id
   WHERE a.experiment_id = _experiment_id
   GROUP BY v.variant_code
   ORDER BY count(*) ASC, v.variant_code
   LIMIT 1;

  SELECT * INTO v_variant
    FROM public.offer_ab_variants
   WHERE experiment_id = _experiment_id
     AND variant_code = coalesce(v_counts.variant_code, CASE WHEN random() < 0.5 THEN 'A' ELSE 'B' END)
   LIMIT 1;

  INSERT INTO public.offer_ab_assignments (experiment_id, variant_id, client_id, lead_id, counselor_id)
  VALUES (_experiment_id, v_variant.id, _client_id, _lead_id, v_uid);

  RETURN jsonb_build_object(
    'assigned', true,
    'experiment_id', _experiment_id,
    'variant_id', v_variant.id,
    'variant_code', v_variant.variant_code,
    'offer_id', v_variant.offer_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_assign_offer_ab_variant(uuid, uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_offer_ab_experiment_stats(_experiment_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH variants AS (
    SELECT v.id, v.variant_code, v.offer_id, o.title
      FROM public.offer_ab_variants v
      JOIN public.offers o ON o.id = v.offer_id
     WHERE v.experiment_id = _experiment_id
  ),
  metrics AS (
    SELECT
      v.id AS variant_id,
      v.variant_code,
      v.offer_id,
      v.title,
      count(a.id) FILTER (WHERE a.id IS NOT NULL) AS assignments,
      count(e.id) FILTER (WHERE e.event_type = 'sent') AS sent,
      count(e.id) FILTER (WHERE e.event_type IN ('claimed', 'redeemed')) AS conversions,
      coalesce(sum(e.revenue_amount) FILTER (WHERE e.event_type = 'redeemed'), 0) AS redeemed_revenue
    FROM variants v
    LEFT JOIN public.offer_ab_assignments a ON a.variant_id = v.id
    LEFT JOIN public.offer_events e ON e.offer_id = v.offer_id
    GROUP BY v.id, v.variant_code, v.offer_id, v.title
  )
  SELECT jsonb_build_object(
    'experiment_id', _experiment_id,
    'variants', coalesce(jsonb_agg(
      jsonb_build_object(
        'variant_id', m.variant_id,
        'variant_code', m.variant_code,
        'offer_id', m.offer_id,
        'title', m.title,
        'assignments', m.assignments,
        'sent', m.sent,
        'conversions', m.conversions,
        'redeemed_revenue', m.redeemed_revenue
      ) ORDER BY m.variant_code
    ), '[]'::jsonb)
  )
  FROM metrics m;
$$;

GRANT EXECUTE ON FUNCTION public.fn_offer_ab_experiment_stats(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_promote_offer_ab_winner(_experiment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_exp public.offer_ab_experiments%ROWTYPE;
  v_stats jsonb;
  v_variants jsonb;
  v_winner jsonb;
  v_loser record;
  v_winner_id uuid;
  v_min int;
BEGIN
  IF NOT (
    public.has_role(v_uid, 'admin'::public.app_role)
    OR public.has_role(v_uid, 'administrator'::public.app_role)
    OR public.has_role(v_uid, 'manager'::public.app_role)
    OR public.user_has_module(v_uid, 'offers', 'edit')
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO v_exp FROM public.offer_ab_experiments WHERE id = _experiment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Experiment not found'; END IF;
  v_min := v_exp.min_conversions;

  v_stats := public.fn_offer_ab_experiment_stats(_experiment_id);
  v_variants := v_stats->'variants';

  SELECT elem INTO v_winner
    FROM jsonb_array_elements(v_variants) elem
   ORDER BY (elem->>'conversions')::int DESC,
            (elem->>'redeemed_revenue')::numeric DESC,
            elem->>'variant_code'
   LIMIT 1;

  IF v_winner IS NULL THEN
    RAISE EXCEPTION 'No variant stats';
  END IF;

  IF (v_winner->>'conversions')::int < v_min THEN
    RAISE EXCEPTION 'Winner needs at least % conversions (got %)', v_min, v_winner->>'conversions';
  END IF;

  v_winner_id := (v_winner->>'variant_id')::uuid;

  UPDATE public.offer_ab_experiments
     SET status = 'completed',
         winner_variant_id = v_winner_id,
         completed_at = now(),
         updated_at = now()
   WHERE id = _experiment_id;

  UPDATE public.offers o
     SET status = 'active', is_active = true
   WHERE o.id = (v_winner->>'offer_id')::uuid;

  FOR v_loser IN
    SELECT v.offer_id
      FROM public.offer_ab_variants v
     WHERE v.experiment_id = _experiment_id AND v.id <> v_winner_id
  LOOP
    UPDATE public.offers
       SET status = 'archived', is_active = false, archived_at = now()
     WHERE id = v_loser.offer_id;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'winner_variant_code', v_winner->>'variant_code',
    'winner_offer_id', v_winner->>'offer_id',
    'stats', v_stats
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_promote_offer_ab_winner(uuid) TO authenticated;

-- Wire running A/B into L0 suggestion (stable variant per client)
CREATE OR REPLACE FUNCTION public.fn_suggest_offer_for_client(_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_offer record;
  v_wallet_id uuid;
  v_unlocked numeric := 0;
  v_potential numeric := 0;
  v_spent numeric := 0;
  v_spendable numeric := 0;
  v_reason text;
  v_why_detail text;
  v_has_payment boolean;
  v_profile jsonb;
  v_scenario text := 'general';
  v_journey_id uuid;
  v_dismissed boolean := false;
  v_ab_exp record;
  v_ab_assign jsonb;
  v_ab_offer_id uuid;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('found', false); END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.client_offer_suggestion_dismissals d
     WHERE d.client_id = _client_id
       AND d.counselor_id = v_uid
       AND (d.expires_at IS NULL OR d.expires_at > now())
  ) INTO v_dismissed;

  IF v_dismissed THEN
    RETURN jsonb_build_object('found', false, 'dismissed', true, 'suggestion_level', 'L0');
  END IF;

  v_profile := public.fn_client_cross_sell_profile(_client_id);

  SELECT EXISTS (
    SELECT 1 FROM public.client_invoice_payments p
    WHERE p.client_id = _client_id
      AND p.archived_at IS NULL
      AND p.is_refund IS DISTINCT FROM true
      AND (p.payment_status = 'verified' OR p.payment_proof_status = 'verified')
  ) INTO v_has_payment;

  SELECT w.id, coalesce(w.unlocked_amount, 0), coalesce(w.potential_wallet, 0)
    INTO v_wallet_id, v_unlocked, v_potential
    FROM public.discount_wallets w
   WHERE w.counselor_id = v_uid
     AND w.period_key = to_char(current_date, 'YYYY-MM')
     AND w.budget_kind = 'month_to_month'
   ORDER BY w.updated_at DESC
   LIMIT 1;

  IF v_wallet_id IS NOT NULL THEN
    SELECT coalesce(sum(a.amount), 0) INTO v_spent
      FROM public.wallet_allocations a
     WHERE a.wallet_id = v_wallet_id AND a.status = 'applied';
  END IF;
  v_spendable := greatest(v_unlocked - v_spent, 0);

  -- O11: prefer running A/B experiment when both variants eligible
  v_ab_offer_id := NULL;
  FOR v_ab_exp IN
    SELECT e.id AS experiment_id
      FROM public.offer_ab_experiments e
     WHERE e.status = 'running'
     ORDER BY e.started_at DESC NULLS LAST
  LOOP
    IF EXISTS (
      SELECT 1
        FROM public.offer_ab_variants v
        JOIN public.offers_eligible_for_client(_client_id) ec ON ec.id = v.offer_id
       WHERE v.experiment_id = v_ab_exp.experiment_id
    ) THEN
      v_ab_assign := public.fn_assign_offer_ab_variant(v_ab_exp.experiment_id, _client_id, NULL);
      IF coalesce((v_ab_assign->>'assigned')::boolean, false) THEN
        v_ab_offer_id := (v_ab_assign->>'offer_id')::uuid;
        EXIT;
      END IF;
    END IF;
  END LOOP;

  IF (v_profile->>'has_coaching')::boolean AND NOT (v_profile->>'has_admission')::boolean THEN
    v_scenario := 'coaching_to_abroad';
    SELECT id INTO v_journey_id
      FROM public.offer_automation_journeys
     WHERE template_key = 'cross_sell_coaching_abroad' AND is_active
     LIMIT 1;
  ELSIF (v_profile->>'has_admission')::boolean AND NOT (v_profile->>'has_allied')::boolean THEN
    v_scenario := 'allied_upsell';
    SELECT id INTO v_journey_id
      FROM public.offer_automation_journeys
     WHERE template_key = 'cross_sell_allied_bundle' AND is_active
     LIMIT 1;
  ELSIF NOT v_has_payment THEN
    v_scenario := 'enrolment';
  END IF;

  IF v_ab_offer_id IS NOT NULL THEN
    SELECT o.id, o.title, o.discount_type, o.discount_value, o.funding_source
      INTO v_offer
      FROM public.offers o
     WHERE o.id = v_ab_offer_id;
    v_scenario := 'ab_test';
  ELSE
    SELECT o.id, o.title, o.discount_type, o.discount_value, o.funding_source
      INTO v_offer
      FROM public.offers_eligible_for_client(_client_id) o
     WHERE o.status IN ('active', 'expiring_soon')
     ORDER BY
       CASE v_scenario
         WHEN 'coaching_to_abroad' THEN CASE WHEN o.title ILIKE '%study%' OR o.title ILIKE '%abroad%' OR o.title ILIKE '%admission%' THEN 0 ELSE 1 END
         WHEN 'allied_upsell' THEN CASE WHEN o.title ILIKE '%forex%' OR o.title ILIKE '%insurance%' OR o.title ILIKE '%allied%' THEN 0 ELSE 1 END
         WHEN 'enrolment' THEN CASE WHEN o.title ILIKE '%enrol%' THEN 0 ELSE 1 END
         ELSE 1
       END,
       o.discount_value DESC NULLS LAST
     LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'found', false,
      'suggestion_level', 'L0',
      'cross_sell_scenario', v_scenario,
      'suggested_journey_id', v_journey_id,
      'profile', v_profile
    );
  END IF;

  v_why_detail := coalesce(v_profile->>'last_activity_label', 'No recent activity')
    || ' · ' || replace(coalesce(v_profile->>'lifecycle_stage', 'prospect'), '_', ' ')
    || CASE WHEN (v_profile->>'country_code') IS NOT NULL THEN ' · ' || (v_profile->>'country_code') ELSE '' END
    || CASE WHEN NOT v_has_payment THEN ' · no verified payment yet' ELSE '' END;

  v_reason := CASE v_scenario
    WHEN 'ab_test' THEN 'A/B experiment — you are seeing variant '
      || coalesce(v_ab_assign->>'variant_code', '?') || ' for this client'
    WHEN 'coaching_to_abroad' THEN
      'Coaching client without study-abroad enrolment — suggest conversion to admissions pathway'
    WHEN 'allied_upsell' THEN
      'Study-abroad client without allied add-ons — forex / insurance / travel cross-sell opportunity'
    WHEN 'enrolment' THEN
      'No verified payment yet — enrolment incentive may unlock conversion'
    ELSE 'Eligible active offer from library'
  END;

  IF v_spendable > 0 THEN
    v_reason := v_reason || ' · ₹' || trim(to_char(v_spendable, 'FM999,999,990')) || ' wallet spendable';
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'suggestion_level', 'L0',
    'offer_id', v_offer.id,
    'title', v_offer.title,
    'discount_type', v_offer.discount_type,
    'discount_value', v_offer.discount_value,
    'funding_source', v_offer.funding_source,
    'reason', v_reason,
    'why_detail', v_why_detail,
    'cross_sell_scenario', v_scenario,
    'suggested_journey_id', v_journey_id,
    'ab_experiment_id', v_ab_assign->>'experiment_id',
    'ab_variant_code', v_ab_assign->>'variant_code',
    'wallet_unlocked', v_unlocked,
    'wallet_potential', v_potential,
    'wallet_spendable', v_spendable,
    'within_wallet_cap', v_spendable > 0 OR v_offer.funding_source = 'university',
    'profile', v_profile
  );
END;
$$;

COMMENT ON TABLE public.offer_ab_experiments IS 'Phase 5R O11 — two-variant offer A/B tests with winner promotion';
