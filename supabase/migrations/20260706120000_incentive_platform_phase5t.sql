-- Phase 5T — I5 rule-based offer propensity + I8 realtime earning ticker

-- ── Realtime publication for incentive earnings ───────────────────────────────
DO $realtime$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'incentive_line_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.incentive_line_items;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'incentive_runs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.incentive_runs;
  END IF;
END;
$realtime$;

-- ── I5 lite: rule-based client propensity (not ML) ────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_client_offer_propensity(
  _client_id uuid,
  _counselor_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile jsonb;
  v_score int := 10;
  v_band text := 'cool';
  v_factors text[] := ARRAY[]::text[];
  v_days int;
  v_has_payment boolean;
  v_has_active_offer boolean;
  v_recent_sent boolean;
BEGIN
  IF _client_id IS NULL OR _counselor_id IS NULL THEN
    RETURN jsonb_build_object('score', 0, 'band', 'cool', 'factors', '[]'::jsonb);
  END IF;

  v_profile := public.fn_client_cross_sell_profile(_client_id);
  v_days := nullif(v_profile->>'last_activity_days', '')::int;

  SELECT EXISTS (
    SELECT 1 FROM public.client_invoice_payments p
     WHERE p.client_id = _client_id
       AND p.archived_at IS NULL
       AND p.is_refund IS DISTINCT FROM true
       AND (p.payment_status = 'verified' OR p.payment_proof_status = 'verified')
  ) INTO v_has_payment;

  IF v_has_payment THEN
    v_score := v_score + 22;
    v_factors := array_append(v_factors, 'Verified payment on file');
  END IF;

  IF v_days IS NULL THEN
    v_factors := array_append(v_factors, 'No recent activity logged');
  ELSIF v_days <= 7 THEN
    v_score := v_score + 20;
    v_factors := array_append(v_factors, 'Active in the last 7 days');
  ELSIF v_days <= 30 THEN
    v_score := v_score + 12;
    v_factors := array_append(v_factors, 'Touched within 30 days');
  ELSIF v_days <= 60 THEN
    v_score := v_score + 6;
    v_factors := array_append(v_factors, 'Some recent engagement');
  ELSE
    v_factors := array_append(v_factors, 'Stale — ' || v_days::text || ' days since last activity');
  END IF;

  IF (v_profile->>'lifecycle_stage') = 'coaching_only' THEN
    v_score := v_score + 18;
    v_factors := array_append(v_factors, 'Coaching-only — study abroad cross-sell opportunity');
  ELSIF (v_profile->>'lifecycle_stage') = 'study_abroad_active' AND NOT (v_profile->>'has_allied')::boolean THEN
    v_score := v_score + 12;
    v_factors := array_append(v_factors, 'Study abroad without allied add-ons');
  ELSIF NOT v_has_payment AND coalesce(v_days, 999) <= 14 THEN
    v_score := v_score + 14;
    v_factors := array_append(v_factors, 'Prospect with recent touch — enrolment push');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.client_offers co
     WHERE co.client_id = _client_id
       AND co.status = 'active'
  ) INTO v_has_active_offer;

  IF v_has_active_offer THEN
    v_score := v_score + 6;
    v_factors := array_append(v_factors, 'Active offer already attached');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.offer_events oe
     WHERE oe.client_id = _client_id
       AND oe.counselor_id = _counselor_id
       AND oe.event_type = 'sent'
       AND oe.created_at >= now() - interval '30 days'
       AND NOT EXISTS (
         SELECT 1 FROM public.offer_events r
          WHERE r.client_id = oe.client_id
            AND r.offer_id = oe.offer_id
            AND r.event_type IN ('redeemed', 'claimed')
            AND r.created_at >= oe.created_at
       )
  ) INTO v_recent_sent;

  IF v_recent_sent THEN
    v_score := v_score - 8;
    v_factors := array_append(v_factors, 'Offer sent recently without conversion');
  END IF;

  v_score := greatest(0, least(v_score, 100));
  v_band := CASE
    WHEN v_score >= 65 THEN 'hot'
    WHEN v_score >= 35 THEN 'warm'
    ELSE 'cool'
  END;

  RETURN jsonb_build_object(
    'score', v_score,
    'band', v_band,
    'factors', to_jsonb(v_factors)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_counselor_offer_propensity_queue(_limit int DEFAULT 8)
RETURNS TABLE (
  client_id uuid,
  full_name text,
  propensity_score int,
  propensity_band text,
  lifecycle_stage text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.full_name,
    (p->>'score')::int,
    p->>'band',
    cp.lifecycle_stage
  FROM public.clients c
  CROSS JOIN LATERAL (
    SELECT public.fn_client_offer_propensity(c.id, v_uid) AS p
  ) x
  LEFT JOIN LATERAL (
    SELECT (public.fn_client_cross_sell_profile(c.id)->>'lifecycle_stage') AS lifecycle_stage
  ) cp ON true
  WHERE coalesce(c.assigned_counselor_id, c.owner_id) = v_uid
    AND NOT EXISTS (
      SELECT 1 FROM public.client_offer_suggestion_dismissals d
       WHERE d.client_id = c.id
         AND d.counselor_id = v_uid
         AND (d.expires_at IS NULL OR d.expires_at > now())
    )
  ORDER BY (p->>'score')::int DESC NULLS LAST, c.full_name
  LIMIT greatest(coalesce(_limit, 8), 1);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_client_offer_propensity(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_counselor_offer_propensity_queue(int) TO authenticated;

-- ── O13 + I5: enrich suggestion payload with propensity ───────────────────────
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
  v_wallet_id uuid;
  v_unlocked numeric := 0;
  v_potential numeric := 0;
  v_spent numeric := 0;
  v_spendable numeric := 0;
  v_reason text;
  v_why_detail text;
  v_has_payment boolean;
  v_profile jsonb;
  v_propensity jsonb;
  v_scenario text := 'general';
  v_journey_id uuid;
  v_dismissed boolean := false;
  v_ab_exp record;
  v_ab_assign jsonb;
  v_ab_offer_id uuid;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('found', false); END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.client_offer_suggestion_dismissals d
     WHERE d.client_id = _client_id
       AND d.counselor_id = v_uid
       AND (d.expires_at IS NULL OR d.expires_at > now())
  ) INTO v_dismissed;

  IF v_dismissed THEN
    RETURN jsonb_build_object('found', false, 'dismissed', true, 'suggestion_level', 'L0');
  END IF;

  v_profile := public.fn_client_cross_sell_profile(_client_id);
  v_propensity := public.fn_client_offer_propensity(_client_id, v_uid);

  SELECT EXISTS (
    SELECT 1 FROM public.client_invoice_payments p
    WHERE p.client_id = _client_id
      AND p.archived_at IS NULL
      AND p.is_refund IS DISTINCT FROM true
      AND (p.payment_status = 'verified' OR p.payment_proof_status = 'verified')
  ) INTO v_has_payment;

  SELECT w.id, coalesce(w.unlocked_amount, 0), coalesce(w.potential_wallet, 0)
    INTO v_wallet_id, v_unlocked, v_potential
    FROM public.discount_wallets w
   WHERE w.counselor_id = v_uid
     AND w.period_key = to_char(current_date, 'YYYY-MM')
     AND w.budget_kind = 'month_to_month'
   ORDER BY w.updated_at DESC
   LIMIT 1;

  IF v_wallet_id IS NOT NULL THEN
    SELECT coalesce(sum(a.amount), 0) INTO v_spent
      FROM public.wallet_allocations a
     WHERE a.wallet_id = v_wallet_id AND a.status = 'applied';
  END IF;
  v_spendable := greatest(v_unlocked - v_spent, 0);

  v_ab_offer_id := NULL;
  FOR v_ab_exp IN
    SELECT e.id AS experiment_id
      FROM public.offer_ab_experiments e
     WHERE e.status = 'running'
     ORDER BY e.started_at DESC NULLS LAST
  LOOP
    IF EXISTS (
      SELECT 1
        FROM public.offer_ab_variants v
        JOIN public.offers_eligible_for_client(_client_id) ec ON ec.id = v.offer_id
       WHERE v.experiment_id = v_ab_exp.experiment_id
    ) THEN
      v_ab_assign := public.fn_assign_offer_ab_variant(v_ab_exp.experiment_id, _client_id, NULL);
      IF coalesce((v_ab_assign->>'assigned')::boolean, false) THEN
        v_ab_offer_id := (v_ab_assign->>'offer_id')::uuid;
        EXIT;
      END IF;
    END IF;
  END LOOP;

  IF (v_profile->>'has_coaching')::boolean AND NOT (v_profile->>'has_admission')::boolean THEN
    v_scenario := 'coaching_to_abroad';
    SELECT id INTO v_journey_id
      FROM public.offer_automation_journeys
     WHERE template_key = 'cross_sell_coaching_abroad' AND is_active
     LIMIT 1;
  ELSIF (v_profile->>'has_admission')::boolean AND NOT (v_profile->>'has_allied')::boolean THEN
    v_scenario := 'allied_upsell';
    SELECT id INTO v_journey_id
      FROM public.offer_automation_journeys
     WHERE template_key = 'cross_sell_allied_bundle' AND is_active
     LIMIT 1;
  ELSIF NOT v_has_payment THEN
    v_scenario := 'enrolment';
  END IF;

  IF v_ab_offer_id IS NOT NULL THEN
    SELECT o.id, o.title, o.discount_type, o.discount_value, o.funding_source
      INTO v_offer
      FROM public.offers o
     WHERE o.id = v_ab_offer_id;
    v_scenario := 'ab_test';
  ELSE
    SELECT o.id, o.title, o.discount_type, o.discount_value, o.funding_source
      INTO v_offer
      FROM public.offers_eligible_for_client(_client_id) o
     WHERE o.status IN ('active', 'expiring_soon')
     ORDER BY
       CASE v_scenario
         WHEN 'coaching_to_abroad' THEN CASE WHEN o.title ILIKE '%study%' OR o.title ILIKE '%abroad%' OR o.title ILIKE '%admission%' THEN 0 ELSE 1 END
         WHEN 'allied_upsell' THEN CASE WHEN o.title ILIKE '%forex%' OR o.title ILIKE '%insurance%' OR o.title ILIKE '%allied%' THEN 0 ELSE 1 END
         WHEN 'enrolment' THEN CASE WHEN o.title ILIKE '%enrol%' THEN 0 ELSE 1 END
         ELSE 1
       END,
       o.discount_value DESC NULLS LAST
     LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'found', false,
      'suggestion_level', 'L0',
      'cross_sell_scenario', v_scenario,
      'suggested_journey_id', v_journey_id,
      'profile', v_profile,
      'propensity_score', (v_propensity->>'score')::int,
      'propensity_band', v_propensity->>'band',
      'propensity_factors', v_propensity->'factors'
    );
  END IF;

  v_why_detail := coalesce(v_profile->>'last_activity_label', 'No recent activity')
    || ' · ' || replace(coalesce(v_profile->>'lifecycle_stage', 'prospect'), '_', ' ')
    || CASE WHEN (v_profile->>'country_code') IS NOT NULL THEN ' · ' || (v_profile->>'country_code') ELSE '' END
    || CASE WHEN NOT v_has_payment THEN ' · no verified payment yet' ELSE '' END;

  v_reason := CASE v_scenario
    WHEN 'ab_test' THEN 'A/B experiment — you are seeing variant '
      || coalesce(v_ab_assign->>'variant_code', '?') || ' for this client'
    WHEN 'coaching_to_abroad' THEN
      'Coaching client without study-abroad enrolment — suggest conversion to admissions pathway'
    WHEN 'allied_upsell' THEN
      'Study-abroad client without allied add-ons — forex / insurance / travel cross-sell opportunity'
    WHEN 'enrolment' THEN
      'No verified payment yet — enrolment incentive may unlock conversion'
    ELSE 'Eligible active offer from library'
  END;

  IF v_spendable > 0 THEN
    v_reason := v_reason || ' · ₹' || trim(to_char(v_spendable, 'FM999,999,990')) || ' wallet spendable';
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'suggestion_level', 'L0',
    'offer_id', v_offer.id,
    'title', v_offer.title,
    'discount_type', v_offer.discount_type,
    'discount_value', v_offer.discount_value,
    'funding_source', v_offer.funding_source,
    'reason', v_reason,
    'why_detail', v_why_detail,
    'cross_sell_scenario', v_scenario,
    'suggested_journey_id', v_journey_id,
    'ab_experiment_id', v_ab_assign->>'experiment_id',
    'ab_variant_code', v_ab_assign->>'variant_code',
    'wallet_unlocked', v_unlocked,
    'wallet_potential', v_potential,
    'wallet_spendable', v_spendable,
    'within_wallet_cap', v_spendable > 0 OR v_offer.funding_source = 'university',
    'profile', v_profile,
    'propensity_score', (v_propensity->>'score')::int,
    'propensity_band', v_propensity->>'band',
    'propensity_factors', v_propensity->'factors'
  );
END;
$$;

COMMENT ON FUNCTION public.fn_client_offer_propensity(uuid, uuid) IS
  'Phase 5T I5 lite — rule-based offer propensity score 0–100 (hot/warm/cool)';
