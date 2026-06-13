# Supabase Schema & ERD (v1)

Full DDL lives in `supabase/01_schema.sql` (tables, enums, indexes), `02_rls.sql` (policies + helper functions), `03_functions.sql` (payroll engine). This doc is the map.

## Design principles
- **Org-scoped**: every table carries `org_id` (the CRM org). RLS filters on it.
- **Engine in the database**: payable-days/PF/ESIC live in Postgres functions, called by RPC. The client never computes money.
- **Snapshot payroll**: `payroll_lines` freezes its inputs so a locked cycle can't drift when historical attendance is corrected.
- **Request + approval split**: each workflow (leave/comp-off/late/mispunch/training) is a request table plus a shared `approvals` trail, enabling multi-stage chains.
- **Versioned policy**: rule parameters live in `policies` keyed by `(domain, version, effective_from)` rather than hard-coded.

## ERD

```mermaid
erDiagram
  companies ||--o{ employees : "payroll company"
  branches  ||--o{ employees : "posted at"
  branches  ||--o{ holidays  : "branch-specific"
  shifts    ||--o{ employees : "assigned"
  employees ||--o{ employees : "reports_to"
  employees ||--o{ employee_documents : "has"
  employees ||--o{ attendance : "daily rows"
  employees ||--o{ leave_requests : "files"
  employees ||--o{ leave_balances : "accrues"
  employees ||--o{ compoff_requests : "files"
  employees ||--o{ late_exemptions : "files"
  employees ||--o{ mispunch_requests : "files"
  employees ||--o{ training_records : "assigned"
  employees ||--o{ payroll_lines : "earns"
  payroll_cycles ||--o{ payroll_lines : "contains"
  leave_requests ||--o{ approvals : "trail"
  compoff_requests ||--o{ approvals : "trail"
  role_assignments }o--|| role_permissions : "role → perms"

  employees {
    uuid id PK
    uuid org_id
    uuid staff_id FK "CRM user"
    text emp_code
    text full_name
    uuid reporting_mgr_id FK
    uuid shift_id FK
    numeric monthly_gross
    numeric basic
    bool pf_applicable
    bool esic_applicable
    enum status
  }
  attendance {
    uuid id PK
    uuid employee_id FK
    date work_date
    time check_in
    time check_out
    time break_start
    time break_end
    enum status
    bool is_mispunch
    text source
  }
  payroll_cycles {
    uuid id PK
    date start_date
    date end_date
    int payroll_days
    enum status
  }
  payroll_lines {
    uuid id PK
    uuid cycle_id FK
    uuid employee_id FK
    numeric payable_days
    numeric daily_rate
    numeric gross_earned
    numeric pf_employee
    numeric esic_employee
    numeric net_salary
    bool is_overridden
    jsonb override_json
  }
  leave_requests {
    uuid id PK
    uuid employee_id FK
    enum type
    numeric days
    bool is_sandwich
    enum status
  }
  leave_balances {
    uuid id PK
    uuid employee_id FK
    int policy_year
    enum type
    numeric entitled
    numeric accrued
    numeric taken
    numeric carried_in
    numeric encashed
  }
  approvals {
    uuid id PK
    text entity_type
    uuid entity_id
    enum stage
    uuid approver_id
    enum decision
  }
  role_permissions {
    uuid id PK
    enum role
    bool can_approve
    bool can_override
    bool can_configure
    jsonb screens
  }
  policies {
    uuid id PK
    text domain
    date effective_from
    int version
    jsonb config
  }
```

## Table groups

**People & org** — `companies`, `branches`, `shifts`, `employees`, `employee_documents`
**Time** — `attendance`, `holidays`
**Workflows** — `leave_requests`, `leave_balances`, `compoff_requests`, `late_exemptions`, `mispunch_requests`, `training_records`, `approvals`
**Payroll** — `payroll_cycles`, `payroll_lines`
**Governance** — `role_permissions`, `role_assignments`, `policies`, `audit_log`

## Key relationships to watch in code
- `employees.staff_id` is the bridge to the CRM's existing user/staff table (Team & Roles). It is nullable so an employee record can exist before a login is provisioned.
- `employees.reporting_mgr_id` is self-referential and drives both the approval chain and manager-scoped RLS (`manages_employee`).
- `payroll_lines` is unique on `(cycle_id, employee_id)`; rebuild is idempotent via upsert while the cycle is Draft.
- `policies` is read newest-effective-first; the engine resolves the row whose `effective_from <= cycle.start_date`.
