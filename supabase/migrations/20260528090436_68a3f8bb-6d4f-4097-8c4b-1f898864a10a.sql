
-- Widen clients INSERT to all editing staff (not just admins).
DROP POLICY IF EXISTS "clients staff create" ON public.clients;
CREATE POLICY "clients staff create"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND public.has_any_app_role(
        auth.uid(),
        ARRAY['admin','administrator','counselor','documentation','telecaller','manager','commission_admin']
      )
);

-- Ensure UPDATE allows the same staff to autosave rows they own/created/were granted on.
DROP POLICY IF EXISTS "clients staff and assigned update" ON public.clients;
CREATE POLICY "clients staff and assigned update"
ON public.clients
FOR UPDATE
TO authenticated
USING (
  public.is_client_staff_editor(auth.uid())
  OR public.can_edit_client(auth.uid(), id)
  OR owner_id = auth.uid()
  OR created_by = auth.uid()
)
WITH CHECK (
  public.is_client_staff_editor(auth.uid())
  OR public.can_edit_client(auth.uid(), id)
  OR owner_id = auth.uid()
  OR created_by = auth.uid()
);
