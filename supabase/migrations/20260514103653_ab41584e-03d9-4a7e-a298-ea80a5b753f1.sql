-- Roll back broken scoped assessment access and restore simple admin/all + creator-only staff visibility.

-- 1) Ensure sessions have a durable creator field for simple access rules.
ALTER TABLE public.assessment_sessions
  ADD COLUMN IF NOT EXISTS created_by uuid;

CREATE INDEX IF NOT EXISTS idx_assessment_sessions_created_by
  ON public.assessment_sessions(created_by);

-- Backfill existing sessions so data reappears immediately for the prior creator/owner.
UPDATE public.assessment_sessions s
   SET created_by = COALESCE(
     s.created_by,
     s.assigned_counselor_id,
     l.auth_user_id,
     c.created_by,
     c.owner_id
   )
  FROM public.assessment_leads l
  FULL JOIN public.clients c ON false
 WHERE (l.id = s.lead_id OR l.id IS NULL)
   AND (c.id = s.client_id OR c.id IS NULL)
   AND s.created_by IS NULL;

-- The FULL JOIN above can skip rows when both lead/client are null in some planners; make a simple final pass.
UPDATE public.assessment_sessions s
   SET created_by = COALESCE(s.created_by, s.assigned_counselor_id)
 WHERE s.created_by IS NULL;

-- 2) Default creator for future client-side inserts.
CREATE OR REPLACE FUNCTION public.fn_assessment_sessions_set_created_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_assessment_session_autoassign ON public.assessment_sessions;
DROP TRIGGER IF EXISTS trg_assessment_sessions_set_created_by ON public.assessment_sessions;
CREATE TRIGGER trg_assessment_sessions_set_created_by
BEFORE INSERT ON public.assessment_sessions
FOR EACH ROW EXECUTE FUNCTION public.fn_assessment_sessions_set_created_by();

-- 3) Remove broken assignee/function dependency.
DROP FUNCTION IF EXISTS public.fn_assessment_session_autoassign();
DROP FUNCTION IF EXISTS public.can_access_assessment_session(uuid, uuid);

-- 4) Replace assessment session policies with simple, permissive policies.
DROP POLICY IF EXISTS assessment_sessions_staff_all ON public.assessment_sessions;
DROP POLICY IF EXISTS assessment_sessions_staff_select ON public.assessment_sessions;
DROP POLICY IF EXISTS assessment_sessions_staff_update ON public.assessment_sessions;
DROP POLICY IF EXISTS assessment_sessions_telecaller_select ON public.assessment_sessions;
DROP POLICY IF EXISTS assessment_sessions_documentation_select ON public.assessment_sessions;
DROP POLICY IF EXISTS assessment_sessions_admin_all ON public.assessment_sessions;
DROP POLICY IF EXISTS assessment_sessions_scoped_select ON public.assessment_sessions;
DROP POLICY IF EXISTS assessment_sessions_scoped_update ON public.assessment_sessions;
DROP POLICY IF EXISTS assessment_sessions_scoped_insert ON public.assessment_sessions;

CREATE POLICY assessment_sessions_admin_all ON public.assessment_sessions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY assessment_sessions_creator_select ON public.assessment_sessions
  FOR SELECT TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY assessment_sessions_creator_update ON public.assessment_sessions
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY assessment_sessions_staff_insert ON public.assessment_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'counselor'::app_role)
    OR public.has_role(auth.uid(), 'documentation'::app_role)
    OR public.has_role(auth.uid(), 'telecaller'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.assessment_leads l
      WHERE l.id = assessment_sessions.lead_id AND l.auth_user_id = auth.uid()
    )
  );

-- Keep portal/client assessment flow intact.
DROP POLICY IF EXISTS assessment_sessions_self_select ON public.assessment_sessions;
CREATE POLICY assessment_sessions_self_select ON public.assessment_sessions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assessment_leads l WHERE l.id = assessment_sessions.lead_id AND l.auth_user_id = auth.uid()));

DROP POLICY IF EXISTS assessment_sessions_self_update ON public.assessment_sessions;
CREATE POLICY assessment_sessions_self_update ON public.assessment_sessions
  FOR UPDATE TO authenticated
  USING (status IN ('draft','in_progress') AND EXISTS (SELECT 1 FROM public.assessment_leads l WHERE l.id = assessment_sessions.lead_id AND l.auth_user_id = auth.uid()))
  WITH CHECK (status IN ('draft','in_progress','submitted') AND EXISTS (SELECT 1 FROM public.assessment_leads l WHERE l.id = assessment_sessions.lead_id AND l.auth_user_id = auth.uid()));

-- 5) Replace lead policies so admin sees all and staff can see leads tied to their created sessions.
DROP POLICY IF EXISTS assessment_leads_staff_all ON public.assessment_leads;
DROP POLICY IF EXISTS assessment_leads_documentation_select ON public.assessment_leads;
DROP POLICY IF EXISTS assessment_leads_admin_all ON public.assessment_leads;
DROP POLICY IF EXISTS assessment_leads_scoped_select ON public.assessment_leads;

CREATE POLICY assessment_leads_admin_all ON public.assessment_leads
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY assessment_leads_creator_select ON public.assessment_leads
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assessment_sessions s
      WHERE s.lead_id = assessment_leads.id
        AND s.created_by = auth.uid()
    )
  );

-- Keep lead self visibility intact.
DROP POLICY IF EXISTS assessment_leads_self_select ON public.assessment_leads;
CREATE POLICY assessment_leads_self_select ON public.assessment_leads
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

-- 6) Drop the assignment table after all dependencies are removed.
DROP TABLE IF EXISTS public.assessment_assignees;