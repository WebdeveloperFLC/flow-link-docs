
CREATE TABLE IF NOT EXISTS public.default_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  member_id uuid NOT NULL,
  permission public.client_permission NOT NULL DEFAULT 'view',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, member_id),
  CHECK (owner_id <> member_id)
);

CREATE INDEX IF NOT EXISTS idx_default_team_members_owner ON public.default_team_members(owner_id);
CREATE INDEX IF NOT EXISTS idx_default_team_members_member ON public.default_team_members(member_id);

ALTER TABLE public.default_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "default_team_members select scoped"
  ON public.default_team_members FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR member_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "default_team_members insert by owner"
  ON public.default_team_members FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "default_team_members update by owner"
  ON public.default_team_members FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "default_team_members delete by owner"
  ON public.default_team_members FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_default_team_members_updated_at
  BEFORE UPDATE ON public.default_team_members
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.user_client_permission(_uid uuid, _cid uuid)
RETURNS public.client_permission
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
     WHERE ca.client_id = _cid AND ca.user_id = _uid
    UNION ALL
    SELECT dtm.permission
      FROM public.clients c
      JOIN public.default_team_members dtm
        ON dtm.member_id = _uid
       AND dtm.owner_id IN (c.owner_id, c.created_by)
     WHERE c.id = _cid
    UNION ALL
    SELECT ca.permission
      FROM public.client_access ca
      JOIN public.team_members tm ON tm.team_id = ca.team_id
     WHERE ca.client_id = _cid AND tm.user_id = _uid
  )
  SELECT perm FROM candidates
   ORDER BY CASE perm WHEN 'full' THEN 4 WHEN 'upload' THEN 3 WHEN 'edit' THEN 2 WHEN 'view' THEN 1 END DESC
   LIMIT 1
$function$;
