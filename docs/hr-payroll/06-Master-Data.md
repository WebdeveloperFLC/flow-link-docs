# 06 — Master Data Administration

**Epic 1 deliverable** — Workforce foundation master registry.

## Entry point

`/hr/admin/master-data` — Master Data Administration hub (8 categories, 40+ domain links).

## Architecture

| Source | Tables / UI | Rule |
|--------|-------------|------|
| **CRM REUSE** | `public.branches`, `departments`, `designations` | Link to `/masters` — never duplicate |
| **HR table REUSE** | `companies`, `hr_employee_categories`, `hr_document_types`, `shifts`, `holidays` | Existing pages extended |
| **NEW registry** | `hr_masters` | Generic CRUD for all other reference masters |

## `hr_masters` columns

Every master row supports: `is_active`, `display_order`, `remarks`, `created_by`, `created_by_label`, `modified_by`, `modified_by_label`, `created_at`, `updated_at`, plus `config jsonb` for domain-specific metadata.

## Domain registry

Canonical list: `src/hr-payroll/lib/masterDataRegistry.ts`

Categories: Organization, Employment, Attendance, Leave, Payroll, Compliance, Holiday, Document.

## Permissions

| Action | HR permission |
|--------|---------------|
| View | `view` + screen `masterData` |
| Create / Edit / Delete | `configure` or `manageEmp` |
| Audit | All writes → `audit_log` via `hrAudit()` |

## Routes

| Route | Purpose |
|-------|---------|
| `/hr/admin/master-data` | Hub |
| `/hr/admin/master-data/companies` | Companies CRUD |
| `/hr/admin/master-data/crm/:section` | CRM master link-out |
| `/hr/admin/master-data/:domain` | Generic `hr_masters` CRUD |

Operational masters (shifts, holidays, document types, categories) link to existing `/hr/config/*` pages.
