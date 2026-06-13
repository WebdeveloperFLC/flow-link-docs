-- Phase 5U — O16b per-service margin floors + WIR lite on performance home

-- ── Service-scoped floor seeds (global from 5S remains fallback) ──────────────
INSERT INTO public.discount_margin_floor_policies (scope_key, min_net_pct, block_counselor_waiver)
VALUES
  ('coaching_services', 75, true),
  ('admission_services', 85, true),
  ('allied_services', 80, true),
  ('travel_financial', 82, true)
ON CONFLICT (scope_key) DO NOTHING;

-- ── Resolve floor: service override → global ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_resolve_discount_margin_floor(_master_key text DEFAULT NULL)
RETURNS public.discount_margin_floor_policies
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.*
    FROM public.discount_margin_floor_policies p
   WHERE p.is_active
     AND p.scope_key = nullif(trim(_master_key), '')
   ORDER BY p.updated_at DESC
   LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.fn_list_discount_margin_floor_policies()
RETURNS SETOF public.discount_margin_floor_policies
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
    FROM public.discount_margin_floor_policies
   WHERE is_active
   ORDER BY CASE scope_key WHEN 'global' THEN 0 ELSE 1 END, scope_key;
$$;

CREATE OR REPLACE FUNCTION public.fn_upsert_discount_margin_floor_policy(
  _scope_key text,
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
  v_key text := nullif(trim(_scope_key), '');
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'administrator'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  IF v_key IS NULL THEN
    RAISE EXCEPTION 'scope_key required';
  END IF;

  IF _min_net_pct <= 0 OR _min_net_pct > 100 THEN
    RAISE EXCEPTION 'min_net_pct must be between 0 and 100 exclusive';
  END IF;

  INSERT INTO public.discount_margin_floor_policies (
    scope_key, min_net_pct, block_counselor_waiver, updated_by
  ) VALUES (
    v_key, _min_net_pct, coalesce(_block_counselor_waiver, true), auth.uid()
  )
  ON CONFLICT (scope_key) DO UPDATE SET
    min_net_pct = EXCLUDED.min_net_pct,
    block_counselor_waiver = EXCLUDED.block_counselor_waiver,
    updated_by = EXCLUDED.updated_by,
    updated_at = now(),
    is_active = true
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- ── WIR lite: counselor wallet impact for performance home ────────────────────
CREATE OR REPLACE FUNCTION public.fn_counselor_wallet_impact(
  _period_key text,
  _counselor_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'found', s.counselor_id IS NOT NULL,
    'wallet_impact_revenue', coalesce(s.wallet_impact_revenue, 0),
    'wallet_used', coalesce(s.wallet_used, 0),
    'roi', CASE
      WHEN coalesce(s.wallet_used, 0) > 0
        THEN round(s.wallet_impact_revenue / s.wallet_used, 2)
      ELSE NULL
    END
  )
  FROM public.counselor_performance_scores s
  WHERE s.counselor_id = _counselor_id
    AND s.period_key = _period_key
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.fn_resolve_discount_margin_floor(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_list_discount_margin_floor_policies() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_upsert_discount_margin_floor_policy(text, numeric, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_counselor_wallet_impact(text, uuid) TO authenticated;

-- ── O16b: service-aware margin evaluation ─────────────────────────────────────
DROP FUNCTION IF EXISTS public.fn_evaluate_discount_margin(numeric, numeric, numeric, uuid);

CREATE OR REPLACE FUNCTION public.fn_evaluate_discount_margin(
  _reference_amount numeric,
  _discount_amount numeric,
  _discount_percent numeric DEFAULT NULL,
  _offer_id uuid DEFAULT NULL,
  _master_key text DEFAULT NULL
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
  v_scope text := nullif(trim(_master_key), '');
  v_ref numeric := coalesce(_reference_amount, 0);
  v_discount numeric := greatest(coalesce(_discount_amount, 0), 0);
  v_net numeric;
  v_min_net numeric;
  v_below boolean := false;
  v_waiver boolean := false;
  v_level text;
BEGIN
  IF _offer_id IS NOT NULL AND v_scope IS NULL THEN
    SELECT * INTO v_offer FROM public.offers WHERE id = _offer_id;
    IF FOUND AND v_offer.applicable_services IS NOT NULL AND cardinality(v_offer.applicable_services) > 0 THEN
      v_scope := v_offer.applicable_services[1];
    END IF;
  ELSIF _offer_id IS NOT NULL THEN
    SELECT * INTO v_offer FROM public.offers WHERE id = _offer_id;
  END IF;

  SELECT * INTO v_policy FROM public.fn_resolve_discount_margin_floor(v_scope);
  IF NOT FOUND THEN
    SELECT * INTO v_policy FROM public.fn_resolve_discount_margin_floor(NULL);
  END IF;
  IF NOT FOUND THEN
    v_policy.min_net_pct := 80;
    v_policy.scope_key := 'global';
    v_policy.block_counselor_waiver := true;
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
    'floor_scope_key', v_policy.scope_key,
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

DROP FUNCTION IF EXISTS public.fn_submit_discount_request(uuid, uuid, uuid, numeric, numeric, uuid, text, numeric);

CREATE OR REPLACE FUNCTION public.fn_submit_discount_request(
  _offer_id uuid DEFAULT NULL,
  _client_id uuid DEFAULT NULL,
  _lead_id uuid DEFAULT NULL,
  _amount numeric DEFAULT NULL,
  _percent numeric DEFAULT NULL,
  _wallet_id uuid DEFAULT NULL,
  _note text DEFAULT NULL,
  _reference_amount numeric DEFAULT NULL,
  _master_key text DEFAULT NULL
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

  SELECT * INTO v_policy FROM public.fn_resolve_discount_margin_floor(_master_key);
  IF NOT FOUND OR v_policy.scope_key IS NULL THEN
    SELECT * INTO v_policy FROM public.fn_resolve_discount_margin_floor(NULL);
  END IF;

  v_margin := public.fn_evaluate_discount_margin(_reference_amount, _amount, _percent, _offer_id, _master_key);
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
        'is_waiver', v_waiver,
        'floor_scope_key', v_margin->>'floor_scope_key'
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
    'floor_scope_key', v_margin->>'floor_scope_key',
    'message', format(
      'Submitted for %s approval%s',
      v_level,
      CASE WHEN v_below THEN ' (below margin floor)' WHEN v_waiver THEN ' (waiver)' ELSE '' END
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_evaluate_discount_margin(numeric, numeric, numeric, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_submit_discount_request(uuid, uuid, uuid, numeric, numeric, uuid, text, numeric, text) TO authenticated;

COMMENT ON FUNCTION public.fn_resolve_discount_margin_floor(text) IS
  'Phase 5U O16b — service-scoped margin floor with global fallback';
COMMENT ON FUNCTION public.fn_counselor_wallet_impact(text, uuid) IS
  'Phase 5U WIR lite — counselor wallet impact revenue + ROI for performance home';
