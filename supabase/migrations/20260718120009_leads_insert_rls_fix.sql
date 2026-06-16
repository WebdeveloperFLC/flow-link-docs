-- Fix lead creation: INSERT policy must not depend solely on created_by matching
-- before fn_assign_lead_number runs. Restore full staff-editor helpers (counselor,
-- telecaller, etc.) narrowed in 20260527101155.

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'director';

CREATE OR REPLACE FUNCTION public.is_client_staff_editor(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(_uid IS NOT NULL, false)
     AND (
       public.has_any_app_role(_uid, ARRAY[
         'admin', 'administrator', 'counselor', 'documentation',
         'telecaller', 'commission_admin', 'manager', 'director'
       ])
       OR public.is_accounting_admin(_uid)
       OR EXISTS (
         SELECT 1
           FROM public.user_module_permissions p
          WHERE p.user_id = _uid
            AND p.can_edit = true
            AND p.module IN ('clients', 'commissions')
       )
     )
$function$;

CREATE OR REPLACE FUNCTION public.is_client_staff_viewer(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(_uid IS NOT NULL, false)
     AND (
       public.is_client_staff_editor(_uid)
       OR public.has_any_app_role(_uid, ARRAY['viewer'])
       OR EXISTS (
         SELECT 1
           FROM public.user_module_permissions p
          WHERE p.user_id = _uid
            AND (p.can_view = true OR p.can_edit = true)
            AND p.module IN ('clients', 'commissions')
       )
     )
$function$;

CREATE OR REPLACE FUNCTION public.is_client_operational_staff(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(_uid IS NOT NULL, false)
     AND public.has_any_app_role(_uid, ARRAY[
       'admin', 'administrator', 'counselor', 'documentation',
       'telecaller', 'manager', 'commission_admin', 'director'
     ])
$function$;

DROP POLICY IF EXISTS "leads staff create" ON public.leads;

CREATE POLICY "leads staff create"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND NOT public.has_any_app_role(auth.uid(), ARRAY['viewer', 'client'])
  AND (
    public.is_client_staff_editor(auth.uid())
    OR public.is_client_operational_staff(auth.uid())
    OR auth.uid() = created_by
  )
);
