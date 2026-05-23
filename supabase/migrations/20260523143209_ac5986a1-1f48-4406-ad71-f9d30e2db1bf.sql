DROP POLICY IF EXISTS "clients insert scoped" ON public.clients;
CREATE POLICY "clients insert scoped" ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'counselor'::app_role)
    OR public.has_role(auth.uid(), 'documentation'::app_role)
    OR public.has_role(auth.uid(), 'telecaller'::app_role)
  );