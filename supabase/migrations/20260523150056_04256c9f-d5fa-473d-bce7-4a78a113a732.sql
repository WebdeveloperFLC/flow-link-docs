
REVOKE SELECT (token) ON public.client_portal_invites FROM authenticated, anon;
REVOKE SELECT (token) ON public.assessment_invitations FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public.get_portal_invite_token(_invite_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_token text; v_invited_by uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='28000'; END IF;
  SELECT token, invited_by INTO v_token, v_invited_by
    FROM public.client_portal_invites WHERE id = _invite_id;
  IF v_token IS NULL THEN RETURN NULL; END IF;
  IF NOT (public.has_role(auth.uid(),'admin'::app_role) OR v_invited_by = auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501';
  END IF;
  RETURN v_token;
END $$;
REVOKE ALL ON FUNCTION public.get_portal_invite_token(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_portal_invite_token(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_assessment_invite_token(_invite_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_token text; v_invited_by uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='28000'; END IF;
  SELECT token, invited_by INTO v_token, v_invited_by
    FROM public.assessment_invitations WHERE id = _invite_id;
  IF v_token IS NULL THEN RETURN NULL; END IF;
  IF NOT (public.has_role(auth.uid(),'admin'::app_role) OR v_invited_by = auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501';
  END IF;
  RETURN v_token;
END $$;
REVOKE ALL ON FUNCTION public.get_assessment_invite_token(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_assessment_invite_token(uuid) TO authenticated;

DROP POLICY IF EXISTS assessment_email_verifications_deny_anon ON public.assessment_email_verifications;
CREATE POLICY assessment_email_verifications_deny_anon
  ON public.assessment_email_verifications
  AS PERMISSIVE FOR ALL TO anon
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "dsh_media insert self" ON public.dsh_media;

DROP POLICY IF EXISTS "leads select" ON public.leads;
CREATE POLICY "leads select" ON public.leads
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR is_accounting_admin(auth.uid())
    OR auth.uid() = created_by
    OR auth.uid() = assigned_counselor_id
  );

DROP POLICY IF EXISTS "leads update" ON public.leads;
CREATE POLICY "leads update" ON public.leads
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR is_accounting_admin(auth.uid())
    OR auth.uid() = created_by
    OR auth.uid() = assigned_counselor_id
  );

DROP POLICY IF EXISTS "profiles readable by self or staff" ON public.profiles;
CREATE POLICY "profiles readable by self or staff" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'counselor'::app_role)
  );
