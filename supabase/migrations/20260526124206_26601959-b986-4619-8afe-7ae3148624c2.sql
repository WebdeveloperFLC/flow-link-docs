
-- 1. user_notification_prefs
create table if not exists public.user_notification_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  muted_categories text[] not null default '{}',
  push_enabled boolean not null default false,
  sound_enabled boolean not null default true,
  digest_frequency text not null default 'off' check (digest_frequency in ('off','daily','weekly')),
  escalation_alerts boolean not null default true,
  timezone text not null default 'Asia/Kolkata',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.user_notification_prefs enable row level security;
create policy "own prefs read" on public.user_notification_prefs for select using (auth.uid() = user_id);
create policy "own prefs upsert" on public.user_notification_prefs for insert with check (auth.uid() = user_id);
create policy "own prefs update" on public.user_notification_prefs for update using (auth.uid() = user_id);
create trigger trg_unp_touch before update on public.user_notification_prefs
  for each row execute function public.touch_updated_at();

-- 2. reminder dedupe state
create table if not exists public.notification_reminder_state (
  entity_type text not null,
  entity_id uuid not null,
  kind text not null,
  escalation_level int not null default 0,
  last_sent_at timestamptz not null default now(),
  next_eligible_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  primary key (entity_type, entity_id, kind)
);
alter table public.notification_reminder_state enable row level security;
create policy "admin read reminder state" on public.notification_reminder_state
  for select using (public.has_role(auth.uid(),'admin'::app_role));

-- 3. delivery log
create table if not exists public.notification_delivery_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  category text not null,
  channel text not null check (channel in ('inapp','email','push','digest','reminder','escalation')),
  status text not null check (status in ('sent','failed','skipped','denied')),
  error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_ndl_user_created on public.notification_delivery_log(user_id, created_at desc);
create index if not exists idx_ndl_status_created on public.notification_delivery_log(status, created_at desc);
alter table public.notification_delivery_log enable row level security;
create policy "own delivery read" on public.notification_delivery_log
  for select using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'::app_role));

-- 4. SLA tracking
create table if not exists public.notification_sla_tracking (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  sla_kind text not null,
  started_at timestamptz not null default now(),
  sla_minutes int not null,
  breached_at timestamptz,
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique (entity_type, entity_id, sla_kind)
);
create index if not exists idx_sla_open on public.notification_sla_tracking(sla_kind) where resolved_at is null;
alter table public.notification_sla_tracking enable row level security;
create policy "admin sla read" on public.notification_sla_tracking
  for select using (public.has_role(auth.uid(),'admin'::app_role));

-- 5. digest log
create table if not exists public.notification_digest_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  period text not null check (period in ('daily','weekly')),
  sent_at timestamptz not null default now(),
  summary jsonb not null default '{}'::jsonb
);
create index if not exists idx_digest_user_sent on public.notification_digest_log(user_id, sent_at desc);
alter table public.notification_digest_log enable row level security;
create policy "own digest read" on public.notification_digest_log
  for select using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'::app_role));
