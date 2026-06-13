-- Phase 5F — enrolment + stage milestone qualifying events, client timeline sync

-- ── Shared helpers ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_incentive_resolve_client_attribution(_client_id uuid)
RETURNS TABLE (
  counselor_id uuid,
  branch_id uuid,
  dimensions jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client public.clients%ROWTYPE;
  v_branch uuid;
  v_dims jsonb := '{}'::jsonb;
  v_comm record;
BEGIN
  SELECT * INTO v_client FROM public.clients WHERE id = _client_id;
  IF NOT FOUND THEN RETURN; END IF;

  counselor_id := coalesce(v_client.closing_counselor_id, v_client.assigned_counselor_id, v_client.owner_id);
  IF counselor_id IS NULL THEN RETURN; END IF;

  SELECT b.id INTO v_branch
    FROM public.branches b
   WHERE b.id::text = v_client.branch OR lower(b.name) = lower(v_client.branch)
   LIMIT 1;
  branch_id := v_branch;

  SELECT cp.country_code INTO v_comm
    FROM public.cf_client_programs cp
   WHERE cp.client_id = _client_id AND cp.is_primary = true
   ORDER BY cp.updated_at DESC NULLS LAST
   LIMIT 1;
  IF FOUND AND v_comm.country_code IS NOT NULL THEN
    v_dims := v_dims || jsonb_build_object('country_code', v_comm.country_code);
  END IF;

  SELECT u.institution_id, u.program_name, u.intake_term, u.intake_year
    INTO v_comm
    FROM public.upi_commission_students u
   WHERE u.client_id = _client_id
   ORDER BY u.updated_at DESC NULLS LAST
   LIMIT 1;
  IF FOUND THEN
    v_dims := v_dims || jsonb_strip_nulls(jsonb_build_object(
      'institution_id', v_comm.institution_id,
      'program_name', v_comm.program_name,
      'intake', nullif(trim(both from coalesce(v_comm.intake_term, '') ||
        case when v_comm.intake_year is not null then '-' || v_comm.intake_year::text else '' end), '')
    ));
  END IF;

  dimensions := v_dims;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_incentive_append_client_timeline(
  _client_id uuid,
  _actor_id uuid,
  _qe_id uuid,
  _qe_event_type text,
  _summary text,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _client_id IS NULL THEN RETURN; END IF;

  INSERT INTO public.client_timeline (
    client_id, event_type, actor_id, summary, metadata, is_staff_only
  ) VALUES (
    _client_id,
    'incentive_event',
    _actor_id,
    _summary,
    _metadata || jsonb_build_object(
      'qualifying_event_id', _qe_id,
      'qe_event_type', _qe_event_type
    ),
    true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_incentive_timeline_summary(
  _qe_event_type text,
  _amount numeric,
  _currency text,
  _dims jsonb
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE _qe_event_type
    WHEN 'enrolment' THEN
      'Enrolment counted · first verified payment · '
        || coalesce(_currency, 'INR') || ' '
        || trim(to_char(coalesce(_amount, 0), 'FM999,999,990.00'))
    WHEN 'stage_change' THEN
      'Pipeline milestone · '
        || replace(coalesce(_dims->>'milestone', 'stage_change'), '_', ' ')
        || coalesce(' · ' || nullif(_dims->>'stage_label', ''), '')
    WHEN 'lead_converted' THEN 'Lead converted · telecaller conversion counted'
    WHEN 'first_verified_payment' THEN
      'Qualifying payment · '
        || coalesce(_currency, 'INR') || ' '
        || trim(to_char(coalesce(_amount, 0), 'FM999,999,990.00'))
    ELSE 'Incentive qualifying event · ' || _qe_event_type
  END;
$$;

-- ── Payment verified → first_verified_payment + enrolment (first payment only) ─
CREATE OR REPLACE FUNCTION public.fn_incentive_record_payment_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client record;
  v_counselor uuid;
  v_branch uuid;
  v_period text;
  v_dims jsonb := '{}'::jsonb;
  v_master text;
  v_code text;
  v_line jsonb;
  v_inv record;
  v_sub text;
  v_comm record;
  v_prior int;
  v_is_first boolean := false;
  v_qe_id uuid;
  v_summary text;
BEGIN
  IF NEW.is_refund = true OR NEW.archived_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF NOT (
    NEW.payment_status = 'verified'
    OR NEW.payment_proof_status = 'verified'
  ) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE'
    AND coalesce(OLD.payment_status, '') = coalesce(NEW.payment_status, '')
    AND coalesce(OLD.payment_proof_status, '') = coalesce(NEW.payment_proof_status, '')
  THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.incentive_qualifying_events qe
     WHERE qe.source_table = 'client_invoice_payments'
       AND qe.source_id = NEW.id
       AND qe.event_type = 'first_verified_payment'
  ) THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_client FROM public.clients WHERE id = NEW.client_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  v_counselor := coalesce(v_client.closing_counselor_id, v_client.assigned_counselor_id, v_client.owner_id);
  IF v_counselor IS NULL THEN RETURN NEW; END IF;

  SELECT b.id INTO v_branch
  FROM public.branches b
  WHERE b.id::text = v_client.branch OR lower(b.name) = lower(v_client.branch)
  LIMIT 1;

  v_period := to_char(coalesce(NEW.paid_at, NEW.verified_at, now()) AT TIME ZONE 'UTC', 'YYYY-MM');

  v_dims := jsonb_build_object(
    'event_subtype', 'first_payment',
    'is_first_payment', false,
    'master_key', null,
    'service_code', null,
    'sub_category', null,
    'country_code', null,
    'country_tag', null,
    'institution_id', null,
    'intake', null,
    'program_name', null
  );

  IF NEW.invoice_id IS NOT NULL THEN
    SELECT id, line_items INTO v_inv FROM public.client_invoices WHERE id = NEW.invoice_id;
    IF v_inv.line_items IS NOT NULL AND jsonb_array_length(v_inv.line_items) > 0 THEN
      v_line := v_inv.line_items->0;
      v_code := coalesce(v_line->>'service_code', v_line->>'service_id');
      IF v_code IS NOT NULL THEN
        SELECT sl.service_category, sl.sub_service INTO v_master, v_sub
        FROM public.service_library sl
        WHERE sl.id::text = split_part(v_code, '::', 1) OR sl.id::text = v_code
        LIMIT 1;
        v_dims := v_dims || jsonb_build_object(
          'master_key', v_master,
          'service_code', v_code,
          'sub_category', v_sub
        );
      END IF;
    END IF;
  END IF;

  SELECT cp.country_code INTO v_sub
  FROM public.cf_client_programs cp
  WHERE cp.client_id = NEW.client_id AND cp.is_primary = true
  ORDER BY cp.updated_at DESC NULLS LAST
  LIMIT 1;
  IF FOUND AND v_sub IS NOT NULL THEN
    v_dims := v_dims || jsonb_build_object('country_code', v_sub);
  END IF;

  SELECT u.institution_id, u.program_name, u.intake_term, u.intake_year
  INTO v_comm
  FROM public.upi_commission_students u
  WHERE u.client_id = NEW.client_id
  ORDER BY u.updated_at DESC NULLS LAST
  LIMIT 1;
  IF FOUND THEN
    v_dims := v_dims || jsonb_strip_nulls(jsonb_build_object(
      'institution_id', v_comm.institution_id,
      'program_name', v_comm.program_name,
      'intake', nullif(trim(both from coalesce(v_comm.intake_term, '') ||
        case when v_comm.intake_year is not null then '-' || v_comm.intake_year::text else '' end), '')
    ));
  END IF;

  SELECT count(*) INTO v_prior
  FROM public.client_invoice_payments p
  WHERE p.client_id = NEW.client_id
    AND p.id <> NEW.id
    AND p.is_refund IS DISTINCT FROM true
    AND p.archived_at IS NULL
    AND (p.payment_status = 'verified' OR p.payment_proof_status = 'verified');

  v_is_first := v_prior = 0;
  v_dims := v_dims || jsonb_build_object('is_first_payment', v_is_first);

  INSERT INTO public.incentive_qualifying_events (
    event_type, event_date, period_key, counselor_id, client_id, branch_id,
    amount, currency, source_type, dimensions, source_table, source_id
  ) VALUES (
    'first_verified_payment',
    (coalesce(NEW.paid_at, NEW.verified_at, now()) AT TIME ZONE 'UTC')::date,
    v_period,
    v_counselor,
    NEW.client_id,
    v_branch,
    coalesce(NEW.amount, 0),
    coalesce(NEW.currency, 'INR'),
    'service_revenue',
    v_dims,
    'client_invoice_payments',
    NEW.id
  )
  RETURNING id INTO v_qe_id;

  v_summary := public.fn_incentive_timeline_summary(
    'first_verified_payment', coalesce(NEW.amount, 0), coalesce(NEW.currency, 'INR'), v_dims
  );
  PERFORM public.fn_incentive_append_client_timeline(
    NEW.client_id,
    coalesce(NEW.verified_by, v_counselor),
    v_qe_id,
    'first_verified_payment',
    v_summary,
    jsonb_build_object('payment_id', NEW.id, 'amount', NEW.amount, 'currency', NEW.currency)
  );

  IF v_is_first AND NOT EXISTS (
    SELECT 1 FROM public.incentive_qualifying_events qe
     WHERE qe.client_id = NEW.client_id AND qe.event_type = 'enrolment'
  ) THEN
    INSERT INTO public.incentive_qualifying_events (
      event_type, event_date, period_key, counselor_id, client_id, branch_id,
      amount, currency, source_type, dimensions, source_table, source_id
    ) VALUES (
      'enrolment',
      (coalesce(NEW.paid_at, NEW.verified_at, now()) AT TIME ZONE 'UTC')::date,
      v_period,
      v_counselor,
      NEW.client_id,
      v_branch,
      coalesce(NEW.amount, 0),
      coalesce(NEW.currency, 'INR'),
      'service_revenue',
      v_dims || jsonb_build_object('milestone', 'first_payment', 'count', 1),
      'client_invoice_payments',
      NEW.id
    )
    RETURNING id INTO v_qe_id;

    v_summary := public.fn_incentive_timeline_summary(
      'enrolment', coalesce(NEW.amount, 0), coalesce(NEW.currency, 'INR'), v_dims
    );
    PERFORM public.fn_incentive_append_client_timeline(
      NEW.client_id,
      coalesce(NEW.verified_by, v_counselor),
      v_qe_id,
      'enrolment',
      v_summary,
      jsonb_build_object('payment_id', NEW.id, 'milestone', 'first_payment')
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ── Pipeline stage milestones → stage_change qualifying events ────────────────
CREATE OR REPLACE FUNCTION public.fn_incentive_record_stage_milestone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stage public.pipeline_stages%ROWTYPE;
  v_milestone text;
  v_attr record;
  v_period text;
  v_dims jsonb;
  v_qe_id uuid;
  v_summary text;
  v_event_date date;
BEGIN
  IF TG_OP <> 'UPDATE' THEN RETURN NEW; END IF;
  IF NEW.pipeline_id IS NULL OR NEW.current_stage_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.current_stage_id IS NOT DISTINCT FROM OLD.current_stage_id
     AND NEW.pipeline_id IS NOT DISTINCT FROM OLD.pipeline_id THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_stage FROM public.pipeline_stages WHERE id = NEW.current_stage_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  v_milestone := CASE v_stage.key
    WHEN 'visa_lodged' THEN 'visa_lodged'
    WHEN 'offer_received' THEN 'offer_received'
    WHEN 'offer_letter' THEN 'offer_received'
    ELSE NULL
  END;
  IF v_milestone IS NULL THEN RETURN NEW; END IF;

  IF EXISTS (
    SELECT 1 FROM public.incentive_qualifying_events qe
     WHERE qe.client_id = NEW.id
       AND qe.event_type = 'stage_change'
       AND qe.dimensions->>'milestone' = v_milestone
  ) THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_attr FROM public.fn_incentive_resolve_client_attribution(NEW.id);
  IF v_attr.counselor_id IS NULL THEN RETURN NEW; END IF;

  v_event_date := (now() AT TIME ZONE 'UTC')::date;
  v_period := to_char(v_event_date, 'YYYY-MM');
  v_dims := coalesce(v_attr.dimensions, '{}'::jsonb) || jsonb_build_object(
    'milestone', v_milestone,
    'stage_key', v_stage.key,
    'stage_label', coalesce(v_stage.label, v_stage.key),
    'pipeline_id', NEW.pipeline_id,
    'stage_id', NEW.current_stage_id,
    'count', 1
  );

  INSERT INTO public.incentive_qualifying_events (
    event_type, event_date, period_key, counselor_id, client_id, branch_id,
    amount, currency, source_type, dimensions, source_table, source_id
  ) VALUES (
    'stage_change',
    v_event_date,
    v_period,
    v_attr.counselor_id,
    NEW.id,
    v_attr.branch_id,
    1,
    'INR',
    NULL,
    v_dims,
    'clients',
    NEW.id
  )
  RETURNING id INTO v_qe_id;

  v_summary := public.fn_incentive_timeline_summary('stage_change', 1, 'INR', v_dims);
  PERFORM public.fn_incentive_append_client_timeline(
    NEW.id,
    auth.uid(),
    v_qe_id,
    'stage_change',
    v_summary,
    jsonb_build_object(
      'milestone', v_milestone,
      'stage_key', v_stage.key,
      'stage_label', v_stage.label
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_incentive_record_stage_milestone ON public.clients;
CREATE TRIGGER trg_incentive_record_stage_milestone
  AFTER UPDATE OF pipeline_id, current_stage_id ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_incentive_record_stage_milestone();

-- ── lead_converted → timeline sync (replace 5D function) ─────────────────────
CREATE OR REPLACE FUNCTION public.fn_incentive_record_lead_converted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period text;
  v_branch uuid;
  v_qe_id uuid;
  v_summary text;
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
  )
  RETURNING id INTO v_qe_id;

  v_summary := public.fn_incentive_timeline_summary('lead_converted', 1, 'INR', '{}'::jsonb);
  PERFORM public.fn_incentive_append_client_timeline(
    NEW.id,
    NEW.converted_by,
    v_qe_id,
    'lead_converted',
    v_summary,
    jsonb_build_object('source_lead_id', NEW.source_lead_id)
  );

  RETURN NEW;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_incentive_qe_client_enrolment
  ON public.incentive_qualifying_events (client_id)
  WHERE event_type = 'enrolment';

CREATE UNIQUE INDEX IF NOT EXISTS idx_incentive_qe_client_stage_milestone
  ON public.incentive_qualifying_events (client_id, (dimensions->>'milestone'))
  WHERE event_type = 'stage_change';

CREATE INDEX IF NOT EXISTS idx_incentive_qe_event_type_period
  ON public.incentive_qualifying_events (event_type, period_key, counselor_id);

-- ── Backfill enrolment from existing first payments (best-effort) ───────────
INSERT INTO public.incentive_qualifying_events (
  event_type, event_date, period_key, counselor_id, client_id, branch_id,
  amount, currency, source_type, dimensions, source_table, source_id
)
SELECT
  'enrolment',
  qe.event_date,
  qe.period_key,
  qe.counselor_id,
  qe.client_id,
  qe.branch_id,
  qe.amount,
  qe.currency,
  qe.source_type,
  qe.dimensions || jsonb_build_object('milestone', 'first_payment', 'count', 1),
  qe.source_table,
  qe.source_id
FROM public.incentive_qualifying_events qe
WHERE qe.event_type = 'first_verified_payment'
  AND coalesce(qe.dimensions->>'is_first_payment', 'false') = 'true'
  AND NOT EXISTS (
    SELECT 1 FROM public.incentive_qualifying_events e2
     WHERE e2.client_id = qe.client_id AND e2.event_type = 'enrolment'
  );

-- ── Backfill stage milestones from stage history (best-effort) ───────────────
INSERT INTO public.incentive_qualifying_events (
  event_type, event_date, period_key, counselor_id, client_id, branch_id,
  amount, currency, source_type, dimensions, source_table, source_id
)
SELECT DISTINCT ON (csh.client_id, v_milestone)
  'stage_change',
  (csh.entered_at AT TIME ZONE 'UTC')::date,
  to_char(csh.entered_at AT TIME ZONE 'UTC', 'YYYY-MM'),
  attr.counselor_id,
  csh.client_id,
  attr.branch_id,
  1,
  'INR',
  NULL,
  coalesce(attr.dimensions, '{}'::jsonb) || jsonb_build_object(
    'milestone', v_milestone,
    'stage_key', ps.key,
    'stage_label', coalesce(ps.label, ps.key),
    'pipeline_id', csh.pipeline_id,
    'stage_id', csh.stage_id,
    'count', 1,
    'backfill', true
  ),
  'client_stage_history',
  csh.id
FROM public.client_stage_history csh
JOIN public.pipeline_stages ps ON ps.id = csh.stage_id
JOIN public.clients c ON c.id = csh.client_id
CROSS JOIN LATERAL (
  SELECT CASE ps.key
    WHEN 'visa_lodged' THEN 'visa_lodged'
    WHEN 'offer_received' THEN 'offer_received'
    WHEN 'offer_letter' THEN 'offer_received'
    ELSE NULL
  END AS v_milestone
) m
CROSS JOIN LATERAL public.fn_incentive_resolve_client_attribution(csh.client_id) attr
WHERE m.v_milestone IS NOT NULL
  AND attr.counselor_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.incentive_qualifying_events qe
     WHERE qe.client_id = csh.client_id
       AND qe.event_type = 'stage_change'
       AND qe.dimensions->>'milestone' = m.v_milestone
  )
ORDER BY csh.client_id, m.v_milestone, csh.entered_at ASC;
