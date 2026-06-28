---
description: SSOT — REUSE → EXTEND → CREATE
alwaysApply: true
---

# SSOT (Single Source of Truth)

Order of operations for every change:

1. **REUSE** — Existing table, column, RPC, component, or helper.
2. **EXTEND** — Add column, JSONB key, optional param, or UI field on existing SSOT.
3. **CREATE** — New artifact only when REUSE and EXTEND cannot satisfy approved requirements.

## Examples

| Domain | SSOT | Extend (preferred) | Create (last resort) |
|--------|------|--------------------|----------------------|
| Employee personal email | `employees.email` | — | — |
| Employee official email | `employees.company_email` | `official_communication_email` | — |
| Emergency contact | `employees.emergency_contacts` JSONB | Add keys (`alternate_mobile`, `address`) | Second contact table |
| HR authorization | `has_perm`, `is_hr` in `20260717120001` | — | New `current_org_id()`-style helpers |
| Training extension | `training_records` + `training_extension_history` | `extension_remarks` column | New training record per extension |
| Exports | `hrReportExport.ts` / `downloadReportTable` | New columns in export mapper | New export framework |

## Anti-patterns

- Parallel columns for the same business fact
- UI-only workflow state with no DB backing for approvals
- Copy-paste RPC when extending existing function is sufficient

Reference: `docs/engineering/02-SSOT.md`.
