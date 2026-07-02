-- Commission Phase 1 RPCs + counselor status view

-- ---------------------------------------------------------------------------
-- Rule resolver (precedence: promotion → intake → program → category → campus → country → default)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_resolve_commission_rule(
  p_institution_id uuid,
  p_partnership_route_id uuid DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_campus text DEFAULT NULL,
  p_program_category text DEFAULT NULL,
  p_program_code text DEFAULT NULL,
  p_intake text DEFAULT NULL,
  p_promotion_id uuid DEFAULT NULL,
  p_as_of date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  commission_id uuid,
  matched_rule_id uuid,
  commission_name text,
  base_rate_percent numeric,
  currency text,
  agreement_version_id uuid,
  match_level text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_commission_id uuid;
BEGIN
  IF p_partnership_route_id IS NOT NULL THEN
    SELECT r.default_commission_id INTO v_commission_id
    FROM public.upi_partnership_routes r
    WHERE r.id = p_partnership_route_id;
  END IF;

  IF v_commission_id IS NULL THEN
    SELECT c.id INTO v_commission_id
    FROM public.upi_commissions c
    WHERE c.institution_id = p_institution_id
      AND c.is_active = true
      AND (c.effective_from IS NULL OR c.effective_from <= p_as_of)
      AND (c.effective_to IS NULL OR c.effective_to >= p_as_of)
    ORDER BY c.effective_from DESC NULLS LAST, c.created_at DESC
    LIMIT 1;
  END IF;

  IF v_commission_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH ranked AS (
    SELECT
      c.id AS commission_id,
      r.id AS matched_rule_id,
      c.name AS commission_name,
      c.base_rate_percent,
      c.currency,
      c.agreement_version_id,
      CASE
        WHEN r.scope_promotion_id IS NOT NULL AND r.scope_promotion_id = p_promotion_id THEN 'promotion'
        WHEN r.scope_intake IS NOT NULL AND lower(r.scope_intake) = lower(COALESCE(p_intake, '')) THEN 'intake'
        WHEN r.scope_program_code IS NOT NULL AND lower(r.scope_program_code) = lower(COALESCE(p_program_code, '')) THEN 'program'
        WHEN r.scope_program_category IS NOT NULL AND lower(r.scope_program_category) = lower(COALESCE(p_program_category, '')) THEN 'category'
        WHEN r.scope_campus IS NOT NULL AND lower(r.scope_campus) = lower(COALESCE(p_campus, '')) THEN 'campus'
        WHEN r.scope_country IS NOT NULL AND lower(r.scope_country) = lower(COALESCE(p_country, '')) THEN 'country'
        WHEN r.rule_type = 'base' OR (
          r.scope_promotion_id IS NULL AND r.scope_intake IS NULL
          AND r.scope_program_code IS NULL AND r.scope_program_category IS NULL
          AND r.scope_campus IS NULL AND r.scope_country IS NULL
        ) THEN 'default'
        ELSE NULL
      END AS match_level,
      CASE
        WHEN r.scope_promotion_id IS NOT NULL AND r.scope_promotion_id = p_promotion_id THEN 1
        WHEN r.scope_intake IS NOT NULL AND lower(r.scope_intake) = lower(COALESCE(p_intake, '')) THEN 2
        WHEN r.scope_program_code IS NOT NULL AND lower(r.scope_program_code) = lower(COALESCE(p_program_code, '')) THEN 3
        WHEN r.scope_program_category IS NOT NULL AND lower(r.scope_program_category) = lower(COALESCE(p_program_category, '')) THEN 4
        WHEN r.scope_campus IS NOT NULL AND lower(r.scope_campus) = lower(COALESCE(p_campus, '')) THEN 5
        WHEN r.scope_country IS NOT NULL AND lower(r.scope_country) = lower(COALESCE(p_country, '')) THEN 6
        WHEN r.rule_type = 'base' OR (
          r.scope_promotion_id IS NULL AND r.scope_intake IS NULL
          AND r.scope_program_code IS NULL AND r.scope_program_category IS NULL
          AND r.scope_campus IS NULL AND r.scope_country IS NULL
        ) THEN 7
        ELSE 99
      END AS rank_order
    FROM public.upi_commissions c
    LEFT JOIN public.upi_commission_rules r ON r.commission_id = c.id
    WHERE c.id = v_commission_id
  )
  SELECT
    ranked.commission_id,
    ranked.matched_rule_id,
    ranked.commission_name,
    ranked.base_rate_percent,
    ranked.currency,
    ranked.agreement_version_id,
    ranked.match_level
  FROM ranked
  WHERE ranked.match_level IS NOT NULL
  ORDER BY ranked.rank_order
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_resolve_commission_rule(uuid, uuid, text, text, text, text, text, uuid, date) TO authenticated;

-- ---------------------------------------------------------------------------
-- Eligibility evaluation (config-driven)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_evaluate_eligibility(
  p_student_commission_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.upi_commission_students%ROWTYPE;
  cfg public.upi_commission_eligibility_configs%ROWTYPE;
  v_eligible boolean := false;
  v_reason text := 'pending';
BEGIN
  SELECT * INTO s FROM public.upi_commission_students WHERE id = p_student_commission_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'not_found');
  END IF;

  IF s.eligibility_config_id IS NOT NULL THEN
    SELECT * INTO cfg FROM public.upi_commission_eligibility_configs WHERE id = s.eligibility_config_id;
  ELSE
    SELECT * INTO cfg
    FROM public.upi_commission_eligibility_configs c
    WHERE c.institution_id = s.institution_id
      AND c.status = 'published'
      AND (c.partnership_route_id IS NULL OR c.partnership_route_id = s.partnership_route_id)
      AND (c.effective_from IS NULL OR c.effective_from <= CURRENT_DATE)
      AND (c.effective_to IS NULL OR c.effective_to >= CURRENT_DATE)
    ORDER BY
      CASE WHEN c.partnership_route_id IS NOT NULL THEN 0 ELSE 1 END,
      c.version_number DESC
    LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    -- Fallback: deposit paid heuristic for Phase 1 manual path
    v_eligible := s.tuition_paid_date IS NOT NULL OR (s.tuition_paid_amount IS NOT NULL AND s.tuition_paid_amount > 0);
    v_reason := CASE WHEN v_eligible THEN 'deposit_paid_fallback' ELSE 'no_config' END;
  ELSE
    CASE cfg.trigger_type
      WHEN 'deposit' THEN
        v_eligible := s.tuition_paid_date IS NOT NULL OR COALESCE(s.tuition_paid_amount, 0) > 0;
        v_reason := 'deposit';
      WHEN 'visa' THEN
        v_eligible := s.study_permit_approved_date IS NOT NULL;
        v_reason := 'visa';
      WHEN 'enrolled' THEN
        v_eligible := s.enrollment_status = 'enrolled' AND s.enrollment_confirmed_date IS NOT NULL;
        v_reason := 'enrolled';
      WHEN 'registered' THEN
        v_eligible := COALESCE(s.registered_credits, 0) > 0;
        v_reason := 'registered';
      WHEN 'started_classes' THEN
        v_eligible := s.enrollment_status = 'enrolled';
        v_reason := 'started_classes';
      ELSE
        v_eligible := false;
        v_reason := 'custom_not_implemented';
    END CASE;
  END IF;

  RETURN jsonb_build_object(
    'eligible', v_eligible,
    'reason', v_reason,
    'config_id', cfg.id,
    'trigger_type', COALESCE(cfg.trigger_type, 'fallback')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_evaluate_eligibility(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Create immutable snapshot + link student
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_create_commission_snapshot(
  p_student_commission_id uuid,
  p_breakdown jsonb DEFAULT '{}',
  p_rules jsonb DEFAULT '[]',
  p_input jsonb DEFAULT '{}',
  p_expected_amount numeric DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.upi_commission_students%ROWTYPE;
  snap_id uuid;
  v_total numeric;
BEGIN
  SELECT * INTO s FROM public.upi_commission_students WHERE id = p_student_commission_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'student commission not found';
  END IF;

  v_total := COALESCE(p_expected_amount, s.amended_expected_amount, s.expected_amount, s.commission_amount, 0);

  INSERT INTO public.upi_commission_snapshots (
    partnership_route_id, commission_id, institution_id, aggregator_id, channel_type,
    student_commission_id, agreement_version_id, matched_rule_id,
    country, campus, program_name, program_category, intake_term,
    expected_amount, eligibility_date, currency, total_amount,
    rules_json, input_json, breakdown_json, snapshot_payload
  ) VALUES (
    s.partnership_route_id, s.commission_id, s.institution_id, s.aggregator_id, s.channel_type,
    s.id, s.agreement_version_id, s.matched_rule_id,
    s.country_of_origin, s.campus, s.program_name, s.program_level, s.intake_term,
    v_total, s.eligibility_date, COALESCE(s.snapshot_currency, s.tuition_currency, 'CAD'), v_total,
    COALESCE(p_rules, '[]'::jsonb), COALESCE(p_input, '{}'::jsonb), COALESCE(p_breakdown, '{}'::jsonb),
    jsonb_build_object(
      'student_commission_id', s.id,
      'commission_id', s.commission_id,
      'agreement_version_id', s.agreement_version_id,
      'matched_rule_id', s.matched_rule_id,
      'expected_amount', v_total,
      'currency', COALESCE(s.snapshot_currency, s.tuition_currency, 'CAD'),
      'eligibility_date', s.eligibility_date
    )
  )
  RETURNING id INTO snap_id;

  UPDATE public.upi_commission_students
  SET commission_snapshot_id = snap_id,
      expected_amount = v_total
  WHERE id = s.id;

  RETURN snap_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_create_commission_snapshot(uuid, jsonb, jsonb, jsonb, numeric) TO authenticated;

-- ---------------------------------------------------------------------------
-- Mark student eligible (creates snapshot if missing)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_mark_student_eligible(
  p_student_commission_id uuid,
  p_eligibility_date date DEFAULT CURRENT_DATE
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  eval jsonb;
  snap_id uuid;
BEGIN
  eval := public.fn_evaluate_eligibility(p_student_commission_id);
  IF NOT (eval->>'eligible')::boolean THEN
    RAISE EXCEPTION 'Student not eligible: %', eval->>'reason';
  END IF;

  UPDATE public.upi_commission_students
  SET eligibility_status = 'eligible',
      eligibility_date = p_eligibility_date,
      claim_status = CASE WHEN hold_status = 'active' THEN claim_status ELSE 'ready' END
  WHERE id = p_student_commission_id;

  SELECT commission_snapshot_id INTO snap_id
  FROM public.upi_commission_students WHERE id = p_student_commission_id;

  IF snap_id IS NULL THEN
    snap_id := public.fn_create_commission_snapshot(p_student_commission_id);
  END IF;

  RETURN snap_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_mark_student_eligible(uuid, date) TO authenticated;

-- ---------------------------------------------------------------------------
-- Publish commission rules (conflict gate in app; RPC sets active)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_publish_commission_rules(
  p_commission_id uuid,
  p_published_by uuid DEFAULT auth.uid()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.upi_commissions
  SET is_active = true,
      is_proposed = false,
      published_at = now(),
      published_by = p_published_by
  WHERE id = p_commission_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'commission not found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_publish_commission_rules(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Hold apply / release
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_apply_commission_hold(
  p_student_commission_id uuid,
  p_hold_reason text,
  p_hold_notes text DEFAULT NULL,
  p_expected_claim_date date DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.upi_commission_hold_reasons WHERE code = p_hold_reason AND is_active) THEN
    RAISE EXCEPTION 'invalid hold reason: %', p_hold_reason;
  END IF;

  UPDATE public.upi_commission_students
  SET hold_status = 'active',
      hold_reason = p_hold_reason,
      hold_notes = p_hold_notes,
      expected_claim_date = p_expected_claim_date,
      claim_status = CASE WHEN claim_status = 'ready' THEN 'not_ready' ELSE claim_status END
  WHERE id = p_student_commission_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_apply_commission_hold(uuid, text, text, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_release_commission_hold(
  p_student_commission_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.upi_commission_students
  SET hold_status = 'released',
      hold_reason = NULL,
      hold_notes = NULL,
      claim_status = CASE
        WHEN eligibility_status = 'eligible' THEN 'ready'
        ELSE claim_status
      END
  WHERE id = p_student_commission_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_release_commission_hold(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Transfer events
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_initiate_commission_transfer(
  p_source_student_commission_id uuid,
  p_to_route_id uuid DEFAULT NULL,
  p_to_institution_id uuid DEFAULT NULL,
  p_transfer_reason text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.upi_commission_students%ROWTYPE;
  event_id uuid;
BEGIN
  SELECT * INTO s FROM public.upi_commission_students WHERE id = p_source_student_commission_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'source not found'; END IF;

  INSERT INTO public.upi_commission_transfer_events (
    institution_id, source_student_commission_id,
    from_route_id, to_route_id, from_institution_id, to_institution_id,
    event_status, outcome, transfer_reason, notes, initiated_by
  ) VALUES (
    s.institution_id, s.id,
    s.partnership_route_id, p_to_route_id, s.institution_id, p_to_institution_id,
    'open', 'under_review', p_transfer_reason, p_notes, auth.uid()
  )
  RETURNING id INTO event_id;

  PERFORM public.fn_apply_commission_hold(
    s.id, 'transfer_under_review', p_transfer_reason, NULL
  );

  RETURN event_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_initiate_commission_transfer(uuid, uuid, uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_process_transfer_outcome(
  p_event_id uuid,
  p_outcome text,
  p_replacement_student_commission_id uuid DEFAULT NULL,
  p_amended_amount numeric DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ev public.upi_commission_transfer_events%ROWTYPE;
BEGIN
  IF p_outcome NOT IN ('unchanged', 'amended', 'cancelled', 'replaced', 'under_review') THEN
    RAISE EXCEPTION 'invalid outcome';
  END IF;

  SELECT * INTO ev FROM public.upi_commission_transfer_events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'event not found'; END IF;

  UPDATE public.upi_commission_transfer_events
  SET event_status = CASE WHEN p_outcome = 'under_review' THEN 'open' ELSE 'resolved' END,
      outcome = p_outcome,
      replacement_student_commission_id = p_replacement_student_commission_id,
      resolved_at = CASE WHEN p_outcome = 'under_review' THEN NULL ELSE now() END
  WHERE id = p_event_id;

  CASE p_outcome
    WHEN 'unchanged' THEN
      PERFORM public.fn_release_commission_hold(ev.source_student_commission_id);
    WHEN 'amended' THEN
      UPDATE public.upi_commission_students
      SET amended_expected_amount = COALESCE(p_amended_amount, amended_expected_amount)
      WHERE id = ev.source_student_commission_id;
      PERFORM public.fn_release_commission_hold(ev.source_student_commission_id);
    WHEN 'cancelled' THEN
      UPDATE public.upi_commission_students
      SET eligibility_status = 'cancelled', claim_status = 'rejected'
      WHERE id = ev.source_student_commission_id;
      PERFORM public.fn_release_commission_hold(ev.source_student_commission_id);
    WHEN 'replaced' THEN
      UPDATE public.upi_commission_students
      SET eligibility_status = 'cancelled', claim_status = 'rejected'
      WHERE id = ev.source_student_commission_id;
      PERFORM public.fn_release_commission_hold(ev.source_student_commission_id);
    ELSE
      NULL;
  END CASE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_process_transfer_outcome(uuid, text, uuid, numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_create_replacement_commission(
  p_source_student_commission_id uuid,
  p_claim_cycle_id uuid,
  p_partnership_route_id uuid DEFAULT NULL,
  p_commission_period_code text DEFAULT 'enrollment'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  src public.upi_commission_students%ROWTYPE;
  new_id uuid;
BEGIN
  SELECT * INTO src FROM public.upi_commission_students WHERE id = p_source_student_commission_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'source not found'; END IF;

  INSERT INTO public.upi_commission_students (
    claim_cycle_id, institution_id, commission_id, client_id,
    student_name, student_email, passport_number, nationality, country_of_origin,
    program_name, program_level, campus, intake_term, intake_month, intake_year,
    tuition_amount, tuition_currency,
    partnership_route_id, aggregator_id, channel_type,
    commission_period_code, eligibility_status, claim_status, payment_status
  ) VALUES (
    p_claim_cycle_id, src.institution_id, src.commission_id, src.client_id,
    src.student_name, src.student_email, src.passport_number, src.nationality, src.country_of_origin,
    src.program_name, src.program_level, src.campus, src.intake_term, src.intake_month, src.intake_year,
    src.tuition_amount, src.tuition_currency,
    COALESCE(p_partnership_route_id, src.partnership_route_id), src.aggregator_id, src.channel_type,
    p_commission_period_code, 'pending', 'not_ready', 'unpaid'
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_create_replacement_commission(uuid, uuid, uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Counselor-safe view (status only — no amounts)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_client_commission_status AS
SELECT
  ucs.client_id,
  ucs.id AS student_commission_id,
  ucs.institution_id,
  i.name AS institution_name,
  ucs.program_name,
  ucs.intake_term,
  ucs.commission_period_code,
  ucs.eligibility_status,
  ucs.claim_status,
  ucs.payment_status,
  ucs.hold_status,
  ucs.hold_reason,
  ucs.eligibility_date,
  ucs.expected_claim_date,
  ucs.commission_status AS legacy_status
FROM public.upi_commission_students ucs
LEFT JOIN public.upi_institutions i ON i.id = ucs.institution_id
WHERE ucs.client_id IS NOT NULL;

GRANT SELECT ON public.v_client_commission_status TO authenticated;
