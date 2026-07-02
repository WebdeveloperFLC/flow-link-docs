# System Architecture

**Repository:** `flow-link-docs` (Future Link Consultants — DMS/CRM Portal)  
**Status:** Primary architecture reference for Cursor sessions and onboarding  
**Last updated:** 2026-06-19

> **Companion docs:** Detailed flow maps, safety rules, and change checklists live in [`docs/system-map/`](./system-map/00-README.md). Consult **09-safety-rules.md** before non-trivial changes.

---

## Table of contents

1. [System Overview](#1-system-overview)
2. [Module Overview](#2-module-overview)
3. [CRM](#3-crm)
4. [Accounting](#4-accounting)
5. [HR Payroll](#5-hr-payroll)
6. [Commission](#6-commission)
7. [Institutions](#7-institutions)
8. [Service Library](#8-service-library)
9. [Dashboard](#9-dashboard)
10. [LMS (planned)](#10-lms-planned)
11. [Database Architecture](#11-database-architecture)
12. [Supabase Architecture](#12-supabase-architecture)
13. [Authentication & Roles](#13-authentication--roles)
14. [Entity Relationships](#14-entity-relationships)
15. [Integration Points](#15-integration-points)
16. [Future Roadmap](#16-future-roadmap)

---

## 1. System Overview

### Purpose

Single web platform for an international education and immigration consultancy:

- **CRM** — leads, clients, documents, chat, telecaller, client portal
- **Revenue** — invoices, payments, receipts, offers, wallets, incentives
- **Operations** — service library, staging pipelines, applications, visa workflows
- **Finance** — full accounting module (multi-entity AR/AP, GL, tax, trust)
- **People** — HR payroll (attendance, leave, payroll runs)
- **Partners** — institutions, commission claims, aggregator workbench

### Technology stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite 5, TypeScript, Tailwind v3, shadcn/ui, react-router |
| **State** | React Context (`AuthContext`), Zustand (accounting stores), TanStack Query (selective) |
| **Backend** | Supabase (Postgres, Auth, Storage, Edge Functions on Deno) |
| **Hosting / sync** | GitHub → Lovable publish branch (`feature/service-library-nav`) |
| **Realtime** | Supabase channels (chat, notifications, timeline) |
| **AI** | Lovable AI Gateway via edge functions (`ai-*`, `dsh-ai-*`, `upi-*`, `assessment-*`) |
| **Email** | Customer SMTP (`smtp-send`) + Lovable transactional queues (separate pipelines) |
| **Telephony** | SBC + `telephony-*` edge functions |

### High-level architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         Browser (React SPA)                               │
│  AppLayout │ PortalLayout │ AccountingLayout │ HrPayrollLayout           │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │ supabase-js (JWT)
┌───────────────────────────────▼──────────────────────────────────────────┐
│                    Supabase (Lovable Cloud)                               │
│  Postgres + RLS │ Auth │ Storage │ Realtime │ Edge Functions │ pg_cron   │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
   Customer SMTP           Lovable Email API        Telephony SBC
   (notifications)         (auth/assessment)        (click-to-call)
```

### Cross-domain coupling (critical)

| From | To | Mechanism |
|------|-----|-----------|
| `clients` | `accounting_clients` | Trigger `fn_sync_accounting_client` |
| `client_invoices` | `client_timeline` | Triggers on status/payment/receipt |
| CRM events | `app_notifications` | `src/lib/appNotifications.ts` → `notifyUsers()` |
| Payment/receipt | Email | `notifications-dispatch` → SMTP or pgmq queue |
| Service selections | Accounting mirror | `service_package` on `accounting_clients` via sync |
| CRM masters | HR config | Shared `branches`, `departments`, designations |

---

## 2. Module Overview

| Module | Route prefix | Source root | Primary tables / data |
|--------|--------------|-------------|------------------------|
| **CRM** | `/`, `/clients`, `/leads`, … | `src/pages/`, `src/components/clients/` | `clients`, `client_*`, `leads` flows |
| **Client portal** | `/portal/*` | `src/pages/portal/` | `client_portal_*`, portal RLS |
| **Accounting** | `/accounting/*` | `src/accounting/` | `accounting_*` |
| **HR Payroll** | `/hr/*` | `src/hr-payroll/` | `hr_*` (migrations `2026071712*`) |
| **Commission (UPI)** | `/commissions`, `/institutions/*` | `src/institutions/` | `upi_*` |
| **Incentive CMS** | `/performance/*`, `/incentives/*` | `src/pages/Performance*.tsx`, `src/incentives/` | `incentive_*`, wallets, offers |
| **Institutions** | `/institutions/*` | `src/institutions/` | `upi_*`, course finder linkage |
| **Service Library** | `/service-library*` | `src/pages/ServiceLibrary*.tsx`, `content/service-library/` | JSON metadata + DB seeds |
| **Dashboard** | `/` | `src/dashboard/` | Aggregated RPCs / views |
| **Course Finder** | `/course-finder` | `src/pages/CourseFinder.tsx` | `cf_*` tables |
| **Assessment** | `/assessment/*` | `src/pages/assessment/` | `assessment_*` |
| **Digital Success Hub** | `/digital-success` | `src/digital-success/` | `dsh_*` |
| **LMS** | _planned_ | — | External / TBD |
| **Settings** | `/settings`, `/users`, `/masters` | `src/pages/` | `profiles`, `user_roles`, masters |

### Layout shells

| Shell | File | Used by |
|-------|------|---------|
| CRM sidebar | `src/components/layout/AppLayout.tsx` | Main app |
| Client portal | `src/components/portal/PortalLayout.tsx` | `/portal/*` |
| Accounting | `src/accounting/components/AccountingLayout.tsx` | `/accounting/*` |
| HR Payroll | `src/hr-payroll/components/HrPayrollLayout.tsx` | `/hr/*` |

Routing is centralized in `src/App.tsx`.

---

## 3. CRM

### Scope

Lead intake → counselling → service selection → application → documentation → payment → client conversion → service processing → visa/immigration → outcome → alumni/closed.

### Key routes

| Area | Routes | Pages |
|------|--------|-------|
| Dashboard | `/` | `DashboardV2` |
| Clients | `/clients`, `/clients/:id`, `/clients/new` | `Clients`, `ClientDetail`, `ClientNew` |
| Leads | `/leads`, `/leads/:id`, `/leads/new`, `/leads/cold` | Lead list/detail/new |
| Messaging | `/messages`, `/whatsapp` | Unified chat |
| Telecaller | `/telecaller` | Dialer + queue |
| Reports / activity | `/reports`, `/activity` | Operational reports |
| Masters / admin | `/masters`, `/users`, `/settings` | Configuration |

### Data model (core)

- **`clients`** — central record; leads differentiated by `lead_stage` pre-conversion
- **`client_profile`**, **`client_education`**, **`client_family_members`** — profile tabs
- **`client_documents`**, **`binders`**, OCR queue — document workflow
- **`client_invoices`**, **`client_invoice_payments`**, **`client_invoice_receipts`** — revenue (see also Accounting bridge)
- **`client_timeline`**, **`client_tasks`**, **`client_notifications`** — activity
- **`chat_*`** — internal messaging
- **`call_queue_items`**, **`call_sessions`** — telecaller

### Lead → client conversion

There is no separate `leads` table migration at conversion time: a row advances through `lead_stage` and becomes a full client file. On write:

- `fn_recalc_lead_score` — scoring
- `fn_log_status_change` / `fn_notify_client_status_change` — timeline + notifications
- `fn_sync_accounting_client` — accounting mirror

See [`docs/system-map/flows/leads-and-conversion.md`](./system-map/flows/leads-and-conversion.md).

### Permissions

Per-client access via `user_client_permission` (owner, `client_access`, team defaults). Staff roles: `admin`, `counselor`, `documentation`, `telecaller`, `manager`, `viewer`, `client`.

### Client portal

`/portal/*` — authenticated clients (`PortalProtectedRoute`). Features: application, files, chat, offers, payments, appointments, assessment.

See [`docs/system-map/flows/portal-access.md`](./system-map/flows/portal-access.md).

---

## 4. Accounting

### Scope

Multi-entity general ledger, AR/AP, banking, petty cash, trust, payroll posting, tax, reports, approvals, fraud, AI assistant.

### Access

- Gate: `useAccountingAccess()` — users without access see `AccountingNoAccessPage`
- Admin grants: `/accounting/settings/access` → `accounting_users` + `accounting_user_module_permissions`
- Per-section: `AccountingSectionRoute` + `usePermission(module, level)`

### Modules

| Section | Path | Store / tables |
|---------|------|----------------|
| Overview | `/accounting` | Aggregates |
| Journals | `/accounting/journals` | `accounting_journals`, `accounting_journal_lines` |
| COA | `/accounting/coa` | `accounting_coa` |
| AR | `/accounting/ar` | `accounting_ar_invoices`, line items |
| AP | `/accounting/ap` | `accounting_ap_bills` |
| Bank | `/accounting/bank-accounts` | `accounting_bank_accounts` (entity-scoped RLS) |
| Petty cash | `/accounting/petty-cash` | `accounting_petty_cash` |
| Trust | `/accounting/trust` | Trust subledger |
| Payroll | `/accounting/payroll` | Payroll accrual/posting |
| Tax | `/accounting/tax` | Filings, calendar, notices |
| Reports | `/accounting/reports` | P&L, BS, CF, TB, GL, consolidated |
| Approvals | `/accounting/approvals` | Multi-stage approval chain |
| Settings | `/accounting/settings` | Entities, users, collection categories |

Source: `src/accounting/**` (~237 files). Mix of Supabase-backed and Zustand mock stores (verify per feature before assuming live DB).

### CRM sync

- **`fn_sync_accounting_client`** on `clients` INSERT/UPDATE → upserts `accounting_clients`
- Accounting Clients page is a **mirror** — do not write `accounting_clients` from CRM flows directly
- Service package text aggregated from client service arrays

### Hardening principles

Approved in [`docs/guides/ACCOUNTING_HARDENING_ARCHITECTURE.md`](./guides/ACCOUNTING_HARDENING_ARCHITECTURE.md):

- No physical delete of financial records
- Service lifecycle via `client_service_cases.lifecycle_status`
- Refunds invoice-line based (policy from DB, not hardcoded)
- Financial immutability: reversals, not silent updates

### Recent DB work

Accounting migrations under `supabase/migrations/202607201200*` (journal contract, immutability, COA seed, trust, tax, AP payments, fiscal periods, bank reconciliation).

See [`docs/system-map/flows/accounting-and-approvals.md`](./system-map/flows/accounting-and-approvals.md).

---

## 5. HR Payroll

### Scope

Enterprise HR: employees, attendance, shifts, leave, comp-off, mispunch, holidays, training, payroll cycles, salary register, ESS (employee self-service), Emp360, approvals, reports.

### Routes

Mounted at `/hr/*` via `src/hr-payroll/HrPayrollRoutes.tsx`.

| Hub | Path |
|-----|------|
| Dashboard | `/hr` |
| ESS | `/hr/me` |
| Employee 360 | `/hr/employee`, `/hr/employee/:id/*` |
| Attendance | `/hr/attendance/*` |
| Leave / comp-off / late / mispunch | `/hr/leave`, `/hr/compoff`, … |
| Payroll | `/hr/payroll/*`, `/hr/salary-register` |
| Config | `/hr/config/*` |
| Reports | `/hr/reports/*` |

### Architecture

- **Provider:** `HrPayrollProvider` + `HrAccessContext` — screen-level RBAC
- **Config layout:** `src/hr-payroll/lib/moduleStructure.ts` — single source for nav hubs
- **CRM shared masters:** branches, departments, designations link to `/masters` (not duplicated in HR-only tables)

### Database

Migrations `supabase/migrations/202607171200*` — schema, RLS, RPCs, demo seed, workflows, integrations, storage, policy engine, Canada engine, RBAC snapshots.

QA: `qa/hr-payroll/`, guide: `docs/guides/hr-payroll-ai-test-guide.md`.

### CRM integration

`20260717120009_hr_payroll_crm_team_integration.sql` — links HR staff to CRM `team_members` / profiles where applicable.

---

## 6. Commission

The platform has **two commission-related surfaces**:

### A. Institutions / UPI commissions (`/commissions`, `/institutions`)

**Source:** `src/institutions/`

| Feature | Path |
|---------|------|
| Institution list/detail | `/institutions`, `/institutions/:id` |
| Course review | `/institutions/review` |
| AI suggestions | `/institutions/suggestions` |
| Aggregator workbench | `/institutions/aggregators/:id/workbench` |
| CF ↔ UPI linkage | `/institutions/linkage` |
| Commissions panel | `/commissions` |

**Tables:** `upi_*` family (programs, agreements, claims, campaigns, commissions).

**Access:** `CommissionsProtectedRoute` — `is_commission_admin` OR accounting admin OR manager.

**Engine:** `src/institutions/lib/commissionEngine.ts`, `commissionRuleResolver.ts`, `claimEngine.ts`.

**Planned automation:** [`src/institutions/planned/INTEGRATION_PLAN.md`](../src/institutions/planned/INTEGRATION_PLAN.md) — client application → commission student → eligibility → claim (not yet active).

### B. Incentive & commercial CMS (`/performance/*`, `/incentives/*`)

**Source:** `src/incentives/lib/*`, `src/pages/Performance*.tsx`

Commercial performance hub: offers, discount wallets, combination engine, incentive plans, runs, payouts, contests, FX, approvals, audit trail, revenue analytics.

| Area | Example routes |
|------|----------------|
| Command center | `/performance`, `/performance/executive`, `/performance/finance` |
| Offers studio | `/performance/offers/*` |
| Wallets | `/performance/wallets`, `/incentives/wallet-topups` |
| Incentive runs | `/incentives/admin`, `/incentives/runs/:runId` |
| Payouts | `/incentives/payouts`, `/incentives/period-close` |

**Tables:** `incentive_*`, promotion requests, wallet policies (migrations `202606191200*` – `202607111200*`).

Logic is heavily unit-tested under `src/incentives/lib/*.test.ts`.

---

## 7. Institutions

### Scope

Partner institutions, course catalog sync, program sheets, agreements, promotions, commission claims, AI document extraction, Course Finder linkage.

### Key components

| Component | Purpose |
|-----------|---------|
| `InstitutionsListPage` / `InstitutionDetailPage` | CRUD + overview |
| `CourseReviewPage` | Course dedup / review queue |
| `AiSuggestionsPage` | AI-driven action items |
| `AggregatorWorkbenchPage` | Statement import, claim cycles |
| `CfUpiLinkagePage` | Map Course Finder institutions to UPI records |

### Data sources

- **DB:** `upi_*` tables
- **Course Finder:** `cf_universities`, `cf_courses` — sync via `syncCourseFinderInstitution.ts`
- **Edge functions:** `upi-extract-*`, `upi-sync-*`, `upi-run-campaign`, etc.

### Permissions

`InstitutionsProtectedRoute` — module permission `institutions` or admin.

---

## 8. Service Library

### Scope

Canonical catalogue of visa, coaching, admission, and allied services — metadata, fees, checklists, staging pipelines, document manifests, eligibility rules.

### Routes

| Route | Page | Access |
|-------|------|--------|
| `/service-library` | `ServiceLibrary` | `ServiceLibraryProtectedRoute` |
| `/service-library-admin` | `ServiceLibraryAdmin` | requires `requireManage` |

### Data layers

| Layer | Location | Role |
|-------|----------|------|
| **JSON source of truth** | `content/service-library/*.json` | Academy UI metadata, fees, copy |
| **DB seeds** | `supabase/migrations/*service*`, `visa-metadata-seed/` | Published services, pipelines, checklists |
| **Specimens** | `public/specimens/` | HTML/PDF checklists served to clients |
| **Runtime** | `service_library_*` tables | Live catalogue after Lovable publish |

### CRM integration

- Client service arrays on `clients` (`visa_services`, `coaching_services`, etc.)
- **Stage pipelines** — `stage_pipelines` linked to `library_id`
- Enrollment does **not** auto-create invoices — explicit action in `ClientInvoicesPanel`

Export script: `scripts/build-service-library-full-zip.mjs` (staging dir `.zip-staging-service-library/`).

See [`docs/system-map/flows/services.md`](./system-map/flows/services.md).

---

## 9. Dashboard

### Implementation

`src/pages/Dashboard.tsx` → `src/dashboard/components/DashboardV2.tsx`

### Data

- Hooks: `useDashboardExecutiveData`, `useDashboardModuleData`, `useDashboardOperationsData`
- Fetch: `src/dashboard/lib/fetchDashboardData.ts`
- Aggregations: `src/dashboard/lib/aggregations.ts`

### Role-based visibility

`src/dashboard/config/dashboardVisibility.ts` resolves profile:

| Profile | Executive view | Operations view |
|---------|----------------|-----------------|
| `admin` | Full | Full |
| `counselor` | Full | Counselor-focused |
| `telecaller` | Summary | Telecaller queue metrics |
| `commission_admin` | Revenue-focused | Module tiles |

KPI tooltips and feature flags: `src/dashboard/config/kpiTooltips.ts`, `featureFlags.ts`.

### Related reporting

- `/reports` — legacy/detailed CRM reports
- `/performance/*` — commercial / incentive analytics (separate module)
- Performance Hub migrations power incentive dashboards (not the main `/` dashboard)

See `docs/system-map/DASHBOARD_V2_*_REPORT.md` for optimization notes.

---

## 10. LMS (planned)

**Status:** Not implemented in this repository.

| Item | State |
|------|-------|
| Product / URL | TBD |
| CRM integration | TBD — enrollments → `clients` / timeline |
| Portal link | TBD |
| Documentation stub | [`docs/guides/lms-usage-guide.md`](./guides/lms-usage-guide.md) |

**Intended relationship (when built):**

- Counselors assign or track learning modules per client
- Students access via portal or external LMS login
- Timeline events on enrollment/completion (pattern: `client_timeline` entries)

---

## 11. Database Architecture

### Schema organization

Single **`public`** schema. Table groups:

| Group | Examples |
|-------|----------|
| CRM core | `clients`, `client_profile`, `client_timeline`, `client_tasks` |
| Documents | `client_documents`, `document_verifications`, `binders` |
| Revenue | `client_invoices`, `client_invoice_payments`, `client_invoice_receipts` |
| Accounting | `accounting_*` |
| HR Payroll | `hr_employees`, `hr_attendance`, `hr_payroll_runs`, … |
| Incentives | `incentive_plans`, `incentive_runs`, `promotion_requests`, … |
| Institutions | `upi_*` |
| Service library | `service_library_*`, `stage_pipelines`, `workflow_templates` |
| Course finder | `cf_*` |
| Identity | `profiles`, `user_roles`, `user_module_permissions`, `branches` |

Full inventory: [`docs/system-map/04-database-map.md`](./system-map/04-database-map.md).

### Critical triggers (never bypass)

| Trigger | Purpose |
|---------|---------|
| `fn_take_invoice_snapshot` | Immutable invoice on send/pay |
| `fn_recompute_invoice_totals` | Payment → invoice status (source of truth) |
| `fn_take_receipt_snapshot` | Immutable receipt |
| `fn_sync_accounting_client` | CRM → accounting mirror |
| `generate_journal_number` | JE-YYYY-NNNN |

### RLS pattern

- **CRM:** `can_view_client` / `can_edit_client` helpers
- **Accounting:** `is_accounting_user`, entity scope on bank accounts
- **Commissions:** `is_commission_admin`
- **Never** inline `user_roles` subquery on same table (recursion risk) — use `SECURITY DEFINER` helpers

### Migrations

- Location: `supabase/migrations/*.sql` (timestamp-ordered)
- Apply via **Lovable → Publish** (not via `npm run ship` alone)
- Checklist: `docs/LOVABLE_PUBLISH_CHECKLIST.md`

### Queues (pgmq)

| Queue | Purpose |
|-------|---------|
| `notification_emails` | Async notification SMTP |
| `transactional_emails` | Lovable templated mail |
| `auth_emails` | Auth pipeline |

---

## 12. Supabase Architecture

### Components

```
┌─────────────────────────────────────────────────┐
│ Auth (auth.users)                                │
│   └── profiles, user_roles, accounting_users    │
├─────────────────────────────────────────────────┤
│ Postgres + RLS + RPCs + triggers                 │
├─────────────────────────────────────────────────┤
│ Storage (private buckets)                        │
│   client-documents, service-library-files, …    │
├─────────────────────────────────────────────────┤
│ Edge Functions (supabase/functions/)            │
│   smtp-send, notifications-dispatch, ai-*, …    │
├─────────────────────────────────────────────────┤
│ Realtime (app_notifications, chat, timeline)    │
├─────────────────────────────────────────────────┤
│ pg_cron → edge workers                          │
└─────────────────────────────────────────────────┘
```

### Edge function categories

| Category | Examples |
|----------|----------|
| Auth / users | `admin-users`, `accounting-create-user`, `client-portal-invite-*` |
| Email | `smtp-send`, `notifications-dispatch`, `process-notification-email-queue` |
| Documents / OCR | `classify-document`, `extract-document-data`, `upi-extract-*` |
| Assessment | `assessment-register`, `assessment-submit`, … |
| Telephony | `telephony-webhook`, `telephony-click-to-call`, … |
| AI | `ai-financial-assistant`, `dsh-ai-*`, `upi-analyze-agreement` |
| Integrations | `odoo-api`, `odoo-sync`, `share-resolve` |

Full map: [`docs/system-map/03-backend-map.md`](./system-map/03-backend-map.md).

### Client integration

- **Client:** `src/integrations/supabase/client.ts`
- **Types:** `src/integrations/supabase/types.ts` (generated; large file)
- **JWT:** Passed from browser; edge functions use service role where configured

### Publish workflow

1. Cursor ships to GitHub `main` + `feature/service-library-nav`
2. Lovable → Sync from GitHub → Publish
3. Approve pending SQL migrations in Lovable UI
4. Hard refresh app

---

## 13. Authentication & Roles

### CRM app roles (`user_roles.role`)

`admin` / `administrator`, `counselor`, `documentation`, `telecaller`, `viewer`, `client`, `commission_admin`, `manager`.

Resolved in `src/contexts/AuthContext.tsx`:

- `isAdmin`, `canEdit`, `canUpload`, `isClient`, `isCommissionAdmin`, `isAccountingAdmin/Member`

### Accounting roles (`accounting_users.role`)

`SUPER_ADMIN`, `FINANCE_ADMIN`, `ACCOUNTANT`, `AUDITOR`, `FINAL_AUDITOR`, `BRANCH_MANAGER`, `COMPLIANCE_OFFICER`, `VIEWER`.

Module matrix: `accounting_user_module_permissions` + `src/accounting/lib/accountingModulePermissions.ts`.

### Module permissions (CRM)

`user_module_permissions(user_id, module, can_view, can_edit, can_delete)` — modules include `institutions`, `commissions`, `digital_success_hub`, accounting sections.

Helper: `user_has_module(uid, module, level)`.

### Bootstrap

- First signup with no admin → auto-promoted via `handle_new_user`
- `signup_role=client` → client role only

Full reference: [`docs/system-map/05-roles-and-permissions.md`](./system-map/05-roles-and-permissions.md).

---

## 14. Entity Relationships

### Core ERD (simplified)

```
auth.users
  ├── profiles (1:1)
  ├── user_roles (1:n app roles)
  ├── user_module_permissions
  └── accounting_users (0:1)
        └── accounting_user_module_permissions

clients (CRM hub)
  ├── client_profile, client_documents, client_invoices, client_timeline
  ├── client_access (sharing)
  └── accounting_clients (0:1 sync via trigger)
        └── accounting_ar_invoices, journals, …

client_invoices
  ├── client_invoice_installments
  ├── client_invoice_payments → allocations
  └── client_invoice_receipts

accounting_entities
  ├── accounting_bank_accounts
  └── entity-scoped reporting

branches ── branding on receipts
firm_profile ── fallback branding
```

Visual diagram: [`docs/system-map/diagrams/erd.mmd`](./system-map/diagrams/erd.mmd).

### Foreign-key hotspots

- `client_id` appears in ~40 tables
- `accounting_clients.linked_crm_client_id` → `clients.id`
- Never rename client IDs without migration plan

---

## 15. Integration Points

| Integration | Direction | Mechanism |
|-------------|-----------|-----------|
| **CRM ↔ Accounting** | CRM → Accounting | `fn_sync_accounting_client` |
| **CRM ↔ Invoices** | CRM | `client_invoices` + triggers; shared `ClientInvoicesPanel` |
| **CRM ↔ HR** | Shared masters | `branches`, `departments`, designations; team link migration |
| **CRM ↔ Service Library** | CRM ← Library | Service arrays, `stage_pipelines`, enrollment RPCs |
| **CRM ↔ Institutions** | Planned | `INTEGRATION_PLAN.md` — application → commission |
| **CRM ↔ Incentives** | CRM → CMS | Qualifying events, wallet usage, unclassified payments |
| **CRM ↔ Portal** | Bidirectional | `client_portal_invites`, portal auth, chat |
| **CRM ↔ Assessment** | Inbound leads | `assessment_leads` → manual conversion |
| **Accounting ↔ Odoo** | Bidirectional | `odoo-api`, `odoo-sync`, `odoo-cron` |
| **Email ↔ SMTP** | Outbound | `smtp-send` (single choke point) |
| **Notifications** | In-app + email | `app_notifications` + `notifications-dispatch` |
| **Telephony** | External SBC | Webhook + browser phone client |
| **AI** | All modules | Lovable gateway edge functions |
| **Lovable publish** | GitHub → Supabase | Branch sync + migration approval |
| **LMS** | Planned | TBD |

### Invoice / payment flow (revenue critical)

See [`docs/system-map/flows/invoices-payments-receipts.md`](./system-map/flows/invoices-payments-receipts.md).

### Notification flow

See [`docs/system-map/flows/notification-center.md`](./system-map/flows/notification-center.md) and [`flows/notifications-email-smtp.md`](./system-map/flows/notifications-email-smtp.md).

---

## 16. Future Roadmap

Prioritized themes from approved architecture docs and planned folders (not committed dates).

### Accounting

| Phase | Item | Doc |
|-------|------|-----|
| A1 | Service removal / archive, dependency check | `ACCOUNTING_HARDENING_ARCHITECTURE.md` |
| A2 | Financial immutability (no delete on posted tx) | same |
| A3 | Transfer wizard engine | same |
| A4 | Refund policy + line-based refund engine | same |
| DB | Journal contract, trust subledger, tax framework | `202607201200*` migrations |
| UI | Reduce mock stores → full Supabase persistence | audit findings |

### CRM / profile

- Profile tab restructure (Identity/Contact consolidation)
- Document workflow phases (phase 1 shipped; 2A+ in guides)
- Lead form location masters-first cascade
- Deep link / Client 360 profile phases (B5–E review bundles)

### Commission / incentives

- Institutions client integration automation (`INTEGRATION_PLAN.md`)
- Incentive CMS phases 5m–6b (pooled wallets, director read-only, contests)
- Unclassified payment classification → incentive qualifying events

### HR Payroll

- Config hub “coming soon” sections (org settings, advanced policies)
- Canada + India statutory engines (Canada engine migration exists)
- ESS expansion, audit snapshots

### Service library

- Visa metadata batch completion (v2.x migrations)
- Document manifest pilot → production
- Service management deletion rules (`20260923120000_*`)

### Platform

- **LMS** integration spec + enrollment bridge
- Dashboard V2 KPI parity with revenue reports
- Repository cleanup (`.cursorignore` shipped; optional delete of `.zip-staging*` per `REPOSITORY_CLEANUP_PLAN.md`)
- Consolidate Performance Hub vs legacy `/reports` metrics

### Safety / process

- Always run [`docs/system-map/10-change-impact-checklist.md`](./system-map/10-change-impact-checklist.md) before cross-module changes
- Ship via `npm run ship`; publish via Lovable for DB changes

---

## Quick reference for Cursor sessions

| Task type | Read first |
|-----------|------------|
| Any change | `docs/system-map/09-safety-rules.md` |
| CRM client/lead | `flows/clients-crm.md`, `flows/leads-and-conversion.md` |
| Invoices/payments | `flows/invoices-payments-receipts.md` |
| Accounting only | `flows/accounting-and-approvals.md`, `guides/ACCOUNTING_HARDENING_ARCHITECTURE.md` |
| HR only | `src/hr-payroll/lib/moduleStructure.ts`, HR migrations `2026071712*` |
| Service library | `content/service-library/`, `flows/services.md` |
| Publish / SQL | `docs/LOVABLE_PUBLISH_CHECKLIST.md` |
| Repo size / ignore | `REPOSITORY_CLEANUP_PLAN.md`, `.cursorignore` |

---

*This document supersedes ad-hoc architecture notes for high-level orientation. For file-level maps, prefer `docs/system-map/`.*
