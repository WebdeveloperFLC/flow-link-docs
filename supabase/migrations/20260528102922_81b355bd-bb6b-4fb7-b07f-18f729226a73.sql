DROP POLICY IF EXISTS "clients staff and assigned view" ON public.clients;

CREATE POLICY "clients staff and assigned view"
ON public.clients
FOR SELECT
TO authenticated
USING (
  public.is_client_staff_viewer(auth.uid())
  OR public.can_view_client(auth.uid(), id)
  OR public.is_portal_user_for(auth.uid(), id)
  OR (
    public.is_client_operational_staff(auth.uid())
    AND (
      owner_id = auth.uid()
      OR created_by = auth.uid()
      OR assigned_counselor_id = auth.uid()
    )
  )
);