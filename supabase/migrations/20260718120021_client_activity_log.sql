-- Client Activity Log — structured audit trail for CRM accountability.
-- Preserves all historical sources; backfills without deleting source tables.

CREATE TABLE IF NOT EXISTS public.client_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role text,
  action text NOT NULL,
  summary text,
  previous_value text,
  new_value text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_table text,
  source_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_activity_log_client_created
  ON public.client_activity_log (client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_activity_log_lead
  ON public.client_activity_log (lead_id, created_at DESC)
  WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_client_activity_log_action
  ON public.client_activity_log (client_id, action, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_activity_log_source_unique
  ON public.client_activity_log (source_table, source_id, client_id)
  WHERE source_table IS NOT NULL AND source_id IS NOT NULL;

ALTER TABLE public.client_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_activity_log staff create" ON public.client_activity_log;
CREATE POLICY "client_activity_log staff create"
  ON public.client_activity_log FOR INSERT TO authenticated
  WITH CHECK (
    public.can_edit_client(auth.uid(), client_id)
    AND (actor_id IS NULL OR actor_id = auth.uid())
  );

DROP POLICY IF EXISTS "client_activity_log view scoped" ON public.client_activity_log;
CREATE POLICY "client_activity_log view scoped"
  ON public.client_activity_log FOR SELECT TO authenticated
  USING (public.can_view_client(auth.uid(), client_id));

-- Resolve primary CRM role label for an actor (best-effort).
CREATE OR REPLACE FUNCTION public.fn_client_activity_actor_role(_uid uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT ur.role::text
      FROM public.user_roles ur
      WHERE ur.user_id = _uid
      ORDER BY CASE ur.role
        WHEN 'admin' THEN 1
        WHEN 'counselor' THEN 2
        WHEN 'documentation' THEN 3
        WHEN 'telecaller' THEN 4
        WHEN 'viewer' THEN 5
        ELSE 6
      END
      LIMIT 1
    ),
    'staff'
  );
$$;

-- Backfill: client_timeline → client_activity_log
INSERT INTO public.client_activity_log (
  client_id, actor_id, actor_role, action, summary, previous_value, new_value, metadata,
  source_table, source_id, created_at
)
SELECT
  ct.client_id,
  ct.actor_id,
  public.fn_client_activity_actor_role(ct.actor_id),
  ct.event_type,
  ct.summary,
  ct.metadata->>'previous_value',
  ct.metadata->>'new_value',
  COALESCE(ct.metadata, '{}'::jsonb),
  'client_timeline',
  ct.id,
  ct.created_at
FROM public.client_timeline ct
WHERE NOT EXISTS (
  SELECT 1 FROM public.client_activity_log cal
  WHERE cal.source_table = 'client_timeline' AND cal.source_id = ct.id
);

-- Backfill: stage completion log
INSERT INTO public.client_activity_log (
  client_id, actor_id, actor_role, action, summary, previous_value, new_value, metadata,
  source_table, source_id, created_at
)
SELECT
  log.client_id,
  log.actor_id,
  public.fn_client_activity_actor_role(log.actor_id),
  CASE log.action
    WHEN 'tick' THEN 'stage_completed'
    WHEN 'untick' THEN 'stage_uncompleted'
    WHEN 'note_cleared' THEN 'stage_note_cleared'
    ELSE 'stage_' || log.action
  END,
  COALESCE(ps.client_label, ps.label, 'Stage'),
  CASE log.action
    WHEN 'tick' THEN NULL
    WHEN 'untick' THEN COALESCE(ps.client_label, ps.label)
    WHEN 'note_cleared' THEN log.note
    ELSE NULL
  END,
  CASE log.action
    WHEN 'tick' THEN COALESCE(ps.client_label, ps.label)
    WHEN 'untick' THEN NULL
    WHEN 'note_cleared' THEN NULL
    ELSE log.note
  END,
  jsonb_build_object(
    'stage_id', log.stage_id,
    'pipeline_id', log.pipeline_id,
    'case_id', log.case_id,
    'note', log.note,
    'completion_action', log.action
  ),
  'client_stage_completion_log',
  log.id,
  log.created_at
FROM public.client_stage_completion_log log
LEFT JOIN public.pipeline_stages ps ON ps.id = log.stage_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.client_activity_log cal
  WHERE cal.source_table = 'client_stage_completion_log' AND cal.source_id = log.id
);

-- Backfill: stage history (entered stage)
INSERT INTO public.client_activity_log (
  client_id, actor_id, actor_role, action, summary, previous_value, new_value, metadata,
  source_table, source_id, created_at
)
SELECT
  h.client_id,
  h.entered_by,
  public.fn_client_activity_actor_role(h.entered_by),
  'stage_entered',
  COALESCE(ps.client_label, ps.label, 'Stage entered'),
  NULL,
  COALESCE(ps.client_label, ps.label),
  jsonb_build_object(
    'stage_id', h.stage_id,
    'pipeline_id', h.pipeline_id,
    'notes', h.notes,
    'stage_metadata', h.metadata
  ),
  'client_stage_history',
  h.id,
  h.entered_at
FROM public.client_stage_history h
LEFT JOIN public.pipeline_stages ps ON ps.id = h.stage_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.client_activity_log cal
  WHERE cal.source_table = 'client_stage_history' AND cal.source_id = h.id
);

-- Backfill: activity_logs scoped to clients
INSERT INTO public.client_activity_log (
  client_id, actor_id, actor_role, action, summary, metadata,
  source_table, source_id, created_at
)
SELECT
  al.entity_id,
  al.user_id,
  public.fn_client_activity_actor_role(al.user_id),
  al.action,
  COALESCE(al.details->>'summary', al.action),
  COALESCE(al.details, '{}'::jsonb),
  'activity_logs',
  al.id,
  al.created_at
FROM public.activity_logs al
WHERE al.entity_type = 'client'
  AND al.entity_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.client_activity_log cal
    WHERE cal.source_table = 'activity_logs' AND cal.source_id = al.id
  );

-- Backfill: activity_logs for documents → resolve client_id
INSERT INTO public.client_activity_log (
  client_id, actor_id, actor_role, action, summary, metadata,
  source_table, source_id, created_at
)
SELECT
  cd.client_id,
  al.user_id,
  public.fn_client_activity_actor_role(al.user_id),
  al.action,
  COALESCE(al.details->>'file_name', al.action),
  COALESCE(al.details, '{}'::jsonb),
  'activity_logs',
  al.id,
  al.created_at
FROM public.activity_logs al
JOIN public.client_documents cd ON cd.id = al.entity_id
WHERE al.entity_type = 'document'
  AND NOT EXISTS (
    SELECT 1 FROM public.client_activity_log cal
    WHERE cal.source_table = 'activity_logs' AND cal.source_id = al.id
  );

-- Backfill: lead history for already-converted clients
INSERT INTO public.client_activity_log (
  client_id, lead_id, actor_id, actor_role, action, summary, new_value, metadata,
  source_table, source_id, created_at
)
SELECT
  c.id,
  l.id,
  l.created_by,
  public.fn_client_activity_actor_role(l.created_by),
  'lead_created',
  'Lead created',
  l.lead_number || ' — ' || TRIM(COALESCE(l.first_name, '') || ' ' || COALESCE(l.last_name, '')),
  jsonb_build_object('lead_number', l.lead_number, 'lead_temperature', l.lead_temperature),
  'leads',
  l.id,
  l.created_at
FROM public.clients c
JOIN public.leads l ON l.id = c.source_lead_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.client_activity_log cal
  WHERE cal.source_table = 'leads' AND cal.source_id = l.id AND cal.client_id = c.id AND cal.action = 'lead_created'
);

INSERT INTO public.client_activity_log (
  client_id, lead_id, actor_id, actor_role, action, summary, metadata,
  source_table, source_id, created_at
)
SELECT
  c.id,
  l.id,
  l.created_by,
  public.fn_client_activity_actor_role(l.created_by),
  'lead_converted',
  'Lead converted to client',
  jsonb_build_object(
    'lead_number', l.lead_number,
    'registration_number', c.registration_number,
    'converted_at', l.converted_at
  ),
  'leads_converted',
  l.id,
  COALESCE(l.converted_at, c.converted_at, c.created_at)
FROM public.clients c
JOIN public.leads l ON l.id = c.source_lead_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.client_activity_log cal
  WHERE cal.source_table = 'leads_converted' AND cal.source_id = l.id AND cal.client_id = c.id
);

-- Backfill: lead remarks linked to client
INSERT INTO public.client_activity_log (
  client_id, actor_id, actor_role, action, summary, new_value, metadata,
  source_table, source_id, created_at
)
SELECT
  lr.client_id,
  lr.author_id,
  public.fn_client_activity_actor_role(lr.author_id),
  'note_added',
  'Remark added',
  lr.remark,
  jsonb_build_object('outcome', lr.outcome, 'lead_status', lr.lead_status),
  'lead_remarks',
  lr.id,
  lr.created_at
FROM public.lead_remarks lr
WHERE lr.client_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.client_activity_log cal
    WHERE cal.source_table = 'lead_remarks' AND cal.source_id = lr.id
  );

-- Backfill: client tasks lifecycle snapshot
INSERT INTO public.client_activity_log (
  client_id, actor_id, actor_role, action, summary, new_value, metadata,
  source_table, source_id, created_at
)
SELECT
  t.client_id,
  t.created_by,
  public.fn_client_activity_actor_role(t.created_by),
  'task_created',
  t.title,
  COALESCE(t.description, t.title),
  jsonb_build_object(
    'task_id', t.id,
    'assigned_to', t.assigned_to,
    'due_at', t.due_at,
    'status', t.status,
    'priority', t.priority
  ),
  'client_tasks',
  t.id,
  t.created_at
FROM public.client_tasks t
WHERE NOT EXISTS (
  SELECT 1 FROM public.client_activity_log cal
  WHERE cal.source_table = 'client_tasks' AND cal.source_id = t.id AND cal.client_id = t.client_id
);
