
-- =============================================================================
-- TeleCMI Calling Module — Stage 1: Database & RLS (additive only)
-- =============================================================================
-- ROLLBACK NOTES (run in reverse order):
--   DROP VIEW IF EXISTS public.v_clients_masked;
--   DROP TABLE IF EXISTS public.telephony_audit_logs CASCADE;
--   DROP TABLE IF EXISTS public.call_sessions CASCADE;
--   DROP TABLE IF EXISTS public.call_queue_items CASCADE;
--   DROP TABLE IF EXISTS public.call_campaigns CASCADE;
--   DROP TABLE IF EXISTS public.telephony_agents CASCADE;
--   ALTER TABLE public.call_events DROP COLUMN IF EXISTS session_id, DROP COLUMN IF EXISTS provider, DROP COLUMN IF EXISTS provider_event_id;
--   DROP FUNCTION IF EXISTS public.is_telephony_admin(uuid);
--   DROP FUNCTION IF EXISTS public.user_telephony_agent_id(uuid);
--   DROP TYPE IF EXISTS public.telephony_role;
--   DROP TYPE IF EXISTS public.call_queue_status;
--   DROP TYPE IF EXISTS public.call_session_status;
--   DROP TYPE IF EXISTS public.call_direction;
-- =============================================================================

-- ---- ENUMS -------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.telephony_role AS ENUM ('telecaller','counselor','admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.call_queue_status AS ENUM
    ('queued','calling','no_answer','busy','callback','connected','enrolled','failed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.call_session_status AS ENUM
    ('initiated','ringing','answered','completed','failed','no_answer','busy','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.call_direction AS ENUM ('outbound','inbound');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---- telephony_agents --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.telephony_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  role public.telephony_role NOT NULL DEFAULT 'counselor',
  telecmi_agent_id text,
  is_on_break boolean NOT NULL DEFAULT false,
  is_available boolean NOT NULL DEFAULT false,
  current_campaign_id uuid,
  last_call_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.telephony_agents ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_telephony_agents_user ON public.telephony_agents(user_id);

-- Helper: get caller's agent id (SECURITY DEFINER, used by RLS)
CREATE OR REPLACE FUNCTION public.user_telephony_agent_id(_uid uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT id FROM public.telephony_agents WHERE user_id = _uid LIMIT 1 $$;

-- Helper: telephony admin = global admin role
CREATE OR REPLACE FUNCTION public.is_telephony_admin(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(_uid, 'admin'::app_role) $$;

CREATE POLICY "telephony_agents read own or admin" ON public.telephony_agents
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_telephony_admin(auth.uid()));

CREATE POLICY "telephony_agents update own availability or admin" ON public.telephony_agents
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_telephony_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_telephony_admin(auth.uid()));

CREATE POLICY "telephony_agents admin insert" ON public.telephony_agents
  FOR INSERT TO authenticated
  WITH CHECK (public.is_telephony_admin(auth.uid()));

CREATE POLICY "telephony_agents admin delete" ON public.telephony_agents
  FOR DELETE TO authenticated
  USING (public.is_telephony_admin(auth.uid()));

CREATE TRIGGER trg_telephony_agents_touch BEFORE UPDATE ON public.telephony_agents
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---- call_campaigns ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.call_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','completed')),
  assigned_team uuid,
  active_from timestamptz,
  active_to timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.call_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "call_campaigns read scoped" ON public.call_campaigns
  FOR SELECT TO authenticated
  USING (
    public.is_telephony_admin(auth.uid())
    OR (assigned_team IS NOT NULL AND public.is_team_member(auth.uid(), assigned_team))
  );

CREATE POLICY "call_campaigns admin write" ON public.call_campaigns
  FOR ALL TO authenticated
  USING (public.is_telephony_admin(auth.uid()))
  WITH CHECK (public.is_telephony_admin(auth.uid()));

CREATE TRIGGER trg_call_campaigns_touch BEFORE UPDATE ON public.call_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---- call_queue_items --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.call_queue_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.call_campaigns(id) ON DELETE SET NULL,
  client_id uuid NOT NULL,
  assigned_agent_id uuid REFERENCES public.telephony_agents(id) ON DELETE SET NULL,
  priority integer NOT NULL DEFAULT 0,
  status public.call_queue_status NOT NULL DEFAULT 'queued',
  retry_count integer NOT NULL DEFAULT 0,
  next_call_at timestamptz,
  last_called_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.call_queue_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_queue_status ON public.call_queue_items(status);
CREATE INDEX IF NOT EXISTS idx_queue_next_call ON public.call_queue_items(next_call_at);
CREATE INDEX IF NOT EXISTS idx_queue_client ON public.call_queue_items(client_id);
CREATE INDEX IF NOT EXISTS idx_queue_agent ON public.call_queue_items(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_queue_campaign ON public.call_queue_items(campaign_id);

-- Prevent duplicate active queue items per client
CREATE UNIQUE INDEX IF NOT EXISTS uq_queue_active_per_client
  ON public.call_queue_items(client_id)
  WHERE status IN ('queued','calling','callback');

-- Enforce one active call per agent
CREATE UNIQUE INDEX IF NOT EXISTS uq_queue_calling_per_agent
  ON public.call_queue_items(assigned_agent_id)
  WHERE status = 'calling' AND assigned_agent_id IS NOT NULL;

CREATE POLICY "queue read scoped" ON public.call_queue_items
  FOR SELECT TO authenticated
  USING (
    public.is_telephony_admin(auth.uid())
    OR assigned_agent_id = public.user_telephony_agent_id(auth.uid())
    OR public.can_view_client(auth.uid(), client_id)
  );

CREATE POLICY "queue insert admin or edit-rights" ON public.call_queue_items
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_telephony_admin(auth.uid())
    OR public.can_edit_client(auth.uid(), client_id)
  );

CREATE POLICY "queue update assigned agent or admin" ON public.call_queue_items
  FOR UPDATE TO authenticated
  USING (
    public.is_telephony_admin(auth.uid())
    OR assigned_agent_id = public.user_telephony_agent_id(auth.uid())
    OR public.can_edit_client(auth.uid(), client_id)
  );

CREATE POLICY "queue delete admin" ON public.call_queue_items
  FOR DELETE TO authenticated
  USING (public.is_telephony_admin(auth.uid()));

CREATE TRIGGER trg_queue_touch BEFORE UPDATE ON public.call_queue_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---- call_sessions -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.telephony_agents(id) ON DELETE SET NULL,
  client_id uuid,
  campaign_id uuid REFERENCES public.call_campaigns(id) ON DELETE SET NULL,
  queue_item_id uuid REFERENCES public.call_queue_items(id) ON DELETE SET NULL,
  provider text NOT NULL DEFAULT 'telecmi',
  telecmi_call_id text,
  direction public.call_direction NOT NULL DEFAULT 'outbound',
  status public.call_session_status NOT NULL DEFAULT 'initiated',
  start_time timestamptz,
  end_time timestamptz,
  duration_seconds integer,
  disposition text,
  recording_url text,
  masked_number_used text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_sessions_client ON public.call_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_sessions_agent ON public.call_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON public.call_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_provider_call ON public.call_sessions(provider, telecmi_call_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_sessions_provider_call
  ON public.call_sessions(provider, telecmi_call_id)
  WHERE telecmi_call_id IS NOT NULL;

-- NOTE: recording_url is a column in this table, but UI MUST fetch it via
-- the telephony-recording-url edge function (which writes an audit log).
-- Direct SELECT works only for the agent on the call, client viewers, or admin.
CREATE POLICY "sessions read scoped" ON public.call_sessions
  FOR SELECT TO authenticated
  USING (
    public.is_telephony_admin(auth.uid())
    OR agent_id = public.user_telephony_agent_id(auth.uid())
    OR (client_id IS NOT NULL AND public.can_view_client(auth.uid(), client_id))
  );

CREATE POLICY "sessions insert by agent or edit-rights" ON public.call_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_telephony_admin(auth.uid())
    OR agent_id = public.user_telephony_agent_id(auth.uid())
    OR (client_id IS NOT NULL AND public.can_edit_client(auth.uid(), client_id))
  );

CREATE POLICY "sessions update agent or admin" ON public.call_sessions
  FOR UPDATE TO authenticated
  USING (
    public.is_telephony_admin(auth.uid())
    OR agent_id = public.user_telephony_agent_id(auth.uid())
    OR (client_id IS NOT NULL AND public.can_edit_client(auth.uid(), client_id))
  );

CREATE POLICY "sessions delete admin" ON public.call_sessions
  FOR DELETE TO authenticated
  USING (public.is_telephony_admin(auth.uid()));

CREATE TRIGGER trg_sessions_touch BEFORE UPDATE ON public.call_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---- telephony_audit_logs ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.telephony_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  session_id uuid REFERENCES public.call_sessions(id) ON DELETE SET NULL,
  client_id uuid,
  event_type text NOT NULL, -- call_started | call_ended | disposition_changed | callback_scheduled | recording_accessed
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.telephony_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_tal_session ON public.telephony_audit_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_tal_actor ON public.telephony_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_tal_created ON public.telephony_audit_logs(created_at DESC);

CREATE POLICY "tal admin read" ON public.telephony_audit_logs
  FOR SELECT TO authenticated
  USING (public.is_telephony_admin(auth.uid()) OR actor_id = auth.uid());

CREATE POLICY "tal authenticated insert own" ON public.telephony_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid() OR public.is_telephony_admin(auth.uid()));
-- No UPDATE / DELETE policies = immutable audit trail.

-- ---- call_events: additive extension -----------------------------------------
ALTER TABLE public.call_events
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.call_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provider text DEFAULT 'telecmi',
  ADD COLUMN IF NOT EXISTS provider_event_id text;

CREATE INDEX IF NOT EXISTS idx_call_events_session ON public.call_events(session_id);
-- Idempotency: prevent duplicate webhook inserts
CREATE UNIQUE INDEX IF NOT EXISTS uq_call_events_provider_event
  ON public.call_events(provider, provider_event_id)
  WHERE provider_event_id IS NOT NULL;

-- Add a SELECT policy for team access via session linkage (additive — old policies remain).
CREATE POLICY "call_events read via session" ON public.call_events
  FOR SELECT TO authenticated
  USING (
    session_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.call_sessions s
      WHERE s.id = call_events.session_id
        AND (
          public.is_telephony_admin(auth.uid())
          OR s.agent_id = public.user_telephony_agent_id(auth.uid())
          OR (s.client_id IS NOT NULL AND public.can_view_client(auth.uid(), s.client_id))
        )
    )
  );

-- ---- v_clients_masked: redacted view for telephony screens -------------------
-- Phones are masked unless client.status = 'enrolled' OR caller is admin.
CREATE OR REPLACE VIEW public.v_clients_masked
WITH (security_invoker = true) AS
SELECT
  c.id,
  c.application_id,
  c.full_name,
  c.country,
  c.application_type,
  c.status,
  CASE
    WHEN c.phone IS NULL THEN NULL
    WHEN c.status = 'enrolled' OR public.is_telephony_admin(auth.uid()) THEN c.phone
    ELSE regexp_replace(c.phone, '.(?=.{3})', '●', 'g')
  END AS phone_display,
  (c.phone IS NOT NULL) AS has_phone,
  c.email,
  c.created_at,
  c.updated_at
FROM public.clients c;

GRANT SELECT ON public.v_clients_masked TO authenticated;
