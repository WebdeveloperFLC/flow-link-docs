-- Give Discount: fix ₹0 spendable after fn_sync_wallet_metrics
-- 1) Demo verified payments (~₹195.5k) / ₹500k target = 39% < 50% unlock threshold → unlocked zeroed
-- 2) Scoped/festive wallets are manually funded — unlock should follow balance, not achievement gate

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

  IF w.budget_kind IN ('scoped', 'festive') THEN
    v_unlock := LEAST(COALESCE(w.balance, 0), v_potential);
  ELSIF COALESCE(v_use_bands, false) THEN
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

COMMENT ON FUNCTION public.fn_sync_wallet_metrics(uuid) IS
  'Sync wallet achievement + unlocked spend. Scoped/festive wallets unlock from balance (manual top-up); month_to_month uses achievement gate.';

-- Demo target aligned to seeded verified payments: ~₹195.5k / ₹300k ≈ 65% (> 50% threshold)
UPDATE public.incentive_targets
   SET target_value = 300000
 WHERE id = 'a0030001-0001-4000-8000-000000000001';

UPDATE public.discount_wallets
   SET assigned_target = 300000
 WHERE id = 'a0020001-0001-4000-8000-000000000001';

SELECT public.fn_sync_wallet_metrics('a0020001-0001-4000-8000-000000000001');
SELECT public.fn_sync_wallet_metrics('a0020004-0004-4000-8000-000000000004');
