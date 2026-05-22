
-- 1) chat_message_meta SELECT: mirror chat_messages visibility rules
DROP POLICY IF EXISTS "meta read via message" ON public.chat_message_meta;
CREATE POLICY "meta read via message" ON public.chat_message_meta
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_messages m
    WHERE m.id = chat_message_meta.message_id
      AND (
        (m.channel_type = ANY (ARRAY['staff_internal','staff_client'])) AND public.can_view_client(auth.uid(), m.client_id)
        OR (m.channel_type = ANY (ARRAY['direct','team_group'])) AND public.is_chat_channel_member(auth.uid(), m.channel_id)
      )
  )
);

-- 2) institution-documents storage: restrict to staff
DROP POLICY IF EXISTS auth_select_institution_documents ON storage.objects;
DROP POLICY IF EXISTS auth_insert_institution_documents ON storage.objects;
DROP POLICY IF EXISTS auth_update_institution_documents ON storage.objects;
DROP POLICY IF EXISTS auth_delete_institution_documents ON storage.objects;

CREATE POLICY auth_select_institution_documents ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'institution-documents' AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'counselor') OR
    public.has_role(auth.uid(), 'documentation') OR
    public.has_role(auth.uid(), 'commission_admin')
  )
);
CREATE POLICY auth_insert_institution_documents ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'institution-documents' AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'counselor') OR
    public.has_role(auth.uid(), 'documentation') OR
    public.has_role(auth.uid(), 'commission_admin')
  )
);
CREATE POLICY auth_update_institution_documents ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'institution-documents' AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'commission_admin')
  )
);
CREATE POLICY auth_delete_institution_documents ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'institution-documents' AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'commission_admin')
  )
);

-- 3) integration_settings: restrict SELECT to admins only
DROP POLICY IF EXISTS "integration_settings readable by authenticated" ON public.integration_settings;
CREATE POLICY "integration_settings readable by admins" ON public.integration_settings
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 4) Remove bootstrap shortcut in is_accounting_admin
CREATE OR REPLACE FUNCTION public.is_accounting_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT _uid IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.accounting_users
    WHERE auth_user_id = _uid
      AND role IN ('SUPER_ADMIN','FINANCE_ADMIN')
      AND status = 'ACTIVE'
  )
$function$;

-- 5) profiles: limit SELECT to own row or staff roles
DROP POLICY IF EXISTS "profiles readable by authenticated" ON public.profiles;
CREATE POLICY "profiles readable by self or staff" ON public.profiles
FOR SELECT TO authenticated
USING (
  auth.uid() = id
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'counselor')
  OR public.has_role(auth.uid(), 'documentation')
  OR public.has_role(auth.uid(), 'viewer')
  OR public.has_role(auth.uid(), 'telecaller')
  OR public.has_role(auth.uid(), 'commission_admin')
);

-- 6) Missing SELECT policies for upi_claim_cycles and upi_invoices
CREATE POLICY commission_admin_select_upi_claim_cycles ON public.upi_claim_cycles
FOR SELECT TO authenticated
USING (public.is_commission_admin(auth.uid()));

CREATE POLICY commission_admin_select_upi_invoices ON public.upi_invoices
FOR SELECT TO authenticated
USING (public.is_commission_admin(auth.uid()));
