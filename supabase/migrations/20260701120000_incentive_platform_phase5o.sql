-- Phase 5O — offer automation journeys (O7): win-back sequences + lifecycle tick processor

CREATE TABLE IF NOT EXISTS public.offer_automation_journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL DEFAULT 'manual'
    CHECK (trigger_type IN ('manual', 'cold_lead', 'lapsed_client')),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.offer_journey_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id uuid NOT NULL REFERENCES public.offer_automation_journeys(id) ON DELETE CASCADE,
  day_offset int NOT NULL CHECK (day_offset >= 0),
  channel text NOT NULL CHECK (channel IN ('whatsapp', 'email', 'sms', 'task', 'in_app')),
  action_type text NOT NULL DEFAULT 'log_touch'
    CHECK (action_type IN ('log_touch', 'notify_counselor', 'create_promotion_request')),
  title text,
  body_template text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offer_journey_steps_journey
  ON public.offer_journey_steps (journey_id, sort_order);

CREATE TABLE IF NOT EXISTS public.offer_journey_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id uuid NOT NULL REFERENCES public.offer_automation_journeys(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  counselor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'cancelled')),
  current_step_index int NOT NULL DEFAULT 0,
  next_step_at date,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT offer_journey_enrollments_target_chk CHECK (
    client_id IS NOT NULL OR lead_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_offer_journey_enrollments_due
  ON public.offer_journey_enrollments (status, next_step_at)
  WHERE status = 'active';

CREATE TABLE IF NOT EXISTS public.offer_journey_step_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.offer_journey_enrollments(id) ON DELETE CASCADE,
  step_id uuid REFERENCES public.offer_journey_steps(id) ON DELETE SET NULL,
  channel text,
  action_type text,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  executed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.offer_automation_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_journey_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_journey_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_journey_step_log ENABLE ROW LEVEL SECURITY;

DO $pol$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'offer_journeys_staff' AND tablename = 'offer_automation_journeys'
  ) THEN
    CREATE POLICY offer_journeys_staff ON public.offer_automation_journeys FOR ALL TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
        OR public.user_has_module(auth.uid(), 'offers', 'view')
      )
      WITH CHECK (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
        OR public.user_has_module(auth.uid(), 'offers', 'edit')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'offer_journey_steps_staff' AND tablename = 'offer_journey_steps'
  ) THEN
    CREATE POLICY offer_journey_steps_staff ON public.offer_journey_steps FOR ALL TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
        OR public.user_has_module(auth.uid(), 'offers', 'view')
      )
      WITH CHECK (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
        OR public.user_has_module(auth.uid(), 'offers', 'edit')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'offer_journey_enrollments_staff' AND tablename = 'offer_journey_enrollments'
  ) THEN
    CREATE POLICY offer_journey_enrollments_staff ON public.offer_journey_enrollments FOR ALL TO authenticated
      USING (
        counselor_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
        OR public.user_has_module(auth.uid(), 'offers', 'view')
      )
      WITH CHECK (
        counselor_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
        OR public.user_has_module(auth.uid(), 'offers', 'edit')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'offer_journey_step_log_staff' AND tablename = 'offer_journey_step_log'
  ) THEN
    CREATE POLICY offer_journey_step_log_staff ON public.offer_journey_step_log FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.offer_journey_enrollments e
           WHERE e.id = enrollment_id
             AND (
               e.counselor_id = auth.uid()
               OR public.has_role(auth.uid(), 'admin'::public.app_role)
               OR public.has_role(auth.uid(), 'administrator'::public.app_role)
               OR public.has_role(auth.uid(), 'manager'::public.app_role)
             )
        )
      );
  END IF;
END
$pol$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.offer_automation_journeys TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offer_journey_steps TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offer_journey_enrollments TO authenticated;
GRANT SELECT ON public.offer_journey_step_log TO authenticated;

-- Seed default cold-lead win-back journey (O7 §15.1)
INSERT INTO public.offer_automation_journeys (id, name, description, trigger_type, is_active)
SELECT
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'Cold lead win-back',
  'Day 2 WhatsApp · Day 7 email · Day 15 SMS · Day 30 counselor task (scope §15.1)',
  'cold_lead',
  true
WHERE NOT EXISTS (SELECT 1 FROM public.offer_automation_journeys LIMIT 1);

INSERT INTO public.offer_journey_steps (journey_id, day_offset, channel, action_type, title, body_template, sort_order)
SELECT v.journey_id, v.day_offset, v.channel, v.action_type, v.title, v.body_template, v.sort_order
  FROM (VALUES
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 2, 'whatsapp', 'log_touch', 'Win-back touch 1', 'Hi — checking in on your study plans. Reply if you would like help.', 1),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 7, 'email', 'log_touch', 'Win-back email', 'Follow-up email with program options and next steps.', 2),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 15, 'sms', 'log_touch', 'Win-back SMS', 'Short SMS reminder — book a free counselling slot.', 3),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 30, 'task', 'notify_counselor', 'Manager-approved final offer', 'Counselor task: propose final win-back offer for approval.', 4)
  ) AS v(journey_id, day_offset, channel, action_type, title, body_template, sort_order)
 WHERE NOT EXISTS (SELECT 1 FROM public.offer_journey_steps LIMIT 1);

CREATE OR REPLACE FUNCTION public.fn_enroll_offer_journey(
  _journey_id uuid,
  _client_id uuid DEFAULT NULL,
  _lead_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_j public.offer_automation_journeys%ROWTYPE;
  v_counselor uuid;
  v_first_day int;
  v_enrollment_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  IF _client_id IS NULL AND _lead_id IS NULL THEN RAISE EXCEPTION 'client or lead required'; END IF;

  SELECT * INTO v_j FROM public.offer_automation_journeys WHERE id = _journey_id AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'journey not found or inactive'; END IF;

  IF _client_id IS NOT NULL THEN
    SELECT coalesce(c.assigned_counselor_id, c.closing_counselor_id, c.owner_id) INTO v_counselor
      FROM public.clients c WHERE c.id = _client_id;
  ELSE
    SELECT l.assigned_counselor_id INTO v_counselor FROM public.leads l WHERE l.id = _lead_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.offer_journey_enrollments e
     WHERE e.journey_id = _journey_id AND e.status = 'active'
       AND ((_client_id IS NOT NULL AND e.client_id = _client_id)
         OR (_lead_id IS NOT NULL AND e.lead_id = _lead_id))
  ) THEN
    RAISE EXCEPTION 'already enrolled in this journey';
  END IF;

  SELECT min(s.day_offset) INTO v_first_day
    FROM public.offer_journey_steps s WHERE s.journey_id = _journey_id;
  v_first_day := coalesce(v_first_day, 0);

  INSERT INTO public.offer_journey_enrollments (
    journey_id, client_id, lead_id, counselor_id, next_step_at
  ) VALUES (
    _journey_id, _client_id, _lead_id, v_counselor,
    (CURRENT_DATE + v_first_day)
  )
  RETURNING id INTO v_enrollment_id;

  RETURN v_enrollment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_execute_journey_step(
  _enrollment_id uuid,
  _step_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_e public.offer_journey_enrollments%ROWTYPE;
  v_s public.offer_journey_steps%ROWTYPE;
  v_result jsonb := '{}'::jsonb;
  v_title text;
  v_body text;
  v_req_id uuid;
BEGIN
  SELECT * INTO v_e FROM public.offer_journey_enrollments WHERE id = _enrollment_id;
  SELECT * INTO v_s FROM public.offer_journey_steps WHERE id = _step_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'enrollment or step not found'; END IF;

  v_title := coalesce(v_s.title, 'Journey step');
  v_body := coalesce(v_s.body_template, '');

  IF v_s.action_type = 'notify_counselor' AND v_e.counselor_id IS NOT NULL THEN
    INSERT INTO public.app_notifications (
      user_id, category, severity, title, body, link, dedupe_key
    ) VALUES (
      v_e.counselor_id,
      'journey_task',
      'info',
      v_title,
      v_body,
      CASE WHEN v_e.client_id IS NOT NULL THEN '/clients/' || v_e.client_id::text ELSE '/leads/' || v_e.lead_id::text END,
      'journey_step:' || _enrollment_id::text || ':' || _step_id::text
    )
    ON CONFLICT (user_id, dedupe_key) DO NOTHING;
    v_result := jsonb_build_object('notified', v_e.counselor_id);
  ELSIF v_s.action_type = 'create_promotion_request' AND v_e.counselor_id IS NOT NULL THEN
    INSERT INTO public.promotion_requests (
      title, description, requested_by, status, target_audience
    ) VALUES (
      v_title,
      v_body,
      v_e.counselor_id,
      'pending',
      CASE WHEN v_e.client_id IS NOT NULL THEN 'client' ELSE 'lead' END
    )
    RETURNING id INTO v_req_id;
    v_result := jsonb_build_object('promotion_request_id', v_req_id);
  ELSE
    v_result := jsonb_build_object('logged', true, 'channel', v_s.channel);
  END IF;

  IF v_e.client_id IS NOT NULL THEN
    INSERT INTO public.client_timeline (client_id, event_type, actor_id, summary, metadata, is_staff_only)
    VALUES (
      v_e.client_id,
      'offer_journey',
      v_e.counselor_id,
      v_title || ' · ' || v_s.channel,
      jsonb_build_object('enrollment_id', _enrollment_id, 'step_id', _step_id, 'channel', v_s.channel),
      true
    );
  END IF;

  INSERT INTO public.offer_journey_step_log (enrollment_id, step_id, channel, action_type, result)
  VALUES (_enrollment_id, _step_id, v_s.channel, v_s.action_type, v_result);

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_process_due_journey_steps(_limit int DEFAULT 200)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_e record;
  v_step public.offer_journey_steps%ROWTYPE;
  v_next public.offer_journey_steps%ROWTYPE;
  v_processed int := 0;
  v_completed int := 0;
BEGIN
  FOR v_e IN
    SELECT e.*
      FROM public.offer_journey_enrollments e
      JOIN public.offer_automation_journeys j ON j.id = e.journey_id AND j.is_active
     WHERE e.status = 'active'
       AND e.next_step_at IS NOT NULL
       AND e.next_step_at <= CURRENT_DATE
     ORDER BY e.next_step_at
     LIMIT coalesce(_limit, 200)
     FOR UPDATE OF e
  LOOP
    SELECT * INTO v_step
      FROM public.offer_journey_steps s
     WHERE s.journey_id = v_e.journey_id
     ORDER BY s.sort_order
     OFFSET v_e.current_step_index
     LIMIT 1;

    IF NOT FOUND THEN
      UPDATE public.offer_journey_enrollments
         SET status = 'completed', completed_at = now(), next_step_at = NULL
       WHERE id = v_e.id;
      v_completed := v_completed + 1;
      CONTINUE;
    END IF;

    PERFORM public.fn_execute_journey_step(v_e.id, v_step.id);

    SELECT * INTO v_next
      FROM public.offer_journey_steps s
     WHERE s.journey_id = v_e.journey_id
     ORDER BY s.sort_order
     OFFSET v_e.current_step_index + 1
     LIMIT 1;

    IF NOT FOUND THEN
      UPDATE public.offer_journey_enrollments
         SET status = 'completed',
             completed_at = now(),
             current_step_index = v_e.current_step_index + 1,
             next_step_at = NULL
       WHERE id = v_e.id;
      v_completed := v_completed + 1;
    ELSE
      UPDATE public.offer_journey_enrollments
         SET current_step_index = v_e.current_step_index + 1,
             next_step_at = (v_e.enrolled_at::date + v_next.day_offset)
       WHERE id = v_e.id;
    END IF;

    v_processed := v_processed + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'processed', v_processed,
    'completed', v_completed
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_enroll_offer_journey(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_execute_journey_step(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_process_due_journey_steps(int) TO authenticated;

COMMENT ON TABLE public.offer_automation_journeys IS 'Phase 5O O7 — multi-step offer automation journeys';
COMMENT ON FUNCTION public.fn_process_due_journey_steps IS 'Called daily from offers-lifecycle-tick';
