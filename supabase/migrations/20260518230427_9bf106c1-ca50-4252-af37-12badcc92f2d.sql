
create table public.upi_sync_queue (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.upi_sync_jobs(id) on delete cascade,
  source_id uuid not null,
  institution_id uuid,
  program_url text not null,
  course_title text,
  status text not null default 'pending',
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, program_url)
);
create index upi_sync_queue_job_status_idx on public.upi_sync_queue(job_id, status);
alter table public.upi_sync_queue enable row level security;
-- service-role only: no policies => no anon/auth access (matches sibling upi_sync_logs table model)
