-- Allow admins and counselors to manage assessment sessions
DROP POLICY IF EXISTS "assessment_sessions_staff_select" ON public.assessment_sessions;
CREATE POLICY "assessment_sessions_staff_select"
ON public.assessment_sessions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'counselor'::app_role));

DROP POLICY IF EXISTS "assessment_sessions_staff_update" ON public.assessment_sessions;
CREATE POLICY "assessment_sessions_staff_update"
ON public.assessment_sessions
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'counselor'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'counselor'::app_role));

-- Questions and programs need to be readable by anonymous + authenticated for the live CRS estimate
DROP POLICY IF EXISTS "assessment_questions_public_read" ON public.assessment_questions;
CREATE POLICY "assessment_questions_public_read"
ON public.assessment_questions
FOR SELECT
TO anon, authenticated
USING (is_active = true);