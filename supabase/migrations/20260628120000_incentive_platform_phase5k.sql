-- Phase 5K — Wallet policy admin + wallet exception requests (W7)

CREATE TABLE IF NOT EXISTS public.wallet_exception_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_key text NOT NULL,
  counselor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  wallet_id uuid NOT NULL REFERENCES public.discount_wallets(id) ON DELETE CASCADE,
  requested_amount numeric NOT NULL CHECK (requested_amount > 0),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  review_note text,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  topup_id uuid REFERENCES public.wallet_topups(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_exception_pending
  ON public.wallet_exception_requests (status, period_key)
  WHERE status = 'pending';

ALTER TABLE public.wallet_exception_requests ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.fn_can_review_wallet_exception(
  _reviewer_id uuid,
  _counselor_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _reviewer_id IS NOT NULL AND (
    public.has_role(_reviewer_id, 'admin'::public.app_role)
    OR public.has_role(_reviewer_id, 'administrator'::public.app_role)
    OR (
      public.has_role(_reviewer_id, 'manager'::public.app_role)
      AND EXISTS (
        SELECT 1
          FROM public.profiles rev
          JOIN public.profiles c ON c.id = _counselor_id
         WHERE rev.id = _reviewer_id
           AND rev.branch_id IS NOT NULL
           AND rev.branch_id = c.branch_id
      )
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.fn_can_review_wallet_exception(uuid, uuid) TO authenticated;

DO $pol$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'wallet_exception_select' AND tablename = 'wallet_exception_requests'
  ) THEN
    CREATE POLICY wallet_exception_select ON public.wallet_exception_requests FOR SELECT TO authenticated
      USING (
        counselor_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'wallet_exception_insert' AND tablename = 'wallet_exception_requests'
  ) THEN
    CREATE POLICY wallet_exception_insert ON public.wallet_exception_requests FOR INSERT TO authenticated
      WITH CHECK (counselor_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'wallet_exception_update' AND tablename = 'wallet_exception_requests'
  ) THEN
    CREATE POLICY wallet_exception_update ON public.wallet_exception_requests FOR UPDATE TO authenticated
      USING (public.fn_can_review_wallet_exception(auth.uid(), counselor_id))
      WITH CHECK (public.fn_can_review_wallet_exception(auth.uid(), counselor_id));
  END IF;
END
$pol$;

GRANT SELECT, INSERT, UPDATE ON public.wallet_exception_requests TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_submit_wallet_exception_request(
  _amount numeric,
  _reason text,
  _period_key text DEFAULT to_char(now(), 'YYYY-MM'),
  _wallet_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  w public.discount_wallets%ROWTYPE;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  IF coalesce(_amount, 0) <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;
  IF trim(coalesce(_reason, '')) = '' THEN RAISE EXCEPTION 'reason required'; END IF;

  IF _wallet_id IS NOT NULL THEN
    SELECT * INTO w FROM public.discount_wallets WHERE id = _wallet_id AND counselor_id = v_uid;
  ELSE
    SELECT * INTO w
      FROM public.discount_wallets
     WHERE counselor_id = v_uid
       AND period_key = _period_key
       AND budget_kind = 'month_to_month'
     ORDER BY created_at DESC
     LIMIT 1;
  END IF;

  IF NOT FOUND THEN RAISE EXCEPTION 'no wallet found for this period'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.wallet_exception_requests r
     WHERE r.wallet_id = w.id AND r.status = 'pending'
  ) THEN
    RAISE EXCEPTION 'a pending exception request already exists for this wallet';
  END IF;

  INSERT INTO public.wallet_exception_requests (
    period_key, counselor_id, wallet_id, requested_amount, reason
  ) VALUES (
    _period_key, v_uid, w.id, _amount, trim(_reason)
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'ok', true,
    'request_id', v_id,
    'message', 'Submitted to manager for wallet exception approval'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_review_wallet_exception_request(
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
  v_uid uuid := auth.uid();
  r public.wallet_exception_requests%ROWTYPE;
  v_topup_id uuid;
BEGIN
  SELECT * INTO r FROM public.wallet_exception_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'request not found'; END IF;
  IF r.status <> 'pending' THEN RAISE EXCEPTION 'request is not pending'; END IF;

  IF NOT public.fn_can_review_wallet_exception(v_uid, r.counselor_id) THEN
    RAISE EXCEPTION 'not authorized to review this request';
  END IF;

  IF lower(trim(_action)) IN ('decline', 'declined', 'reject', 'rejected') THEN
    UPDATE public.wallet_exception_requests
       SET status = 'declined',
           review_note = _note,
           reviewed_by = v_uid,
           reviewed_at = now()
     WHERE id = _request_id;
    RETURN jsonb_build_object('ok', true, 'status', 'declined');
  END IF;

  IF lower(trim(_action)) NOT IN ('approve', 'approved') THEN
    RAISE EXCEPTION 'action must be approve or decline';
  END IF;

  INSERT INTO public.wallet_topups (wallet_id, amount, currency, topup_type, reason, created_by)
  SELECT w.id, r.requested_amount, w.currency, 'exception',
         coalesce(_note, r.reason), v_uid
    FROM public.discount_wallets w
   WHERE w.id = r.wallet_id
  RETURNING id INTO v_topup_id;

  PERFORM public.fn_sync_wallet_metrics(r.wallet_id);

  UPDATE public.wallet_exception_requests
     SET status = 'approved',
         review_note = _note,
         reviewed_by = v_uid,
         reviewed_at = now(),
         topup_id = v_topup_id
   WHERE id = _request_id;

  RETURN jsonb_build_object(
    'ok', true,
    'status', 'approved',
    'topup_id', v_topup_id,
    'amount', r.requested_amount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_submit_wallet_exception_request(numeric, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_review_wallet_exception_request(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_wallet_exception_pending_count(_period_key text DEFAULT to_char(now(), 'YYYY-MM'))
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::int
    FROM public.wallet_exception_requests r
   WHERE r.status = 'pending'
     AND r.period_key = _period_key;
$$;

GRANT EXECUTE ON FUNCTION public.fn_wallet_exception_pending_count(text) TO authenticated;

COMMENT ON TABLE public.wallet_exception_requests IS 'Phase 5K W7 — counselor wallet top-up exception queue';
COMMENT ON FUNCTION public.fn_submit_wallet_exception_request IS 'Counselor submits extra wallet budget request';
COMMENT ON FUNCTION public.fn_review_wallet_exception_request IS 'Manager/admin approves → exception top-up';
