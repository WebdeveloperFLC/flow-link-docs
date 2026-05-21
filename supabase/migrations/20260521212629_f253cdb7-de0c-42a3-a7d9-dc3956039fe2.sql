
create table if not exists public.ai_help_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_ai_help_conv_user on public.ai_help_conversations(user_id, updated_at desc);

create table if not exists public.ai_help_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_help_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_ai_help_msg_conv on public.ai_help_messages(conversation_id, created_at);

create table if not exists public.ai_help_feedback (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.ai_help_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating in (-1, 1)),
  note text,
  created_at timestamptz not null default now()
);

alter table public.ai_help_conversations enable row level security;
alter table public.ai_help_messages enable row level security;
alter table public.ai_help_feedback enable row level security;

create policy "own conv select" on public.ai_help_conversations for select using (auth.uid() = user_id);
create policy "own conv insert" on public.ai_help_conversations for insert with check (auth.uid() = user_id);
create policy "own conv update" on public.ai_help_conversations for update using (auth.uid() = user_id);
create policy "own conv delete" on public.ai_help_conversations for delete using (auth.uid() = user_id);

create policy "own msg select" on public.ai_help_messages for select using (auth.uid() = user_id);
create policy "own msg insert" on public.ai_help_messages for insert with check (auth.uid() = user_id);
create policy "own msg delete" on public.ai_help_messages for delete using (auth.uid() = user_id);

create policy "own fb select" on public.ai_help_feedback for select using (auth.uid() = user_id);
create policy "own fb insert" on public.ai_help_feedback for insert with check (auth.uid() = user_id);
create policy "own fb update" on public.ai_help_feedback for update using (auth.uid() = user_id);
create policy "own fb delete" on public.ai_help_feedback for delete using (auth.uid() = user_id);

create or replace function public.touch_ai_help_conv()
returns trigger language plpgsql as $$
begin
  update public.ai_help_conversations set updated_at = now() where id = new.conversation_id;
  return new;
end $$;

drop trigger if exists trg_touch_ai_help_conv on public.ai_help_messages;
create trigger trg_touch_ai_help_conv after insert on public.ai_help_messages
for each row execute function public.touch_ai_help_conv();
