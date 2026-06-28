# Backlog: Payroll Run Versioning

**Status:** Post Go-Live backlog  
**Priority:** Medium — replaces UAT deletion with archived runs  
**Owner:** HR & Payroll + Engineering

---

## Summary

Replace the current UAT reset pattern (delete generated payroll artifacts for a cycle) with **Payroll Run Versioning**: each process/lock/pay attempt creates an immutable **archived payroll run** while the active cycle can be re-run without losing historical calculations.

---

## Problem

`fn_reset_payroll_cycle_uat` removes `payroll_lines`, snapshots, and slips for a cycle so UAT can re-run the workflow. That is correct for pre-production testing but is not suitable once teams need:

- Side-by-side comparison of payroll runs (before/after attendance correction)
- Complete audit trail of every computed register, not just audit_log text
- Recovery without “cannot be undone” deletion semantics

---

## Target behavior

1. **Versioned runs** — Each Process → Lock (or explicit “Create run”) persists a `payroll_run` row with status, timestamps, actor, and link to frozen line/snapshot sets.
2. **Active vs archived** — Only one run is *active* per cycle for workflow (Draft/Processed/Approved/Locked/Paid); prior runs move to `archived` and remain queryable.
3. **UAT reset becomes “start new run”** — Reset returns workflow to Draft and marks the current run archived; no hard delete of historical runs (optional retention policy later).
4. **Reports & 360** — Salary register, employee payroll history, and exports can filter by run version or “latest archived + active”.
5. **Production cycles** — `is_production = true` cycles never delete or overwrite archived runs; new corrections create new versions only.

---

## Out of scope (for this backlog item)

- Changes to `fn_compute_payroll` formula logic (versioning wraps outputs, does not alter calculation rules)
- Accounting GL batch versioning (separate accounting backlog if needed)

---

## Suggested schema sketch (draft)

| Table | Purpose |
|-------|---------|
| `payroll_runs` | `id`, `cycle_id`, `run_number`, `status`, `workflow_status`, `created_by`, `archived_at` |
| `payroll_lines` | Add `run_id` FK; unique on `(run_id, employee_id)` |
| `payroll_line_snapshots` | Add `run_id` FK |
| `salary_slips` | Add `run_id` FK |

Migration path: backfill `run_id = 1` for existing lines per cycle; deprecate UAT hard-delete RPC in favor of archive + new run.

---

## Acceptance criteria (when implemented)

- [ ] UAT can re-run payroll without losing prior run data
- [ ] Admin can view/compare archived runs for a cycle
- [ ] Production payroll cycles retain full run history
- [ ] Audit log references run id / run number
- [ ] Existing UAT reset UI migrates to “Archive run & reset workflow” or equivalent
