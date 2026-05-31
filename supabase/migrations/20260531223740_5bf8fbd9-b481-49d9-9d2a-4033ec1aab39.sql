-- New statuses for two-way confirmation workflow
ALTER TYPE calendar_event_status ADD VALUE IF NOT EXISTS 'awaiting_requester';
ALTER TYPE calendar_event_status ADD VALUE IF NOT EXISTS 'confirmed';
ALTER TYPE calendar_event_status ADD VALUE IF NOT EXISTS 'declined_by_requester';
ALTER TYPE calendar_event_status ADD VALUE IF NOT EXISTS 'reschedule_requested';
ALTER TYPE calendar_event_status ADD VALUE IF NOT EXISTS 'rescheduled_awaiting';

-- Event columns
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS meeting_link text,
  ADD COLUMN IF NOT EXISTS host_remarks text,
  ADD COLUMN IF NOT EXISTS requester_response_at timestamptz,
  ADD COLUMN IF NOT EXISTS reschedule_proposed_date date,
  ADD COLUMN IF NOT EXISTS reschedule_proposed_start time,
  ADD COLUMN IF NOT EXISTS reschedule_proposed_end time,
  ADD COLUMN IF NOT EXISTS reschedule_reason text;

-- Audit notes
ALTER TABLE public.calendar_event_audit
  ADD COLUMN IF NOT EXISTS note text;

-- Single-use tokens
ALTER TABLE public.calendar_tokens
  ADD COLUMN IF NOT EXISTS used_at timestamptz;

-- Public read of tokens for visitor action page (token is unguessable)
DROP POLICY IF EXISTS "calendar_tokens public read" ON public.calendar_tokens;
CREATE POLICY "calendar_tokens public read" ON public.calendar_tokens
  FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.calendar_tokens TO anon;