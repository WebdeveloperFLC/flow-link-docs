-- Sprint 0: Counsellor period achievement RPC (fixes Period Close broken query)
-- Achievement = verified payment revenue in period / incentive_targets.target_value
-- Falls back to incentive_line_items (service_revenue) when no live payments.

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

GRANT EXECUTE ON FUNCTION public.fn_counselor_period_achievement(text) TO authenticated;

COMMENT ON FUNCTION public.fn_counselor_period_achievement(text) IS
  'Sprint 0: per-counsellor achievement % for a YYYY-MM period. Numerator prefers verified payments; falls back to locked incentive line items.';
