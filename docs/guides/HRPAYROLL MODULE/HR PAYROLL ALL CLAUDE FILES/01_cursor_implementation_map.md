# Cursor Implementation Map (v1)

How to read this: each prototype screen maps to a React route, the Supabase tables it reads/writes, the governing RLS/permission, the engine touchpoint, and the sprint it lands in. Build top-to-bottom — earlier rows unblock later ones.

**Stack assumption:** React + Vite (same as Performance Hub), Supabase JS client, TanStack Query for data, route-guarded by `role_assignments`. All money/day maths via Postgres RPC — never client-side.

| # | Prototype screen | Route | Primary tables | Writes | Permission gate | Engine / RPC | Sprint |
|---|------------------|-------|----------------|--------|-----------------|--------------|--------|
| 1 | Payroll Dashboard | `/hr` | `payroll_lines`, `employees`, `branches` | – | `view` | reads `v_payroll_preview` | S3 |
| 2 | My Portal (ESS) | `/hr/me` | `employees`, `attendance`, `payroll_lines`, `leave_balances` | `attendance` (self punch) | `apply` (self) | `fn_build_payroll_line` (read) | S2 |
| 3 | Employee 360° | `/hr/employee/:id` | `employees`, `attendance`, `leave_requests`, `training_records`, `audit_log` | – | `view` + manages/HR | – | S3 |
| 4 | Employee Master | `/hr/employees` | `employees`, `companies`, `branches`, `shifts` | `employees` | `manage_emp` | – | S1 |
| 5 | Employee form (profile/salary/statutory) | `/hr/employees/:id/edit` | `employees`, `employee_documents` | `employees`, `employee_documents` | `manage_emp` | – | S1–S2 |
| 6 | Shift Management | `/hr/shifts` | `shifts`, `employees` | `shifts` | `configure`/`manage_emp` | – | S2 |
| 7 | Training | `/hr/training` | `training_records`, `employees` | `training_records` | `approve` | feeds `unpaid_training` | S4 |
| 8 | Payable Days Engine (calculator) | `/hr/calculator` | – (stateless) | – | `view` | `fn_compute_payroll` (RPC, live) | S3 |
| 9 | Payroll Verification | `/hr/payroll/:cycleId` | `payroll_lines`, `payroll_cycles` | `payroll_lines`, `payroll_cycles` | `export`/`approve`/`override` | `fn_build_payroll_line`, lock/approve | S3–S4 |
| 10 | Attendance + Punch Station | `/hr/attendance` | `attendance`, `shifts`, `employees` | `attendance` | `manage_emp`/`approve`; self via `apply` | `fn_derive_status` (trigger) | S2 |
| 11 | Leave Management | `/hr/leave` | `leave_requests`, `leave_balances`, `approvals` | `leave_requests`, `approvals`, `leave_balances` | `apply` (create), `approve` (decide) | balance + sandwich logic | S4 |
| 12 | Comp-Off | `/hr/compoff` | `compoff_requests`, `approvals` | both | `apply`/`approve` | feeds `comp_off` | S4 |
| 13 | Late Coming | `/hr/late` | `late_exemptions` | same | `apply`/`approve` | reduces `late` in rollup | S4 |
| 14 | Mispunch | `/hr/mispunch` | `mispunch_requests` | same | `apply`/`approve` | reduces `mispunch` in rollup | S4 |
| 15 | Holidays | `/hr/holidays` | `holidays`, `branches` | `holidays` | `manage_emp` | – | S2 |
| 16 | Payroll & Policy Config | `/hr/config` | `policies`, `payroll_cycles` | `policies`, `payroll_cycles` | `configure` | – | S5 |
| 17 | Roles & Access | `/hr/roles` | `role_permissions`, `role_assignments` | both | `configure` | – | S1 (perms), S5 (full editor) |
| 18 | Audit Logs | `/hr/audit` | `audit_log` | insert-only (system) | `view` (HR) | – | S3 |

## Cross-cutting build tasks (not a single screen)

| Task | Tables/objects | Sprint |
|---|---|---|
| Auth + org context provider, route guard from `role_assignments` | `role_assignments`, `role_permissions` | S1 |
| `useRole()` / `usePerm()` hooks → mirror prototype `can()` / `canSee()` | `role_permissions.screens` jsonb | S1 |
| Supabase Storage bucket `hr-docs` + signed-URL upload for photo/documents | `employee_documents` | S2 |
| `v_payroll_preview` view (live rollup without freezing) | functions | S3 |
| Payroll lock/unlock + snapshot semantics | `payroll_cycles`, `payroll_lines` | S4 |
| Export Excel/CSV/PDF (server-rendered to match register) | `payroll_lines` | S4 |
| Audit-log writer wrapper around every mutating RPC | `audit_log` | S3 |
| Leave accrual cron (monthly 1.5/1.0 etc.) | `leave_balances` | S5 |
| CRM integration adapters (Team&Roles, Performance Hub, Accounting) | see integration spec | S5–S6 |

## Route guard pattern (Cursor: implement once, reuse)
```ts
// guard reads role for current org, checks screen visibility + permission
const { role, can, canSee } = useHrAccess(orgId);
if (!canSee(routeKey)) return <Navigate to={firstAllowed(role)} />;
// inside screens, gate buttons: {can('approve') && <ApproveButton/>}
```
This is the production equivalent of the prototype's `RoleCtx`. `role_permissions.screens` is the same jsonb shape the prototype persists, so the matrix editor (screen 17) ports almost directly.
