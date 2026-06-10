-- Fix apply-discount wallet selection + staff roles on log_offer_event

CREATE OR REPLACE FUNCTION public.log_offer_event(
  _offer_id uuid,
  _client_id uuid DEFAULT NULL,
  _counselor_id uuid DEFAULT NULL,
  _event_type text DEFAULT 'viewed',
  _channel text DEFAULT NULL,
  _revenue_amount numeric DEFAULT 0,
  _tracking_code text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  IF _event_type NOT IN ('viewed','claimed','redeemed','delivered') THEN
    RAISE EXCEPTION 'Invalid offer event_type: %', _event_type;
  END IF;

  IF NOT (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'administrator'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
    OR public.has_role(auth.uid(), 'counselor'::public.app_role)
    OR (_client_id IS NOT NULL AND public.can_view_client(auth.uid(), _client_id))
    OR (_client_id IS NOT NULL AND public.is_portal_user_for(auth.uid(), _client_id))
  ) THEN
    RAISE EXCEPTION 'Not authorized to log offer event';
  END IF;

  INSERT INTO public.offer_events (
    offer_id, client_id, counselor_id, event_type, channel, revenue_amount, tracking_code
  ) VALUES (
    _offer_id, _client_id, _counselor_id, _event_type, _channel, COALESCE(_revenue_amount, 0), _tracking_code
  )
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_apply_offer_discount(
  _offer_id uuid DEFAULT NULL,
  _client_id uuid DEFAULT NULL,
  _lead_id uuid DEFAULT NULL,
  _amount numeric DEFAULT NULL,
  _percent numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_period text := to_char(CURRENT_DATE, 'YYYY-MM');
  w public.discount_wallets%ROWTYPE;
  o public.offers%ROWTYPE;
  v_spent numeric;
  v_remaining numeric;
  v_debit numeric;
  v_discount numeric;
  v_alloc_id uuid;
  v_funding text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF (_client_id IS NULL) = (_lead_id IS NULL) THEN
    RAISE EXCEPTION 'provide exactly one of client_id or lead_id';
  END IF;

  IF COALESCE(_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  v_discount := _amount;

  SELECT * INTO w
    FROM public.discount_wallets
   WHERE counselor_id = v_uid
     AND period_key = v_period
     AND budget_kind = 'month_to_month'
     AND closed_at IS NULL
   ORDER BY updated_at DESC
   LIMIT 1
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no wallet for current period');
  END IF;

  w := public.fn_sync_wallet_metrics(w.id);

  IF _offer_id IS NOT NULL THEN
    SELECT * INTO o FROM public.offers WHERE id = _offer_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'offer not found';
    END IF;
    IF o.status NOT IN ('active', 'expiring_soon') THEN
      RAISE EXCEPTION 'offer is not active (status: %)', o.status;
    END IF;
    v_funding := o.funding_source::text;
    v_debit := CASE o.funding_source
      WHEN 'university' THEN 0
      WHEN 'joint' THEN ROUND(v_discount * COALESCE(o.fl_contribution_pct, 50) / 100, 2)
      ELSE v_discount
    END;
  ELSE
    v_funding := 'future_link';
    v_debit := v_discount;
  END IF;

  IF _percent IS NOT NULL AND _percent > w.max_percent_per_client THEN
    RAISE EXCEPTION 'discount percent % exceeds cap %', _percent, w.max_percent_per_client;
  END IF;

  IF w.max_amount_per_client IS NOT NULL AND v_discount > w.max_amount_per_client THEN
    RAISE EXCEPTION 'discount amount % exceeds per-client cap %', v_discount, w.max_amount_per_client;
  END IF;

  SELECT COALESCE(SUM(a.amount), 0) INTO v_spent
    FROM public.wallet_allocations a
   WHERE a.wallet_id = w.id
     AND a.status = 'applied';

  v_remaining := COALESCE(w.unlocked_amount, 0) - v_spent;

  IF COALESCE(w.potential_wallet, 0) > 0 OR w.assigned_target IS NOT NULL THEN
    IF v_debit > 0 AND v_debit > v_remaining THEN
      RETURN jsonb_build_object(
        'ok', false,
        'reason', format('exceeds unlocked budget (remaining %s)', v_remaining),
        'remaining_unlocked', v_remaining,
        'debited', 0,
        'funding_source', v_funding
      );
    END IF;
  END IF;

  IF NOT w.allow_negative AND v_debit > w.balance THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', format('insufficient balance (have %s, need %s)', w.balance, v_debit),
      'remaining_unlocked', v_remaining,
      'debited', 0,
      'funding_source', v_funding
    );
  END IF;

  INSERT INTO public.wallet_allocations (
    wallet_id,
    counselor_id,
    client_id,
    lead_id,
    offer_id,
    amount,
    currency,
    percent,
    status,
    created_by,
    applied_at
  ) VALUES (
    w.id,
    v_uid,
    _client_id,
    _lead_id,
    _offer_id,
    v_debit,
    w.currency,
    _percent,
    'applied',
    v_uid,
    now()
  )
  RETURNING id INTO v_alloc_id;

  IF _offer_id IS NOT NULL AND _client_id IS NOT NULL THEN
    PERFORM public.log_offer_event(
      _offer_id,
      _client_id,
      v_uid,
      'redeemed',
      'give_discount',
      v_discount,
      NULL
    );
  END IF;

  v_remaining := v_remaining - v_debit;

  RETURN jsonb_build_object(
    'ok', true,
    'allocation_id', v_alloc_id,
    'debited', v_debit,
    'discount_value', v_discount,
    'funding_source', v_funding,
    'remaining_unlocked', GREATEST(v_remaining, 0),
    'wallet_balance', (SELECT balance FROM public.discount_wallets WHERE id = w.id)
  );
END;
$$;
