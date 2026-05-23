-- assessment_invitations: split the broad ALL policy into scoped policies
DROP POLICY IF EXISTS "assessment_invites_staff_all" ON public.assessment_invitations;

CREATE POLICY "assessment_invites_select_scoped"
  ON public.assessment_invitations
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (client_id IS NOT NULL AND can_view_client(auth.uid(), client_id))
  );

CREATE POLICY "assessment_invites_staff_insert"
  ON public.assessment_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'counselor'::app_role)
    OR has_role(auth.uid(), 'telecaller'::app_role)
  );

CREATE POLICY "assessment_invites_update_scoped"
  ON public.assessment_invitations
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (client_id IS NOT NULL AND can_edit_client(auth.uid(), client_id))
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR (client_id IS NOT NULL AND can_edit_client(auth.uid(), client_id))
  );

CREATE POLICY "assessment_invites_delete_scoped"
  ON public.assessment_invitations
  FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (client_id IS NOT NULL AND can_edit_client(auth.uid(), client_id))
  );

-- assessment_leads: tighten the creator policy with a client-scope check
DROP POLICY IF EXISTS "assessment_leads_creator_select" ON public.assessment_leads;

CREATE POLICY "assessment_leads_creator_select"
  ON public.assessment_leads
  FOR SELECT TO authenticated
  USING (
    assessment_lead_has_creator(id, auth.uid())
    AND (client_id IS NULL OR can_view_client(auth.uid(), client_id))
  );

-- upi_institution_sources: restrict SELECT to admins / commission admins
DROP POLICY IF EXISTS "auth_select_upi_institution_sources" ON public.upi_institution_sources;

CREATE POLICY "upi_institution_sources_admin_select"
  ON public.upi_institution_sources
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR is_commission_admin(auth.uid())
  );