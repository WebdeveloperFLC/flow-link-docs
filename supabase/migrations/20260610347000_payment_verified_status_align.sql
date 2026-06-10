-- Align payment verification: Finance sets payment_status; wallet/achievement must honour both columns.
-- Backfill historical rows + trigger + helper for consistent filtering.

CREATE OR REPLACE FUNCTION public.fn_payment_is_verified(
  _payment_status text,
  _payment_proof_status text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(_payment_status, '') = 'verified'
      OR COALESCE(_payment_proof_status, '') = 'verified';
$$;

COMMENT ON FUNCTION public.fn_payment_is_verified(text, text) IS
  'True when Finance (payment_status) or proof workflow (payment_proof_status) marks payment verified.';

-- Backfill rows verified in Finance but not in proof column
UPDATE public.client_invoice_payments
SET payment_proof_status = 'verified'
WHERE payment_status = 'verified'
  AND COALESCE(payment_proof_status, 'pending') <> 'verified';

CREATE OR REPLACE FUNCTION public.trg_client_invoice_payments_sync_proof_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.payment_status = 'verified'
     AND COALESCE(NEW.payment_proof_status, 'pending') <> 'verified' THEN
    NEW.payment_proof_status := 'verified';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_client_invoice_payments_sync_proof_status ON public.client_invoice_payments;
CREATE TRIGGER trg_client_invoice_payments_sync_proof_status
  BEFORE INSERT OR UPDATE OF payment_status ON public.client_invoice_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_client_invoice_payments_sync_proof_status();

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
      COALESCE(c.assigned_counselor_id, c.owner_id) AS cid,
      SUM(COALESCE(p.amount_in_inr, p.amount, 0))::numeric AS rev
    FROM public.client_invoice_payments p
    JOIN public.clients c ON c.id = p.client_id
    WHERE public.fn_payment_is_verified(p.payment_status, p.payment_proof_status)
      AND COALESCE(p.payment_status, '') NOT IN ('rejected', 'cancelled')
      AND p.archived_at IS NULL
      AND COALESCE(p.is_refund, false) = false
      AND p.paid_at >= v_start
      AND p.paid_at < v_end
      AND COALESCE(c.assigned_counselor_id, c.owner_id) IS NOT NULL
    GROUP BY COALESCE(c.assigned_counselor_id, c.owner_id)
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
    COALESCE(SUM(
      CASE WHEN public.fn_payment_is_verified(p.payment_status, p.payment_proof_status)
        THEN COALESCE(p.amount_in_inr, p.amount, 0)
        ELSE 0
      END
    ), 0),
    COALESCE(SUM(COALESCE(p.amount_in_inr, p.amount, 0)), 0)
    INTO v_paid_verified, v_paid_total
    FROM public.client_invoice_payments p
    JOIN public.clients c ON c.id = p.client_id
   WHERE COALESCE(c.assigned_counselor_id, c.owner_id) = _counselor_id
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
    counselor_id, period_key, revenue_achievement, conversion_rate, wallet_roi,
    collections_received, client_satisfaction, total_score,
    wallet_impact_revenue, wallet_used, updated_at
  ) VALUES (
    _counselor_id, _period_key,
    ROUND(v_rev_score, 1), ROUND(v_conv_score, 1), ROUND(v_roi_score, 1),
    ROUND(v_coll_score, 1), ROUND(v_sat_score, 1), v_total,
    COALESCE(v_achieved_rev, 0), COALESCE(v_wallet_used, 0), now()
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

COMMENT ON FUNCTION public.fn_counselor_period_achievement(text) IS
  'Per-counsellor achievement %. Counsellor = COALESCE(assigned_counselor_id, owner_id). '
  'Verified = payment_status OR payment_proof_status.';
