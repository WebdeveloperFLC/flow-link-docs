---
description: Future Link ERP Engineering Standards — always apply
alwaysApply: true
---

# Future Link ERP Engineering Standards

Apply on every ERP change (HR, CRM, Accounting, Performance Hub, etc.).

## Core principles

1. **Change Request Classification** — Bug fix vs enhancement vs architecture; implement only approved scope.
2. **SSOT** — REUSE → EXTEND → CREATE (see `02-ssot.md`).
3. **Ownership Principle** — Each domain owns its data and workflows; do not cross boundaries without approval.
4. **Database First** — Schema/RPC before UI (see `03-database-first.md`).
5. **Migration Review** — Mandatory gate before any SQL (see `04-migration-review.md`).
6. **Build & Release Gates** — No ship until build + tests pass (see `05-build-gates.md`).
7. **UAT Governance** — Approved defects only; rejected items stay out of scope (see `06-uat-governance.md`).
8. **Architect Approval** — No architecture changes without ERP Solution Architect sign-off.
9. **Backward Compatibility** — Migrations must tolerate partial publish order where documented.
10. **Modular Delivery** — One concern per migration; independent enhancement tracks stay separate.
11. **Documentation First** — Classify and document before coding non-trivial work.
12. **No Silent Assumptions** — Verify functions, columns, and dependencies exist before referencing them.
13. **Every Feature Has an Exit Strategy** — Prefer reversible, additive changes.
14. **Audit What Matters** — Use `audit_log` for business-significant actions.
15. **One User Experience** — Consistent patterns across modules (approvals, exports, errors).

## Hard stops (unless architect approves)

- Payroll engine / `fn_compute_payroll` changes
- Leave Management new scope
- Accounting module changes
- Duplicate authorization helpers
- Redesigns labeled “rejected” in UAT triage

## Implementation report (required section)

Every implementation deliverable must include **Existing Functions Reused** (see `04-migration-review.md`).

Human-readable reference: `docs/engineering/01-Engineering-Standards.md`.
