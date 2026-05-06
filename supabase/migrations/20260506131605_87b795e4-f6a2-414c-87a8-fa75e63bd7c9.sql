CREATE OR REPLACE FUNCTION public.whoami()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'uid', auth.uid(),
    'role', auth.role(),
    'jwt_present', current_setting('request.jwt.claims', true) IS NOT NULL
  );
$$;
GRANT EXECUTE ON FUNCTION public.whoami() TO anon, authenticated;