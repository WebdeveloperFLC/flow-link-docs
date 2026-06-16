-- Repair: backfill unique index must include client_id (multiple clients can share source_lead_id).
-- Safe to re-run after a partial apply of 20260718120021.

DROP INDEX IF EXISTS public.idx_client_activity_log_source_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_activity_log_source_unique
  ON public.client_activity_log (source_table, source_id, client_id)
  WHERE source_table IS NOT NULL AND source_id IS NOT NULL;

-- Re-run lead backfills (idempotent per client + lead)
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

-- Complete any remaining backfills from 20260718120021
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
