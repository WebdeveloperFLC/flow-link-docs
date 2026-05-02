CREATE TABLE public.call_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  received_at timestamptz NOT NULL DEFAULT now(),
  event_type text,
  direction text,
  from_number text,
  to_number text,
  duration_seconds integer,
  recording_url text,
  call_id text,
  status text,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  client_id uuid,
  matched_at timestamptz
);

CREATE INDEX idx_call_events_received_at ON public.call_events (received_at DESC);
CREATE INDEX idx_call_events_client_id ON public.call_events (client_id);
CREATE INDEX idx_call_events_from_number ON public.call_events (from_number);
CREATE INDEX idx_call_events_to_number ON public.call_events (to_number);

ALTER TABLE public.call_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "call_events readable by authenticated"
ON public.call_events FOR SELECT TO authenticated USING (true);

CREATE POLICY "team updates call_events"
ON public.call_events FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'counselor'::app_role) OR has_role(auth.uid(), 'documentation'::app_role));

CREATE POLICY "admins delete call_events"
ON public.call_events FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
