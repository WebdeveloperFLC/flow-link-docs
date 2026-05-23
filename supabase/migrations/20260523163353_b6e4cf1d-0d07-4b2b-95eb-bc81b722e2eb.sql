-- Normalize role names used by client workflow policies.
-- Keep legacy `admin` working while supporting normalized `administrator` / `manager` labels.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'administrator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';

-- Security-definer role helpers: no RLS recursion, all role comparisons centralized.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
      FROM public.user_roles
     WHERE user_id = _user_id
       AND role = _role
  )
$function$;

CREATE OR REPLACE FUNCTION public.has_any_app_role(_uid uuid, _roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(_uid IS NOT NULL, false)
     AND EXISTS (
       SELECT 1
         FROM public.user_roles ur
        WHERE ur.user_id = _uid
          AND ur.role::text = ANY(_roles)
     )
$function$;

CREATE OR REPLACE FUNCTION public.is_client_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.has_any_app_role(_uid, ARRAY['admin','administrator'])
$function$;

CREATE OR REPLACE FUNCTION public.is_client_staff_editor(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(_uid IS NOT NULL, false)
     AND (
       public.has_any_app_role(_uid, ARRAY[
         'admin', 'administrator', 'counselor', 'documentation',
         'telecaller', 'commission_admin', 'manager'
       ])
       OR public.is_accounting_admin(_uid)
       OR EXISTS (
         SELECT 1
           FROM public.user_module_permissions p
          WHERE p.user_id = _uid
            AND p.can_edit = true
            AND p.module IN ('clients', 'commissions')
       )
     )
$function$;

CREATE OR REPLACE FUNCTION public.is_client_staff_viewer(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(_uid IS NOT NULL, false)
     AND (
       public.is_client_staff_editor(_uid)
       OR public.has_any_app_role(_uid, ARRAY['viewer'])
       OR EXISTS (
         SELECT 1
           FROM public.user_module_permissions p
          WHERE p.user_id = _uid
            AND (p.can_view = true OR p.can_edit = true)
            AND p.module IN ('clients', 'commissions')
       )
     )
$function$;

-- Client permissions are now role-aware first, then record-specific.
CREATE OR REPLACE FUNCTION public.user_client_permission(_uid uuid, _cid uuid)
RETURNS public.client_permission
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH candidates AS (
    SELECT 'full'::public.client_permission AS perm
      WHERE public.is_client_staff_editor(_uid)
    UNION ALL
    SELECT 'view'::public.client_permission
      WHERE public.is_client_staff_viewer(_uid)
    UNION ALL
    SELECT 'full'::public.client_permission
      FROM public.clients c
     WHERE c.id = _cid AND (c.owner_id = _uid OR c.created_by = _uid)
    UNION ALL
    SELECT ca.permission
      FROM public.client_access ca
     WHERE ca.client_id = _cid AND ca.user_id = _uid AND ca.revoked_at IS NULL
    UNION ALL
    SELECT dtm.permission
      FROM public.clients c
      JOIN public.default_team_members dtm
        ON dtm.member_id = _uid
       AND dtm.owner_id IN (c.owner_id, c.created_by)
     WHERE c.id = _cid AND dtm.revoked_at IS NULL
    UNION ALL
    SELECT ca.permission
      FROM public.client_access ca
      JOIN public.team_members tm ON tm.team_id = ca.team_id
     WHERE ca.client_id = _cid AND tm.user_id = _uid AND ca.revoked_at IS NULL
  )
  SELECT perm FROM candidates
   ORDER BY CASE perm WHEN 'full' THEN 4 WHEN 'upload' THEN 3 WHEN 'edit' THEN 2 WHEN 'view' THEN 1 END DESC
   LIMIT 1
$function$;

CREATE OR REPLACE FUNCTION public.can_view_client(_uid uuid, _cid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.user_client_permission(_uid, _cid) IS NOT NULL
$function$;

CREATE OR REPLACE FUNCTION public.can_edit_client(_uid uuid, _cid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.user_client_permission(_uid, _cid) IN ('edit','upload','full')
$function$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_any_app_role(uuid, text[]) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_client_admin(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_client_staff_editor(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_client_staff_viewer(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.user_client_permission(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.can_view_client(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.can_edit_client(uuid, uuid) TO authenticated, anon;

-- CLIENTS: clean policies for view/create/autosave-update/delete.
DROP POLICY IF EXISTS "clients insert scoped" ON public.clients;
DROP POLICY IF EXISTS "clients view scoped" ON public.clients;
DROP POLICY IF EXISTS "clients update scoped" ON public.clients;
DROP POLICY IF EXISTS "admins delete clients" ON public.clients;

CREATE POLICY "clients staff and assigned view"
ON public.clients
FOR SELECT
TO authenticated
USING (
  public.is_client_staff_viewer(auth.uid())
  OR public.can_view_client(auth.uid(), id)
  OR public.is_portal_user_for(auth.uid(), id)
);

CREATE POLICY "clients staff create"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (public.is_client_staff_editor(auth.uid()));

CREATE POLICY "clients staff and assigned update"
ON public.clients
FOR UPDATE
TO authenticated
USING (
  public.is_client_staff_editor(auth.uid())
  OR public.can_edit_client(auth.uid(), id)
)
WITH CHECK (
  public.is_client_staff_editor(auth.uid())
  OR public.can_edit_client(auth.uid(), id)
);

CREATE POLICY "clients admin delete"
ON public.clients
FOR DELETE
TO authenticated
USING (public.is_client_admin(auth.uid()));

-- LEADS: staff can create/read/update for conversion; viewer read-only.
DROP POLICY IF EXISTS "leads insert" ON public.leads;
DROP POLICY IF EXISTS "leads select" ON public.leads;
DROP POLICY IF EXISTS "leads update" ON public.leads;
DROP POLICY IF EXISTS "leads delete" ON public.leads;

CREATE POLICY "leads staff create"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (public.is_client_staff_editor(auth.uid()));

CREATE POLICY "leads staff view"
ON public.leads
FOR SELECT
TO authenticated
USING (
  public.is_client_staff_viewer(auth.uid())
  OR auth.uid() = created_by
  OR auth.uid() = assigned_counselor_id
);

CREATE POLICY "leads staff update"
ON public.leads
FOR UPDATE
TO authenticated
USING (
  public.is_client_staff_editor(auth.uid())
  OR (auth.uid() = created_by AND NOT public.has_any_app_role(auth.uid(), ARRAY['viewer','client']))
  OR (auth.uid() = assigned_counselor_id AND NOT public.has_any_app_role(auth.uid(), ARRAY['viewer','client']))
)
WITH CHECK (
  public.is_client_staff_editor(auth.uid())
  OR (auth.uid() = created_by AND NOT public.has_any_app_role(auth.uid(), ARRAY['viewer','client']))
  OR (auth.uid() = assigned_counselor_id AND NOT public.has_any_app_role(auth.uid(), ARRAY['viewer','client']))
);

CREATE POLICY "leads admin delete"
ON public.leads
FOR DELETE
TO authenticated
USING (public.is_client_admin(auth.uid()));

-- INVOICES: draft invoice creation and invoice edits follow client edit permission.
DROP POLICY IF EXISTS "ci_write" ON public.client_invoices;
DROP POLICY IF EXISTS "ci_view" ON public.client_invoices;

CREATE POLICY "client_invoices view scoped"
ON public.client_invoices
FOR SELECT
TO authenticated
USING (
  public.is_portal_user_for(auth.uid(), client_id)
  OR public.can_view_client(auth.uid(), client_id)
);

CREATE POLICY "client_invoices staff write"
ON public.client_invoices
FOR ALL
TO authenticated
USING (public.can_edit_client(auth.uid(), client_id))
WITH CHECK (public.can_edit_client(auth.uid(), client_id));

-- Client profile and case people already key off can_edit/can_view; rebuild names cleanly.
DROP POLICY IF EXISTS "client_profile insert scoped" ON public.client_profile;
DROP POLICY IF EXISTS "client_profile view scoped" ON public.client_profile;
DROP POLICY IF EXISTS "client_profile update scoped" ON public.client_profile;
DROP POLICY IF EXISTS "admins delete client_profile" ON public.client_profile;

CREATE POLICY "client_profile staff create"
ON public.client_profile
FOR INSERT
TO authenticated
WITH CHECK (public.can_edit_client(auth.uid(), client_id));

CREATE POLICY "client_profile view scoped"
ON public.client_profile
FOR SELECT
TO authenticated
USING (public.can_view_client(auth.uid(), client_id));

CREATE POLICY "client_profile staff update"
ON public.client_profile
FOR UPDATE
TO authenticated
USING (public.can_edit_client(auth.uid(), client_id))
WITH CHECK (public.can_edit_client(auth.uid(), client_id));

CREATE POLICY "client_profile admin delete"
ON public.client_profile
FOR DELETE
TO authenticated
USING (public.is_client_admin(auth.uid()));

DROP POLICY IF EXISTS "case_people insert scoped" ON public.case_people;
DROP POLICY IF EXISTS "case_people view scoped" ON public.case_people;
DROP POLICY IF EXISTS "case_people update scoped" ON public.case_people;
DROP POLICY IF EXISTS "admins delete case_people" ON public.case_people;

CREATE POLICY "case_people staff create"
ON public.case_people
FOR INSERT
TO authenticated
WITH CHECK (public.can_edit_client(auth.uid(), client_id));

CREATE POLICY "case_people view scoped"
ON public.case_people
FOR SELECT
TO authenticated
USING (public.can_view_client(auth.uid(), client_id));

CREATE POLICY "case_people staff update"
ON public.case_people
FOR UPDATE
TO authenticated
USING (public.can_edit_client(auth.uid(), client_id))
WITH CHECK (public.can_edit_client(auth.uid(), client_id));

CREATE POLICY "case_people admin delete"
ON public.case_people
FOR DELETE
TO authenticated
USING (public.is_client_admin(auth.uid()));

-- Family members: staff editors can edit; viewer remains read-only.
DROP POLICY IF EXISTS "cfm insert" ON public.client_family_members;
DROP POLICY IF EXISTS "cfm select" ON public.client_family_members;
DROP POLICY IF EXISTS "cfm update" ON public.client_family_members;
DROP POLICY IF EXISTS "cfm delete" ON public.client_family_members;

CREATE POLICY "client_family_members staff create"
ON public.client_family_members
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_client_staff_editor(auth.uid())
  AND (
    (primary_client_id IS NOT NULL AND public.can_edit_client(auth.uid(), primary_client_id))
    OR (primary_lead_id IS NOT NULL AND public.is_client_staff_editor(auth.uid()))
  )
);

CREATE POLICY "client_family_members view scoped"
ON public.client_family_members
FOR SELECT
TO authenticated
USING (
  public.is_client_staff_viewer(auth.uid())
  OR (primary_client_id IS NOT NULL AND public.can_view_client(auth.uid(), primary_client_id))
  OR (primary_lead_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.leads l
     WHERE l.id = client_family_members.primary_lead_id
       AND (public.is_client_staff_viewer(auth.uid()) OR l.created_by = auth.uid() OR l.assigned_counselor_id = auth.uid())
  ))
);

CREATE POLICY "client_family_members staff update"
ON public.client_family_members
FOR UPDATE
TO authenticated
USING (
  public.is_client_staff_editor(auth.uid())
  AND (
    (primary_client_id IS NOT NULL AND public.can_edit_client(auth.uid(), primary_client_id))
    OR (primary_lead_id IS NOT NULL AND public.is_client_staff_editor(auth.uid()))
  )
)
WITH CHECK (
  public.is_client_staff_editor(auth.uid())
  AND (
    (primary_client_id IS NOT NULL AND public.can_edit_client(auth.uid(), primary_client_id))
    OR (primary_lead_id IS NOT NULL AND public.is_client_staff_editor(auth.uid()))
  )
);

CREATE POLICY "client_family_members staff delete"
ON public.client_family_members
FOR DELETE
TO authenticated
USING (
  public.is_client_staff_editor(auth.uid())
  AND (
    (primary_client_id IS NOT NULL AND public.can_edit_client(auth.uid(), primary_client_id))
    OR (primary_lead_id IS NOT NULL AND public.is_client_staff_editor(auth.uid()))
  )
);

-- Client notes / services in this app are timeline rows, remarks, and service columns on clients.
-- Timeline and remarks are write-protected with client edit permission.
DROP POLICY IF EXISTS "client_timeline insert scoped" ON public.client_timeline;
DROP POLICY IF EXISTS "client_timeline view scoped" ON public.client_timeline;
DROP POLICY IF EXISTS "client_timeline admin delete" ON public.client_timeline;

CREATE POLICY "client_timeline staff create"
ON public.client_timeline
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_edit_client(auth.uid(), client_id)
  AND (actor_id IS NULL OR actor_id = auth.uid())
);

CREATE POLICY "client_timeline view scoped"
ON public.client_timeline
FOR SELECT
TO authenticated
USING (public.can_view_client(auth.uid(), client_id));

CREATE POLICY "client_timeline admin delete"
ON public.client_timeline
FOR DELETE
TO authenticated
USING (public.is_client_admin(auth.uid()));

DROP POLICY IF EXISTS "remarks insert scoped" ON public.lead_remarks;
DROP POLICY IF EXISTS "remarks read scoped" ON public.lead_remarks;
DROP POLICY IF EXISTS "remarks update own" ON public.lead_remarks;

CREATE POLICY "lead_remarks staff create"
ON public.lead_remarks
FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND public.can_edit_client(auth.uid(), client_id)
);

CREATE POLICY "lead_remarks view scoped"
ON public.lead_remarks
FOR SELECT
TO authenticated
USING (public.can_view_client(auth.uid(), client_id));

CREATE POLICY "lead_remarks staff update"
ON public.lead_remarks
FOR UPDATE
TO authenticated
USING (public.can_edit_client(auth.uid(), client_id))
WITH CHECK (public.can_edit_client(auth.uid(), client_id));

-- Profiles / user roles: readable for staff/self; role management remains admin-only.
DROP POLICY IF EXISTS "profiles readable by self or staff" ON public.profiles;
DROP POLICY IF EXISTS "admins update profiles" ON public.profiles;
DROP POLICY IF EXISTS "users update own profile" ON public.profiles;

CREATE POLICY "profiles readable by self or staff"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id OR public.is_client_staff_viewer(auth.uid()));

CREATE POLICY "profiles admin update"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_client_admin(auth.uid()))
WITH CHECK (public.is_client_admin(auth.uid()));

CREATE POLICY "profiles self update"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles select own or admin" ON public.user_roles;

CREATE POLICY "user_roles select own or admin"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_client_admin(auth.uid()));

CREATE POLICY "user_roles admin manage"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_client_admin(auth.uid()))
WITH CHECK (public.is_client_admin(auth.uid()));