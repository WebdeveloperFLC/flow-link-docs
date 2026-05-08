
-- Atomic queue claim — returns the row claimed (or NULL if queue empty)
CREATE OR REPLACE FUNCTION public.claim_next_queue_item(_agent_id uuid, _campaign_id uuid DEFAULT NULL)
RETURNS public.call_queue_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  picked public.call_queue_items;
BEGIN
  -- Recover stale calling items first
  UPDATE public.call_queue_items
     SET status = 'queued', assigned_agent_id = NULL
   WHERE status = 'calling'
     AND last_called_at IS NOT NULL
     AND last_called_at < now() - interval '10 minutes';

  -- Refuse to hand out a new call if the agent already has one active
  IF EXISTS (
    SELECT 1 FROM public.call_queue_items
     WHERE assigned_agent_id = _agent_id AND status = 'calling'
  ) THEN
    RAISE EXCEPTION 'agent already has an active call'
      USING ERRCODE = '55000';
  END IF;

  WITH next_item AS (
    SELECT id
      FROM public.call_queue_items
     WHERE (
             status = 'queued'
             OR (status = 'callback' AND next_call_at IS NOT NULL AND next_call_at <= now())
           )
       AND (_campaign_id IS NULL OR campaign_id = _campaign_id)
     ORDER BY priority DESC, created_at ASC
     LIMIT 1
     FOR UPDATE SKIP LOCKED
  )
  UPDATE public.call_queue_items q
     SET status = 'calling',
         assigned_agent_id = _agent_id,
         last_called_at = now()
    FROM next_item
   WHERE q.id = next_item.id
  RETURNING q.* INTO picked;

  RETURN picked;
END;
$$;

-- Stale-call sweep callable on its own
CREATE OR REPLACE FUNCTION public.recover_stale_calling_items()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH stale AS (
    UPDATE public.call_queue_items
       SET status = 'queued', assigned_agent_id = NULL
     WHERE status = 'calling'
       AND last_called_at IS NOT NULL
       AND last_called_at < now() - interval '10 minutes'
    RETURNING 1
  )
  SELECT COALESCE(count(*),0)::int FROM stale;
$$;
