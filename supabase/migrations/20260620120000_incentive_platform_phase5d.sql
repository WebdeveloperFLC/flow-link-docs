-- Phase 5D — Telecaller home (lead_converted events), suggestion send, promotion publish

-- ── Client conversion attribution ─────────────────────────────────────────────
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS converted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clients_converted_by
  ON public.clients (converted_by, converted_at)
  WHERE converted_by IS NOT NULL;

-- Extend milestone enum constraint for telecaller count plans
ALTER TABLE public.incentive_rules DROP CONSTRAINT IF EXISTS incentive_rules_milestone_check;
ALTER TABLE public.incentive_rules
  ADD CONSTRAINT incentive_rules_milestone_check CHECK (
    milestone IS NULL
    OR milestone IN (
      'first_payment',
      'commission_paid',
      'visa_lodged',
      'offer_received',
      'lead_converted'
    )
  );

CREATE OR REPLACE FUNCTION public.fn_set_client_converted_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tc uuid;
BEGIN
  IF NEW.converted_by IS NOT NULL OR NEW.source_lead_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT ta.user_id INTO v_tc
    FROM public.call_queue_items cqi
    JOIN public.telephony_agents ta ON ta.id = cqi.assigned_agent_id
   WHERE cqi.client_id = NEW.id
   ORDER BY cqi.updated_at DESC NULLS LAST
   LIMIT 1;

  IF v_tc IS NULL THEN
    SELECT l.created_by INTO v_tc
      FROM public.leads l
     WHERE l.id = NEW.source_lead_id
       AND EXISTS (
         SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = l.created_by
            AND ur.role = 'telecaller'::public.app_role
       );
  END IF;

  IF v_tc IS NOT NULL THEN
    UPDATE public.clients SET converted_by = v_tc WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_incentive_record_lead_converted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period text;
  v_branch uuid;
BEGIN
  IF NEW.converted_by IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.converted_by IS NOT DISTINCT FROM NEW.converted_by THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.incentive_qualifying_events qe
     WHERE qe.source_table = 'clients'
       AND qe.source_id = NEW.id
       AND qe.event_type = 'lead_converted'
  ) THEN
    RETURN NEW;
  END IF;

  v_period := to_char(coalesce(NEW.converted_at, NEW.created_at, now()), 'YYYY-MM');
  SELECT branch_id INTO v_branch FROM public.profiles WHERE id = NEW.converted_by;

  INSERT INTO public.incentive_qualifying_events (
    event_type, event_date, period_key, counselor_id, client_id, branch_id,
    amount, currency, source_type, dimensions, source_table, source_id
  ) VALUES (
    'lead_converted',
    (coalesce(NEW.converted_at, NEW.created_at, now()) AT TIME ZONE 'UTC')::date,
    v_period,
    NEW.converted_by,
    NEW.id,
    v_branch,
    1,
    'INR',
    NULL,
    jsonb_build_object(
      'attribution', 'converted_by',
      'source_lead_id', NEW.source_lead_id,
      'count', 1
    ),
    'clients',
    NEW.id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_client_converted_by ON public.clients;
CREATE TRIGGER trg_set_client_converted_by
  AFTER INSERT ON public.clients
  FOR EACH ROW
  WHEN (NEW.source_lead_id IS NOT NULL)
  EXECUTE FUNCTION public.fn_set_client_converted_by();

DROP TRIGGER IF EXISTS trg_incentive_record_lead_converted ON public.clients;
CREATE TRIGGER trg_incentive_record_lead_converted
  AFTER INSERT OR UPDATE OF converted_by ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_incentive_record_lead_converted();

-- Backfill converted_by for recent lead-linked clients (best-effort)
UPDATE public.clients c
   SET converted_by = sub.user_id
  FROM (
    SELECT DISTINCT ON (cqi.client_id) cqi.client_id, ta.user_id
      FROM public.call_queue_items cqi
      JOIN public.telephony_agents ta ON ta.id = cqi.assigned_agent_id
     WHERE cqi.client_id IS NOT NULL
     ORDER BY cqi.client_id, cqi.updated_at DESC NULLS LAST
  ) sub
 WHERE c.id = sub.client_id
   AND c.source_lead_id IS NOT NULL
   AND c.converted_by IS NULL;

-- ── Telecaller home aggregates ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_telecaller_period_home(
  _period_key text DEFAULT to_char(current_date, 'YYYY-MM'),
  _user_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := coalesce(_user_id, auth.uid());
  v_conversions int := 0;
  v_target numeric := 0;
  v_per_conv numeric := 0;
  v_assigned int := 0;
  v_locked numeric := 0;
  v_has_locked boolean := false;
  v_rate numeric := 0;
  v_events jsonb := '[]'::jsonb;
  v_period_start date := (_period_key || '-01')::date;
  v_period_end date := (date_trunc('month', v_period_start) + interval '1 month - 1 day')::date;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'authentication required');
  END IF;

  SELECT count(*)::int INTO v_conversions
    FROM public.incentive_qualifying_events qe
   WHERE qe.counselor_id = v_uid
     AND qe.period_key = _period_key
     AND qe.event_type = 'lead_converted';

  SELECT coalesce(t.target_value, 0) INTO v_target
    FROM public.incentive_targets t
   WHERE t.counselor_id = v_uid
     AND t.period_key = _period_key
   ORDER BY t.created_at DESC
   LIMIT 1;

  SELECT coalesce(r.rate_value, 0) INTO v_per_conv
    FROM public.incentive_rules r
    JOIN public.incentive_plans p ON p.id = r.plan_id
   WHERE r.is_active
     AND r.milestone = 'lead_converted'
     AND r.rate_type = 'per_unit'::public.incentive_rate_type
     AND p.is_active
     AND (p.role_key IS NULL OR p.role_key = 'telecaller')
     AND p.active_from <= v_period_end
     AND (p.active_to IS NULL OR p.active_to >= v_period_start)
   ORDER BY r.sort_order
   LIMIT 1;

  IF v_per_conv <= 0 THEN
    v_per_conv := 300;
  END IF;

  SELECT count(DISTINCT cqi.client_id)::int INTO v_assigned
    FROM public.call_queue_items cqi
    JOIN public.telephony_agents ta ON ta.id = cqi.assigned_agent_id
   WHERE ta.user_id = v_uid
     AND cqi.created_at >= v_period_start
     AND cqi.created_at < (v_period_end + 1);

  SELECT coalesce(sum(li.earned_amount), 0),
         bool_or(ir.locked)
    INTO v_locked, v_has_locked
    FROM public.incentive_line_items li
    JOIN public.incentive_runs ir ON ir.id = li.run_id
   WHERE li.counselor_id = v_uid
     AND ir.period_key = _period_key;

  SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.event_date DESC), '[]'::jsonb)
    INTO v_events
    FROM (
      SELECT
        qe.event_date,
        qe.created_at,
        c.full_name AS client_name,
        c.id AS client_id,
        coalesce(qe.dimensions->>'status', 'counted') AS status_label
      FROM public.incentive_qualifying_events qe
      LEFT JOIN public.clients c ON c.id = qe.client_id
     WHERE qe.counselor_id = v_uid
       AND qe.period_key = _period_key
       AND qe.event_type = 'lead_converted'
     ORDER BY qe.event_date DESC, qe.created_at DESC
     LIMIT 8
    ) x;

  IF v_assigned > 0 THEN
    v_rate := round((v_conversions::numeric / v_assigned) * 100, 1);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'period_key', _period_key,
    'conversions', v_conversions,
    'target', v_target,
    'per_conversion', v_per_conv,
    'projected_cash', v_conversions * v_per_conv,
    'locked_cash', v_locked,
    'has_locked_run', v_has_locked,
    'conversion_rate', v_rate,
    'assigned_leads', v_assigned,
    'recent_events', v_events
  );
END;
$$;

-- ── Offer suggestion send (WhatsApp channel log) ──────────────────────────────
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
  IF _event_type NOT IN ('viewed', 'claimed', 'redeemed', 'delivered', 'sent') THEN
    RAISE EXCEPTION 'Invalid offer event_type: %', _event_type;
  END IF;

  IF NOT (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'administrator'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
    OR public.has_role(auth.uid(), 'counselor'::public.app_role)
    OR public.has_role(auth.uid(), 'telecaller'::public.app_role)
    OR (_client_id IS NOT NULL AND public.can_view_client(auth.uid(), _client_id))
    OR (_client_id IS NOT NULL AND public.is_portal_user_for(auth.uid(), _client_id))
  ) THEN
    RAISE EXCEPTION 'Not authorized to log offer event';
  END IF;

  INSERT INTO public.offer_events (
    offer_id, client_id, counselor_id, event_type, channel, revenue_amount, tracking_code
  ) VALUES (
    _offer_id,
    _client_id,
    coalesce(_counselor_id, auth.uid()),
    _event_type,
    _channel,
    coalesce(_revenue_amount, 0),
    _tracking_code
  )
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

-- ── Publish promotion request → draft offer ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_publish_promotion_from_request(_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.promotion_requests%ROWTYPE;
  v_offer_id uuid;
  v_discount numeric := 10;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'administrator'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
    OR public.user_has_module(auth.uid(), 'offers', 'edit')
  ) THEN
    RAISE EXCEPTION 'not authorized to publish promotions';
  END IF;

  SELECT * INTO r FROM public.promotion_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'request not found'; END IF;
  IF r.status IN ('published', 'declined') THEN
    RAISE EXCEPTION 'request cannot be published from status %', r.status;
  END IF;

  IF r.proposed_discount_text ~* '(\d+)\s*%' THEN
    v_discount := (regexp_match(r.proposed_discount_text, '(\d+)\s*%', 'i'))[1]::numeric;
  END IF;

  INSERT INTO public.offers (
    title,
    description,
    discount_type,
    discount_value,
    status,
    funding_source,
    audience,
    created_by
  ) VALUES (
    r.title,
    coalesce(r.description, r.proposed_discount_text),
    'percentage',
    v_discount,
    'draft'::public.offer_status,
    coalesce(r.funding_source, 'future_link')::public.offer_funding_source,
    'global',
    auth.uid()
  )
  RETURNING id INTO v_offer_id;

  UPDATE public.promotion_requests
     SET status = 'published',
         published_offer_id = v_offer_id,
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         updated_at = now()
   WHERE id = _request_id;

  RETURN jsonb_build_object(
    'ok', true,
    'offer_id', v_offer_id,
    'status', 'published'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_telecaller_period_home(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_publish_promotion_from_request(uuid) TO authenticated;

COMMENT ON FUNCTION public.fn_telecaller_period_home IS 'Phase 5D — telecaller performance home metrics';
COMMENT ON FUNCTION public.fn_publish_promotion_from_request IS 'Phase 5D — create draft offer from approved promotion request';
