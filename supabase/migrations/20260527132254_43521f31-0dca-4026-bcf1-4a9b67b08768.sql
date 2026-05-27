DROP POLICY IF EXISTS "leads staff create" ON public.leads;

CREATE POLICY "leads staff create"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND auth.uid() = created_by
  AND NOT public.has_any_app_role(auth.uid(), ARRAY['viewer','client'])
);