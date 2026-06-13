-- =====================================================================
-- Future Link HRMS / Payroll — Supabase Schema (v1)
-- Pattern: mirrors Performance Hub (org-scoped, RLS via auth.uid()→staff)
-- Run order: 01_schema.sql → 02_rls.sql → 03_functions.sql → 99_seed.sql
-- =====================================================================

-- ---------- EXTENSIONS ----------
create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "pg_trgm";       -- search on names

-- ---------- ENUMS (idempotent — safe to re-run after partial apply) ----------
DO $$ BEGIN CREATE TYPE employment_type AS ENUM ('Full-Time','Part-Time','Intern','Temporary','Contract');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE emp_status AS ENUM ('On Probation','Confirmed','Resigned','Terminated','On Notice');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE work_week AS ENUM ('6-Day','5-Day');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE shift_type AS ENUM ('Day','Night','Rotational','Custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE att_status AS ENUM ('Present','Half Day','Absent','Leave','Sick Leave','Holiday','Week Off','Unauthorized Leave');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE leave_type AS ENUM ('Annual Leave','Sick Leave','Casual Leave','Comp-Off Leave','Special Leave','Unpaid Leave');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE request_status AS ENUM ('Pending','Approved','Rejected','Cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE approval_stage AS ENUM ('Manager','HR','Final');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE holiday_type AS ENUM ('National','Festival','Company','Optional');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE training_status AS ENUM ('In Progress','Completed','Extended','Cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payroll_status AS ENUM ('Draft','Locked','Paid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE hr_role AS ENUM ('Super Admin','Admin','HR Manager','HR Executive','Manager','Employee');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================================
-- ORG / BRANCH / COMPANY
-- branches: reuse existing CRM public.branches (Genda Circle, Ajwa, etc.)
-- =====================================================================
create table if not exists companies (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null,                         -- FK to existing CRM org (Team & Roles)
  name        text not null,                          -- 'FL Pvt. Ltd.', 'FL Academic'
  created_at  timestamptz not null default now()
);

-- CRM already owns public.branches — add HR-only column if missing
alter table public.branches
  add column if not exists timezone text not null default 'Asia/Kolkata';

-- =====================================================================
-- SHIFTS  (drives late / break / OT / half-day)
-- =====================================================================
create table if not exists shifts (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null,
  name          text not null,
  type          shift_type not null default 'Day',
  login_time    time not null,                        -- '10:00'
  logout_time   time not null,                        -- '19:00'
  work_hours    numeric(4,2) not null default 9,
  grace_min     int not null default 5,               -- 10:00 → grace to 10:05
  break_min     int not null default 45,
  half_day_after_min int not null default 60,         -- late > 60m → Half Day
  ot_eligible   boolean not null default true,
  created_at    timestamptz not null default now()
);

-- =====================================================================
-- EMPLOYEES  (the master; links to CRM staff via staff_id)
-- =====================================================================
create table if not exists employees (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null,
  staff_id        uuid unique,                         -- FK → CRM staff/auth user (Team & Roles). NULL until linked.
  emp_code        text not null,                       -- 'FL-1042' (human readable)
  -- profile
  full_name       text not null,
  gender          text,
  dob             date,
  mobile          text,
  email           text,
  addr_current    text,
  addr_permanent  text,
  emergency       text,
  photo_url       text,                                -- Supabase Storage path (not base64 in prod)
  -- employment
  designation     text,
  department      text,
  company_id      uuid references companies(id),
  branch_id       uuid references public.branches(id),
  reporting_mgr_id uuid references employees(id),      -- self-ref for approval chain
  employment_type employment_type not null default 'Full-Time',
  date_of_joining date,
  notice_period   text default '30 days',
  work_week       work_week not null default '6-Day',
  status          emp_status not null default 'On Probation',
  shift_id        uuid references shifts(id),
  -- salary components (monthly, INR)
  monthly_gross   numeric(12,2) not null default 0,
  basic           numeric(12,2) not null default 0,
  hra             numeric(12,2) not null default 0,
  conveyance      numeric(12,2) not null default 0,
  special_allow   numeric(12,2) not null default 0,
  incentive       numeric(12,2) not null default 0,    -- default monthly incentive; per-cycle override in payroll_lines
  bonus           numeric(12,2) not null default 0,
  -- statutory
  pf_applicable   boolean not null default true,
  pf_number       text,
  uan             text,
  esic_applicable boolean not null default false,
  esic_number     text,
  -- bank (salary disbursement — v1)
  bank_holder_name    text,
  bank_name           text,
  bank_account_number text,
  bank_ifsc           text,
  bank_branch         text,
  bank_account_type   text not null default 'Savings',
  bank_verified       boolean not null default false,
  -- leave config (entitlement resolved from policy by work_week, but allow per-emp override)
  annual_entitlement numeric(5,1),                     -- null → derive from policy
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (org_id, emp_code)
);
create index if not exists idx_hr_employees_org on employees (org_id);
create index if not exists idx_hr_employees_branch on employees (branch_id);
create index if not exists idx_hr_employees_name_trgm on employees using gin (full_name gin_trgm_ops);

-- =====================================================================
-- DOCUMENTS  (metadata; files live in Supabase Storage bucket 'hr-docs')
-- =====================================================================
create table if not exists employee_documents (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null,
  employee_id  uuid not null references employees(id) on delete cascade,
  doc_type     text not null,                          -- 'Aadhaar Card','Offer Letter',... (guided list)
  file_name    text,
  storage_path text,                                   -- bucket path
  mime         text,
  uploaded_by  uuid,
  created_at   timestamptz not null default now()
);
create index if not exists idx_hr_employee_documents_emp on employee_documents (employee_id);

-- =====================================================================
-- PAYROLL CYCLES
-- =====================================================================
create table if not exists payroll_cycles (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null,
  label         text not null,                          -- '26 May 2026 – 25 Jun 2026'
  start_date    date not null,
  end_date      date not null,
  payroll_days  int not null,                           -- divisor for daily rate (28/30/31)
  status        payroll_status not null default 'Draft',
  approved_by   uuid,
  approved_at   timestamptz,
  created_at    timestamptz not null default now(),
  unique (org_id, start_date, end_date)
);

-- =====================================================================
-- ATTENDANCE  (one row per employee per day)
-- =====================================================================
create table if not exists attendance (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null,
  employee_id  uuid not null references employees(id) on delete cascade,
  work_date    date not null,
  check_in     time,
  check_out    time,
  break_start  time,
  break_end    time,
  break_min    int,                                     -- stored override; else derived
  status       att_status not null default 'Absent',
  is_mispunch  boolean not null default false,
  source       text not null default 'manual',          -- 'manual' | 'biometric' | 'self' | 'import'
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (employee_id, work_date)
);
create index if not exists idx_hr_attendance_org_date on attendance (org_id, work_date);
create index if not exists idx_hr_attendance_emp_date on attendance (employee_id, work_date);

-- =====================================================================
-- LEAVE  (+ balances + approval chain)
-- =====================================================================
create table if not exists leave_requests (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null,
  employee_id   uuid not null references employees(id) on delete cascade,
  type          leave_type not null,
  from_date     date not null,
  to_date       date not null,
  days          numeric(4,1) not null,                  -- supports 0.5
  reason        text,
  has_document  boolean not null default false,
  document_id   uuid references employee_documents(id),
  is_sandwich   boolean not null default false,         -- flagged when bridging off-days
  status        request_status not null default 'Pending',
  created_at    timestamptz not null default now()
);
create index if not exists idx_hr_leave_requests_emp on leave_requests (employee_id, status);

-- per-step approval trail (Employee → Manager → HR → Final)
create table if not exists approvals (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null,
  entity_type   text not null,                          -- 'leave'|'compoff'|'late'|'mispunch'|'training'
  entity_id     uuid not null,
  stage         approval_stage not null,
  approver_id   uuid,                                    -- employee/staff who acted
  decision      request_status not null default 'Pending',
  acted_at      timestamptz,
  comment       text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_hr_approvals_entity on approvals (entity_type, entity_id);

-- leave balances (per employee per leave_type per policy-year)
create table if not exists leave_balances (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null,
  employee_id   uuid not null references employees(id) on delete cascade,
  policy_year   int not null,                            -- e.g. 2026
  type          leave_type not null,
  entitled      numeric(5,1) not null default 0,
  accrued       numeric(5,1) not null default 0,         -- monthly accrual to date (1.5/mo etc.)
  taken         numeric(5,1) not null default 0,
  carried_in    numeric(5,1) not null default 0,
  encashed      numeric(5,1) not null default 0,
  unique (employee_id, policy_year, type)
);

-- =====================================================================
-- COMP-OFF / LATE / MISPUNCH
-- =====================================================================
create table if not exists compoff_requests (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null,
  employee_id  uuid not null references employees(id) on delete cascade,
  worked_date  date not null,
  occasion     text,                                     -- 'Worked on Weekly Off' etc.
  reason       text,
  status       request_status not null default 'Pending',
  created_at   timestamptz not null default now()
);

create table if not exists late_exemptions (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null,
  employee_id  uuid not null references employees(id) on delete cascade,
  late_date    date not null,
  official_in  time not null,
  actual_in    time not null,
  delay_min    int not null,
  reason       text,
  status       request_status not null default 'Pending',
  created_at   timestamptz not null default now()
);

create table if not exists mispunch_requests (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null,
  employee_id  uuid not null references employees(id) on delete cascade,
  punch_date   date not null,
  issue        text not null,                            -- 'Missing Punch Out' etc.
  evidence     text,
  status       request_status not null default 'Pending',
  created_at   timestamptz not null default now()
);

-- =====================================================================
-- TRAINING  (unpaid days reduce payable)
-- =====================================================================
create table if not exists training_records (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null,
  employee_id  uuid not null references employees(id) on delete cascade,
  type         text not null,                            -- 'Paid Training'|'Unpaid Training'
  duration     text,
  unpaid_days  int not null default 0,                   -- capped 0..7 (business rule)
  start_date   date,
  status       training_status not null default 'In Progress',
  created_at   timestamptz not null default now()
);

-- =====================================================================
-- HOLIDAYS
-- =====================================================================
create table if not exists holidays (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null,
  holiday_date date not null,
  name         text not null,
  type         holiday_type not null default 'Festival',
  branch_id    uuid references public.branches(id),             -- null = all branches
  created_at   timestamptz not null default now()
);

-- =====================================================================
-- PAYROLL LINES  (one frozen row per employee per cycle; the audit-grade record)
-- =====================================================================
create table if not exists payroll_lines (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null,
  cycle_id      uuid not null references payroll_cycles(id) on delete cascade,
  employee_id   uuid not null references employees(id) on delete cascade,
  -- snapshot inputs (so a locked line never drifts when attendance is edited later)
  payroll_days  int not null,
  monthly_gross numeric(12,2) not null,
  basic         numeric(12,2) not null,
  -- rolled-up counters
  leaves_taken  numeric(5,1) not null default 0,
  paid_leaves   numeric(5,1) not null default 0,
  comp_off      numeric(5,1) not null default 0,
  late_count    int not null default 0,
  mispunch_count int not null default 0,                 -- mispunch + absent (per Excel column)
  ul_count      int not null default 0,
  sandwich_count int not null default 0,
  unpaid_training int not null default 0,
  -- derived deductions
  late_deduction numeric(5,1) not null default 0,        -- K (slab)
  mispunch_deduction numeric(5,1) not null default 0,    -- N
  payable_days  numeric(6,2) not null,
  daily_rate    numeric(12,2) not null,
  gross_earned  numeric(12,2) not null,
  incentive     numeric(12,2) not null default 0,
  bonus         numeric(12,2) not null default 0,
  pf_employee   numeric(12,2) not null default 0,
  esic_employee numeric(12,2) not null default 0,
  net_salary    numeric(12,2) not null,
  -- override
  is_overridden boolean not null default false,
  override_json jsonb,                                    -- the manual input set, if overridden
  override_by   uuid,
  created_at    timestamptz not null default now(),
  unique (cycle_id, employee_id)
);
create index if not exists idx_hr_payroll_lines_cycle on payroll_lines (cycle_id);

-- =====================================================================
-- SALARY SLIPS  (PDF archive per locked payroll line — v1 Phase 4)
-- =====================================================================
create table if not exists salary_slips (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null,
  payroll_line_id uuid not null references payroll_lines(id) on delete cascade,
  employee_id     uuid not null references employees(id) on delete cascade,
  cycle_id        uuid not null references payroll_cycles(id) on delete cascade,
  storage_path    text,
  generated_at    timestamptz not null default now(),
  unique (payroll_line_id)
);
create index if not exists idx_hr_salary_slips_emp on salary_slips (employee_id, cycle_id);

-- =====================================================================
-- RBAC  (role → permission + screen visibility; editable, persisted)
-- =====================================================================
create table if not exists role_permissions (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null,
  role        hr_role not null,
  -- action perms
  can_view      boolean not null default true,
  can_apply     boolean not null default false,
  can_approve   boolean not null default false,
  can_override  boolean not null default false,
  can_export    boolean not null default false,
  can_configure boolean not null default false,
  can_manage_emp boolean not null default false,
  -- screen visibility map (key→bool)
  screens     jsonb not null default '{}'::jsonb,
  unique (org_id, role)
);

-- maps an org member to one HR role (extends CRM Team & Roles)
create table if not exists role_assignments (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null,
  staff_id    uuid not null,                             -- CRM staff/auth uid
  role        hr_role not null,
  scope_branch_id uuid references public.branches(id),          -- optional branch scoping
  unique (org_id, staff_id)
);

-- =====================================================================
-- AUDIT LOG
-- =====================================================================
create table if not exists audit_log (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null,
  actor_id    uuid,
  actor_label text,                                       -- 'You (HR Manager)'
  action      text not null,                              -- 'Leave Approved','Permission Granted'
  target      text,                                       -- 'LV-2211 · Karan Joshi'
  prev_value  text,
  new_value   text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_hr_audit_log_org on audit_log (org_id, created_at desc);

-- =====================================================================
-- POLICY  (versioned config — see business rules doc §Policy Versioning)
-- =====================================================================
create table if not exists policies (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null,
  domain        text not null,                            -- 'late'|'mispunch'|'leave'|'sandwich_ul'|'cycle'
  effective_from date not null,
  version       int not null,
  config        jsonb not null,                           -- rule params (slab table, caps, accrual rates)
  created_by    uuid,
  created_at    timestamptz not null default now(),
  unique (org_id, domain, version)
);
create index if not exists idx_hr_policies_org on policies (org_id, domain, effective_from desc);

-- updated_at triggers
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;
drop trigger if exists trg_emp_updated on employees;
create trigger trg_emp_updated  before update on employees  for each row execute function set_updated_at();
drop trigger if exists trg_att_updated on attendance;
create trigger trg_att_updated  before update on attendance for each row execute function set_updated_at();
