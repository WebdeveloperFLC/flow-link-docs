-- Phase 5Q — cross-sell journey templates (O7 ext) · counselor suggestion card O13 · earning refresh hook

-- ── Extend journey triggers + template keys ───────────────────────────────────
ALTER TABLE public.offer_automation_journeys
  ADD COLUMN IF NOT EXISTS template_key text UNIQUE;

ALTER TABLE public.offer_automation_journeys
  DROP CONSTRAINT IF EXISTS offer_automation_journeys_trigger_type_check;

ALTER TABLE public.offer_automation_journeys
  ADD CONSTRAINT offer_automation_journeys_trigger_type_check
  CHECK (trigger_type IN (
    'manual', 'cold_lead', 'lapsed_client',
    'cross_sell_coaching', 'cross_sell_allied'
  ));

COMMENT ON COLUMN public.offer_automation_journeys.template_key IS
  'Phase 5Q — idempotent seed key for journey templates';

-- ── O13: persistent suggestion dismissals ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.client_offer_suggestion_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  counselor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  reason text,
  UNIQUE (client_id, counselor_id)
);

CREATE INDEX IF NOT EXISTS idx_client_offer_suggestion_dismissals_active
  ON public.client_offer_suggestion_dismissals (client_id, counselor_id, expires_at);

ALTER TABLE public.client_offer_suggestion_dismissals ENABLE ROW LEVEL SECURITY;

DO $pol$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'client_offer_suggestion_dismissals_own' AND tablename = 'client_offer_suggestion_dismissals'
  ) THEN
    CREATE POLICY client_offer_suggestion_dismissals_own ON public.client_offer_suggestion_dismissals FOR ALL TO authenticated
      USING (counselor_id = auth.uid())
      WITH CHECK (counselor_id = auth.uid());
  END IF;
END
$pol$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_offer_suggestion_dismissals TO authenticated;

-- ── Cross-sell profile helper ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_client_cross_sell_profile(_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client public.clients%ROWTYPE;
  v_has_coaching boolean := false;
  v_has_admission boolean := false;
  v_has_allied boolean := false;
  v_last_activity timestamptz;
  v_days_inactive int;
  v_country text;
  v_stage text;
BEGIN
  SELECT * INTO v_client FROM public.clients WHERE id = _client_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('found', false); END IF;

  v_has_coaching := coalesce(array_length(v_client.coaching_services, 1), 0) > 0;
  v_has_admission := coalesce(array_length(v_client.admission_services, 1), 0) > 0
    OR coalesce(array_length(v_client.visa_services, 1), 0) > 0;

  SELECT EXISTS (
    SELECT 1 FROM public.client_invoice_payments p
    JOIN public.client_invoices i ON i.id = p.invoice_id
    WHERE p.client_id = _client_id
      AND p.archived_at IS NULL
      AND p.is_refund IS DISTINCT FROM true
      AND (p.payment_status = 'verified' OR p.payment_proof_status = 'verified')
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(coalesce(i.line_items, '[]'::jsonb)) li
        WHERE lower(coalesce(li->>'master_key', '')) = 'coaching_services'
      )
  ) INTO v_has_coaching;

  SELECT EXISTS (
    SELECT 1 FROM public.client_invoice_payments p
    JOIN public.client_invoices i ON i.id = p.invoice_id
    WHERE p.client_id = _client_id
      AND p.archived_at IS NULL
      AND p.is_refund IS DISTINCT FROM true
      AND (p.payment_status = 'verified' OR p.payment_proof_status = 'verified')
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(coalesce(i.line_items, '[]'::jsonb)) li
        WHERE lower(coalesce(li->>'master_key', '')) IN (
          'admission_services', 'visa_immigration'
        )
      )
  ) INTO v_has_admission;

  SELECT EXISTS (
    SELECT 1 FROM public.client_invoice_payments p
    JOIN public.client_invoices i ON i.id = p.invoice_id
    WHERE p.client_id = _client_id
      AND p.archived_at IS NULL
      AND p.is_refund IS DISTINCT FROM true
      AND (p.payment_status = 'verified' OR p.payment_proof_status = 'verified')
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(coalesce(i.line_items, '[]'::jsonb)) li
        WHERE lower(coalesce(li->>'master_key', '')) IN ('allied_services', 'travel_financial')
      )
  ) INTO v_has_allied;

  SELECT max(ts) INTO v_last_activity FROM (
    SELECT p.paid_at AS ts FROM public.client_invoice_payments p
     WHERE p.client_id = _client_id AND p.paid_at IS NOT NULL
    UNION ALL
    SELECT ct.created_at FROM public.client_timeline ct WHERE ct.client_id = _client_id
  ) x;

  v_days_inactive := CASE
    WHEN v_last_activity IS NULL THEN NULL
    ELSE greatest(0, (current_date - v_last_activity::date))
  END;

  SELECT cp.country_code INTO v_country
    FROM public.cf_client_programs cp
   WHERE cp.client_id = _client_id AND cp.is_primary = true
   ORDER BY cp.updated_at DESC NULLS LAST
   LIMIT 1;

  v_stage := CASE
    WHEN v_has_admission THEN 'study_abroad_active'
    WHEN v_has_coaching AND NOT v_has_admission THEN 'coaching_only'
    WHEN v_has_allied THEN 'allied_client'
    ELSE coalesce(nullif(trim(v_client.status), ''), 'prospect')
  END;

  RETURN jsonb_build_object(
    'found', true,
    'has_coaching', v_has_coaching,
    'has_admission', v_has_admission,
    'has_allied', v_has_allied,
    'lifecycle_stage', v_stage,
    'country_code', v_country,
    'last_activity_days', v_days_inactive,
    'last_activity_label', CASE
      WHEN v_days_inactive IS NULL THEN 'No recent activity logged'
      WHEN v_days_inactive = 0 THEN 'Active today'
      WHEN v_days_inactive = 1 THEN 'Last touch yesterday'
      ELSE 'Last activity ' || v_days_inactive::text || ' days ago'
    END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_client_cross_sell_profile(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_dismiss_client_offer_suggestion(
  _client_id uuid,
  _days int DEFAULT 7,
  _reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;

  INSERT INTO public.client_offer_suggestion_dismissals (
    client_id, counselor_id, expires_at, reason
  ) VALUES (
    _client_id,
    v_uid,
    CASE WHEN _days IS NULL OR _days <= 0 THEN NULL ELSE now() + (_days || ' days')::interval END,
    _reason
  )
  ON CONFLICT (client_id, counselor_id) DO UPDATE SET
    dismissed_at = now(),
    expires_at = EXCLUDED.expires_at,
    reason = EXCLUDED.reason;

  RETURN jsonb_build_object('ok', true, 'client_id', _client_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_dismiss_client_offer_suggestion(uuid, int, text) TO authenticated;

-- ── O13: richer L0 suggestion payload ─────────────────────────────────────────
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
  v_scenario text := 'general';
  v_journey_id uuid;
  v_dismissed boolean := false;
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

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'found', false,
      'suggestion_level', 'L0',
      'cross_sell_scenario', v_scenario,
      'suggested_journey_id', v_journey_id,
      'profile', v_profile
    );
  END IF;

  v_why_detail := coalesce(v_profile->>'last_activity_label', 'No recent activity')
    || ' · ' || replace(coalesce(v_profile->>'lifecycle_stage', 'prospect'), '_', ' ')
    || CASE WHEN (v_profile->>'country_code') IS NOT NULL THEN ' · ' || (v_profile->>'country_code') ELSE '' END
    || CASE WHEN NOT v_has_payment THEN ' · no verified payment yet' ELSE '' END;

  v_reason := CASE v_scenario
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
    'wallet_unlocked', v_unlocked,
    'wallet_potential', v_potential,
    'wallet_spendable', v_spendable,
    'within_wallet_cap', v_spendable > 0 OR v_offer.funding_source = 'university',
    'profile', v_profile
  );
END;
$$;

-- ── Seed cross-sell journey templates ─────────────────────────────────────────
INSERT INTO public.offer_automation_journeys (id, name, description, trigger_type, template_key, is_active)
SELECT
  'b2c3d4e5-f6a7-8901-bcde-f12345678901'::uuid,
  'IELTS → Study abroad cross-sell',
  'Coaching-only clients · day 0 counselor nudge · day 3 in-app · day 7 promo request · day 14 task',
  'cross_sell_coaching',
  'cross_sell_coaching_abroad',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.offer_automation_journeys WHERE template_key = 'cross_sell_coaching_abroad'
);

INSERT INTO public.offer_journey_steps (journey_id, day_offset, channel, action_type, title, body_template, sort_order)
SELECT v.journey_id, v.day_offset, v.channel, v.action_type, v.title, v.body_template, v.sort_order
  FROM (VALUES
    ('b2c3d4e5-f6a7-8901-bcde-f12345678901'::uuid, 0, 'in_app', 'notify_counselor', 'Cross-sell: study abroad', 'Coaching client ready for admissions pathway — review suggested offer.', 1),
    ('b2c3d4e5-f6a7-8901-bcde-f12345678901'::uuid, 3, 'whatsapp', 'log_touch', 'Study abroad intro', 'Share study-abroad options and next steps after coaching progress.', 2),
    ('b2c3d4e5-f6a7-8901-bcde-f12345678901'::uuid, 7, 'email', 'create_promotion_request', 'Admissions bundle promo', 'Request MarCom approval for admissions cross-sell bundle.', 3),
    ('b2c3d4e5-f6a7-8901-bcde-f12345678901'::uuid, 14, 'task', 'notify_counselor', 'Conversion check-in', 'Counselor task: confirm study-abroad conversion or update pipeline stage.', 4)
  ) AS v(journey_id, day_offset, channel, action_type, title, body_template, sort_order)
 WHERE EXISTS (SELECT 1 FROM public.offer_automation_journeys WHERE id = v.journey_id)
   AND NOT EXISTS (
     SELECT 1 FROM public.offer_journey_steps s
      WHERE s.journey_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'::uuid
   );

INSERT INTO public.offer_automation_journeys (id, name, description, trigger_type, template_key, is_active)
SELECT
  'c3d4e5f6-a7b8-9012-cdef-123456789012'::uuid,
  'Allied services cross-sell',
  'Study-abroad clients without allied · forex · insurance · travel reminders',
  'cross_sell_allied',
  'cross_sell_allied_bundle',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.offer_automation_journeys WHERE template_key = 'cross_sell_allied_bundle'
);

INSERT INTO public.offer_journey_steps (journey_id, day_offset, channel, action_type, title, body_template, sort_order)
SELECT v.journey_id, v.day_offset, v.channel, v.action_type, v.title, v.body_template, v.sort_order
  FROM (VALUES
    ('c3d4e5f6-a7b8-9012-cdef-123456789012'::uuid, 0, 'in_app', 'notify_counselor', 'Allied upsell opportunity', 'Client on study-abroad track — no allied purchase yet. Suggest forex / insurance.', 1),
    ('c3d4e5f6-a7b8-9012-cdef-123456789012'::uuid, 5, 'whatsapp', 'log_touch', 'Allied services intro', 'Introduce forex, travel insurance, or documentation add-ons.', 2),
    ('c3d4e5f6-a7b8-9012-cdef-123456789012'::uuid, 12, 'email', 'log_touch', 'Allied follow-up email', 'Email with allied service menu and pricing.', 3)
  ) AS v(journey_id, day_offset, channel, action_type, title, body_template, sort_order)
 WHERE EXISTS (SELECT 1 FROM public.offer_automation_journeys WHERE id = v.journey_id)
   AND NOT EXISTS (
     SELECT 1 FROM public.offer_journey_steps s
      WHERE s.journey_id = 'c3d4e5f6-a7b8-9012-cdef-123456789012'::uuid
   );

-- ── Auto-enroll cross-sell journeys (daily tick) ──────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_process_cross_sell_journey_enrollments(_limit int DEFAULT 50)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_j_coaching uuid;
  v_j_allied uuid;
  v_client record;
  v_enrolled int := 0;
BEGIN
  SELECT id INTO v_j_coaching
    FROM public.offer_automation_journeys
   WHERE template_key = 'cross_sell_coaching_abroad' AND is_active
   LIMIT 1;

  SELECT id INTO v_j_allied
    FROM public.offer_automation_journeys
   WHERE template_key = 'cross_sell_allied_bundle' AND is_active
   LIMIT 1;

  IF v_j_coaching IS NOT NULL THEN
    FOR v_client IN
      SELECT c.id AS client_id,
             coalesce(c.assigned_counselor_id, c.closing_counselor_id, c.owner_id) AS counselor_id
        FROM public.clients c
       WHERE coalesce(c.assigned_counselor_id, c.closing_counselor_id, c.owner_id) IS NOT NULL
         AND (public.fn_client_cross_sell_profile(c.id)->>'has_coaching')::boolean
         AND NOT (public.fn_client_cross_sell_profile(c.id)->>'has_admission')::boolean
         AND NOT EXISTS (
           SELECT 1 FROM public.offer_journey_enrollments e
            WHERE e.journey_id = v_j_coaching
              AND e.client_id = c.id
              AND e.status = 'active'
         )
       LIMIT coalesce(_limit, 50)
    LOOP
      INSERT INTO public.offer_journey_enrollments (
        journey_id, client_id, counselor_id, next_step_at
      )
      SELECT v_j_coaching, v_client.client_id, v_client.counselor_id,
             (CURRENT_DATE + coalesce(min(s.day_offset), 0))
        FROM public.offer_journey_steps s
       WHERE s.journey_id = v_j_coaching;
      v_enrolled := v_enrolled + 1;
    END LOOP;
  END IF;

  IF v_j_allied IS NOT NULL THEN
    FOR v_client IN
      SELECT c.id AS client_id,
             coalesce(c.assigned_counselor_id, c.closing_counselor_id, c.owner_id) AS counselor_id
        FROM public.clients c
       WHERE coalesce(c.assigned_counselor_id, c.closing_counselor_id, c.owner_id) IS NOT NULL
         AND (public.fn_client_cross_sell_profile(c.id)->>'has_admission')::boolean
         AND NOT (public.fn_client_cross_sell_profile(c.id)->>'has_allied')::boolean
         AND NOT EXISTS (
           SELECT 1 FROM public.offer_journey_enrollments e
            WHERE e.journey_id = v_j_allied
              AND e.client_id = c.id
              AND e.status = 'active'
         )
       LIMIT coalesce(_limit, 50)
    LOOP
      INSERT INTO public.offer_journey_enrollments (
        journey_id, client_id, counselor_id, next_step_at
      )
      SELECT v_j_allied, v_client.client_id, v_client.counselor_id,
             (CURRENT_DATE + coalesce(min(s.day_offset), 0))
        FROM public.offer_journey_steps s
       WHERE s.journey_id = v_j_allied;
      v_enrolled := v_enrolled + 1;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('ok', true, 'enrolled', v_enrolled);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_process_cross_sell_journey_enrollments(int) TO authenticated;

-- Counselor-visible earning snapshot for I8 poll (no websocket)
CREATE OR REPLACE FUNCTION public.fn_counselor_earning_snapshot(
  _counselor_id uuid,
  _period_key text
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH runs AS (
    SELECT r.id, r.locked
      FROM public.incentive_runs r
     WHERE r.period_key = _period_key
  ),
  earned AS (
    SELECT coalesce(sum(li.earned_amount), 0) AS total
      FROM public.incentive_line_items li
     WHERE li.counselor_id = _counselor_id
       AND li.run_id IN (SELECT id FROM runs)
  )
  SELECT jsonb_build_object(
    'period_key', _period_key,
    'earned_total', (SELECT total FROM earned),
    'has_locked_run', EXISTS (SELECT 1 FROM runs WHERE locked),
    'refreshed_at', now()
  );
$$;

GRANT EXECUTE ON FUNCTION public.fn_counselor_earning_snapshot(uuid, text) TO authenticated;
