-- Phase 5S — O16 floor price protection (margin floor + waiver guard)

-- ── Global margin floor policy ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.discount_margin_floor_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_key text NOT NULL DEFAULT 'global' UNIQUE,
  min_net_pct numeric NOT NULL DEFAULT 80 CHECK (min_net_pct > 0 AND min_net_pct <= 100),
  block_counselor_waiver boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.discount_margin_floor_policies (scope_key, min_net_pct, block_counselor_waiver)
VALUES ('global', 80, true)
ON CONFLICT (scope_key) DO NOTHING;

ALTER TABLE public.discount_margin_floor_policies ENABLE ROW LEVEL SECURITY;

DO $policy$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'discount_margin_floor_policies_read' AND tablename = 'discount_margin_floor_policies'
  ) THEN
    CREATE POLICY discount_margin_floor_policies_read ON public.discount_margin_floor_policies
      FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'discount_margin_floor_policies_admin' AND tablename = 'discount_margin_floor_policies'
  ) THEN
    CREATE POLICY discount_margin_floor_policies_admin ON public.discount_margin_floor_policies
      FOR ALL TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
      )
      WITH CHECK (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
      );
  END IF;
END;
$policy$;

GRANT SELECT ON public.discount_margin_floor_policies TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.discount_margin_floor_policies TO authenticated;

-- ── Approval request audit columns ────────────────────────────────────────────
ALTER TABLE public.discount_approval_requests
  ADD COLUMN IF NOT EXISTS reference_amount numeric,
  ADD COLUMN IF NOT EXISTS net_after_discount numeric,
  ADD COLUMN IF NOT EXISTS below_floor boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_waiver boolean NOT NULL DEFAULT false;

-- ── Helpers ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_get_discount_margin_floor_policy()
RETURNS public.discount_margin_floor_policies
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
    FROM public.discount_margin_floor_policies
   WHERE scope_key = 'global'
     AND is_active
   ORDER BY updated_at DESC
   LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.fn_set_discount_margin_floor_policy(
  _min_net_pct numeric,
  _block_counselor_waiver boolean DEFAULT true
)
RETURNS public.discount_margin_floor_policies
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.discount_margin_floor_policies%ROWTYPE;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'administrator'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  IF _min_net_pct <= 0 OR _min_net_pct > 100 THEN
    RAISE EXCEPTION 'min_net_pct must be between 0 and 100 exclusive';
  END IF;

  UPDATE public.discount_margin_floor_policies
     SET min_net_pct = _min_net_pct,
         block_counselor_waiver = coalesce(_block_counselor_waiver, true),
         updated_by = auth.uid(),
         updated_at = now()
   WHERE scope_key = 'global'
   RETURNING * INTO v_row;

  IF NOT FOUND THEN
    INSERT INTO public.discount_margin_floor_policies (
      scope_key, min_net_pct, block_counselor_waiver, updated_by
    ) VALUES (
      'global', _min_net_pct, coalesce(_block_counselor_waiver, true), auth.uid()
    )
    RETURNING * INTO v_row;
  END IF;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_evaluate_discount_margin(
  _reference_amount numeric,
  _discount_amount numeric,
  _discount_percent numeric DEFAULT NULL,
  _offer_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_policy public.discount_margin_floor_policies%ROWTYPE;
  v_offer public.offers%ROWTYPE;
  v_ref numeric := coalesce(_reference_amount, 0);
  v_discount numeric := greatest(coalesce(_discount_amount, 0), 0);
  v_net numeric;
  v_min_net numeric;
  v_below boolean := false;
  v_waiver boolean := false;
  v_level text;
BEGIN
  SELECT * INTO v_policy FROM public.fn_get_discount_margin_floor_policy();
  IF NOT FOUND THEN
    v_policy.min_net_pct := 80;
    v_policy.block_counselor_waiver := true;
  END IF;

  IF _offer_id IS NOT NULL THEN
    SELECT * INTO v_offer FROM public.offers WHERE id = _offer_id;
  END IF;

  IF v_ref > 0 AND coalesce(_discount_percent, 0) > 0 AND v_discount = 0 THEN
    v_discount := round(v_ref * _discount_percent / 100, 2);
  END IF;

  IF v_ref > 0 THEN
    v_net := greatest(v_ref - v_discount, 0);
    v_min_net := round(v_ref * v_policy.min_net_pct / 100, 2);
    v_below := v_net < v_min_net;
    v_waiver := v_discount >= v_ref;
  END IF;

  IF v_offer.id IS NOT NULL AND lower(coalesce(v_offer.offer_category, '')) IN ('scholarship', 'waiver', 'full_waiver') THEN
    v_waiver := true;
  END IF;

  v_level := public.fn_discount_approval_level(_discount_percent, v_discount, v_below, v_waiver);

  RETURN jsonb_build_object(
    'reference_amount', v_ref,
    'discount_amount', v_discount,
    'net_after_discount', CASE WHEN v_ref > 0 THEN v_net ELSE NULL END,
    'min_net_required', CASE WHEN v_ref > 0 THEN v_min_net ELSE NULL END,
    'min_net_pct', v_policy.min_net_pct,
    'below_floor', v_below,
    'is_waiver', v_waiver,
    'approval_level', v_level,
    'max_discount_without_floor', CASE
      WHEN v_ref > 0 THEN greatest(v_ref - v_min_net, 0)
      ELSE NULL
    END
  );
END;
$$;

DROP FUNCTION IF EXISTS public.fn_discount_approval_level(numeric, numeric);

CREATE OR REPLACE FUNCTION public.fn_discount_approval_level(
  _percent numeric,
  _amount numeric,
  _below_floor boolean DEFAULT false,
  _is_waiver boolean DEFAULT false
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN coalesce(_is_waiver, false) THEN 'admin'
    WHEN coalesce(_below_floor, false) THEN 'admin'
    WHEN coalesce(_percent, 0) <= 10 AND coalesce(_amount, 0) <= 5000 THEN 'instant'
    WHEN coalesce(_percent, 0) <= 20 THEN 'manager'
    ELSE 'admin'
  END;
$$;

DROP FUNCTION IF EXISTS public.fn_submit_discount_request(uuid, uuid, uuid, numeric, numeric, uuid, text);

CREATE OR REPLACE FUNCTION public.fn_submit_discount_request(
  _offer_id uuid DEFAULT NULL,
  _client_id uuid DEFAULT NULL,
  _lead_id uuid DEFAULT NULL,
  _amount numeric DEFAULT NULL,
  _percent numeric DEFAULT NULL,
  _wallet_id uuid DEFAULT NULL,
  _note text DEFAULT NULL,
  _reference_amount numeric DEFAULT NULL
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
  v_margin jsonb;
  v_below boolean := false;
  v_waiver boolean := false;
  v_ref numeric;
  v_net numeric;
  w public.discount_wallets%ROWTYPE;
  o public.offers%ROWTYPE;
  v_policy public.discount_margin_floor_policies%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  IF coalesce(_amount, 0) <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;

  SELECT * INTO v_policy FROM public.fn_get_discount_margin_floor_policy();
  v_margin := public.fn_evaluate_discount_margin(_reference_amount, _amount, _percent, _offer_id);
  v_below := coalesce((v_margin->>'below_floor')::boolean, false);
  v_waiver := coalesce((v_margin->>'is_waiver')::boolean, false);
  v_ref := nullif(v_margin->>'reference_amount', '')::numeric;
  v_net := nullif(v_margin->>'net_after_discount', '')::numeric;

  IF coalesce(v_policy.block_counselor_waiver, true)
     AND v_waiver
     AND NOT (
       public.has_role(v_uid, 'admin'::public.app_role)
       OR public.has_role(v_uid, 'administrator'::public.app_role)
     ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'Scholarship or full waiver requires admin approval — contact your branch admin'
    );
  END IF;

  v_level := v_margin->>'approval_level';

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
      RETURN v_result || jsonb_build_object(
        'approval_level', v_level,
        'auto_applied', true,
        'below_floor', v_below,
        'is_waiver', v_waiver
      );
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
    discount_amount, discount_percent, wallet_debit, approval_level, status, request_note,
    reference_amount, net_after_discount, below_floor, is_waiver
  ) VALUES (
    v_period, v_uid, _client_id, _lead_id, _offer_id, w.id,
    _amount, _percent, v_debit, v_level, 'pending', _note,
    v_ref, v_net, v_below, v_waiver
  )
  RETURNING id INTO v_req_id;

  RETURN jsonb_build_object(
    'ok', true,
    'pending_approval', true,
    'request_id', v_req_id,
    'approval_level', v_level,
    'below_floor', v_below,
    'is_waiver', v_waiver,
    'message', format(
      'Submitted for %s approval%s',
      v_level,
      CASE WHEN v_below THEN ' (below margin floor)' WHEN v_waiver THEN ' (waiver)' ELSE '' END
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_get_discount_margin_floor_policy() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_set_discount_margin_floor_policy(numeric, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_evaluate_discount_margin(numeric, numeric, numeric, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_discount_approval_level(numeric, numeric, boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_submit_discount_request(uuid, uuid, uuid, numeric, numeric, uuid, text, numeric) TO authenticated;

COMMENT ON TABLE public.discount_margin_floor_policies IS 'Phase 5S O16 — org-wide minimum net price after discount (margin floor)';
COMMENT ON FUNCTION public.fn_evaluate_discount_margin(numeric, numeric, numeric, uuid) IS
  'O16 preview: net after discount vs min_net_pct floor; flags waiver and approval level';
