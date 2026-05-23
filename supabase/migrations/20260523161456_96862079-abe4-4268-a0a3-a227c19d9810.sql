-- Make has_role SECURITY DEFINER so RLS policies that call it
-- aren't subject to user_roles RLS in the caller's context.
-- This is the Lovable-recommended pattern and fixes counselor/
-- documentation/telecaller/commission users failing RLS on
-- public.clients INSERT during Lead -> Convert to Client.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
      FROM public.user_roles
     WHERE user_id = _user_id
       AND role = _role
  )
$function$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;