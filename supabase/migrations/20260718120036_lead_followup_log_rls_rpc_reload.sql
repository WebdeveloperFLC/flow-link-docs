-- Staff write access on lead_followup_log (RPC fallback path) + refresh PostgREST schema cache.

DROP POLICY IF EXISTS "lead_followup_log staff insert" ON public.lead_followup_log;
CREATE POLICY "lead_followup_log staff insert"
  ON public.lead_followup_log FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_id
        AND (
          public.has_role(auth.uid(), 'admin'::public.app_role)
          OR public.is_accounting_admin(auth.uid())
          OR public.is_commission_admin(auth.uid())
          OR public.has_role(auth.uid(), 'counselor'::public.app_role)
          OR public.has_role(auth.uid(), 'documentation'::public.app_role)
          OR public.has_role(auth.uid(), 'telecaller'::public.app_role)
          OR auth.uid() = l.created_by
          OR auth.uid() = l.assigned_counselor_id
        )
    )
  );

DROP POLICY IF EXISTS "lead_followup_log staff update" ON public.lead_followup_log;
CREATE POLICY "lead_followup_log staff update"
  ON public.lead_followup_log FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_id
        AND (
          public.has_role(auth.uid(), 'admin'::public.app_role)
          OR public.is_accounting_admin(auth.uid())
          OR public.is_commission_admin(auth.uid())
          OR public.has_role(auth.uid(), 'counselor'::public.app_role)
          OR public.has_role(auth.uid(), 'documentation'::public.app_role)
          OR public.has_role(auth.uid(), 'telecaller'::public.app_role)
          OR auth.uid() = l.created_by
          OR auth.uid() = l.assigned_counselor_id
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_id
        AND (
          public.has_role(auth.uid(), 'admin'::public.app_role)
          OR public.is_accounting_admin(auth.uid())
          OR public.is_commission_admin(auth.uid())
          OR public.has_role(auth.uid(), 'counselor'::public.app_role)
          OR public.has_role(auth.uid(), 'documentation'::public.app_role)
          OR public.has_role(auth.uid(), 'telecaller'::public.app_role)
          OR auth.uid() = l.created_by
          OR auth.uid() = l.assigned_counselor_id
        )
    )
  );

-- Idempotent: ensure RPCs exist after publish (reload API schema).
CREATE OR REPLACE FUNCTION public.sync_lead_followup_log(
  _lead_id uuid,
  _scheduled_at timestamptz,
  _channel text,
  _note text
)
RETURNS public.lead_followup_log
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  rec public.lead_followup_log;
BEGIN
  PERFORM public._assert_can_edit_lead(uid, _lead_id);

  IF _scheduled_at IS NULL THEN
    UPDATE public.lead_followup_log f
       SET status = 'cancelled'
     WHERE f.lead_id = _lead_id
       AND f.status = 'scheduled';

    UPDATE public.leads l
       SET next_followup_at = NULL,
           followup_channel = NULL,
           followup_note = NULL
     WHERE l.id = _lead_id;

    RETURN NULL;
  END IF;

  SELECT * INTO rec
    FROM public.lead_followup_log f
   WHERE f.lead_id = _lead_id
     AND f.status = 'scheduled'
   LIMIT 1;

  IF rec.id IS NOT NULL THEN
    UPDATE public.lead_followup_log f
       SET scheduled_at = _scheduled_at,
           channel = NULLIF(trim(_channel), ''),
           note = NULLIF(trim(_note), '')
     WHERE f.id = rec.id
     RETURNING * INTO rec;
  ELSE
    INSERT INTO public.lead_followup_log (
      lead_id, scheduled_at, channel, note, status, created_by
    ) VALUES (
      _lead_id,
      _scheduled_at,
      NULLIF(trim(_channel), ''),
      NULLIF(trim(_note), ''),
      'scheduled',
      uid
    )
    RETURNING * INTO rec;
  END IF;

  UPDATE public.leads l
     SET next_followup_at = _scheduled_at,
         followup_channel = NULLIF(trim(_channel), ''),
         followup_note = NULLIF(trim(_note), '')
   WHERE l.id = _lead_id;

  RETURN rec;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_lead_followup(
  _lead_id uuid,
  _completion_note text DEFAULT NULL
)
RETURNS public.lead_followup_log
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  rec public.lead_followup_log;
BEGIN
  PERFORM public._assert_can_edit_lead(uid, _lead_id);

  SELECT * INTO rec
    FROM public.lead_followup_log f
   WHERE f.lead_id = _lead_id
     AND f.status = 'scheduled'
   ORDER BY f.created_at DESC
   LIMIT 1;

  IF rec.id IS NULL THEN
    RAISE EXCEPTION 'No scheduled follow-up to complete' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.lead_followup_log f
     SET status = 'completed',
         completed_at = now(),
         completed_by = uid,
         completion_note = NULLIF(trim(_completion_note), '')
   WHERE f.id = rec.id
  RETURNING * INTO rec;

  UPDATE public.leads l
     SET next_followup_at = NULL,
         followup_channel = NULL,
         followup_note = NULL
   WHERE l.id = _lead_id;

  RETURN rec;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_lead_followup_log(uuid, timestamptz, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_lead_followup(uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
