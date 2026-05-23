-- Defense-in-depth: force RLS even for table owners
ALTER TABLE public.assessment_invitations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.client_portal_invites FORCE ROW LEVEL SECURITY;
ALTER TABLE public.telephony_agents FORCE ROW LEVEL SECURITY;

-- Tighten SELECT on assessment_invitations: only inviter or admin
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'assessment_invitations' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.assessment_invitations', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Inviter or admin can view assessment invitations"
ON public.assessment_invitations
FOR SELECT
TO authenticated
USING (
  invited_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Tighten SELECT on client_portal_invites: only inviter or admin
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'client_portal_invites' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.client_portal_invites', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Inviter or admin can view portal invites"
ON public.client_portal_invites
FOR SELECT
TO authenticated
USING (
  invited_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
);
