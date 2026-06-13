-- Phase 5E — Period lock readiness gates (block lock while queues are open)

CREATE OR REPLACE FUNCTION public.fn_period_lock_readiness(_period_key text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uncl int;
  v_appr int;
  v_promo int;
  v_blockers text[] := ARRAY[]::text[];
BEGIN
  SELECT public.fn_unclassified_payment_count(_period_key) INTO v_uncl;

  SELECT count(*)::int INTO v_appr
    FROM public.discount_approval_requests
   WHERE period_key = _period_key
     AND status = 'pending';

  SELECT count(*)::int INTO v_promo
    FROM public.promotion_requests
   WHERE status IN ('pending', 'in_review');

  IF v_uncl > 0 THEN
    v_blockers := array_append(v_blockers, format('%s unclassified payment(s) must be mapped', v_uncl));
  END IF;

  IF v_appr > 0 THEN
    v_blockers := array_append(v_blockers, format('%s discount approval(s) still pending', v_appr));
  END IF;

  RETURN jsonb_build_object(
    'period_key', _period_key,
    'unclassified_count', v_uncl,
    'pending_approvals', v_appr,
    'promotion_requests_open', v_promo,
    'can_lock', cardinality(v_blockers) = 0,
    'blockers', to_jsonb(v_blockers)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_period_lock_readiness(text) TO authenticated;
