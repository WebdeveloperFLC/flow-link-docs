ALTER TABLE public.client_access ADD COLUMN IF NOT EXISTS revoked_at timestamptz;
ALTER TABLE public.default_team_members ADD COLUMN IF NOT EXISTS revoked_at timestamptz;

CREATE OR REPLACE FUNCTION public.user_client_permission(_uid uuid, _cid uuid)
 RETURNS client_permission
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH candidates AS (
    SELECT 'full'::public.client_permission AS perm
      WHERE public.has_role(_uid, 'admin'::app_role)
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