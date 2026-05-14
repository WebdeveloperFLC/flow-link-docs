
-- 1) Assignees table
CREATE TABLE IF NOT EXISTS public.assessment_assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.assessment_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text,
  assigned_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_assessment_assignees_user ON public.assessment_assignees(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_assignees_session ON public.assessment_assignees(session_id);

ALTER TABLE public.assessment_assignees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS assessment_assignees_admin_all ON public.assessment_assignees;
CREATE POLICY assessment_assignees_admin_all ON public.assessment_assignees
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS assessment_assignees_self_select ON public.assessment_assignees;
CREATE POLICY assessment_assignees_self_select ON public.assessment_assignees
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 2) Helper: can a user access a given session?
CREATE OR REPLACE FUNCTION public.can_access_assessment_session(_uid uuid, _sid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_uid, 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.assessment_sessions s
      WHERE s.id = _sid
        AND (
          s.assigned_counselor_id = _uid
          OR EXISTS (SELECT 1 FROM public.assessment_assignees a WHERE a.session_id = s.id AND a.user_id = _uid)
          OR (s.client_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.clients c
             WHERE c.id = s.client_id AND (c.owner_id = _uid OR c.created_by = _uid)
          ))
          OR (s.client_id IS NOT NULL AND public.user_client_permission(_uid, s.client_id) IS NOT NULL)
        )
    )
$$;

-- 3) Sessions: drop broad staff policies and replace with scoped ones
DROP POLICY IF EXISTS assessment_sessions_staff_all ON public.assessment_sessions;
DROP POLICY IF EXISTS assessment_sessions_staff_select ON public.assessment_sessions;
DROP POLICY IF EXISTS assessment_sessions_staff_update ON public.assessment_sessions;
DROP POLICY IF EXISTS assessment_sessions_telecaller_select ON public.assessment_sessions;
DROP POLICY IF EXISTS assessment_sessions_documentation_select ON public.assessment_sessions;

DROP POLICY IF EXISTS assessment_sessions_admin_all ON public.assessment_sessions;
CREATE POLICY assessment_sessions_admin_all ON public.assessment_sessions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS assessment_sessions_scoped_select ON public.assessment_sessions;
CREATE POLICY assessment_sessions_scoped_select ON public.assessment_sessions
  FOR SELECT TO authenticated
  USING (
    assigned_counselor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.assessment_assignees a WHERE a.session_id = assessment_sessions.id AND a.user_id = auth.uid())
    OR (client_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.clients c
       WHERE c.id = assessment_sessions.client_id AND (c.owner_id = auth.uid() OR c.created_by = auth.uid())
    ))
    OR (client_id IS NOT NULL AND public.user_client_permission(auth.uid(), assessment_sessions.client_id) IS NOT NULL)
  );

DROP POLICY IF EXISTS assessment_sessions_scoped_update ON public.assessment_sessions;
CREATE POLICY assessment_sessions_scoped_update ON public.assessment_sessions
  FOR UPDATE TO authenticated
  USING (
    assigned_counselor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.assessment_assignees a WHERE a.session_id = assessment_sessions.id AND a.user_id = auth.uid())
    OR (client_id IS NOT NULL AND public.user_client_permission(auth.uid(), assessment_sessions.client_id) IN ('edit','upload','full'))
  )
  WITH CHECK (true);

DROP POLICY IF EXISTS assessment_sessions_scoped_insert ON public.assessment_sessions;
CREATE POLICY assessment_sessions_scoped_insert ON public.assessment_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'counselor'::app_role)
    OR (client_id IS NOT NULL AND public.user_client_permission(auth.uid(), client_id) IN ('edit','upload','full'))
  );

-- 4) Leads: drop broad staff policies, keep self/portal, add scoped staff visibility
DROP POLICY IF EXISTS assessment_leads_staff_all ON public.assessment_leads;
DROP POLICY IF EXISTS assessment_leads_documentation_select ON public.assessment_leads;

DROP POLICY IF EXISTS assessment_leads_admin_all ON public.assessment_leads;
CREATE POLICY assessment_leads_admin_all ON public.assessment_leads
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS assessment_leads_scoped_select ON public.assessment_leads;
CREATE POLICY assessment_leads_scoped_select ON public.assessment_leads
  FOR SELECT TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.assessment_sessions s
      WHERE s.lead_id = assessment_leads.id
        AND (
          s.assigned_counselor_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.assessment_assignees a WHERE a.session_id = s.id AND a.user_id = auth.uid())
        )
    )
    OR (client_id IS NOT NULL AND public.user_client_permission(auth.uid(), client_id) IS NOT NULL)
  );

-- 5) Auto-assign creator: when a counselor creates a session, ensure they're recorded
CREATE OR REPLACE FUNCTION public.fn_assessment_session_autoassign()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.assigned_counselor_id IS NOT NULL THEN
    INSERT INTO public.assessment_assignees (session_id, user_id, role, assigned_by)
    VALUES (NEW.id, NEW.assigned_counselor_id, 'creator', NEW.assigned_counselor_id)
    ON CONFLICT (session_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_assessment_session_autoassign ON public.assessment_sessions;
CREATE TRIGGER trg_assessment_session_autoassign
AFTER INSERT ON public.assessment_sessions
FOR EACH ROW EXECUTE FUNCTION public.fn_assessment_session_autoassign();

-- 6) Backfill assignees from existing sessions
INSERT INTO public.assessment_assignees (session_id, user_id, role, assigned_by)
SELECT id, assigned_counselor_id, 'creator', assigned_counselor_id
  FROM public.assessment_sessions
 WHERE assigned_counselor_id IS NOT NULL
ON CONFLICT (session_id, user_id) DO NOTHING;
