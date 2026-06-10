-- Sprint 4: Performance score engine + period close → reseed next wallet

-- ── Score storage ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.counselor_performance_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id uuid NOT NULL,
  period_key text NOT NULL,
  revenue_achievement numeric NOT NULL DEFAULT 0,
  conversion_rate numeric NOT NULL DEFAULT 0,
  wallet_roi numeric NOT NULL DEFAULT 0,
  collections_received numeric NOT NULL DEFAULT 0,
  client_satisfaction numeric NOT NULL DEFAULT 0,
  total_score numeric NOT NULL DEFAULT 0,
  wallet_impact_revenue numeric NOT NULL DEFAULT 0,
  wallet_used numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (counselor_id, period_key)
);

CREATE INDEX IF NOT EXISTS idx_counselor_performance_scores_period
  ON public.counselor_performance_scores (period_key, total_score DESC);

COMMENT ON TABLE public.counselor_performance_scores IS
  'Monthly performance score (0–100) per counsellor; feeds leaderboard and period-close loop.';

-- ── Configurable weights (Finance sign-off) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.performance_score_weights (
  id int PRIMARY KEY DEFAULT 1,
  weight_revenue_achievement numeric NOT NULL DEFAULT 40,
  weight_conversion_rate numeric NOT NULL DEFAULT 20,
  weight_wallet_roi numeric NOT NULL DEFAULT 20,
  weight_collections numeric NOT NULL DEFAULT 10,
  weight_satisfaction numeric NOT NULL DEFAULT 10,
  default_satisfaction_score numeric NOT NULL DEFAULT 70,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT performance_score_weights_singleton CHECK (id = 1),
  CONSTRAINT performance_score_weights_sum CHECK (
    weight_revenue_achievement + weight_conversion_rate + weight_wallet_roi
    + weight_collections + weight_satisfaction = 100
  )
);

INSERT INTO public.performance_score_weights (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.counselor_performance_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_score_weights ENABLE ROW LEVEL SECURITY;

-- ── Compute one counsellor score ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_compute_performance_score(
  _counselor_id uuid,
  _period_key text
)
RETURNS public.counselor_performance_scores
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start date;
  v_end date;
  v_weights public.performance_score_weights%ROWTYPE;
  v_ach_pct numeric;
  v_achieved_rev numeric;
  v_rev_score numeric;
  v_conv_score numeric;
  v_roi_score numeric;
  v_coll_score numeric;
  v_sat_score numeric;
  v_total numeric;
  v_wallet_used numeric;
  v_leads_total int;
  v_leads_converted int;
  v_paid_verified numeric;
  v_paid_total numeric;
  v_row public.counselor_performance_scores%ROWTYPE;
BEGIN
  v_start := (_period_key || '-01')::date;
  v_end := (v_start + interval '1 month')::date;

  SELECT * INTO v_weights FROM public.performance_score_weights WHERE id = 1;

  SELECT a.achievement_pct, a.achieved_revenue
    INTO v_ach_pct, v_achieved_rev
    FROM public.fn_counselor_period_achievement(_period_key) a
   WHERE a.counselor_id = _counselor_id;

  v_rev_score := LEAST(COALESCE(v_ach_pct, 0) / 150.0 * 100, 100);

  SELECT
    COUNT(*)::int,
    COUNT(*) FILTER (
      WHERE l.status = 'converted' OR l.converted_to_client_id IS NOT NULL
    )::int
    INTO v_leads_total, v_leads_converted
    FROM public.leads l
   WHERE l.assigned_counselor_id = _counselor_id
     AND COALESCE(l.created_at, now()) >= v_start
     AND COALESCE(l.created_at, now()) < v_end;

  IF v_leads_total > 0 THEN
    v_conv_score := (v_leads_converted::numeric / v_leads_total) * 100;
  ELSE
    v_conv_score := 50;
  END IF;

  SELECT COALESCE(SUM(wa.amount), 0) INTO v_wallet_used
    FROM public.wallet_allocations wa
    JOIN public.discount_wallets dw ON dw.id = wa.wallet_id
   WHERE dw.counselor_id = _counselor_id
     AND dw.period_key = _period_key
     AND wa.status = 'applied';

  IF COALESCE(v_wallet_used, 0) > 0 THEN
    v_roi_score := LEAST((COALESCE(v_achieved_rev, 0) / v_wallet_used) / 10.0 * 100, 100);
  ELSE
    v_roi_score := 50;
  END IF;

  SELECT
    COALESCE(SUM(CASE WHEN p.payment_proof_status = 'verified' THEN COALESCE(p.amount_in_inr, p.amount, 0) ELSE 0 END), 0),
    COALESCE(SUM(COALESCE(p.amount_in_inr, p.amount, 0)), 0)
    INTO v_paid_verified, v_paid_total
    FROM public.client_invoice_payments p
    JOIN public.clients c ON c.id = p.client_id
   WHERE c.assigned_counselor_id = _counselor_id
     AND p.archived_at IS NULL
     AND COALESCE(p.is_refund, false) = false
     AND p.paid_at >= v_start
     AND p.paid_at < v_end;

  IF v_paid_total > 0 THEN
    v_coll_score := (v_paid_verified / v_paid_total) * 100;
  ELSE
    v_coll_score := COALESCE(v_rev_score, 50);
  END IF;

  v_sat_score := COALESCE(v_weights.default_satisfaction_score, 70);

  v_total := ROUND(
    v_rev_score * v_weights.weight_revenue_achievement / 100
    + v_conv_score * v_weights.weight_conversion_rate / 100
    + v_roi_score * v_weights.weight_wallet_roi / 100
    + v_coll_score * v_weights.weight_collections / 100
    + v_sat_score * v_weights.weight_satisfaction / 100,
    1
  );

  INSERT INTO public.counselor_performance_scores (
    counselor_id,
    period_key,
    revenue_achievement,
    conversion_rate,
    wallet_roi,
    collections_received,
    client_satisfaction,
    total_score,
    wallet_impact_revenue,
    wallet_used,
    updated_at
  ) VALUES (
    _counselor_id,
    _period_key,
    ROUND(v_rev_score, 1),
    ROUND(v_conv_score, 1),
    ROUND(v_roi_score, 1),
    ROUND(v_coll_score, 1),
    ROUND(v_sat_score, 1),
    v_total,
    COALESCE(v_achieved_rev, 0),
    COALESCE(v_wallet_used, 0),
    now()
  )
  ON CONFLICT (counselor_id, period_key) DO UPDATE SET
    revenue_achievement = EXCLUDED.revenue_achievement,
    conversion_rate = EXCLUDED.conversion_rate,
    wallet_roi = EXCLUDED.wallet_roi,
    collections_received = EXCLUDED.collections_received,
    client_satisfaction = EXCLUDED.client_satisfaction,
    total_score = EXCLUDED.total_score,
    wallet_impact_revenue = EXCLUDED.wallet_impact_revenue,
    wallet_used = EXCLUDED.wallet_used,
    updated_at = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_sync_performance_scores_for_period(_period_key text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  n int := 0;
BEGIN
  FOR r IN
    SELECT DISTINCT counselor_id
      FROM public.discount_wallets
     WHERE period_key = _period_key
    UNION
    SELECT DISTINCT counselor_id
      FROM public.incentive_targets
     WHERE period_key = _period_key
  LOOP
    PERFORM public.fn_compute_performance_score(r.counselor_id, _period_key);
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

-- ── Extended period close: score → close → seed next month ────────────────────
CREATE OR REPLACE FUNCTION public.fn_close_due_wallets()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_cid uuid;
  v_pk text;
  n int := 0;
BEGIN
  FOR r IN
    SELECT id FROM public.discount_wallets
     WHERE closed_at IS NULL
       AND valid_to IS NOT NULL
       AND valid_to < CURRENT_DATE
  LOOP
    SELECT counselor_id, period_key INTO v_cid, v_pk
      FROM public.discount_wallets WHERE id = r.id;

    PERFORM public.fn_close_wallet(r.id);

    IF v_cid IS NOT NULL AND v_pk IS NOT NULL THEN
      PERFORM public.fn_compute_performance_score(v_cid, v_pk);
    END IF;

    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_period_close_and_reseed(_period_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  r record;
  v_next text;
  v_closed int := 0;
  v_scored int := 0;
  v_seeded int := 0;
  v_funded int := 0;
  v_wallet_id uuid;
  v_fund jsonb;
BEGIN
  IF v_uid IS NOT NULL AND NOT (
    public.has_role(v_uid, 'admin'::public.app_role)
    OR public.has_role(v_uid, 'administrator'::public.app_role)
    OR public.has_role(v_uid, 'manager'::public.app_role)
    OR public.user_has_module(v_uid, 'discount_wallet', 'edit')
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_scored := public.fn_sync_performance_scores_for_period(_period_key);
  v_next := public.fn_next_period_key(_period_key);

  FOR r IN
    SELECT *
      FROM public.discount_wallets
     WHERE period_key = _period_key
       AND closed_at IS NULL
       AND budget_kind = 'month_to_month'
  LOOP
    PERFORM public.fn_sync_wallet_metrics(r.id);
    PERFORM public.fn_close_wallet(r.id);
    v_closed := v_closed + 1;

    v_wallet_id := public.fn_get_or_create_wallet(
      r.branch_id,
      r.counselor_id,
      r.currency,
      r.max_amount_per_client,
      r.max_percent_per_client,
      v_next
    );

    IF v_wallet_id IS NOT NULL THEN
      v_seeded := v_seeded + 1;
      v_fund := public.fn_auto_fund_wallet(v_wallet_id);
      IF (v_fund->>'funded')::boolean THEN
        v_funded := v_funded + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'period_key', _period_key,
    'next_period_key', v_next,
    'scores_computed', v_scored,
    'wallets_closed', v_closed,
    'next_wallets_seeded', v_seeded,
    'next_wallets_funded', v_funded
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_performance_leaderboard(
  _period_key text,
  _limit int DEFAULT 10
)
RETURNS TABLE (
  counselor_id uuid,
  full_name text,
  total_score numeric,
  revenue_achievement numeric,
  wallet_impact_revenue numeric,
  rank bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.counselor_id,
    COALESCE(p.full_name, p.email, s.counselor_id::text) AS full_name,
    s.total_score,
    s.revenue_achievement,
    s.wallet_impact_revenue,
    RANK() OVER (ORDER BY s.total_score DESC, s.wallet_impact_revenue DESC) AS rank
  FROM public.counselor_performance_scores s
  LEFT JOIN public.profiles p ON p.id = s.counselor_id
  WHERE s.period_key = _period_key
  ORDER BY s.total_score DESC, s.wallet_impact_revenue DESC
  LIMIT GREATEST(COALESCE(_limit, 10), 1);
$$;

GRANT EXECUTE ON FUNCTION public.fn_compute_performance_score(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_sync_performance_scores_for_period(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_period_close_and_reseed(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_performance_leaderboard(text, int) TO authenticated;

-- ── RLS ───────────────────────────────────────────────────────────────────────
DO $pol$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'counselor_performance_scores_read' AND tablename = 'counselor_performance_scores'
  ) THEN
    CREATE POLICY counselor_performance_scores_read ON public.counselor_performance_scores
      FOR SELECT TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'counselor_performance_scores_admin' AND tablename = 'counselor_performance_scores'
  ) THEN
    CREATE POLICY counselor_performance_scores_admin ON public.counselor_performance_scores
      FOR ALL TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
      )
      WITH CHECK (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'performance_score_weights_read' AND tablename = 'performance_score_weights'
  ) THEN
    CREATE POLICY performance_score_weights_read ON public.performance_score_weights
      FOR SELECT TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'performance_score_weights_admin' AND tablename = 'performance_score_weights'
  ) THEN
    CREATE POLICY performance_score_weights_admin ON public.performance_score_weights
      FOR ALL TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
      )
      WITH CHECK (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
      );
  END IF;
END
$pol$;
