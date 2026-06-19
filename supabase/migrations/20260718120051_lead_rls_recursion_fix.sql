-- Phase D UAT defect: infinite recursion in leads RLS during follow-up save/load.
--
-- Root cause: circular policy evaluation
--   leads SELECT ("leads telecaller queue view") → call_queue_items
--   call_queue_items SELECT ("queue read scoped") → leads
-- Child tables (lead_followup_log, lead_remarks) subquery leads and re-enter the cycle.

-- ---------------------------------------------------------------------------
-- SECURITY DEFINER helpers — read leads / queue without re-entering RLS
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_can_view_lead_rls(_uid uuid, _lead_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.leads l
     WHERE l.id = _lead_id
       AND (
         _uid = l.created_by
         OR _uid = l.assigned_counselor_id
         OR (
           public.is_client_staff_viewer(_uid)
           AND public.fn_branch_record_visible(_uid, l.branch_id, l.branch)
         )
       )
  );
$$;

CREATE OR REPLACE FUNCTION public.fn_can_edit_lead_rls(_uid uuid, _lead_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.leads l
     WHERE l.id = _lead_id
       AND (
         (
           public.is_client_staff_editor(_uid)
           AND public.fn_branch_record_visible(_uid, l.branch_id, l.branch)
         )
         OR (
           _uid = l.created_by
           AND NOT public.has_any_app_role(_uid, ARRAY['viewer', 'client'])
         )
         OR (
           _uid = l.assigned_counselor_id
           AND NOT public.has_any_app_role(_uid, ARRAY['viewer', 'client'])
         )
       )
  );
$$;

CREATE OR REPLACE FUNCTION public.fn_can_access_lead_followup_rls(_uid uuid, _lead_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.leads l
     WHERE l.id = _lead_id
       AND (
         public.has_role(_uid, 'admin'::public.app_role)
         OR public.is_accounting_admin(_uid)
         OR public.is_commission_admin(_uid)
         OR public.has_role(_uid, 'counselor'::public.app_role)
         OR public.has_role(_uid, 'documentation'::public.app_role)
         OR public.has_role(_uid, 'telecaller'::public.app_role)
         OR _uid = l.created_by
         OR _uid = l.assigned_counselor_id
       )
  );
$$;

CREATE OR REPLACE FUNCTION public.fn_lead_in_user_call_queue(_uid uuid, _lead_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.call_queue_items cqi
      JOIN public.telephony_agents ta ON ta.id = cqi.assigned_agent_id
     WHERE cqi.lead_id = _lead_id
       AND ta.user_id = _uid
       AND cqi.status IN ('queued', 'calling', 'callback')
  );
$$;

REVOKE ALL ON FUNCTION public.fn_can_view_lead_rls(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_can_edit_lead_rls(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_can_access_lead_followup_rls(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_lead_in_user_call_queue(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_can_view_lead_rls(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_can_edit_lead_rls(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_can_access_lead_followup_rls(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_lead_in_user_call_queue(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Break leads ↔ call_queue_items cycle
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "leads telecaller queue view" ON public.leads;
CREATE POLICY "leads telecaller queue view"
  ON public.leads
  FOR SELECT
  TO authenticated
  USING (
    public.is_telephony_admin(auth.uid())
    OR public.fn_lead_in_user_call_queue(auth.uid(), id)
  );

DROP POLICY IF EXISTS "queue read scoped" ON public.call_queue_items;
CREATE POLICY "queue read scoped" ON public.call_queue_items
  FOR SELECT TO authenticated
  USING (
    public.is_telephony_admin(auth.uid())
    OR assigned_agent_id = public.user_telephony_agent_id(auth.uid())
    OR (client_id IS NOT NULL AND public.can_view_client(auth.uid(), client_id))
    OR (lead_id IS NOT NULL AND public.fn_can_view_lead_rls(auth.uid(), lead_id))
  );

-- ---------------------------------------------------------------------------
-- lead_followup_log — stop subquerying leads inside RLS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "lead_followup_log staff select" ON public.lead_followup_log;
CREATE POLICY "lead_followup_log staff select"
  ON public.lead_followup_log FOR SELECT TO authenticated
  USING (public.fn_can_access_lead_followup_rls(auth.uid(), lead_id));

DROP POLICY IF EXISTS "lead_followup_log staff insert" ON public.lead_followup_log;
CREATE POLICY "lead_followup_log staff insert"
  ON public.lead_followup_log FOR INSERT TO authenticated
  WITH CHECK (public.fn_can_access_lead_followup_rls(auth.uid(), lead_id));

DROP POLICY IF EXISTS "lead_followup_log staff update" ON public.lead_followup_log;
CREATE POLICY "lead_followup_log staff update"
  ON public.lead_followup_log FOR UPDATE TO authenticated
  USING (public.fn_can_access_lead_followup_rls(auth.uid(), lead_id))
  WITH CHECK (public.fn_can_access_lead_followup_rls(auth.uid(), lead_id));

-- ---------------------------------------------------------------------------
-- lead_remarks — same pattern (follow-up notes / history adjacent flows)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "lead_remarks staff create" ON public.lead_remarks;
CREATE POLICY "lead_remarks staff create"
  ON public.lead_remarks
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND (
      (client_id IS NOT NULL AND public.can_view_client(auth.uid(), client_id))
      OR (lead_id IS NOT NULL AND public.fn_can_view_lead_rls(auth.uid(), lead_id))
    )
  );

DROP POLICY IF EXISTS "lead_remarks view scoped" ON public.lead_remarks;
CREATE POLICY "lead_remarks view scoped"
  ON public.lead_remarks
  FOR SELECT TO authenticated
  USING (
    (client_id IS NOT NULL AND public.can_view_client(auth.uid(), client_id))
    OR (lead_id IS NOT NULL AND public.fn_can_view_lead_rls(auth.uid(), lead_id))
  );

DROP POLICY IF EXISTS "lead_remarks staff update" ON public.lead_remarks;
CREATE POLICY "lead_remarks staff update"
  ON public.lead_remarks
  FOR UPDATE TO authenticated
  USING (
    (client_id IS NOT NULL AND public.can_edit_client(auth.uid(), client_id))
    OR (lead_id IS NOT NULL AND public.fn_can_edit_lead_rls(auth.uid(), lead_id))
  )
  WITH CHECK (
    (client_id IS NOT NULL AND public.can_edit_client(auth.uid(), client_id))
    OR (lead_id IS NOT NULL AND public.fn_can_edit_lead_rls(auth.uid(), lead_id))
  );

NOTIFY pgrst, 'reload schema';
