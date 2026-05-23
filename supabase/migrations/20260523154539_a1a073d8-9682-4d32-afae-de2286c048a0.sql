
-- 1. Hide tokens on invitation tables from authenticated reads
REVOKE SELECT (token) ON public.assessment_invitations FROM anon, authenticated;
REVOKE SELECT (token) ON public.client_portal_invites FROM anon, authenticated;

-- 2. Telephony agents: hide SBC credentials from authenticated reads, expose only a boolean
ALTER TABLE public.telephony_agents
  ADD COLUMN IF NOT EXISTS sbc_password_set boolean
  GENERATED ALWAYS AS (sbc_password IS NOT NULL AND sbc_password <> '') STORED;

REVOKE SELECT (sbc_password, sbc_user_id) ON public.telephony_agents FROM anon, authenticated;

-- 3. accounting_user_entity_scope: scope SELECT to own rows for non-admins
DROP POLICY IF EXISTS "Accounting users can view scope rows" ON public.accounting_user_entity_scope;
CREATE POLICY "Accounting users can view own scope rows"
  ON public.accounting_user_entity_scope
  FOR SELECT
  USING (
    public.is_accounting_admin(auth.uid())
    OR accounting_user_id = (
      SELECT id FROM public.accounting_users WHERE auth_user_id = auth.uid()
    )
  );

-- 4. email_events: drop the public NULL-email_id branch
DROP POLICY IF EXISTS "view email events" ON public.email_events;
CREATE POLICY "view email events"
  ON public.email_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_emails e
      WHERE e.id = email_events.email_id
        AND public.can_view_client(auth.uid(), e.client_id)
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );
