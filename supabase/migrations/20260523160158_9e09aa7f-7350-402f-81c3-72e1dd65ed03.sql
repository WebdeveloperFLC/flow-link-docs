-- Broaden leads SELECT/UPDATE to include all staff roles allowed to convert
DROP POLICY IF EXISTS "leads select" ON public.leads;
CREATE POLICY "leads select"
ON public.leads
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_accounting_admin(auth.uid())
  OR is_commission_admin(auth.uid())
  OR has_role(auth.uid(), 'counselor'::app_role)
  OR has_role(auth.uid(), 'documentation'::app_role)
  OR has_role(auth.uid(), 'telecaller'::app_role)
  OR auth.uid() = created_by
  OR auth.uid() = assigned_counselor_id
);

DROP POLICY IF EXISTS "leads update" ON public.leads;
CREATE POLICY "leads update"
ON public.leads
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_accounting_admin(auth.uid())
  OR is_commission_admin(auth.uid())
  OR has_role(auth.uid(), 'counselor'::app_role)
  OR has_role(auth.uid(), 'documentation'::app_role)
  OR has_role(auth.uid(), 'telecaller'::app_role)
  OR auth.uid() = created_by
  OR auth.uid() = assigned_counselor_id
);

-- Block viewer role from inserting clients (today: any authenticated user)
DROP POLICY IF EXISTS "clients insert scoped" ON public.clients;
CREATE POLICY "clients insert scoped"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'counselor'::app_role)
  OR has_role(auth.uid(), 'documentation'::app_role)
  OR has_role(auth.uid(), 'telecaller'::app_role)
  OR is_commission_admin(auth.uid())
);
