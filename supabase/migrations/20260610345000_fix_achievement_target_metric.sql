-- Fix: Incentive Plans UI stores target_metric = 'net_revenue' but achievement/sizing
-- RPCs only matched 'revenue', leaving revenue_achievement at 0 and potential_wallet unset.

CREATE OR REPLACE FUNCTION public.fn_counselor_period_achievement(_period_key text)
RETURNS TABLE (
  counselor_id uuid,
  target_value numeric,
  achieved_revenue numeric,
  achievement_pct numeric,
  revenue_source text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start date;
  v_end date;
BEGIN
  v_start := (_period_key || '-01')::date;
  v_end := (v_start + interval '1 month')::date;

  RETURN QUERY
  WITH targets AS (
    SELECT
      t.counselor_id AS cid,
      SUM(t.target_value)::numeric AS tgt
    FROM public.incentive_targets t
    WHERE t.period_key = _period_key
      AND COALESCE(t.target_metric, 'revenue') IN ('revenue', 'net_revenue')
    GROUP BY t.counselor_id
  ),
  pay_rev AS (
    SELECT
      c.assigned_counselor_id AS cid,
      SUM(COALESCE(p.amount_in_inr, p.amount, 0))::numeric AS rev
    FROM public.client_invoice_payments p
    JOIN public.clients c ON c.id = p.client_id
    WHERE p.payment_proof_status = 'verified'
      AND p.archived_at IS NULL
      AND COALESCE(p.is_refund, false) = false
      AND p.paid_at >= v_start
      AND p.paid_at < v_end
      AND c.assigned_counselor_id IS NOT NULL
    GROUP BY c.assigned_counselor_id
  ),
  combined AS (
    SELECT
      COALESCE(t.cid, p.cid) AS cid,
      COALESCE(t.tgt, 0)::numeric AS tgt,
      COALESCE(p.rev, 0)::numeric AS rev
    FROM targets t
    FULL OUTER JOIN pay_rev p ON p.cid = t.cid
  )
  SELECT
    c.cid,
    c.tgt,
    c.rev,
    CASE WHEN c.tgt > 0 THEN ROUND((c.rev / c.tgt) * 100, 1) ELSE NULL END,
    CASE WHEN c.rev > 0 THEN 'verified_payments' ELSE 'none' END
  FROM combined c
  WHERE c.cid IS NOT NULL;
END;
$$;

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
