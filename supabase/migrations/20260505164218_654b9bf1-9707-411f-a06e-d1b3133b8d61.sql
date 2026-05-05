
-- ========== profiles: contact + lifecycle ==========
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists status text not null default 'active';
alter table public.profiles add column if not exists suspended_at timestamptz;
alter table public.profiles add column if not exists deleted_at timestamptz;

-- admins can update any profile (status changes etc.)
drop policy if exists "admins update profiles" on public.profiles;
create policy "admins update profiles" on public.profiles for update to authenticated
  using (public.has_role(auth.uid(),'admin'::app_role))
  with check (public.has_role(auth.uid(),'admin'::app_role));

-- ========== clients: ownership ==========
alter table public.clients add column if not exists owner_id uuid references auth.users(id);
update public.clients set owner_id = created_by where owner_id is null;
create index if not exists clients_owner_id_idx on public.clients(owner_id);

-- ========== teams ==========
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.teams enable row level security;

create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (team_id, user_id)
);
alter table public.team_members enable row level security;

-- ========== client access (user OR team, with permission) ==========
do $$ begin
  create type public.client_permission as enum ('view','edit','upload','full');
exception when duplicate_object then null; end $$;

create table if not exists public.client_access (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  permission public.client_permission not null default 'view',
  granted_by uuid references auth.users(id),
  granted_at timestamptz not null default now(),
  check ((user_id is not null) <> (team_id is not null))
);
create unique index if not exists client_access_user_uniq on public.client_access(client_id, user_id) where user_id is not null;
create unique index if not exists client_access_team_uniq on public.client_access(client_id, team_id) where team_id is not null;
alter table public.client_access enable row level security;

-- ========== helpers ==========
create or replace function public.is_team_member(_uid uuid, _team uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.team_members where team_id=_team and user_id=_uid)
$$;

create or replace function public.user_client_permission(_uid uuid, _cid uuid)
returns public.client_permission language sql stable security definer set search_path=public as $$
  select case
    when public.has_role(_uid,'admin'::app_role) then 'full'::public.client_permission
    when exists(select 1 from public.clients where id=_cid and (owner_id=_uid or created_by=_uid)) then 'full'::public.client_permission
    else (
      select max(perm)::text::public.client_permission from (
        select permission::text as perm from public.client_access where client_id=_cid and user_id=_uid
        union all
        select ca.permission::text from public.client_access ca
          join public.team_members tm on tm.team_id=ca.team_id
         where ca.client_id=_cid and tm.user_id=_uid
      ) p
    )
  end
$$;

create or replace function public.can_view_client(_uid uuid,_cid uuid) returns boolean
  language sql stable security definer set search_path=public as
  $$ select public.user_client_permission(_uid,_cid) is not null $$;
create or replace function public.can_edit_client(_uid uuid,_cid uuid) returns boolean
  language sql stable security definer set search_path=public as
  $$ select public.user_client_permission(_uid,_cid) in ('edit','upload','full') $$;
create or replace function public.can_upload_client(_uid uuid,_cid uuid) returns boolean
  language sql stable security definer set search_path=public as
  $$ select public.user_client_permission(_uid,_cid) in ('upload','full') $$;

-- ========== teams RLS ==========
drop policy if exists "team members read teams" on public.teams;
create policy "team members read teams" on public.teams for select to authenticated using (
  public.has_role(auth.uid(),'admin'::app_role) or created_by = auth.uid() or public.is_team_member(auth.uid(), id)
);
drop policy if exists "creators manage teams" on public.teams;
create policy "creators manage teams" on public.teams for all to authenticated
  using (public.has_role(auth.uid(),'admin'::app_role) or created_by = auth.uid())
  with check (public.has_role(auth.uid(),'admin'::app_role) or created_by = auth.uid());

drop policy if exists "members read team_members" on public.team_members;
create policy "members read team_members" on public.team_members for select to authenticated using (
  public.has_role(auth.uid(),'admin'::app_role)
  or user_id = auth.uid()
  or exists(select 1 from public.teams t where t.id=team_id and t.created_by=auth.uid())
  or public.is_team_member(auth.uid(), team_id)
);
drop policy if exists "creators manage team_members" on public.team_members;
create policy "creators manage team_members" on public.team_members for all to authenticated
  using (public.has_role(auth.uid(),'admin'::app_role) or exists(select 1 from public.teams t where t.id=team_id and t.created_by=auth.uid()))
  with check (public.has_role(auth.uid(),'admin'::app_role) or exists(select 1 from public.teams t where t.id=team_id and t.created_by=auth.uid()));

-- ========== client_access RLS ==========
drop policy if exists "read client_access" on public.client_access;
create policy "read client_access" on public.client_access for select to authenticated using (
  public.has_role(auth.uid(),'admin'::app_role)
  or user_id = auth.uid()
  or (team_id is not null and public.is_team_member(auth.uid(), team_id))
  or exists(select 1 from public.clients c where c.id=client_id and (c.owner_id=auth.uid() or c.created_by=auth.uid()))
);
drop policy if exists "owners manage client_access" on public.client_access;
create policy "owners manage client_access" on public.client_access for all to authenticated
  using (
    public.has_role(auth.uid(),'admin'::app_role)
    or exists(select 1 from public.clients c where c.id=client_id and (c.owner_id=auth.uid() or c.created_by=auth.uid()))
  )
  with check (
    public.has_role(auth.uid(),'admin'::app_role)
    or exists(select 1 from public.clients c where c.id=client_id and (c.owner_id=auth.uid() or c.created_by=auth.uid()))
  );

-- ========== Replace open client RLS with scoped ==========
drop policy if exists "clients readable by authenticated" on public.clients;
create policy "clients view scoped" on public.clients for select to authenticated
  using (public.can_view_client(auth.uid(), id));

drop policy if exists "team updates clients" on public.clients;
create policy "clients update scoped" on public.clients for update to authenticated
  using (public.can_edit_client(auth.uid(), id));

-- INSERT: must own the new row
drop policy if exists "team creates clients" on public.clients;
create policy "clients insert scoped" on public.clients for insert to authenticated with check (
  (public.has_role(auth.uid(),'admin'::app_role)
    or public.has_role(auth.uid(),'counselor'::app_role)
    or public.has_role(auth.uid(),'documentation'::app_role))
  and (owner_id is null or owner_id = auth.uid())
);

-- ========== Per-client child tables ==========

-- client_documents
drop policy if exists "documents readable by authenticated" on public.client_documents;
create policy "client_documents view scoped" on public.client_documents for select to authenticated
  using (public.can_view_client(auth.uid(), client_id));
drop policy if exists "team updates documents" on public.client_documents;
create policy "client_documents update scoped" on public.client_documents for update to authenticated
  using (public.can_edit_client(auth.uid(), client_id));
drop policy if exists "team uploads documents" on public.client_documents;
create policy "client_documents insert scoped" on public.client_documents for insert to authenticated with check (
  public.can_upload_client(auth.uid(), client_id)
);

-- case_people
drop policy if exists "case_people readable by authenticated" on public.case_people;
create policy "case_people view scoped" on public.case_people for select to authenticated
  using (public.can_view_client(auth.uid(), client_id));
drop policy if exists "team updates case_people" on public.case_people;
create policy "case_people update scoped" on public.case_people for update to authenticated
  using (public.can_edit_client(auth.uid(), client_id));
drop policy if exists "team inserts case_people" on public.case_people;
create policy "case_people insert scoped" on public.case_people for insert to authenticated with check (
  public.can_edit_client(auth.uid(), client_id)
);

-- client_profile
drop policy if exists "client_profile readable by authenticated" on public.client_profile;
create policy "client_profile view scoped" on public.client_profile for select to authenticated
  using (public.can_view_client(auth.uid(), client_id));
drop policy if exists "team updates client_profile" on public.client_profile;
create policy "client_profile update scoped" on public.client_profile for update to authenticated
  using (public.can_edit_client(auth.uid(), client_id));
drop policy if exists "team upserts client_profile" on public.client_profile;
create policy "client_profile insert scoped" on public.client_profile for insert to authenticated with check (
  public.can_edit_client(auth.uid(), client_id)
);

-- client_education
drop policy if exists "client_education readable by authenticated" on public.client_education;
create policy "client_education view scoped" on public.client_education for select to authenticated
  using (public.can_view_client(auth.uid(), client_id));
drop policy if exists "team updates client_education" on public.client_education;
create policy "client_education update scoped" on public.client_education for update to authenticated
  using (public.can_edit_client(auth.uid(), client_id));
drop policy if exists "team inserts client_education" on public.client_education;
create policy "client_education insert scoped" on public.client_education for insert to authenticated with check (
  public.can_edit_client(auth.uid(), client_id)
);

-- client_section_settings
drop policy if exists "css readable by authenticated" on public.client_section_settings;
create policy "css view scoped" on public.client_section_settings for select to authenticated
  using (public.can_view_client(auth.uid(), client_id));
drop policy if exists "team manages css" on public.client_section_settings;
create policy "css manage scoped" on public.client_section_settings for all to authenticated
  using (public.can_edit_client(auth.uid(), client_id))
  with check (public.can_edit_client(auth.uid(), client_id));

-- binders
drop policy if exists "binders readable by authenticated" on public.binders;
create policy "binders view scoped" on public.binders for select to authenticated
  using (public.can_view_client(auth.uid(), client_id));
drop policy if exists "team creates binders" on public.binders;
create policy "binders insert scoped" on public.binders for insert to authenticated with check (
  public.can_upload_client(auth.uid(), client_id)
);

-- filled_forms
drop policy if exists "filled_forms readable by authenticated" on public.filled_forms;
create policy "filled_forms view scoped" on public.filled_forms for select to authenticated
  using (public.can_view_client(auth.uid(), client_id));
drop policy if exists "team manages filled_forms" on public.filled_forms;
create policy "filled_forms manage scoped" on public.filled_forms for all to authenticated
  using (public.can_edit_client(auth.uid(), client_id))
  with check (public.can_edit_client(auth.uid(), client_id));

-- questionnaire_instances
drop policy if exists "qinst readable by authenticated" on public.questionnaire_instances;
create policy "qinst view scoped" on public.questionnaire_instances for select to authenticated
  using (public.can_view_client(auth.uid(), client_id));
drop policy if exists "team manages qinst" on public.questionnaire_instances;
create policy "qinst manage scoped" on public.questionnaire_instances for all to authenticated
  using (public.can_edit_client(auth.uid(), client_id))
  with check (public.can_edit_client(auth.uid(), client_id));

-- document_verifications
drop policy if exists "verifications readable by authenticated" on public.document_verifications;
create policy "verifications view scoped" on public.document_verifications for select to authenticated
  using (client_id is null or public.can_view_client(auth.uid(), client_id));
drop policy if exists "team creates verifications" on public.document_verifications;
create policy "verifications insert scoped" on public.document_verifications for insert to authenticated with check (
  client_id is null or public.can_edit_client(auth.uid(), client_id)
);
drop policy if exists "team updates verifications" on public.document_verifications;
create policy "verifications update scoped" on public.document_verifications for update to authenticated
  using (client_id is null or public.can_edit_client(auth.uid(), client_id));

-- document_fingerprints
drop policy if exists "fingerprints readable by authenticated" on public.document_fingerprints;
create policy "fingerprints view scoped" on public.document_fingerprints for select to authenticated
  using (client_id is null or public.can_view_client(auth.uid(), client_id));
drop policy if exists "team writes fingerprints" on public.document_fingerprints;
create policy "fingerprints insert scoped" on public.document_fingerprints for insert to authenticated with check (
  client_id is null or public.can_edit_client(auth.uid(), client_id)
);

-- call_events
drop policy if exists "call_events readable by authenticated" on public.call_events;
create policy "call_events view scoped" on public.call_events for select to authenticated
  using (client_id is null or public.can_view_client(auth.uid(), client_id));
drop policy if exists "team updates call_events" on public.call_events;
create policy "call_events update scoped" on public.call_events for update to authenticated
  using (client_id is null or public.can_edit_client(auth.uid(), client_id));

-- share_links: only when target is a viewable client
drop policy if exists "share links readable by authenticated" on public.share_links;
create policy "share links view scoped" on public.share_links for select to authenticated using (
  public.has_role(auth.uid(),'admin'::app_role)
  or created_by = auth.uid()
  or (target_type = 'client' and public.can_view_client(auth.uid(), target_id))
);

-- activity_logs: scope reads
drop policy if exists "logs readable by authenticated" on public.activity_logs;
create policy "logs view scoped" on public.activity_logs for select to authenticated using (
  public.has_role(auth.uid(),'admin'::app_role)
  or user_id = auth.uid()
  or (entity_type = 'client' and entity_id is not null and public.can_view_client(auth.uid(), entity_id))
);

-- ========== handle_new_user: stop auto-admin promotion ==========
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  any_admin boolean;
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.email)
  on conflict (id) do nothing;

  select exists(select 1 from public.user_roles where role='admin'::app_role) into any_admin;
  if not any_admin then
    insert into public.user_roles (user_id, role) values (new.id, 'admin'::app_role)
      on conflict do nothing;
  else
    insert into public.user_roles (user_id, role) values (new.id, 'viewer'::app_role)
      on conflict do nothing;
  end if;
  return new;
end;
$$;
