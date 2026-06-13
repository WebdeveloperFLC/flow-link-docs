# Future Link HRMS / Payroll — Production Handoff (v1)

Build artifacts for implementing the HRMS/Payroll prototype inside the Supabase + React CRM (same pattern as Performance Hub). The prototype (`hrms-full-prototype.html`) is the UX reference and carries the **verified payroll engine**; these documents turn it into a buildable spec.

## What's here

### `docs/`
1. **01_cursor_implementation_map.md** — every screen → route → tables → RLS/permission → engine touchpoint → sprint.
2. **02_schema_and_erd.md** — schema overview + Mermaid ERD.
3. **03_business_rules_and_test_vectors.md** — the payable-days formula, late slab, edge cases, and **30 golden test vectors** (engine == Excel).
4. **04_crm_integration_spec.md** — Team & Roles, Performance Hub incentives, Accounting payout.
5. **05_attendance_integration_options.md** — self-punch / biometric / vendor API / CSV, with a v1 recommendation.
6. **06_statutory_v1_scope.md** — what PF/ESIC v1 covers and what's deferred.
7. **07_uat_guide.md** — test script with pinned expectations (incl. Excel anchor).
8. **08_prototype_gaps.md** — **shown-but-not-implemented**: sandwich auto-calc, leave balances, approval chains, policy versioning, and more.
9. **09_six_sprint_plan.md** — the build sequence.

### `supabase/`
- **01_schema.sql** — tables, enums, indexes.
- **02_rls.sql** — RLS policies + access helper functions.
- **03_functions.sql** — payroll engine (exact port), rollup, punch-status derivation, triggers.
- **99_seed_demo.sql** — demo data mirroring the prototype (5 employees, a cycle, attendance, requests, RBAC).

## Run order (Supabase SQL editor or migrations)
```
01_schema.sql → 02_rls.sql → 03_functions.sql → 99_seed_demo.sql
```

## The one rule that matters most
**The payroll maths lives in Postgres (`fn_compute_payroll`) and is the single source of truth.** It is a verbatim port of the Excel formula and was diff-tested against the prototype engine across all 30 vectors. The React client must call it (RPC / view), never re-implement it — that's what guarantees Excel parity and prevents browser/DB float drift.

## Correctness anchor
Test vector **TV02** = the Excel sample row (Isha, mispunch+absent = 3) → **29.5 payable days, ₹39,500 net**. If your build reproduces that end-to-end (punch → rollup → engine → register), the core is right.

## Known v1 boundaries (see docs 06 & 08)
- Employer PF/ESIC, Professional Tax, TDS, statutory filing files → deferred.
- Sandwich auto-detection, leave accrual/validation, multi-stage approvals, policy versioning → schema + engine ready; **logic to be built** (sprints 4–5).
- OT is displayed but non-monetary in v1.
