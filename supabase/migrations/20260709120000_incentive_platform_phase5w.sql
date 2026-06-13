-- Phase 5W — Performance Hub readiness check (batch UAT / go-live gate)

CREATE OR REPLACE FUNCTION public.fn_performance_hub_readiness_check(_period_key text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unclassified int := 0;
  v_approvals int := 0;
  v_promos int := 0;
  v_wallet_exc int := 0;
  v_open_wallets int := 0;
  v_ab_running int := 0;
  v_journeys int := 0;
  v_floor_policies int := 0;
  v_runs_locked int := 0;
  v_runs_open int := 0;
  v_scores int := 0;
  v_blockers text[] := ARRAY[]::text[];
BEGIN
  IF _period_key IS NULL OR trim(_period_key) = '' THEN
    RAISE EXCEPTION 'period_key required';
  END IF;

  v_unclassified := coalesce(public.fn_unclassified_payment_count(_period_key), 0);

  SELECT count(*)::int INTO v_approvals
    FROM public.discount_approval_requests
   WHERE period_key = _period_key AND status = 'pending';

  SELECT count(*)::int INTO v_promos
    FROM public.promotion_requests
   WHERE status IN ('pending', 'in_review');

  SELECT count(*)::int INTO v_wallet_exc
    FROM public.wallet_exception_requests
   WHERE period_key = _period_key AND status = 'pending';

  SELECT count(*)::int INTO v_open_wallets
    FROM public.discount_wallets
   WHERE period_key = _period_key
     AND closed_at IS NULL;

  SELECT count(*)::int INTO v_ab_running
    FROM public.offer_ab_experiments
   WHERE status = 'running';

  SELECT count(*)::int INTO v_journeys
    FROM public.offer_automation_journeys
   WHERE is_active = true;

  SELECT count(*)::int INTO v_floor_policies
    FROM public.discount_margin_floor_policies
   WHERE is_active = true;

  SELECT
    count(*) FILTER (WHERE locked)::int,
    count(*) FILTER (WHERE NOT locked)::int
    INTO v_runs_locked, v_runs_open
    FROM public.incentive_runs
   WHERE period_key = _period_key;

  SELECT count(*)::int INTO v_scores
    FROM public.counselor_performance_scores
   WHERE period_key = _period_key;

  IF v_unclassified > 0 THEN
    v_blockers := array_append(v_blockers, v_unclassified::text || ' unclassified payment(s)');
  END IF;
  IF v_approvals > 0 THEN
    v_blockers := array_append(v_blockers, v_approvals::text || ' pending discount approval(s)');
  END IF;
  IF v_wallet_exc > 0 THEN
    v_blockers := array_append(v_blockers, v_wallet_exc::text || ' wallet exception(s)');
  END IF;
  IF v_promos > 0 THEN
    v_blockers := array_append(v_blockers, v_promos::text || ' promotion request(s) open');
  END IF;

  RETURN jsonb_build_object(
    'period_key', _period_key,
    'queues', jsonb_build_object(
      'unclassified_payments', v_unclassified,
      'pending_discount_approvals', v_approvals,
      'promotion_requests', v_promos,
      'wallet_exceptions', v_wallet_exc
    ),
    'offers_intelligence', jsonb_build_object(
      'running_ab_experiments', v_ab_running,
      'active_automation_journeys', v_journeys,
      'margin_floor_policies', v_floor_policies
    ),
    'period_state', jsonb_build_object(
      'open_wallets', v_open_wallets,
      'incentive_runs_locked', v_runs_locked,
      'incentive_runs_open', v_runs_open,
      'counselor_scores_rows', v_scores
    ),
    'ready_for_period_lock', cardinality(v_blockers) = 0,
    'blockers', to_jsonb(v_blockers),
    'phases_shipped', jsonb_build_array('5Q', '5R', '5S', '5T', '5U', '5V', '5W')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_performance_hub_readiness_check(text) TO authenticated;

COMMENT ON FUNCTION public.fn_performance_hub_readiness_check(text) IS
  'Phase 5W — admin readiness snapshot for batch UAT and period lock gate';
