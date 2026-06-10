-- Sprint 2: Wallet sizing — achievement + rules → base × multiplier
-- Uses prior-period achievement for sizing; current-period for metrics on wallet row.

-- ── Extend discount_wallets ───────────────────────────────────────────────────
ALTER TABLE public.discount_wallets
  ADD COLUMN IF NOT EXISTS assigned_target numeric,
  ADD COLUMN IF NOT EXISTS base_wallet numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS performance_multiplier numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS potential_wallet numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS achieved_revenue numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS achievement_pct numeric,
  ADD COLUMN IF NOT EXISTS unlocked_amount numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.discount_wallets.assigned_target IS
  'Revenue target (INR) from incentive_targets for this period; set by fn_size_wallet.';
COMMENT ON COLUMN public.discount_wallets.base_wallet IS
  'Base allocation from wallet_topup_rules matched to PRIOR period achievement.';
COMMENT ON COLUMN public.discount_wallets.potential_wallet IS
  'base_wallet × performance_multiplier (max earn-to-give budget for period).';
COMMENT ON COLUMN public.discount_wallets.unlocked_amount IS
  'Spendable cap from current achievement (Sprint 3 refines; defaults to potential in Sprint 2).';

-- ── Multiplier bands (Finance-configurable) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wallet_multiplier_bands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_achievement_pct numeric NOT NULL DEFAULT 0,
  max_achievement_pct numeric,
  multiplier numeric NOT NULL DEFAULT 1,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_multiplier_bands_order
  ON public.wallet_multiplier_bands (sort_order)
  WHERE is_active;

ALTER TABLE public.wallet_multiplier_bands ENABLE ROW LEVEL SECURITY;

INSERT INTO public.wallet_multiplier_bands (min_achievement_pct, max_achievement_pct, multiplier, sort_order)
SELECT v.min_pct, v.max_pct, v.mult, v.ord
  FROM (VALUES
    (0::numeric, 49.99::numeric, 0.5::numeric, 1),
    (50::numeric, 79.99::numeric, 0.75::numeric, 2),
    (80::numeric, 99.99::numeric, 1.0::numeric, 3),
    (100::numeric, 119.99::numeric, 1.15::numeric, 4),
    (120::numeric, NULL::numeric, 1.25::numeric, 5)
  ) AS v(min_pct, max_pct, mult, ord)
 WHERE NOT EXISTS (SELECT 1 FROM public.wallet_multiplier_bands LIMIT 1);

-- ── Extend wallet_settings ────────────────────────────────────────────────────
ALTER TABLE public.wallet_settings
  ADD COLUMN IF NOT EXISTS target_base_pct numeric NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS unlock_threshold_pct numeric NOT NULL DEFAULT 50;

COMMENT ON COLUMN public.wallet_settings.target_base_pct IS
  'Fallback: base_wallet = assigned_target × (target_base_pct / 100) when no topup rule matches.';
COMMENT ON COLUMN public.wallet_settings.unlock_threshold_pct IS
  'Minimum achievement % before any unlock (Sprint 3 enforcement); sizing uses full curve in Sprint 2.';

-- Seed example top-up rules when table empty (achievement band → base amount INR)
-- scope_type must match production CHECK (global | branch | role), not 'org'.
INSERT INTO public.wallet_topup_rules (
  scope_type, currency, min_achievement_pct, max_achievement_pct, topup_amount, rollover_policy, is_active
)
SELECT 'global', 'INR', v.min_pct, v.max_pct, v.amt, 'expire'::public.wallet_rollover_policy, true
  FROM (VALUES
    (0::numeric, 49.99::numeric, 5000::numeric),
    (50::numeric, 79.99::numeric, 10000::numeric),
    (80::numeric, 99.99::numeric, 15000::numeric),
    (100::numeric, NULL::numeric, 20000::numeric)
  ) AS v(min_pct, max_pct, amt)
 WHERE NOT EXISTS (SELECT 1 FROM public.wallet_topup_rules WHERE is_active LIMIT 1);

-- ── Helpers ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_wallet_prior_period_key(_period_key text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT to_char((_period_key || '-01')::date - interval '1 month', 'YYYY-MM');
$$;

CREATE OR REPLACE FUNCTION public.fn_wallet_multiplier_for_achievement(_achievement_pct numeric)
RETURNS numeric
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT b.multiplier
        FROM public.wallet_multiplier_bands b
       WHERE b.is_active
         AND _achievement_pct >= b.min_achievement_pct
         AND (b.max_achievement_pct IS NULL OR _achievement_pct <= b.max_achievement_pct)
       ORDER BY b.sort_order
       LIMIT 1
    ),
    1.0
  );
$$;

CREATE OR REPLACE FUNCTION public.fn_wallet_base_from_rules(
  _achievement_pct numeric,
  _assigned_target numeric,
  _currency text DEFAULT 'INR',
  _branch_id uuid DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_base numeric;
  v_pct numeric;
BEGIN
  SELECT r.topup_amount INTO v_base
    FROM public.wallet_topup_rules r
   WHERE r.is_active
     AND r.currency = COALESCE(_currency, 'INR')
     AND _achievement_pct >= r.min_achievement_pct
     AND (r.max_achievement_pct IS NULL OR _achievement_pct <= r.max_achievement_pct)
     AND (r.branch_id IS NULL OR r.branch_id = _branch_id)
   ORDER BY r.min_achievement_pct DESC
   LIMIT 1;

  IF v_base IS NOT NULL THEN
    RETURN v_base;
  END IF;

  SELECT target_base_pct INTO v_pct FROM public.wallet_settings WHERE id = 1;
  IF COALESCE(_assigned_target, 0) > 0 AND COALESCE(v_pct, 0) > 0 THEN
    RETURN ROUND(_assigned_target * v_pct / 100, 2);
  END IF;

  RETURN 0;
END;
$$;

-- Sync current-period achievement metrics onto wallet row
CREATE OR REPLACE FUNCTION public.fn_sync_wallet_metrics(_wallet_id uuid)
RETURNS public.discount_wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w public.discount_wallets%ROWTYPE;
  v_ach numeric;
  v_rev numeric;
  v_tgt numeric;
  v_potential numeric;
  v_unlock numeric;
  v_threshold numeric;
BEGIN
  SELECT * INTO w FROM public.discount_wallets WHERE id = _wallet_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'wallet not found';
  END IF;

  SELECT a.achievement_pct, a.achieved_revenue, a.target_value
    INTO v_ach, v_rev, v_tgt
    FROM public.fn_counselor_period_achievement(w.period_key) a
   WHERE a.counselor_id = w.counselor_id;

  SELECT unlock_threshold_pct INTO v_threshold FROM public.wallet_settings WHERE id = 1;

  v_potential := COALESCE(w.potential_wallet, 0);
  IF v_ach IS NULL OR v_ach <= 0 THEN
    v_unlock := 0;
  ELSIF v_ach < COALESCE(v_threshold, 50) THEN
    v_unlock := 0;
  ELSE
    v_unlock := ROUND(v_potential * LEAST(v_ach / 100.0, 1.0), 2);
  END IF;

  UPDATE public.discount_wallets
     SET achieved_revenue = COALESCE(v_rev, 0),
         achievement_pct = v_ach,
         assigned_target = COALESCE(v_tgt, assigned_target),
         unlocked_amount = v_unlock,
         updated_at = now()
   WHERE id = _wallet_id
   RETURNING * INTO w;

  RETURN w;
END;
$$;

-- Size wallet from PRIOR period achievement + current target
CREATE OR REPLACE FUNCTION public.fn_size_wallet(_wallet_id uuid)
RETURNS public.discount_wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w public.discount_wallets%ROWTYPE;
  v_uid uuid := auth.uid();
  v_prior text;
  v_prior_ach numeric;
  v_target numeric;
  v_base numeric;
  v_mult numeric;
  v_potential numeric;
BEGIN
  IF v_uid IS NOT NULL AND NOT (
    public.has_role(v_uid, 'admin'::public.app_role)
    OR public.has_role(v_uid, 'administrator'::public.app_role)
    OR public.has_role(v_uid, 'manager'::public.app_role)
    OR public.user_has_module(v_uid, 'discount_wallet', 'edit')
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO w FROM public.discount_wallets WHERE id = _wallet_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'wallet not found';
  END IF;

  v_prior := public.fn_wallet_prior_period_key(w.period_key);

  SELECT t.target_value INTO v_target
    FROM public.incentive_targets t
   WHERE t.counselor_id = w.counselor_id
     AND t.period_key = w.period_key
     AND COALESCE(t.target_metric, 'revenue') IN ('revenue', 'net_revenue')
   ORDER BY t.created_at DESC
   LIMIT 1;

  SELECT a.achievement_pct INTO v_prior_ach
    FROM public.fn_counselor_period_achievement(v_prior) a
   WHERE a.counselor_id = w.counselor_id;

  v_prior_ach := COALESCE(v_prior_ach, 0);
  v_base := public.fn_wallet_base_from_rules(v_prior_ach, v_target, w.currency, w.branch_id);
  v_mult := public.fn_wallet_multiplier_for_achievement(v_prior_ach);
  v_potential := ROUND(v_base * v_mult, 2);

  UPDATE public.discount_wallets
     SET assigned_target = v_target,
         base_wallet = v_base,
         performance_multiplier = v_mult,
         potential_wallet = v_potential,
         updated_at = now()
   WHERE id = _wallet_id
   RETURNING * INTO w;

  RETURN public.fn_sync_wallet_metrics(_wallet_id);
END;
$$;

-- Top up wallet balance to base_wallet (after sizing)
CREATE OR REPLACE FUNCTION public.fn_auto_fund_wallet(_wallet_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w public.discount_wallets%ROWTYPE;
  v_uid uuid := auth.uid();
  v_delta numeric;
  v_topup_id uuid;
BEGIN
  IF v_uid IS NOT NULL AND NOT (
    public.has_role(v_uid, 'admin'::public.app_role)
    OR public.has_role(v_uid, 'administrator'::public.app_role)
    OR public.has_role(v_uid, 'manager'::public.app_role)
    OR public.user_has_module(v_uid, 'discount_wallet', 'edit')
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  w := public.fn_size_wallet(_wallet_id);

  v_delta := ROUND(COALESCE(w.base_wallet, 0) - COALESCE(w.balance, 0), 2);
  IF v_delta <= 0 THEN
    RETURN jsonb_build_object(
      'wallet_id', _wallet_id,
      'sized', true,
      'funded', false,
      'delta', 0,
      'base_wallet', w.base_wallet,
      'potential_wallet', w.potential_wallet
    );
  END IF;

  INSERT INTO public.wallet_topups (wallet_id, amount, currency, topup_type, reason, created_by)
  VALUES (
    _wallet_id,
    v_delta,
    w.currency,
    'base',
    'Auto-fund to base wallet (Sprint 2)',
    v_uid
  )
  RETURNING id INTO v_topup_id;

  SELECT * INTO w FROM public.discount_wallets WHERE id = _wallet_id;

  RETURN jsonb_build_object(
    'wallet_id', _wallet_id,
    'sized', true,
    'funded', true,
    'delta', v_delta,
    'topup_id', v_topup_id,
    'base_wallet', w.base_wallet,
    'potential_wallet', w.potential_wallet,
    'balance', w.balance
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_auto_fund_wallets_for_period(_period_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  n_sized int := 0;
  n_funded int := 0;
  res jsonb;
BEGIN
  FOR r IN
    SELECT id FROM public.discount_wallets
     WHERE period_key = _period_key
       AND budget_kind = 'month_to_month'
       AND closed_at IS NULL
  LOOP
    res := public.fn_auto_fund_wallet(r.id);
    n_sized := n_sized + 1;
    IF (res->>'funded')::boolean THEN
      n_funded := n_funded + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'period_key', _period_key,
    'wallets_processed', n_sized,
    'wallets_funded', n_funded
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_size_wallets_for_period(_period_key text)
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
    SELECT id FROM public.discount_wallets
     WHERE period_key = _period_key
       AND closed_at IS NULL
  LOOP
    PERFORM public.fn_size_wallet(r.id);
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_wallet_prior_period_key(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_wallet_multiplier_for_achievement(numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_wallet_base_from_rules(numeric, numeric, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_sync_wallet_metrics(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_size_wallet(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_auto_fund_wallet(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_auto_fund_wallets_for_period(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_size_wallets_for_period(text) TO authenticated;

-- RLS: multiplier bands admin
DO $pol$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'wallet_multiplier_bands_admin' AND tablename = 'wallet_multiplier_bands'
  ) THEN
    CREATE POLICY wallet_multiplier_bands_admin ON public.wallet_multiplier_bands FOR ALL TO authenticated
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
    SELECT 1 FROM pg_policies WHERE policyname = 'wallet_multiplier_bands_read' AND tablename = 'wallet_multiplier_bands'
  ) THEN
    CREATE POLICY wallet_multiplier_bands_read ON public.wallet_multiplier_bands FOR SELECT TO authenticated
      USING (true);
  END IF;
END
$pol$;
