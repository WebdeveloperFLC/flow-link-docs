-- Phase 5C — Performance Hub queues: unclassified payments, discount approvals, promotion requests

-- ── Discount approval requests (depth matrix §6.5) ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.discount_approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_key text NOT NULL,
  counselor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  offer_id uuid REFERENCES public.offers(id) ON DELETE SET NULL,
  wallet_id uuid REFERENCES public.discount_wallets(id) ON DELETE SET NULL,
  discount_amount numeric NOT NULL CHECK (discount_amount > 0),
  discount_percent numeric,
  wallet_debit numeric NOT NULL DEFAULT 0,
  approval_level text NOT NULL CHECK (approval_level IN ('instant', 'manager', 'admin')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'declined', 'applied', 'cancelled')),
  request_note text,
  review_note text,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  allocation_id uuid REFERENCES public.wallet_allocations(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT discount_approval_target_chk CHECK (
    (client_id IS NOT NULL AND lead_id IS NULL) OR (client_id IS NULL AND lead_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_discount_approval_pending
  ON public.discount_approval_requests (status, approval_level, period_key)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_discount_approval_counselor
  ON public.discount_approval_requests (counselor_id, period_key);

-- ── Promotion requests (field → MarCom) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.promotion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  requested_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  offer_category text,
  target_audience text,
  funding_source text NOT NULL DEFAULT 'future_link',
  proposed_discount_text text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_review', 'approved', 'published', 'declined')),
  sla_at timestamptz NOT NULL DEFAULT (now() + interval '48 hours'),
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  published_offer_id uuid REFERENCES public.offers(id) ON DELETE SET NULL,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promotion_requests_status
  ON public.promotion_requests (status, sla_at);

ALTER TABLE public.discount_approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_requests ENABLE ROW LEVEL SECURITY;

-- ── Helpers ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_discount_approval_level(_percent numeric, _amount numeric)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN COALESCE(_percent, 0) <= 10 AND COALESCE(_amount, 0) <= 5000 THEN 'instant'
    WHEN COALESCE(_percent, 0) <= 20 THEN 'manager'
    ELSE 'admin'
  END;
$$;

CREATE OR REPLACE FUNCTION public.fn_can_review_discount_level(_level text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE _level
    WHEN 'manager' THEN
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'administrator'::public.app_role)
      OR public.has_role(auth.uid(), 'manager'::public.app_role)
    WHEN 'admin' THEN
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'administrator'::public.app_role)
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION public.fn_unclassified_payment_count(_period_key text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer
    FROM public.incentive_qualifying_events qe
   WHERE qe.period_key = _period_key
     AND qe.source_table = 'client_invoice_payments'
     AND nullif(qe.dimensions->>'master_key', '') IS NULL
     AND nullif(qe.dimensions->>'service_code', '') IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.fn_unclassified_payments_for_period(_period_key text)
RETURNS TABLE (
  payment_id uuid,
  client_id uuid,
  client_name text,
  counselor_id uuid,
  counselor_name text,
  amount numeric,
  currency text,
  paid_at timestamptz,
  invoice_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id AS payment_id,
    p.client_id,
    c.full_name AS client_name,
    qe.counselor_id,
    pr.full_name AS counselor_name,
    coalesce(p.amount_in_inr, p.amount, 0) AS amount,
    coalesce(p.currency, 'INR') AS currency,
    coalesce(p.paid_at, p.verified_at, p.created_at) AS paid_at,
    p.invoice_id
  FROM public.incentive_qualifying_events qe
  JOIN public.client_invoice_payments p
    ON p.id = qe.source_id AND qe.source_table = 'client_invoice_payments'
  JOIN public.clients c ON c.id = p.client_id
  LEFT JOIN public.profiles pr ON pr.id = qe.counselor_id
  WHERE qe.period_key = _period_key
    AND p.archived_at IS NULL
    AND p.is_refund IS DISTINCT FROM true
    AND nullif(qe.dimensions->>'master_key', '') IS NULL
    AND nullif(qe.dimensions->>'service_code', '') IS NULL
  ORDER BY coalesce(p.paid_at, p.created_at) DESC;
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

CREATE OR REPLACE FUNCTION public.fn_submit_discount_request(
  _offer_id uuid DEFAULT NULL,
  _client_id uuid DEFAULT NULL,
  _lead_id uuid DEFAULT NULL,
  _amount numeric DEFAULT NULL,
  _percent numeric DEFAULT NULL,
  _wallet_id uuid DEFAULT NULL,
  _note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_period text := to_char(current_date, 'YYYY-MM');
  v_level text;
  v_debit numeric;
  v_result jsonb;
  v_req_id uuid;
  w public.discount_wallets%ROWTYPE;
  o public.offers%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  IF COALESCE(_amount, 0) <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;

  v_level := public.fn_discount_approval_level(_percent, _amount);

  -- Estimate wallet debit for queue display
  v_debit := _amount;
  IF _offer_id IS NOT NULL THEN
    SELECT * INTO o FROM public.offers WHERE id = _offer_id;
    IF FOUND THEN
      v_debit := CASE o.funding_source
        WHEN 'university' THEN 0
        WHEN 'joint' THEN round(_amount * coalesce(o.fl_contribution_pct, 50) / 100, 2)
        ELSE _amount
      END;
    END IF;
  END IF;

  IF v_level = 'instant' OR public.fn_can_review_discount_level(v_level) THEN
    v_result := public.fn_apply_offer_discount(
      _offer_id, _client_id, _lead_id, _amount, _percent, _wallet_id
    );
    IF coalesce((v_result->>'ok')::boolean, false) THEN
      RETURN v_result || jsonb_build_object('approval_level', v_level, 'auto_applied', true);
    END IF;
    RETURN v_result;
  END IF;

  IF _wallet_id IS NOT NULL THEN
    SELECT * INTO w FROM public.discount_wallets WHERE id = _wallet_id AND counselor_id = v_uid;
  ELSE
    w := public.fn_pick_discount_wallet(v_uid, v_period, _client_id, _lead_id, NULL, v_debit);
  END IF;

  INSERT INTO public.discount_approval_requests (
    period_key, counselor_id, client_id, lead_id, offer_id, wallet_id,
    discount_amount, discount_percent, wallet_debit, approval_level, status, request_note
  ) VALUES (
    v_period, v_uid, _client_id, _lead_id, _offer_id, w.id,
    _amount, _percent, v_debit, v_level, 'pending', _note
  )
  RETURNING id INTO v_req_id;

  RETURN jsonb_build_object(
    'ok', true,
    'pending_approval', true,
    'request_id', v_req_id,
    'approval_level', v_level,
    'message', format('Submitted for %s approval', v_level)
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

  RETURN v_result || jsonb_build_object('request_id', _request_id, 'status', 'applied');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_suggest_offer_for_client(_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_offer record;
  v_unlocked numeric := 0;
  v_potential numeric := 0;
  v_reason text;
  v_has_payment boolean;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('found', false); END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.client_invoice_payments p
    WHERE p.client_id = _client_id
      AND p.archived_at IS NULL
      AND p.is_refund IS DISTINCT FROM true
      AND (p.payment_status = 'verified' OR p.payment_proof_status = 'verified')
  ) INTO v_has_payment;

  SELECT coalesce(w.unlocked_amount, 0), coalesce(w.potential_wallet, 0)
    INTO v_unlocked, v_potential
    FROM public.discount_wallets w
   WHERE w.counselor_id = v_uid
     AND w.period_key = to_char(current_date, 'YYYY-MM')
     AND w.budget_kind = 'month_to_month'
   ORDER BY w.updated_at DESC
   LIMIT 1;

  SELECT o.id, o.title, o.discount_type, o.discount_value, o.funding_source
    INTO v_offer
    FROM public.offers_eligible_for_client(_client_id) o
   WHERE o.status IN ('active', 'expiring_soon')
   ORDER BY
     CASE WHEN NOT v_has_payment AND o.title ILIKE '%enrol%' THEN 0 ELSE 1 END,
     o.discount_value DESC NULLS LAST
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  v_reason := CASE
    WHEN NOT v_has_payment THEN 'No verified payment yet — enrolment-style offer may help conversion'
    ELSE 'Eligible active offer from library'
  END;

  RETURN jsonb_build_object(
    'found', true,
    'offer_id', v_offer.id,
    'title', v_offer.title,
    'discount_type', v_offer.discount_type,
    'discount_value', v_offer.discount_value,
    'funding_source', v_offer.funding_source,
    'reason', v_reason,
    'wallet_unlocked', v_unlocked,
    'wallet_potential', v_potential
  );
END;
$$;

-- ── RLS ───────────────────────────────────────────────────────────────────────
DO $pol$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'discount_approval_select' AND tablename = 'discount_approval_requests') THEN
    CREATE POLICY discount_approval_select ON public.discount_approval_requests FOR SELECT TO authenticated
      USING (
        counselor_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'discount_approval_insert' AND tablename = 'discount_approval_requests') THEN
    CREATE POLICY discount_approval_insert ON public.discount_approval_requests FOR INSERT TO authenticated
      WITH CHECK (counselor_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'discount_approval_update' AND tablename = 'discount_approval_requests') THEN
    CREATE POLICY discount_approval_update ON public.discount_approval_requests FOR UPDATE TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'promotion_requests_select' AND tablename = 'promotion_requests') THEN
    CREATE POLICY promotion_requests_select ON public.promotion_requests FOR SELECT TO authenticated
      USING (
        requested_by = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
        OR public.user_has_module(auth.uid(), 'offers', 'view')
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'promotion_requests_insert' AND tablename = 'promotion_requests') THEN
    CREATE POLICY promotion_requests_insert ON public.promotion_requests FOR INSERT TO authenticated
      WITH CHECK (requested_by = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'promotion_requests_update' AND tablename = 'promotion_requests') THEN
    CREATE POLICY promotion_requests_update ON public.promotion_requests FOR UPDATE TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
        OR public.user_has_module(auth.uid(), 'offers', 'edit')
      );
  END IF;
END
$pol$;

GRANT SELECT, INSERT, UPDATE ON public.discount_approval_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.promotion_requests TO authenticated;

GRANT EXECUTE ON FUNCTION public.fn_discount_approval_level(numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_can_review_discount_level(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_unclassified_payment_count(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_unclassified_payments_for_period(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_classify_payment_service(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_submit_discount_request(uuid, uuid, uuid, numeric, numeric, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_review_discount_request(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_suggest_offer_for_client(uuid) TO authenticated;

COMMENT ON TABLE public.discount_approval_requests IS 'Phase 5C — depth-matrix discount approval queue';
COMMENT ON TABLE public.promotion_requests IS 'Phase 5C — field promotion requests to MarCom';
