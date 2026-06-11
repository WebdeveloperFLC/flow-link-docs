-- Include public prospect + service library context in staff submissions list

CREATE OR REPLACE FUNCTION public.list_assessment_sessions_admin(_limit int DEFAULT 200)
RETURNS TABLE (
  id uuid,
  status text,
  goal text,
  country text,
  answers jsonb,
  output jsonb,
  pdf_path text,
  submitted_at timestamptz,
  created_at timestamptz,
  assessment_kind text,
  source text,
  library_id uuid,
  prospect_name text,
  prospect_email text,
  prospect_phone text,
  client_name text,
  client_email text,
  client_phone text,
  lead_name text,
  lead_email text,
  lead_phone text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id,
    s.status::text,
    s.goal::text,
    s.country::text,
    s.answers,
    s.output,
    s.pdf_path,
    s.submitted_at,
    s.created_at,
    s.assessment_kind,
    s.source,
    s.library_id,
    s.prospect_name,
    s.prospect_email,
    s.prospect_phone,
    c.full_name,
    c.email,
    c.phone,
    NULLIF(btrim(concat_ws(' ', l.first_name, l.last_name)), '') AS lead_name,
    l.email,
    l.phone
  FROM public.assessment_sessions s
  LEFT JOIN public.clients c ON c.id = s.client_id
  LEFT JOIN public.assessment_leads l ON l.id = s.lead_id
  WHERE
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'counselor'::app_role)
    OR public.has_role(auth.uid(), 'telecaller'::app_role)
    OR public.has_role(auth.uid(), 'documentation'::app_role)
  ORDER BY s.created_at DESC
  LIMIT GREATEST(COALESCE(_limit, 200), 1);
$$;

REVOKE ALL ON FUNCTION public.list_assessment_sessions_admin(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_assessment_sessions_admin(int) TO authenticated;
