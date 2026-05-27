
CREATE OR REPLACE FUNCTION public.list_assignable_staff()
RETURNS TABLE(id uuid, full_name text, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.email
  FROM public.profiles p
  WHERE COALESCE(p.status, 'active') = 'active'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = p.id
        AND ur.role <> 'client'::app_role
    )
  ORDER BY p.full_name NULLS LAST, p.email NULLS LAST
$$;

REVOKE ALL ON FUNCTION public.list_assignable_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_assignable_staff() TO authenticated;

CREATE OR REPLACE FUNCTION public.list_assignable_teams()
RETURNS TABLE(id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.name FROM public.teams t ORDER BY t.name
$$;

REVOKE ALL ON FUNCTION public.list_assignable_teams() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_assignable_teams() TO authenticated;
