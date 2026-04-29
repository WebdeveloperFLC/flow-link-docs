
-- Roles enum
create type public.app_role as enum ('admin', 'counselor', 'documentation', 'viewer');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- User roles (separate table)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique(user_id, role)
);
alter table public.user_roles enable row level security;

-- has_role security definer
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- Auto-create profile + assign first user as admin (rest as viewer)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  user_count int;
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.email);

  select count(*) into user_count from public.user_roles;
  if user_count = 0 then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'viewer');
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Profile policies
create policy "profiles readable by authenticated"
  on public.profiles for select to authenticated using (true);
create policy "users update own profile"
  on public.profiles for update to authenticated using (auth.uid() = id);

-- user_roles policies
create policy "roles readable by authenticated"
  on public.user_roles for select to authenticated using (true);
create policy "admins manage roles"
  on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- Workflow templates
create table public.workflow_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text not null,
  category text not null,
  version int not null default 1,
  items jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.workflow_templates enable row level security;

create policy "templates readable by authenticated"
  on public.workflow_templates for select to authenticated using (true);
create policy "admins manage templates"
  on public.workflow_templates for all to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- Clients
create sequence if not exists public.application_id_seq start 1001;

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  application_id text unique not null default ('FL-' || nextval('public.application_id_seq')::text),
  full_name text not null,
  email text,
  phone text,
  country text not null,
  application_type text not null,
  template_id uuid references public.workflow_templates(id),
  status text not null default 'in_progress',
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.clients enable row level security;

create policy "clients readable by authenticated"
  on public.clients for select to authenticated using (true);
create policy "counselors+admins create clients"
  on public.clients for insert to authenticated
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'counselor'));
create policy "counselors+admins update clients"
  on public.clients for update to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'counselor'));
create policy "admins delete clients"
  on public.clients for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));

-- Documents
create table public.client_documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  document_type text not null,
  custom_type text,
  file_name text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  version int not null default 1,
  status text not null default 'uploaded',
  uploaded_by uuid references auth.users(id),
  uploaded_at timestamptz not null default now()
);
alter table public.client_documents enable row level security;

create policy "documents readable by authenticated"
  on public.client_documents for select to authenticated using (true);
create policy "team uploads documents"
  on public.client_documents for insert to authenticated
  with check (
    public.has_role(auth.uid(),'admin') or
    public.has_role(auth.uid(),'counselor') or
    public.has_role(auth.uid(),'documentation')
  );
create policy "team updates documents"
  on public.client_documents for update to authenticated
  using (
    public.has_role(auth.uid(),'admin') or
    public.has_role(auth.uid(),'counselor') or
    public.has_role(auth.uid(),'documentation')
  );
create policy "admins delete documents"
  on public.client_documents for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));

-- Binders
create table public.binders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  size_bytes bigint,
  generated_by uuid references auth.users(id),
  generated_at timestamptz not null default now()
);
alter table public.binders enable row level security;

create policy "binders readable by authenticated"
  on public.binders for select to authenticated using (true);
create policy "team creates binders"
  on public.binders for insert to authenticated
  with check (
    public.has_role(auth.uid(),'admin') or
    public.has_role(auth.uid(),'counselor') or
    public.has_role(auth.uid(),'documentation')
  );
create policy "admins delete binders"
  on public.binders for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));

-- Activity log
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);
alter table public.activity_logs enable row level security;

create policy "logs readable by authenticated"
  on public.activity_logs for select to authenticated using (true);
create policy "authenticated users write logs"
  on public.activity_logs for insert to authenticated with check (auth.uid() = user_id);

-- Storage bucket (private)
insert into storage.buckets (id, name, public) values ('client-documents','client-documents', false)
  on conflict (id) do nothing;

create policy "team reads client docs"
  on storage.objects for select to authenticated
  using (bucket_id = 'client-documents');

create policy "team uploads client docs"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'client-documents' and (
      public.has_role(auth.uid(),'admin') or
      public.has_role(auth.uid(),'counselor') or
      public.has_role(auth.uid(),'documentation')
    )
  );

create policy "team updates client docs"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'client-documents' and (
      public.has_role(auth.uid(),'admin') or
      public.has_role(auth.uid(),'counselor') or
      public.has_role(auth.uid(),'documentation')
    )
  );

create policy "admins delete client docs"
  on storage.objects for delete to authenticated
  using (bucket_id = 'client-documents' and public.has_role(auth.uid(),'admin'));
