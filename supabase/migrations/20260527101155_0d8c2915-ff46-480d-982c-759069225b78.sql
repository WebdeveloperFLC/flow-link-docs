
CREATE OR REPLACE FUNCTION public.is_client_staff_editor(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(_uid IS NOT NULL, false)
     AND (
       public.has_any_app_role(_uid, ARRAY['admin', 'administrator'])
       OR public.is_accounting_admin(_uid)
     )
$$;

CREATE OR REPLACE FUNCTION public.is_client_staff_viewer(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_client_staff_editor(_uid)
$$;
