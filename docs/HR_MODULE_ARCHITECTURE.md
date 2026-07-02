# HR / Payroll Module — Architecture

Reference for the `/hr/*` module (`src/hr-payroll/`). Companion to the audit (`docs/ux-audit/02-hr-ux-audit.md`) and the remediation log (`docs/HR_IMPLEMENTATION_PROGRESS.md`).

Last updated: 2026-07-02.

## 1. Module overview

HR/Payroll is a self-contained sub-application mounted under `/hr/*` from the main CRM router. It owns the full employee lifecycle: employee master data, attendance & exceptions, leave & holidays, payroll processing (cycle-based), approvals, reports, employee self-service (ESS), and configuration/administration.

Per the Future Link architecture decision (2026-07-01), **HR is the System of Record (SSOT) for employee information and lifecycle**; other modules reference the HR employee record. **Authorization is module-specific** — HR does not own other modules' roles/permissions.

Stack: React 18 + TypeScript, react-router (nested routes), TanStack Query for data fetching/caching, Supabase (Postgres + RLS + storage) via `@/integrations/supabase/client`. The module renders with a **bespoke CSS design system** scoped under `data-hr-payroll` (it does not currently use the shared shadcn/ui shell — see Known limitations).

## 2. Route map

Defined in `src/hr-payroll/HrPayrollRoutes.tsx`, all nested under `HrPayrollLayout`.

| Area | Route(s) | Page |
|---|---|---|
| Dashboard / ESS | `/hr`, `/hr/me` (+ `me/time-history`, `me/exceptions`) | HrDashboardPage, HrEssPage |
| Employee directory | `/hr/employee` (list), `/hr/employee/:id/*` (360 tabs) | HrEmp360ListPage, HrEmp360Layout + Summary/Attendance/Leaves/Payroll/Training/Documents/PolicyBundle |
| Employee master | `/hr/employees` | HrEmployeesPage |
| People | `/hr/documents`, `/hr/training` | HrDocumentsPage, HrTrainingPage |
| Attendance | `/hr/attendance/{records,exceptions,compoff,late,mispunch}` (+ legacy redirects) | AttendanceModuleLayout + HrAttendancePage, AemsHrReviewPage, HrCompoffPage, HrLatePage, HrMispunchPage |
| Leave / holidays | `/hr/leave`, `/hr/holidays` | HrLeavePage, HrHolidaysPage |
| Payroll | `/hr/payroll/{process,validation,register,history}`, `/hr/payroll/verify/:cycleId?`, `/hr/payroll/:cycleId?` | HrCalculatorPage, HrPayrollValidationPage, HrSalaryRegisterPage, HrPayrollHistoryPage, HrVerifyPage |
| Approvals | `/hr/approvals/:type` | HrApprovalsPage |
| Reports | `/hr/reports`, `/hr/reports/:reportId` | HrReportsHubPage, HrReportPage |
| Config | `/hr/config` + `config/{shifts,holidays,document-types,categories,roles,audit,:slug}`; `config/{branches,departments,designations}` → redirect to `/hr/admin/master-data/crm/*` | HrConfigHubPage, HrShiftsPage, HrHolidaysPage (masterMode), HrDocumentTypesPage, HrEmployeeCategoriesPage, HrRolesPage, HrAuditPage, HrConfigPolicyRoute |
| Admin | `/hr/admin`, `admin/master-data` (+ companies, crm/:section, :domain), `admin/wpms/*`, `admin/incidents` | HrAdminHubPage, HrMasterDataHubPage, HrCompaniesAdminPage, HrAdminCrmMasterPage, HrMasterDataDomainPage, Wpms* , AemsIncidentRegisterPage |
| Import | `/hr/import` | HrImportPage |

Unknown sub-paths redirect to `/hr`. RBAC gating per route is resolved in `HrPayrollLayout` via `screenKeyFromPath` + `canSee`.

## 3. Folder structure

```
src/hr-payroll/
├── HrPayrollRoutes.tsx          # route table (nested under HrPayrollLayout)
├── context/
│   ├── HrAccessContext.tsx      # context type: role, can/canSee, cycle, pendingCounts…
│   └── HrPayrollProvider.tsx    # provider: RBAC resolution, cycle, pending counts, toast
├── components/
│   ├── HrPayrollLayout.tsx      # sidebar + topbar shell, RBAC nav, "View as" role
│   ├── HrModuleErrorBoundary.tsx
│   ├── ui/                      # ModalShell, StatusBadge, Stat, EmployeeAvatar, EmployeeCard
│   ├── payroll/                 # PayrollBreakdownModal, PayrollBreakdownPanel (PayrollWorkflowStepper)
│   ├── employees/               # EmployeeFormModal, EmployeeDetailModal, EmployeeDocumentsPanel
│   ├── emp360/                  # Emp360FilterBar, Emp360ProfileChrome, Emp360ActivityTimeline…
│   ├── attendance/              # AttendanceModuleLayout
│   ├── team/                    # CrmImportModal
│   └── wtm/                     # WtmWorkforceTimeWidget
├── hooks/                       # useHrEmployees, useHrPayroll, useHrRequests, useHrAttendance,
│                                #   useHrShifts, useWtm, useEstimatedPayroll, useHrAttendanceBulk…
├── lib/
│   ├── constants.ts, nav.ts, format.ts, types.ts, hrApi.ts, moduleStructure.ts
│   ├── payrollBreakdown.ts, payrollExport.ts, bankTransferExport.ts, salarySlip.ts
│   ├── estimatedPayrollCalculator.ts, attendanceMetrics.ts, leavePolicy.ts
│   ├── payrollVerifyFilters.ts, payrollUatReset.ts, emp360Paths.ts, emp360Filters.ts
│   └── payrollValidation.ts, payrollConfirm.ts, payrollReadiness.ts,        # ← added in remediation
│       payrollWorkflowGuide.ts, payrollAuditTrail.ts, attendanceImport.ts   #    (+ *.test.ts each)
└── pages/
    ├── (top-level pages listed in the route map)
    ├── emp360/                  # HrEmp360Layout + per-tab pages
    ├── admin/                   # hub + master-data + companies + crm master
    ├── wpms/, wtm/, aems/, reports/
```

## 4. Component hierarchy (runtime)

```
AppRoutes ("/hr/*")
└── HrPayrollRoutes
    └── HrPayrollProvider (RBAC, cycle, pending counts, toast)
        └── HrPayrollLayout (sidebar + topbar + "View as" role + error boundary)
            └── <Outlet>  →  active page, e.g. HrVerifyPage
                ├── PayrollWorkflowStepper
                ├── ModalShell (validation gate / confirmation / override / UAT reset)
                └── PayrollBreakdownModal
```

Shared primitives (`ModalShell`, `StatusBadge`, `Stat`, `EmployeeAvatar`, `EmployeeCard`) live in `components/ui`. Pure business logic lives in `lib/` and is unit-tested; pages compose hooks + lib + components.

## 5. Employee lifecycle

Every employee is created in HR (SSOT). `HrEmployeesPage` (Employee Master) is the CRUD surface (create/edit/deactivate, `EmployeeFormModal`/`EmployeeDetailModal`); `HrEmp360ListPage` + `HrEmp360Layout` is the read-oriented 360 profile (Summary + Attendance/Leaves/Payroll/Training/Documents/Policy-Bundle tabs). Deactivation is soft (status change; historical payroll/attendance/leave/documents preserved). Employees can also be imported from CRM (`CrmImportModal`, `HrCrmMasterLinkPage`). Status values (Active / Probation / On Notice / Inactive, etc.) drive UI affordances including the ESS status banner.

## 6. Attendance workflow

`AttendanceModuleLayout` hosts tabs: Records, Exceptions (AEMS), Comp-off, Late, Mispunch. Attendance can be captured live via the workforce-time widget (WTM) or bulk-imported from CSV (`HrImportPage` → `attendanceImport.ts` validates live, upserts into `attendance` with `source=import`, conflict key `employee_id,work_date`). Exceptions/late/mispunch/comp-off are request types flowing through the approval system and feeding payroll roll-ups.

## 7. Leave workflow

`HrLeavePage` handles application (`LeaveModal`) and the request list. Policy logic (entitlements, monthly caps, sandwich rules, notice, sick-certificate requirement) lives in `lib/leavePolicy.ts`. Requests move through `processApprovalDecision` (supports multi-stage approver chains); on approval the payroll line is rebuilt (`rebuildPayrollLine`). The list supports search + bulk approve/reject (HR-11), a per-row detail modal, cancel/reopen/delete, and document attachments. Balances render via `LeaveSummaryPanel` and `displayLeaveBalances`.

## 8. Payroll workflow

Cycle-based, status machine: **Draft → Processed → Approved → Locked → Paid** (`PAYROLL_WORKFLOW_STEPS`).

- **Verify** (`HrVerifyPage`) is the operational hub: filter by country/branch/company/date/cycle/status; a wide salary register (paginated + sortable, HR-16); per-line breakdown and override (`override_json`, reason required — HR-17).
- **Validation gate (HR-15):** `payrollValidation.ts` classifies each line into hard errors / warnings; hard errors **block** Process/Approve/Lock/Mark-paid and bank export, with an audited admin override.
- **Confirmation (HR-14):** every transition opens a `ModalShell` dialog with status transition, impact figures, a **readiness checklist** (`payrollReadiness.ts`), and a type-to-confirm challenge (`payrollConfirm.ts`) for the irreversible Lock/Mark-paid.
- **Guidance (HR-13):** `payrollWorkflowGuide.ts` drives the current-step/next-action callout and the pipeline preview.
- **Audit trail (HR-19):** `payrollAuditTrail.ts` surfaces the cycle's `audit_log` events as a "Cycle history" timeline.
- **Outputs:** salary register (CSV/Excel/PDF), batch salary slips (locked/paid only), and a bank-transfer CSV (`bankTransferExport.ts`, with missing/unverified-bank checks).
- **Calculator** (`HrCalculatorPage`) is a what-if sandbox (`fn_compute_payroll`); it does not write to the register.
- Server-side RPCs (`processPayrollCycle`, `approvePayrollCycle`, `lockPayrollCycle`, `markPayrollPaid`, `rebuildPayrollCycle`, `resetPayrollCycleUat`) in `hrApi.ts` perform the state changes; the client refetches via query invalidation.

## 9. ESS (Employee Self-Service) workflow

`HrEssPage` (`/hr/me`, "My Portal") is the employee-facing surface: profile hero, quick actions (apply leave, attendance exceptions, comp-off, salary slip), live check-in (WTM), leave balances, salary breakdown, payroll history, and documents. Non-active employees see a status banner (HR-08); approvers additionally see a "Team approvals" quick link (HR-23). Salary slips are available only for Locked/Paid cycles.

## 10. Audit architecture

All HR mutations of interest call `hrAudit(action, target, prev, next)` (`hrApi.ts`) → inserts into the shared `audit_log` table (`org_id`, `actor_id`, `actor_label`, `action`, `target`, `prev_value`, `new_value`, `created_at`). `useHrAuditLogs` reads the latest rows. Surfaces: the global Audit Logs page (`HrAuditPage`), the Emp360 activity timeline, an audit report, and (HR-19) the payroll cycle history on the Verify page (filtered via `payrollAuditTrail.ts`). Validation overrides (HR-15) also write an audit row.

## 11. Integration points

- **CRM** — HR is the employee SSOT; CRM references HR employees. Employees can be imported from CRM (`CrmImportModal`/`HrCrmMasterLinkPage`). Organisational masters (branch/department/designation) currently live in CRM `/masters`; HR config links out to them (see Known limitations / Phase 2 HR-10). `audit_log` is shared org-wide.
- **Accounting** — Payroll produces the salary register and a bank-transfer file for disbursement; posting payroll to the general ledger is not implemented in this module (Phase 2 candidate).
- **Institution / Performance / other modules** — reference the HR employee record; each maintains its own module-specific roles/permissions (per the architecture decision). HR does not own those permissions.
- **Auth/RBAC** — HR roles/permissions resolved in `HrPayrollProvider`/`HrAccessContext` (`role`, `can`, `canSee`, `pendingCounts`); the "View as role" control previews menus only (real permissions unchanged) — see remaining business decision HR-02.

## 12. Extension points

- **Pure logic in `lib/`** — add/adjust rules in `payrollValidation`, `leavePolicy`, `estimatedPayrollCalculator`, `payrollReadiness`, `attendanceImport` without touching pages; each has (or can have) a colocated `*.test.ts`.
- **Navigation** — add screens via `HR_NAV` (`lib/nav.ts`), `HR_SCREEN_ROUTES`/`HR_SCREEN_TITLES` (`lib/constants.ts`), and a route in `HrPayrollRoutes.tsx`; RBAC follows automatically via `screenKeyFromPath` + `canSee`.
- **Payroll workflow** — the status machine (`PAYROLL_WORKFLOW_STEPS`) and its guidance (`payrollWorkflowGuide`) are the seam for new steps.
- **Reports** — add report definitions consumed by `HrReportsPage`/`HrReportPage`.
- **Config/policies** — `moduleStructure.ts` + `policies` table drive the config hub.

## 13. Known limitations

- **Bespoke design system (HR-01):** HR uses its own CSS, diverging from the shared shadcn/ui shell used elsewhere.
- **Org master-data ownership (HR-10):** branch/department/designation live in CRM `/masters` and HR links out via a redirect (cross-module SSOT not yet built).
- **Hub-within-hub navigation (HR-03):** config/admin/master-data nest several levels; baseline wayfinding (topbar Back/Main-menu, hub intros, sub-page back-links) exists but no breadcrumb/flatten.
- **Register table:** paginated + sortable, but still 25 columns with horizontal scroll (no frozen column / column grouping — HR-16 remainder).
- **Pending-approval counts (HR-18)** shown on the cycle are module-wide, not cycle-scoped.
- **Reports (HR-21):** no shared cross-report filters or drill-through.
- **"View as role" (HR-02):** persistent for all users; behaviour pending a business decision.
- **Payroll → GL posting:** not implemented.

## 14. Future roadmap (Phase 2)

- HR-01 design-system migration onto the shared shell/shadcn primitives.
- HR-10 HR-as-SSOT reference architecture across CRM/Accounting/Institution/Performance.
- HR-03 navigation flatten + breadcrumbs.
- HR-21 report shared filters + drill-through.
- HR-16 remainder (frozen Employee column, column grouping/visibility).
- HR-23 remainder (full role-aware manager dashboard with team-scoped queries).
- HR-02 / HR-09 once the business decisions are made (role-preview policy; canonical holidays surface).
- Payroll → general-ledger posting integration with Accounting.
