-- Sprint 0: Wallet balance triggers + period-close helpers
-- Creates functions/triggers only when missing (does not overwrite Lovable production bodies).

-- ── Top-up → balance + ledger ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_wallet_topup_apply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance numeric;
BEGIN
  UPDATE public.discount_wallets
     SET balance = balance + NEW.amount,
         updated_at = now()
   WHERE id = NEW.wallet_id
   RETURNING balance INTO v_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'wallet not found: %', NEW.wallet_id;
  END IF;

  INSERT INTO public.wallet_ledger (
    wallet_id, entry_type, amount, currency, balance_after, ref_topup_id, note
  ) VALUES (
    NEW.wallet_id, 'topup', NEW.amount, NEW.currency, v_balance, NEW.id,
    COALESCE(NEW.reason, NEW.topup_type)
  );

  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_wallet_topup_apply') THEN
    CREATE TRIGGER trg_wallet_topup_apply
      AFTER INSERT ON public.wallet_topups
      FOR EACH ROW EXECUTE FUNCTION public.trg_wallet_topup_apply();
  END IF;
END $$;

-- ── Allocation → cap/balance guard + debit + ledger ─────────────────────────
CREATE OR REPLACE FUNCTION public.trg_wallet_allocation_apply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w public.discount_wallets%ROWTYPE;
  v_balance numeric;
  v_pct numeric;
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

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_wallet_allocation_apply') THEN
    CREATE TRIGGER trg_wallet_allocation_apply
      AFTER INSERT ON public.wallet_allocations
      FOR EACH ROW EXECUTE FUNCTION public.trg_wallet_allocation_apply();
  END IF;
END $$;

-- ── Period helpers (install stubs only if absent) ───────────────────────────
DO $install$
BEGIN
  IF to_regprocedure('public.fn_next_period_key(text,date)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.fn_next_period_key(_period_key text, _valid_to date DEFAULT NULL)
      RETURNS text
      LANGUAGE sql
      IMMUTABLE
      AS $body$
        SELECT to_char(
          (COALESCE(_period_key, to_char(CURRENT_DATE, 'YYYY-MM')) || '-01')::date + interval '1 month',
          'YYYY-MM'
        );
      $body$;
    $fn$;
  END IF;

  IF to_regprocedure('public.fn_close_wallet(uuid)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.fn_close_wallet(_wallet_id uuid)
      RETURNS text
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $body$
      DECLARE
        w public.discount_wallets%ROWTYPE;
        v_outcome text;
        v_carry numeric;
      BEGIN
        SELECT * INTO w FROM public.discount_wallets WHERE id = _wallet_id FOR UPDATE;
        IF NOT FOUND THEN RETURN 'wallet not found'; END IF;
        IF w.closed_at IS NOT NULL THEN RETURN 'already closed'; END IF;

        v_carry := GREATEST(w.balance, 0);
        v_outcome := CASE
          WHEN v_carry <= 0 THEN 'zero_balance'
          WHEN w.rollover_policy = 'expire' THEN 'expired'
          WHEN w.rollover_policy IN ('partial', 'full') THEN 'carried_forward'
          ELSE 'expired'
        END;

        UPDATE public.discount_wallets
           SET closed_at = now(),
               close_outcome = v_outcome,
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
      $body$;
    $fn$;
  END IF;

  IF to_regprocedure('public.fn_close_due_wallets()') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.fn_close_due_wallets()
      RETURNS integer
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $body$
      DECLARE
        r record;
        n int := 0;
      BEGIN
        FOR r IN
          SELECT id FROM public.discount_wallets
           WHERE closed_at IS NULL
             AND valid_to IS NOT NULL
             AND valid_to < CURRENT_DATE
        LOOP
          PERFORM public.fn_close_wallet(r.id);
          n := n + 1;
        END LOOP;
        RETURN n;
      END;
      $body$;
    $fn$;
  END IF;

  IF to_regprocedure('public.fn_reinstate_wallet(uuid,text)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.fn_reinstate_wallet(_wallet_id uuid, _to_period text DEFAULT NULL)
      RETURNS text
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $body$
      DECLARE
        w public.discount_wallets%ROWTYPE;
        ws public.wallet_settings%ROWTYPE;
        v_target_period text;
        v_new_id uuid;
        v_grace_ok boolean := false;
      BEGIN
        SELECT * INTO w FROM public.discount_wallets WHERE id = _wallet_id;
        IF NOT FOUND THEN RETURN 'wallet not found'; END IF;
        IF w.close_outcome IS DISTINCT FROM 'expired' THEN
          RETURN 'only expired wallets can be reinstated';
        END IF;

        SELECT * INTO ws FROM public.wallet_settings WHERE id = 1;
        IF w.closed_at IS NOT NULL THEN
          IF COALESCE(ws.grace_unit, 'days') = 'end_of_next_month' THEN
            v_grace_ok := CURRENT_DATE <= (
              date_trunc('month', w.closed_at::date + interval '2 month') - interval '1 day'
            )::date;
          ELSE
            v_grace_ok := w.closed_at >= (now() - make_interval(days => COALESCE(ws.grace_days, 30)));
          END IF;
        END IF;
        IF NOT v_grace_ok THEN RETURN 'grace window elapsed'; END IF;

        v_target_period := COALESCE(_to_period, w.carry_to_period, public.fn_next_period_key(w.period_key, w.valid_to));

        INSERT INTO public.discount_wallets (
          counselor_id, branch_id, period_key, name, currency, balance,
          budget_kind, max_percent_per_client, max_amount_per_client,
          rollover_policy, rollover_cap, allow_negative,
          scope_country_tag, scope_service_code, scope_master_key, scope_sub_category,
          valid_from, valid_to, carried_to_wallet
        ) VALUES (
          w.counselor_id, w.branch_id, v_target_period,
          COALESCE(w.name, 'Reinstated') || ' (' || v_target_period || ')',
          w.currency, w.balance,
          w.budget_kind, w.max_percent_per_client, w.max_amount_per_client,
          w.rollover_policy, w.rollover_cap, w.allow_negative,
          w.scope_country_tag, w.scope_service_code, w.scope_master_key, w.scope_sub_category,
          date_trunc('month', (v_target_period || '-01')::date)::date,
          (date_trunc('month', (v_target_period || '-01')::date) + interval '1 month - 1 day')::date,
          w.id
        )
        RETURNING id INTO v_new_id;

        UPDATE public.discount_wallets SET carried_to_wallet = v_new_id WHERE id = _wallet_id;

        RETURN 'reinstated to ' || v_target_period || ' as ' || v_new_id::text;
      END;
      $body$;
    $fn$;
  END IF;

  IF to_regprocedure('public.fn_get_or_create_wallet(uuid,uuid,text,numeric,numeric,text)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.fn_get_or_create_wallet(
        _branch uuid,
        _counselor uuid,
        _currency text,
        _max_amt numeric,
        _max_pct numeric,
        _period text
      )
      RETURNS uuid
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $body$
      DECLARE
        v_id uuid;
      BEGIN
        SELECT id INTO v_id
          FROM public.discount_wallets
         WHERE counselor_id = _counselor
           AND period_key = _period
           AND budget_kind = 'month_to_month'
         LIMIT 1;

        IF v_id IS NOT NULL THEN RETURN v_id; END IF;

        INSERT INTO public.discount_wallets (
          counselor_id, branch_id, period_key, name, currency,
          max_percent_per_client, max_amount_per_client, budget_kind,
          valid_from, valid_to, rollover_policy
        ) VALUES (
          _counselor, _branch, _period, _period || ' budget', _currency,
          COALESCE(_max_pct, 10), _max_amt, 'month_to_month',
          date_trunc('month', (_period || '-01')::date)::date,
          (date_trunc('month', (_period || '-01')::date) + interval '1 month - 1 day')::date,
          'expire'
        )
        RETURNING id INTO v_id;

        RETURN v_id;
      END;
      $body$;
    $fn$;
  END IF;

  IF to_regprocedure('public.fn_release_expired_reservations()') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.fn_release_expired_reservations()
      RETURNS integer
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $body$
      DECLARE
        n int;
      BEGIN
        UPDATE public.wallet_allocations
           SET status = 'reversed',
               reversed_at = now(),
               reversal_reason = 'reservation expired'
         WHERE status = 'reserved'
           AND created_at < now() - interval '24 hours';
        GET DIAGNOSTICS n = ROW_COUNT;
        RETURN n;
      END;
      $body$;
    $fn$;
  END IF;
END
$install$;
