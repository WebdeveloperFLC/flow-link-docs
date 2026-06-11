-- Public full Settle Abroad assessments (Express Entry CRS, Germany Chancenkarte, etc.)

DROP POLICY IF EXISTS assessment_sessions_public_settle_abroad_insert ON public.assessment_sessions;
CREATE POLICY assessment_sessions_public_settle_abroad_insert ON public.assessment_sessions
  FOR INSERT TO anon
  WITH CHECK (
    assessment_kind = 'settle_abroad'
    AND source = 'public_link'
    AND public_token IS NOT NULL
  );

DROP POLICY IF EXISTS assessment_sessions_public_settle_abroad_select ON public.assessment_sessions;
CREATE POLICY assessment_sessions_public_settle_abroad_select ON public.assessment_sessions
  FOR SELECT TO anon
  USING (
    assessment_kind = 'settle_abroad'
    AND public_token IS NOT NULL
  );

DROP POLICY IF EXISTS assessment_sessions_public_settle_abroad_update ON public.assessment_sessions;
CREATE POLICY assessment_sessions_public_settle_abroad_update ON public.assessment_sessions
  FOR UPDATE TO anon
  USING (
    assessment_kind = 'settle_abroad'
    AND public_token IS NOT NULL
    AND status IN ('draft', 'in_progress')
  )
  WITH CHECK (
    assessment_kind = 'settle_abroad'
    AND public_token IS NOT NULL
    AND status IN ('draft', 'in_progress', 'submitted')
  );

-- Prospects need to load the questionnaire without signing in
DROP POLICY IF EXISTS assessment_questions_anon_read ON public.assessment_questions;
CREATE POLICY assessment_questions_anon_read ON public.assessment_questions
  FOR SELECT TO anon
  USING (is_active = true);
