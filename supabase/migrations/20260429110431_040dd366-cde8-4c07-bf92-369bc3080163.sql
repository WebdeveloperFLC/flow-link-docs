
-- Share links for time-limited document/binder access
create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('document','binder')),
  target_id uuid not null,
  token text not null unique,
  expires_at timestamptz not null,
  max_views integer,
  view_count integer not null default 0,
  revoked boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index share_links_token_idx on public.share_links(token);
create index share_links_target_idx on public.share_links(target_type, target_id);

alter table public.share_links enable row level security;

create policy "share links readable by authenticated"
  on public.share_links for select to authenticated using (true);

create policy "team creates share links"
  on public.share_links for insert to authenticated
  with check (
    has_role(auth.uid(), 'admin'::app_role)
    or has_role(auth.uid(), 'counselor'::app_role)
    or has_role(auth.uid(), 'documentation'::app_role)
  );

create policy "team revokes share links"
  on public.share_links for update to authenticated
  using (
    has_role(auth.uid(), 'admin'::app_role)
    or has_role(auth.uid(), 'counselor'::app_role)
    or has_role(auth.uid(), 'documentation'::app_role)
  );

create policy "admins delete share links"
  on public.share_links for delete to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));

-- API keys for Odoo / external integrations
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  key_hash text not null unique,
  prefix text not null,
  scopes text[] not null default array['read']::text[],
  last_used_at timestamptz,
  revoked boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now()
);

alter table public.api_keys enable row level security;

create policy "admins read api keys"
  on public.api_keys for select to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));

create policy "admins create api keys"
  on public.api_keys for insert to authenticated
  with check (has_role(auth.uid(), 'admin'::app_role));

create policy "admins update api keys"
  on public.api_keys for update to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));

create policy "admins delete api keys"
  on public.api_keys for delete to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));
