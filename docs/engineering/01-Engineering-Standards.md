# Future Link ERP Engineering Standards

| | |
|---|---|
| **Version** | 1.0 |
| **Status** | Active |
| **Owner** | ERP Solution Architect |
| **Audience** | Developers, Cursor agents, QA |

---

## Purpose

Single reference for how Future Link ERP modules (HR Payroll, CRM, Accounting, Performance Hub, Service Library) are designed, changed, and released.

---

## The fifteen standards

| # | Standard | Summary |
|---|----------|---------|
| 1 | Change Request Classification | Bug / enhancement / architecture — implement only approved scope |
| 2 | SSOT | REUSE → EXTEND → CREATE ([02-SSOT.md](./02-SSOT.md)) |
| 3 | Ownership Principle | Domain owns data and workflows ([03-Ownership-Principle.md](./03-Ownership-Principle.md)) |
| 4 | ERP Defect Analysis | Root cause before fix; preserve SSOT and linkages |
| 5 | Build & Release Gate | TS + build + tests before ship ([05-Build-Release-Gates.md](./05-Build-Release-Gates.md)) |
| 6 | UAT Governance | Approved items only ([06-UAT-Governance.md](./06-UAT-Governance.md)) |
| 7 | Architect Approval | No architecture changes without sign-off ([08-Architecture-Review.md](./08-Architecture-Review.md)) |
| 8 | Backward Compatibility | Safe migrations, partial publish tolerance ([07-Backward-Compatibility.md](./07-Backward-Compatibility.md)) |
| 9 | Modular Delivery | Independent migration tracks (e.g. contact SSOT ≠ UAT WRE fix) |
| 10 | Documentation First | Classify and document before large implementations |
| 11 | No Silent Assumptions | Verify DB objects and helpers exist |
| 12 | Database First | Schema/RPC before UI ([04-Migration-Review-Checklist.md](./04-Migration-Review-Checklist.md)) |
| 13 | Every Feature Has an Exit Strategy | Additive, reversible changes preferred |
| 14 | Audit What Matters | `audit_log` for significant business events |
| 15 | One User Experience | Shared patterns for approvals, exports, errors |

---

## Cursor rules mirror

Agent-enforced copies live in `.cursor/rules/01-engineering-standards.md` through `07-release-process.md`.

---

## Required implementation report sections

Every non-trivial delivery must include:

1. **Classification summary** (UAT / change type)
2. **Files changed**
3. **Migration list** (if any)
4. **Build result**
5. **Test result**
6. **Existing Functions Reused** ([04-Migration-Review-Checklist.md](./04-Migration-Review-Checklist.md))
7. **Migration Dependency Verification** (when SQL ships)
8. **Commit hash**

---

## Hard stops (default)

Unless ERP Solution Architect explicitly approves:

- Payroll engine / `fn_compute_payroll` modifications
- New Leave Management scope
- Accounting module changes
- Duplicate authorization helpers
- UAT items marked **Rejected**
