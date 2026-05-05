CREATE OR REPLACE FUNCTION public.user_client_permission(_uid uuid, _cid uuid)
 RETURNS client_permission
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select case
    when public.has_role(_uid,'admin'::app_role) then 'full'::public.client_permission
    when exists(select 1 from public.clients where id=_cid and (owner_id=_uid or created_by=_uid)) then 'full'::public.client_permission
    when exists(select 1 from public.client_access where client_id=_cid and user_id=_uid) then
      (select permission from public.client_access where client_id=_cid and user_id=_uid limit 1)
    else (
      select max(ca.permission::text)::public.client_permission
        from public.client_access ca
        join public.team_members tm on tm.team_id=ca.team_id
       where ca.client_id=_cid and tm.user_id=_uid
    )
  end
$function$;