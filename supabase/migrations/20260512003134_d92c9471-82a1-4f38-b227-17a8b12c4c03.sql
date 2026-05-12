CREATE POLICY "assessment_sessions_portal_client_select"
ON public.assessment_sessions FOR SELECT
USING (
  client_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.client_portal_links l
    WHERE l.client_id = assessment_sessions.client_id AND l.user_id = auth.uid()
  )
);