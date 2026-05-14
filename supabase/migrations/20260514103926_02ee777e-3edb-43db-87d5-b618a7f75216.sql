-- Avoid recursive RLS between assessment_leads and assessment_sessions while keeping simple creator-only visibility.
CREATE OR REPLACE FUNCTION public.assessment_lead_has_creator(_lead_id uuid, _uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.assessment_sessions s
     WHERE s.lead_id = _lead_id
       AND s.created_by = _uid
  )
$$;

DROP POLICY IF EXISTS assessment_leads_creator_select ON public.assessment_leads;
CREATE POLICY assessment_leads_creator_select ON public.assessment_leads
  FOR SELECT TO authenticated
  USING (public.assessment_lead_has_creator(id, auth.uid()));