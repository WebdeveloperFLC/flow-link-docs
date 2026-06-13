-- Phase 5N — wallet policy W4 (no-full-burn), W5 (stepped unlock), W6 (unspent unlock at close)

ALTER TABLE public.wallet_settings
  ADD COLUMN IF NOT EXISTS no_full_burn_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS no_full_burn_week1_max_pct numeric NOT NULL DEFAULT 40
    CHECK (no_full_burn_week1_max_pct > 0 AND no_full_burn_week1_max_pct <= 100),
  ADD COLUMN IF NOT EXISTS use_stepped_unlock_bands boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS unspent_unlock_close_policy text NOT NULL DEFAULT 'forfeit'
    CHECK (unspent_unlock_close_policy IN ('forfeit', 'ignore'));

COMMENT ON COLUMN public.wallet_settings.no_full_burn_enabled IS 'Phase 5N W4 — cap week-1 spend to % of unlocked';
COMMENT ON COLUMN public.wallet_settings.no_full_burn_week1_max_pct IS 'Phase 5N W4 — max % of unlocked spendable in days 1–7 of period month';
COMMENT ON COLUMN public.wallet_settings.use_stepped_unlock_bands IS 'Phase 5N W5 — use wallet_unlock_bands instead of linear unlock_threshold_pct';
COMMENT ON COLUMN public.wallet_settings.unspent_unlock_close_policy IS 'Phase 5N W6 — forfeit unused unlock capacity at period close';

ALTER TABLE public.discount_wallets
  ADD COLUMN IF NOT EXISTS forfeited_unlock_amount numeric NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.wallet_unlock_bands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_achievement_pct numeric NOT NULL DEFAULT 0,
  max_achievement_pct numeric,
  unlock_pct_of_potential numeric NOT NULL DEFAULT 0
    CHECK (unlock_pct_of_potential >= 0 AND unlock_pct_of_potential <= 100),
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_unlock_bands_order
  ON public.wallet_unlock_bands (sort_order)
  WHERE is_active;

ALTER TABLE public.wallet_unlock_bands ENABLE ROW LEVEL SECURITY;

INSERT INTO public.wallet_unlock_bands (min_achievement_pct, max_achievement_pct, unlock_pct_of_potential, sort_order)
SELECT v.min_pct, v.max_pct, v.pct, v.ord
  FROM (VALUES
    (0::numeric, 19.99::numeric, 0::numeric, 1),
    (20::numeric, 49.99::numeric, 30::numeric, 2),
    (50::numeric, 79.99::numeric, 60::numeric, 3),
    (80::numeric, NULL::numeric, 100::numeric, 4)
  ) AS v(min_pct, max_pct, pct, ord)
 WHERE NOT EXISTS (SELECT 1 FROM public.wallet_unlock_bands LIMIT 1);

DO $pol$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'wallet_unlock_bands_admin' AND tablename = 'wallet_unlock_bands'
  ) THEN
    CREATE POLICY wallet_unlock_bands_admin ON public.wallet_unlock_bands FOR ALL TO authenticated
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
    SELECT 1 FROM pg_policies WHERE policyname = 'wallet_unlock_bands_read' AND tablename = 'wallet_unlock_bands'
  ) THEN
    CREATE POLICY wallet_unlock_bands_read ON public.wallet_unlock_bands FOR SELECT TO authenticated
      USING (true);
  END IF;
END
$pol$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wallet_unlock_bands TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_wallet_unlock_from_bands(
  _achievement_pct numeric,
  _potential numeric
)
RETURNS numeric
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT ROUND(
    COALESCE(_potential, 0) * COALESCE(
      (
        SELECT b.unlock_pct_of_potential / 100.0
          FROM public.wallet_unlock_bands b
         WHERE b.is_active
           AND COALESCE(_achievement_pct, 0) >= b.min_achievement_pct
           AND (b.max_achievement_pct IS NULL OR _achievement_pct <= b.max_achievement_pct)
         ORDER BY b.sort_order
         LIMIT 1
      ),
      0
    ),
    2
  );
$$;

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
  v_use_bands boolean;
BEGIN
  SELECT * INTO w FROM public.discount_wallets WHERE id = _wallet_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'wallet not found';
  END IF;

  SELECT a.achievement_pct, a.achieved_revenue, a.target_value
    INTO v_ach, v_rev, v_tgt
    FROM public.fn_counselor_period_achievement(w.period_key) a
   WHERE a.counselor_id = w.counselor_id;

  SELECT unlock_threshold_pct, use_stepped_unlock_bands
    INTO v_threshold, v_use_bands
    FROM public.wallet_settings WHERE id = 1;

  v_potential := COALESCE(w.potential_wallet, 0);

  IF COALESCE(v_use_bands, false) THEN
    v_unlock := public.fn_wallet_unlock_from_bands(v_ach, v_potential);
  ELSIF v_ach IS NULL OR v_ach <= 0 THEN
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

CREATE OR REPLACE FUNCTION public.fn_wallet_spend_limits(_wallet_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w public.discount_wallets%ROWTYPE;
  v_spent numeric;
  v_remaining numeric;
  v_week1_active boolean := false;
  v_week1_cap numeric;
  v_week1_remaining numeric;
  v_period_start date;
  v_settings record;
BEGIN
  SELECT * INTO w FROM public.discount_wallets WHERE id = _wallet_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'wallet not found');
  END IF;

  SELECT COALESCE(SUM(a.amount), 0) INTO v_spent
    FROM public.wallet_allocations a
   WHERE a.wallet_id = _wallet_id AND a.status = 'applied';

  v_remaining := GREATEST(COALESCE(w.unlocked_amount, 0) - v_spent, 0);

  SELECT no_full_burn_enabled, no_full_burn_week1_max_pct
    INTO v_settings
    FROM public.wallet_settings WHERE id = 1;

  IF COALESCE(v_settings.no_full_burn_enabled, false) AND w.period_key ~ '^\d{4}-\d{2}$' THEN
    v_period_start := (w.period_key || '-01')::date;
    IF CURRENT_DATE >= v_period_start AND CURRENT_DATE < v_period_start + interval '7 days' THEN
      v_week1_active := true;
      v_week1_cap := ROUND(COALESCE(w.unlocked_amount, 0) * v_settings.no_full_burn_week1_max_pct / 100.0, 2);
      v_week1_remaining := GREATEST(v_week1_cap - v_spent, 0);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'unlocked_amount', COALESCE(w.unlocked_amount, 0),
    'spent', v_spent,
    'remaining', v_remaining,
    'week1_cap_active', v_week1_active,
    'week1_max_spendable', v_week1_cap,
    'week1_remaining', v_week1_remaining,
    'effective_remaining', CASE
      WHEN v_week1_active AND v_week1_remaining IS NOT NULL
        THEN LEAST(v_remaining, v_week1_remaining)
      ELSE v_remaining
    END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_wallet_unlock_from_bands(numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_sync_wallet_metrics(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_wallet_spend_limits(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.trg_wallet_allocation_apply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w public.discount_wallets%ROWTYPE;
  v_balance numeric;
  v_spent numeric;
  v_remaining numeric;
  v_week1_cap numeric;
  v_period_start date;
  v_settings record;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'applied' THEN
    SELECT * INTO w FROM public.discount_wallets WHERE id = NEW.wallet_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'wallet not found: %', NEW.wallet_id;
    END IF;

    IF NEW.percent IS NOT NULL AND NEW.percent > w.max_percent_per_client THEN
      RAISE EXCEPTION 'discount percent % exceeds cap %', NEW.percent, w.max_percent_per_client;
    END IF;

    IF w.max_amount_per_client IS NOT NULL AND NEW.amount > w.max_amount_per_client THEN
      RAISE EXCEPTION 'discount amount % exceeds per-client cap %', NEW.amount, w.max_amount_per_client;
    END IF;

    IF COALESCE(w.potential_wallet, 0) > 0 OR w.assigned_target IS NOT NULL THEN
      SELECT COALESCE(SUM(a.amount), 0) INTO v_spent
        FROM public.wallet_allocations a
       WHERE a.wallet_id = NEW.wallet_id
         AND a.status = 'applied'
         AND a.id IS DISTINCT FROM NEW.id;

      v_remaining := COALESCE(w.unlocked_amount, 0) - v_spent;
      IF NEW.amount > 0 AND NEW.amount > v_remaining THEN
        RAISE EXCEPTION 'exceeds unlocked budget (remaining %, requested %)', v_remaining, NEW.amount;
      END IF;

      SELECT no_full_burn_enabled, no_full_burn_week1_max_pct
        INTO v_settings
        FROM public.wallet_settings WHERE id = 1;

      IF COALESCE(v_settings.no_full_burn_enabled, false) AND w.period_key ~ '^\d{4}-\d{2}$' THEN
        v_period_start := (w.period_key || '-01')::date;
        IF CURRENT_DATE >= v_period_start AND CURRENT_DATE < v_period_start + interval '7 days' THEN
          v_week1_cap := ROUND(COALESCE(w.unlocked_amount, 0) * v_settings.no_full_burn_week1_max_pct / 100.0, 2);
          IF NEW.amount > 0 AND (v_spent + NEW.amount) > v_week1_cap THEN
            RAISE EXCEPTION 'no-full-burn (W4): week 1 cap % of unlocked (max %, remaining %)',
              v_settings.no_full_burn_week1_max_pct, v_week1_cap, GREATEST(v_week1_cap - v_spent, 0);
          END IF;
        END IF;
      END IF;
    END IF;

    IF NOT w.allow_negative AND NEW.amount > w.balance THEN
      RAISE EXCEPTION 'insufficient wallet balance (have %, need %)', w.balance, NEW.amount;
    END IF;

    UPDATE public.discount_wallets
       SET balance = balance - NEW.amount,
           updated_at = now()
     WHERE id = NEW.wallet_id
     RETURNING balance INTO v_balance;

    INSERT INTO public.wallet_ledger (
      wallet_id, entry_type, amount, currency, balance_after, ref_allocation_id, note
    ) VALUES (
      NEW.wallet_id, 'allocation', -NEW.amount, NEW.currency, v_balance, NEW.id, 'discount applied'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_close_wallet(_wallet_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w public.discount_wallets%ROWTYPE;
  v_outcome text;
  v_carry numeric;
  v_spent numeric;
  v_unspent_unlock numeric := 0;
  v_close_policy text;
BEGIN
  SELECT * INTO w FROM public.discount_wallets WHERE id = _wallet_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'wallet not found'; END IF;
  IF w.closed_at IS NOT NULL THEN RETURN 'already closed'; END IF;

  PERFORM public.fn_sync_wallet_metrics(_wallet_id);
  SELECT * INTO w FROM public.discount_wallets WHERE id = _wallet_id;

  SELECT COALESCE(SUM(a.amount), 0) INTO v_spent
    FROM public.wallet_allocations a
   WHERE a.wallet_id = _wallet_id AND a.status = 'applied';

  v_unspent_unlock := GREATEST(COALESCE(w.unlocked_amount, 0) - v_spent, 0);

  SELECT unspent_unlock_close_policy INTO v_close_policy FROM public.wallet_settings WHERE id = 1;

  IF v_unspent_unlock > 0 AND COALESCE(v_close_policy, 'forfeit') = 'forfeit' THEN
    INSERT INTO public.wallet_ledger (wallet_id, entry_type, amount, currency, balance_after, note)
    VALUES (
      _wallet_id,
      'unlock_forfeit',
      0,
      w.currency,
      w.balance,
      format('W6: forfeited unused unlock capacity %s', v_unspent_unlock)
    );
  END IF;

  v_carry := GREATEST(w.balance, 0);
  v_outcome := CASE
    WHEN v_carry <= 0 AND v_unspent_unlock > 0 AND v_close_policy = 'forfeit' THEN 'unlock_forfeited'
    WHEN v_carry <= 0 THEN 'zero_balance'
    WHEN w.rollover_policy = 'expire' THEN 'expired'
    WHEN w.rollover_policy IN ('partial', 'full') THEN 'carried_forward'
    ELSE 'expired'
  END;

  UPDATE public.discount_wallets
     SET closed_at = now(),
         close_outcome = v_outcome,
         forfeited_unlock_amount = CASE WHEN v_close_policy = 'forfeit' THEN v_unspent_unlock ELSE 0 END,
         balance = CASE WHEN w.rollover_policy = 'expire' THEN 0 ELSE w.balance END,
         updated_at = now()
   WHERE id = _wallet_id;

  IF v_outcome = 'carried_forward' AND v_carry > 0 THEN
    UPDATE public.discount_wallets
       SET carry_to_period = public.fn_next_period_key(w.period_key, w.valid_to)
     WHERE id = _wallet_id;
  END IF;

  RETURN v_outcome;
END;
$$;

COMMENT ON FUNCTION public.fn_wallet_spend_limits IS 'Phase 5N — unlocked remaining + W4 week-1 cap for Give Discount UI';
COMMENT ON FUNCTION public.fn_wallet_unlock_from_bands IS 'Phase 5N W5 — stepped unlock % of potential by achievement band';
COMMENT ON FUNCTION public.trg_wallet_allocation_apply IS 'Sprint 3 + Phase 5N W4 no-full-burn week-1 cap';
