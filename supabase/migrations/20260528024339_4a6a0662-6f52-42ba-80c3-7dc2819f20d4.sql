
-- Restrict app_notifications inserts: staff-only, no impersonation of viewer/client roles only
DROP POLICY IF EXISTS "authenticated insert notifications" ON public.app_notifications;

CREATE POLICY "staff insert notifications"
ON public.app_notifications
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND NOT public.has_any_app_role(auth.uid(), ARRAY['viewer','client'])
);

-- Convert security-definer-default views to security_invoker so they
-- respect the querying user's RLS instead of the view owner's privileges.
ALTER VIEW public.vw_client_current_stage SET (security_invoker = true);
ALTER VIEW public.vw_portal_stages SET (security_invoker = true);
