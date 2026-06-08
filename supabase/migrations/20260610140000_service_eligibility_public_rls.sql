-- Allow anonymous public eligibility check/save when edge function is unavailable

DROP POLICY IF EXISTS assessment_sessions_public_eligibility_insert ON public.assessment_sessions;
CREATE POLICY assessment_sessions_public_eligibility_insert ON public.assessment_sessions
  FOR INSERT TO anon
  WITH CHECK (
    assessment_kind = 'service_eligibility'
    AND source = 'public_link'
    AND public_token IS NOT NULL
  );

DROP POLICY IF EXISTS assessment_sessions_public_eligibility_select ON public.assessment_sessions;
CREATE POLICY assessment_sessions_public_eligibility_select ON public.assessment_sessions
  FOR SELECT TO anon
  USING (
    assessment_kind = 'service_eligibility'
    AND public_token IS NOT NULL
  );

DROP POLICY IF EXISTS assessment_sessions_public_eligibility_update ON public.assessment_sessions;
CREATE POLICY assessment_sessions_public_eligibility_update ON public.assessment_sessions
  FOR UPDATE TO anon
  USING (
    assessment_kind = 'service_eligibility'
    AND public_token IS NOT NULL
    AND status IN ('draft', 'in_progress')
  )
  WITH CHECK (
    assessment_kind = 'service_eligibility'
    AND public_token IS NOT NULL
    AND status IN ('draft', 'in_progress', 'submitted')
  );
