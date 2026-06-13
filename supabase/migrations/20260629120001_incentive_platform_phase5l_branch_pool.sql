-- Phase 5L (part 2) — branch pool, O10 influence, wallet impact (requires branch_pool enum from 5l part 1)

ALTER TABLE public.discount_wallets
  ALTER COLUMN counselor_id DROP NOT NULL;

ALTER TABLE public.discount_wallets
  DROP CONSTRAINT IF EXISTS discount_wallets_branch_pool_counselor_chk;

ALTER TABLE public.discount_wallets
  ADD CONSTRAINT discount_wallets_branch_pool_counselor_chk CHECK (
    (budget_kind = 'branch_pool' AND counselor_id IS NULL AND branch_id IS NOT NULL)
    OR (budget_kind <> 'branch_pool' AND counselor_id IS NOT NULL)
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_discount_wallets_branch_pool
  ON public.discount_wallets (branch_id, period_key)
  WHERE budget_kind = 'branch_pool';

CREATE TABLE IF NOT EXISTS public.branch_pool_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_wallet_id uuid NOT NULL REFERENCES public.discount_wallets(id) ON DELETE CASCADE,
  counselor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  counselor_wallet_id uuid NOT NULL REFERENCES public.discount_wallets(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  reason text,
  allocated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_branch_pool_allocations_pool
  ON public.branch_pool_allocations (pool_wallet_id, created_at DESC);

ALTER TABLE public.branch_pool_allocations ENABLE ROW LEVEL SECURITY;

DO $pol$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'branch_pool_allocations_select' AND tablename = 'branch_pool_allocations'
  ) THEN
    CREATE POLICY branch_pool_allocations_select ON public.branch_pool_allocations FOR SELECT TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'branch_pool_allocations_insert' AND tablename = 'branch_pool_allocations'
  ) THEN
    CREATE POLICY branch_pool_allocations_insert ON public.branch_pool_allocations FOR INSERT TO authenticated
      WITH CHECK (
        allocated_by = auth.uid()
        AND (
          public.has_role(auth.uid(), 'admin'::public.app_role)
          OR public.has_role(auth.uid(), 'administrator'::public.app_role)
          OR public.has_role(auth.uid(), 'manager'::public.app_role)
        )
      );
  END IF;
END
$pol$;

GRANT SELECT, INSERT ON public.branch_pool_allocations TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_get_or_create_branch_pool_wallet(
  _branch_id uuid,
  _period_key text,
  _currency text DEFAULT 'INR'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id
    FROM public.discount_wallets
   WHERE branch_id = _branch_id
     AND period_key = _period_key
     AND budget_kind = 'branch_pool'
   LIMIT 1;

  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  INSERT INTO public.discount_wallets (
    branch_id, counselor_id, period_key, currency, name, budget_kind, balance
  ) VALUES (
    _branch_id, NULL, _period_key, _currency,
    'Branch pool', 'branch_pool'::public.wallet_budget_kind, 0
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_allocate_from_branch_pool(
  _branch_id uuid,
  _counselor_id uuid,
  _amount numeric,
  _period_key text DEFAULT to_char(now(), 'YYYY-MM'),
  _reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_pool_id uuid;
  v_counselor_wallet_id uuid;
  v_pool_balance numeric;
  v_topup_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  IF coalesce(_amount, 0) <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;

  IF NOT (
    public.has_role(v_uid, 'admin'::public.app_role)
    OR public.has_role(v_uid, 'administrator'::public.app_role)
    OR (
      public.has_role(v_uid, 'manager'::public.app_role)
      AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_uid AND p.branch_id = _branch_id)
    )
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_pool_id := public.fn_get_or_create_branch_pool_wallet(_branch_id, _period_key, 'INR');

  SELECT balance INTO v_pool_balance FROM public.discount_wallets WHERE id = v_pool_id FOR UPDATE;
  IF coalesce(v_pool_balance, 0) < _amount THEN
    RAISE EXCEPTION 'insufficient pool balance (remaining %)', v_pool_balance;
  END IF;

  SELECT id INTO v_counselor_wallet_id
    FROM public.discount_wallets
   WHERE counselor_id = _counselor_id
     AND period_key = _period_key
     AND budget_kind = 'month_to_month'
   ORDER BY created_at DESC
   LIMIT 1;

  IF v_counselor_wallet_id IS NULL THEN
    RAISE EXCEPTION 'counselor has no personal wallet for period %', _period_key;
  END IF;

  UPDATE public.discount_wallets
     SET balance = balance - _amount, updated_at = now()
   WHERE id = v_pool_id;

  INSERT INTO public.wallet_topups (wallet_id, amount, currency, topup_type, reason, created_by)
  SELECT w.id, _amount, w.currency, 'branch_pool', coalesce(_reason, 'Branch pool allocation'), v_uid
    FROM public.discount_wallets w WHERE w.id = v_counselor_wallet_id
  RETURNING id INTO v_topup_id;

  PERFORM public.fn_sync_wallet_metrics(v_counselor_wallet_id);

  INSERT INTO public.branch_pool_allocations (
    pool_wallet_id, counselor_id, counselor_wallet_id, amount, reason, allocated_by
  ) VALUES (
    v_pool_id, _counselor_id, v_counselor_wallet_id, _amount, _reason, v_uid
  );

  RETURN jsonb_build_object(
    'ok', true,
    'pool_wallet_id', v_pool_id,
    'counselor_wallet_id', v_counselor_wallet_id,
    'amount', _amount,
    'topup_id', v_topup_id,
    'pool_remaining', v_pool_balance - _amount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_get_or_create_branch_pool_wallet(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_allocate_from_branch_pool(uuid, uuid, numeric, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_offer_influence_breakdown(
  _date_from date DEFAULT NULL,
  _date_to date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_direct numeric := 0;
  v_assisted numeric := 0;
  v_multi numeric := 0;
BEGIN
  SELECT coalesce(sum(p.amount), 0) INTO v_direct
    FROM public.wallet_allocations wa
    JOIN public.client_invoice_payments p ON p.invoice_id = wa.invoice_id
   WHERE wa.status = 'applied'
     AND wa.offer_id IS NOT NULL
     AND (_date_from IS NULL OR wa.created_at::date >= _date_from)
     AND (_date_to IS NULL OR wa.created_at::date <= _date_to);

  SELECT coalesce(sum(p.amount), 0) INTO v_assisted
    FROM public.wallet_allocations wa
    JOIN public.client_invoice_payments p ON p.client_id = wa.client_id
   WHERE wa.status = 'applied'
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
     AND (_date_from IS NULL OR wa.created_at::date >= _date_from)
     AND (_date_to IS NULL OR wa.created_at::date <= _date_to);

  SELECT coalesce(sum(x.rev), 0) INTO v_multi
    FROM (
      SELECT sum(wa.amount) AS rev
        FROM public.wallet_allocations wa
       WHERE wa.status = 'applied'
         AND wa.offer_id IS NOT NULL
         AND wa.applies_service_code IS NOT NULL
         AND (_date_from IS NULL OR wa.created_at::date >= _date_from)
         AND (_date_to IS NULL OR wa.created_at::date <= _date_to)
       GROUP BY wa.client_id
      HAVING count(DISTINCT wa.applies_service_code) > 1
    ) x;

  RETURN jsonb_build_object(
    'direct_revenue', round(v_direct, 2),
    'assisted_revenue', round(v_assisted, 2),
    'multi_service_revenue', round(v_multi, 2),
    'total_influenced', round(v_direct + v_assisted + v_multi, 2)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_offer_influence_breakdown(date, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_wallet_impact_summary(_period_key text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'counselor_id', s.counselor_id,
        'counselor_name', coalesce(p.full_name, p.email, s.counselor_id::text),
        'wallet_impact_revenue', s.wallet_impact_revenue,
        'wallet_used', s.wallet_used,
        'roi', CASE WHEN coalesce(s.wallet_used, 0) > 0
               THEN round(s.wallet_impact_revenue / s.wallet_used, 2) ELSE NULL END
      )
      ORDER BY s.wallet_impact_revenue DESC
    ),
    '[]'::jsonb
  )
  FROM public.counselor_performance_scores s
  LEFT JOIN public.profiles p ON p.id = s.counselor_id
  WHERE s.period_key = _period_key
    AND (s.wallet_impact_revenue > 0 OR s.wallet_used > 0);
$$;

GRANT EXECUTE ON FUNCTION public.fn_wallet_impact_summary(text) TO authenticated;

COMMENT ON FUNCTION public.fn_allocate_from_branch_pool IS 'Phase 5L W2 — manager allocates from branch pool to counselor wallet';
COMMENT ON FUNCTION public.fn_offer_influence_breakdown IS 'Phase 5L O10 — direct / assisted / multi-service influence revenue';
COMMENT ON FUNCTION public.fn_wallet_impact_summary IS 'Phase 5L — per-counselor wallet ROI for analytics';
