-- Phase 5V — O10 counselor influence + period-aware offer analytics support

CREATE OR REPLACE FUNCTION public.fn_counselor_offer_influence(
  _period_key text,
  _counselor_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from date;
  v_to date;
  v_direct numeric := 0;
  v_assisted numeric := 0;
  v_multi numeric := 0;
  v_wallet_spent numeric := 0;
  v_offers_sent bigint := 0;
  v_redemptions bigint := 0;
BEGIN
  IF _counselor_id IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  v_from := (_period_key || '-01')::date;
  v_to := (date_trunc('month', v_from) + interval '1 month' - interval '1 day')::date;

  SELECT coalesce(sum(p.amount), 0) INTO v_direct
    FROM public.wallet_allocations wa
    JOIN public.client_invoice_payments p ON p.invoice_id = wa.invoice_id
   WHERE wa.status = 'applied'
     AND wa.counselor_id = _counselor_id
     AND wa.offer_id IS NOT NULL
     AND wa.created_at::date >= v_from
     AND wa.created_at::date <= v_to;

  SELECT coalesce(sum(p.amount), 0) INTO v_assisted
    FROM public.wallet_allocations wa
    JOIN public.client_invoice_payments p ON p.client_id = wa.client_id
   WHERE wa.status = 'applied'
     AND wa.counselor_id = _counselor_id
     AND wa.offer_id IS NOT NULL
     AND wa.client_id IS NOT NULL
     AND p.archived_at IS NULL
     AND coalesce(p.is_refund, false) = false
     AND p.created_at > wa.created_at
     AND p.created_at <= wa.created_at + interval '90 days'
     AND NOT EXISTS (
       SELECT 1 FROM public.wallet_allocations wa2
        WHERE wa2.invoice_id = p.invoice_id AND wa2.offer_id IS NOT NULL
     )
     AND wa.created_at::date >= v_from
     AND wa.created_at::date <= v_to;

  SELECT coalesce(sum(x.rev), 0) INTO v_multi
    FROM (
      SELECT sum(wa.amount) AS rev
        FROM public.wallet_allocations wa
       WHERE wa.status = 'applied'
         AND wa.counselor_id = _counselor_id
         AND wa.offer_id IS NOT NULL
         AND wa.applies_service_code IS NOT NULL
         AND wa.created_at::date >= v_from
         AND wa.created_at::date <= v_to
       GROUP BY wa.client_id
      HAVING count(DISTINCT wa.applies_service_code) > 1
    ) x;

  SELECT coalesce(sum(wa.amount), 0) INTO v_wallet_spent
    FROM public.wallet_allocations wa
   WHERE wa.status = 'applied'
     AND wa.counselor_id = _counselor_id
     AND wa.created_at::date >= v_from
     AND wa.created_at::date <= v_to;

  SELECT count(*)::bigint INTO v_offers_sent
    FROM public.offer_events oe
   WHERE oe.counselor_id = _counselor_id
     AND oe.event_type = 'sent'
     AND oe.created_at::date >= v_from
     AND oe.created_at::date <= v_to;

  SELECT count(*)::bigint INTO v_redemptions
    FROM public.offer_events oe
   WHERE oe.counselor_id = _counselor_id
     AND oe.event_type = 'redeemed'
     AND oe.created_at::date >= v_from
     AND oe.created_at::date <= v_to;

  RETURN jsonb_build_object(
    'found', true,
    'period_key', _period_key,
    'direct_revenue', round(v_direct, 2),
    'assisted_revenue', round(v_assisted, 2),
    'multi_service_revenue', round(v_multi, 2),
    'total_influenced', round(v_direct + v_assisted + v_multi, 2),
    'wallet_discount_spent', round(v_wallet_spent, 2),
    'offers_sent', v_offers_sent,
    'redemptions', v_redemptions
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_counselor_offer_influence(text, uuid) TO authenticated;

COMMENT ON FUNCTION public.fn_counselor_offer_influence(text, uuid) IS
  'Phase 5V O10 — counselor-scoped offer influence revenue for a performance period';
