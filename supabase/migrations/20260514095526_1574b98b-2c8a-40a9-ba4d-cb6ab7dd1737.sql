
-- Documentation role: read assessment leads + sessions
CREATE POLICY assessment_leads_documentation_select ON public.assessment_leads
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'documentation'::app_role));

CREATE POLICY assessment_sessions_documentation_select ON public.assessment_sessions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'documentation'::app_role));

-- Telecaller role: also read assessment_sessions (already had _all but only admin/counselor/telecaller; ensure select)
CREATE POLICY assessment_sessions_telecaller_select ON public.assessment_sessions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'telecaller'::app_role));

-- App email logs: allow staff (counselor/documentation/telecaller) to read their visibility (admins already covered)
CREATE POLICY app_email_logs_staff_read ON public.app_email_logs
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'counselor'::app_role)
    OR public.has_role(auth.uid(),'documentation'::app_role)
    OR public.has_role(auth.uid(),'telecaller'::app_role)
  );
