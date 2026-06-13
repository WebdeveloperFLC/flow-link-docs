-- Phase 6B — Director read-only role (Implementation Map §6 Task 4)

DO $enum$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'director'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'director';
  END IF;
END
$enum$;

CREATE OR REPLACE FUNCTION public.fn_is_director_only(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL
    AND public.has_role(_user_id, 'director'::public.app_role)
    AND NOT public.has_role(_user_id, 'admin'::public.app_role)
    AND NOT public.has_role(_user_id, 'administrator'::public.app_role)
    AND NOT public.has_role(_user_id, 'manager'::public.app_role);
$$;

GRANT EXECUTE ON FUNCTION public.fn_is_director_only(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_assert_not_director_read_only()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.fn_is_director_only(auth.uid()) THEN
    RAISE EXCEPTION 'DIRECTOR_READ_ONLY: operational changes require admin or finance workflow';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_assert_not_director_read_only() TO authenticated;

COMMENT ON FUNCTION public.fn_is_director_only(uuid) IS
  'Phase 6B — true when user is director without admin/administrator/manager (read-only executive)';
COMMENT ON FUNCTION public.fn_assert_not_director_read_only() IS
  'Phase 6B — blocks performance/offers/wallet mutations for director-only users';

-- ── Director firm-wide SELECT on performance hub tables ───────────────────────
DO $pol$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'director_read_discount_wallets' AND tablename = 'discount_wallets') THEN
    CREATE POLICY director_read_discount_wallets ON public.discount_wallets
      FOR SELECT TO authenticated
      USING (public.fn_is_director_only(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'director_read_incentive_runs' AND tablename = 'incentive_runs') THEN
    CREATE POLICY director_read_incentive_runs ON public.incentive_runs
      FOR SELECT TO authenticated
      USING (public.fn_is_director_only(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'director_read_incentive_line_items' AND tablename = 'incentive_line_items') THEN
    CREATE POLICY director_read_incentive_line_items ON public.incentive_line_items
      FOR SELECT TO authenticated
      USING (public.fn_is_director_only(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'director_read_incentive_payouts' AND tablename = 'incentive_payouts') THEN
    CREATE POLICY director_read_incentive_payouts ON public.incentive_payouts
      FOR SELECT TO authenticated
      USING (public.fn_is_director_only(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'director_read_wallet_allocations' AND tablename = 'wallet_allocations') THEN
    CREATE POLICY director_read_wallet_allocations ON public.wallet_allocations
      FOR SELECT TO authenticated
      USING (public.fn_is_director_only(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'director_read_discount_approvals' AND tablename = 'discount_approval_requests') THEN
    CREATE POLICY director_read_discount_approvals ON public.discount_approval_requests
      FOR SELECT TO authenticated
      USING (public.fn_is_director_only(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'director_read_promotion_requests' AND tablename = 'promotion_requests') THEN
    CREATE POLICY director_read_promotion_requests ON public.promotion_requests
      FOR SELECT TO authenticated
      USING (public.fn_is_director_only(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'director_read_offers' AND tablename = 'offers') THEN
    CREATE POLICY director_read_offers ON public.offers
      FOR SELECT TO authenticated
      USING (public.fn_is_director_only(auth.uid()));
  END IF;
END
$pol$;

-- ── Guard mutating RPCs ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_period_close_and_reseed(_period_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  r record;
  v_next text;
  v_closed int := 0;
  v_scored int := 0;
  v_seeded int := 0;
  v_funded int := 0;
  v_wallet_id uuid;
  v_fund jsonb;
BEGIN
  PERFORM public.fn_assert_not_director_read_only();

  IF v_uid IS NOT NULL AND NOT (
    public.has_role(v_uid, 'admin'::public.app_role)
    OR public.has_role(v_uid, 'administrator'::public.app_role)
    OR public.has_role(v_uid, 'manager'::public.app_role)
    OR public.user_has_module(v_uid, 'discount_wallet', 'edit')
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_scored := public.fn_sync_performance_scores_for_period(_period_key);
  v_next := public.fn_next_period_key(_period_key);

  FOR r IN
    SELECT *
      FROM public.discount_wallets
     WHERE period_key = _period_key
       AND closed_at IS NULL
       AND budget_kind = 'month_to_month'
  LOOP
    PERFORM public.fn_sync_wallet_metrics(r.id);
    PERFORM public.fn_close_wallet(r.id);
    v_closed := v_closed + 1;

    v_wallet_id := public.fn_get_or_create_wallet(
      r.branch_id,
      r.counselor_id,
      r.currency,
      r.max_amount_per_client,
      r.max_percent_per_client,
      v_next
    );

    IF v_wallet_id IS NOT NULL THEN
      v_seeded := v_seeded + 1;
      v_fund := public.fn_auto_fund_wallet(v_wallet_id);
      IF (v_fund->>'funded')::boolean THEN
        v_funded := v_funded + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'period_key', _period_key,
    'next_period_key', v_next,
    'scores_computed', v_scored,
    'wallets_closed', v_closed,
    'next_wallets_seeded', v_seeded,
    'next_wallets_funded', v_funded
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_apply_offer_discount(
  _offer_id uuid DEFAULT NULL,
  _client_id uuid DEFAULT NULL,
  _lead_id uuid DEFAULT NULL,
  _amount numeric DEFAULT NULL,
  _percent numeric DEFAULT NULL,
  _wallet_id uuid DEFAULT NULL
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

  PERFORM public.fn_assert_not_director_read_only();

  IF (_client_id IS NULL) = (_lead_id IS NULL) THEN
    RAISE EXCEPTION 'provide exactly one of client_id or lead_id';
  END IF;

  IF COALESCE(_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  v_discount := _amount;

  IF _offer_id IS NOT NULL THEN
    SELECT * INTO o FROM public.offers WHERE id = _offer_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'offer not found';
    END IF;
    IF o.status NOT IN ('active', 'expiring_soon') THEN
      RAISE EXCEPTION 'offer is not active (status: %)', o.status;
    END IF;
    IF NOT public.fn_counselor_can_use_offer_type(o.offer_category, v_uid) THEN
      RETURN jsonb_build_object(
        'ok', false,
        'reason', format('offer type "%s" requires manager or admin approval', COALESCE(o.offer_category, 'restricted'))
      );
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

  w := public.fn_pick_discount_wallet(v_uid, v_period, _client_id, _lead_id, _wallet_id, v_debit);
  w := public.fn_sync_wallet_metrics(w.id);

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
        'funding_source', v_funding,
        'wallet_id', w.id
      );
    END IF;
  END IF;

  IF NOT w.allow_negative AND v_debit > w.balance THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', format('insufficient balance (have %s, need %s)', w.balance, v_debit),
      'remaining_unlocked', v_remaining,
      'debited', 0,
      'funding_source', v_funding,
      'wallet_id', w.id
    );
  END IF;

  INSERT INTO public.wallet_allocations (
    wallet_id, counselor_id, client_id, lead_id, offer_id,
    amount, currency, percent, status, created_by, applied_at
  ) VALUES (
    w.id, v_uid, _client_id, _lead_id, _offer_id,
    v_debit, w.currency, _percent, 'applied', v_uid, now()
  )
  RETURNING id INTO v_alloc_id;

  IF _offer_id IS NOT NULL AND _client_id IS NOT NULL THEN
    PERFORM public.log_offer_event(
      _offer_id, _client_id, v_uid, 'redeemed', 'give_discount', v_discount, NULL
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
    'wallet_balance', (SELECT balance FROM public.discount_wallets WHERE id = w.id),
    'wallet_id', w.id,
    'wallet_name', w.name,
    'budget_kind', w.budget_kind
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_review_discount_request(
  _request_id uuid,
  _action text,
  _note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.discount_approval_requests%ROWTYPE;
  v_result jsonb;
BEGIN
  PERFORM public.fn_assert_not_director_read_only();

  SELECT * INTO r FROM public.discount_approval_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'request not found'; END IF;
  IF r.status <> 'pending' THEN RAISE EXCEPTION 'request is not pending'; END IF;

  IF NOT public.fn_can_review_discount_level(r.approval_level) THEN
    RAISE EXCEPTION 'not authorized to review this request level';
  END IF;

  IF lower(_action) = 'decline' THEN
    UPDATE public.discount_approval_requests
       SET status = 'declined', review_note = _note, reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
     WHERE id = _request_id;
    RETURN jsonb_build_object('ok', true, 'status', 'declined');
  END IF;

  IF lower(_action) <> 'approve' THEN
    RAISE EXCEPTION 'action must be approve or decline';
  END IF;

  v_result := public.fn_apply_offer_discount(
    r.offer_id, r.client_id, r.lead_id, r.discount_amount, r.discount_percent, r.wallet_id
  );

  IF NOT coalesce((v_result->>'ok')::boolean, false) THEN
    RETURN v_result;
  END IF;

  UPDATE public.discount_approval_requests
     SET status = 'applied',
         review_note = _note,
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         allocation_id = nullif(v_result->>'allocation_id', '')::uuid,
         updated_at = now()
   WHERE id = _request_id;

  RETURN v_result || jsonb_build_object('ok', true, 'status', 'applied');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_classify_payment_service(
  _payment_id uuid,
  _service_library_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pay public.client_invoice_payments%ROWTYPE;
  v_sl public.service_library%ROWTYPE;
  v_line jsonb;
  v_lines jsonb;
BEGIN
  PERFORM public.fn_assert_not_director_read_only();

  IF NOT (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'administrator'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
    OR public.user_has_module(auth.uid(), 'incentives', 'edit')
  ) THEN
    RAISE EXCEPTION 'not authorized to classify payments';
  END IF;

  SELECT * INTO v_pay FROM public.client_invoice_payments WHERE id = _payment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'payment not found'; END IF;

  SELECT * INTO v_sl FROM public.service_library WHERE id = _service_library_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'service not found'; END IF;

  IF v_pay.invoice_id IS NOT NULL THEN
    SELECT line_items INTO v_lines FROM public.client_invoices WHERE id = v_pay.invoice_id;
    IF v_lines IS NOT NULL AND jsonb_array_length(v_lines) > 0 THEN
      v_line := v_lines->0;
      v_line := v_line || jsonb_build_object(
        'service_code', v_sl.id::text,
        'service_name', coalesce(nullif(v_sl.service, ''), v_sl.sub_service)
      );
      v_lines := jsonb_set(v_lines, '{0}', v_line);
      UPDATE public.client_invoices SET line_items = v_lines, updated_at = now() WHERE id = v_pay.invoice_id;
    END IF;
  END IF;

  UPDATE public.incentive_qualifying_events qe
     SET dimensions = coalesce(qe.dimensions, '{}'::jsonb) || jsonb_build_object(
       'master_key', v_sl.service_category,
       'service_code', v_sl.id::text,
       'sub_category', v_sl.sub_service
     )
   WHERE qe.source_table = 'client_invoice_payments'
     AND qe.source_id = _payment_id;

  RETURN jsonb_build_object(
    'ok', true,
    'payment_id', _payment_id,
    'master_key', v_sl.service_category,
    'service_code', v_sl.id::text
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_admin_unlock_incentive_run(
  _run_id uuid,
  _reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_run public.incentive_runs%ROWTYPE;
  v_payouts int;
BEGIN
  PERFORM public.fn_assert_not_director_read_only();

  IF NOT public.fn_can_admin_incentive_runs(v_uid) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF trim(coalesce(_reason, '')) = '' THEN
    RAISE EXCEPTION 'reason required';
  END IF;

  SELECT * INTO v_run FROM public.incentive_runs WHERE id = _run_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'run not found';
  END IF;

  IF NOT v_run.locked THEN
    RAISE EXCEPTION 'run is not locked';
  END IF;

  IF v_run.status = 'void' THEN
    RAISE EXCEPTION 'voided runs cannot be unlocked';
  END IF;

  SELECT count(*)::int INTO v_payouts
    FROM public.incentive_payouts ip
   WHERE ip.run_id = _run_id
     AND ip.status IN ('approved', 'processed', 'paid');

  IF v_payouts > 0 THEN
    RAISE EXCEPTION 'cannot unlock — % payout(s) already approved or paid', v_payouts;
  END IF;

  UPDATE public.incentive_runs
     SET locked = false,
         status = 'calculated',
         approved_at = NULL,
         approved_by = NULL,
         updated_at = now()
   WHERE id = _run_id;

  INSERT INTO public.incentive_run_admin_actions (run_id, action, reason, performed_by)
  VALUES (_run_id, 'unlock', trim(_reason), v_uid);

  RETURN jsonb_build_object(
    'ok', true,
    'run_id', _run_id,
    'action', 'unlock',
    'period_key', v_run.period_key,
    'message', 'Run unlocked — recalculate is allowed again'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_admin_void_incentive_run(
  _run_id uuid,
  _reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_run public.incentive_runs%ROWTYPE;
  v_payouts int;
BEGIN
  PERFORM public.fn_assert_not_director_read_only();

  IF NOT public.fn_can_admin_incentive_runs(v_uid) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF trim(coalesce(_reason, '')) = '' THEN
    RAISE EXCEPTION 'reason required';
  END IF;

  SELECT * INTO v_run FROM public.incentive_runs WHERE id = _run_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'run not found';
  END IF;

  IF v_run.status = 'void' THEN
    RAISE EXCEPTION 'run already voided';
  END IF;

  SELECT count(*)::int INTO v_payouts
    FROM public.incentive_payouts ip
   WHERE ip.run_id = _run_id;

  IF v_payouts > 0 THEN
    RAISE EXCEPTION 'cannot void — delete payouts first (% row(s))', v_payouts;
  END IF;

  UPDATE public.incentive_runs
     SET locked = false,
         status = 'void',
         approved_at = NULL,
         approved_by = NULL,
         updated_at = now()
   WHERE id = _run_id;

  DELETE FROM public.incentive_line_items WHERE run_id = _run_id;

  INSERT INTO public.incentive_run_admin_actions (run_id, action, reason, performed_by)
  VALUES (_run_id, 'void', trim(_reason), v_uid);

  RETURN jsonb_build_object(
    'ok', true,
    'run_id', _run_id,
    'action', 'void',
    'period_key', v_run.period_key,
    'message', 'Run voided — line items cleared'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_mark_payouts_payroll_sent(
  _payout_ids uuid[],
  _batch_ref text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_count int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  PERFORM public.fn_assert_not_director_read_only();

  IF NOT (
    public.has_role(v_uid, 'admin'::public.app_role)
    OR public.has_role(v_uid, 'administrator'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.incentive_payouts
     SET payroll_status = 'sent_to_payroll',
         payroll_sent_at = now(),
         payroll_batch_ref = nullif(trim(_batch_ref), '')
   WHERE id = ANY(_payout_ids);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('ok', true, 'updated', v_count);
END;
$$;

COMMENT ON FUNCTION public.fn_is_director_only(uuid) IS
  'Phase 6B — true when user is director without admin/administrator/manager (read-only executive)';
