CREATE OR REPLACE FUNCTION public.is_client_operational_staff(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(_uid IS NOT NULL, false)
     AND public.has_any_app_role(_uid, ARRAY[
       'admin', 'administrator', 'counselor', 'documentation',
       'telecaller', 'manager', 'commission_admin'
     ])
$function$;

GRANT EXECUTE ON FUNCTION public.is_client_operational_staff(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.client_convert_debug(
  _phase text,
  _policy text,
  _cid uuid,
  _owner_id uuid,
  _created_by uuid,
  _assigned_counselor_id uuid,
  _payload jsonb,
  _allowed boolean,
  _condition text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_roles text[];
  v_can_edit boolean;
BEGIN
  SELECT COALESCE(array_agg(ur.role::text ORDER BY ur.role::text), ARRAY[]::text[])
    INTO v_roles
    FROM public.user_roles ur
   WHERE ur.user_id = v_uid;

  IF _cid IS NOT NULL THEN
    v_can_edit := public.can_edit_client(v_uid, _cid);
  ELSE
    v_can_edit := NULL;
  END IF;

  RAISE LOG '[client-convert-debug] uid=% roles=% policy=% phase=% client_id=% owner_id=% created_by=% counselor_id=% allowed=% can_edit_client=% condition=% payload=%',
    v_uid, v_roles, _policy, _phase, _cid, _owner_id, _created_by,
    _assigned_counselor_id, _allowed, v_can_edit, _condition, _payload;

  RETURN COALESCE(_allowed, false);
END
$function$;

GRANT EXECUTE ON FUNCTION public.client_convert_debug(text, text, uuid, uuid, uuid, uuid, jsonb, boolean, text) TO authenticated, service_role;

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
     WHERE c.id = _cid AND (c.owner_id = _uid OR c.created_by = _uid OR c.assigned_counselor_id = _uid)
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

DROP POLICY IF EXISTS "clients staff create" ON public.clients;
CREATE POLICY "clients staff create"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (
  public.client_convert_debug(
    'WITH CHECK',
    'clients staff create',
    id,
    owner_id,
    created_by,
    assigned_counselor_id,
    jsonb_build_object(
      'id', id,
      'full_name', full_name,
      'source_lead_id', source_lead_id,
      'status', status,
      'lead_stage', lead_stage,
      'owner_id', owner_id,
      'created_by', created_by,
      'assigned_counselor_id', assigned_counselor_id
    ),
    public.is_client_operational_staff(auth.uid())
      AND (
        owner_id = auth.uid()
        OR created_by = auth.uid()
        OR assigned_counselor_id = auth.uid()
      ),
    'is_client_operational_staff(auth.uid()) AND (owner_id = auth.uid() OR created_by = auth.uid() OR assigned_counselor_id = auth.uid())'
  )
);

DROP POLICY IF EXISTS "clients staff and assigned update" ON public.clients;
CREATE POLICY "clients staff and assigned update"
ON public.clients
FOR UPDATE
TO authenticated
USING (
  public.client_convert_debug(
    'USING',
    'clients staff and assigned update',
    id,
    owner_id,
    created_by,
    assigned_counselor_id,
    jsonb_build_object(
      'id', id,
      'full_name', full_name,
      'source_lead_id', source_lead_id,
      'status', status,
      'lead_stage', lead_stage,
      'owner_id', owner_id,
      'created_by', created_by,
      'assigned_counselor_id', assigned_counselor_id
    ),
    public.is_client_staff_editor(auth.uid())
      OR public.can_edit_client(auth.uid(), id)
      OR owner_id = auth.uid()
      OR created_by = auth.uid()
      OR assigned_counselor_id = auth.uid(),
    'is_client_staff_editor(auth.uid()) OR can_edit_client(auth.uid(), id) OR owner_id = auth.uid() OR created_by = auth.uid() OR assigned_counselor_id = auth.uid()'
  )
)
WITH CHECK (
  public.client_convert_debug(
    'WITH CHECK',
    'clients staff and assigned update',
    id,
    owner_id,
    created_by,
    assigned_counselor_id,
    jsonb_build_object(
      'id', id,
      'full_name', full_name,
      'source_lead_id', source_lead_id,
      'status', status,
      'lead_stage', lead_stage,
      'owner_id', owner_id,
      'created_by', created_by,
      'assigned_counselor_id', assigned_counselor_id
    ),
    public.is_client_staff_editor(auth.uid())
      OR public.can_edit_client(auth.uid(), id)
      OR owner_id = auth.uid()
      OR created_by = auth.uid()
      OR assigned_counselor_id = auth.uid(),
    'is_client_staff_editor(auth.uid()) OR can_edit_client(auth.uid(), id) OR owner_id = auth.uid() OR created_by = auth.uid() OR assigned_counselor_id = auth.uid()'
  )
);