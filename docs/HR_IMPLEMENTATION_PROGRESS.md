# HR / Payroll Audit — Implementation Progress

Tracks implementation of the findings in `docs/ux-audit/02-hr-ux-audit.md`.

## Environment note (read first)

The implementation environment can edit repo files and run **pure-logic unit tests** (via Node type-stripping), but it **cannot** run `git`, `eslint`, `vitest`, or `vite build` against this repo (the working tree is not mounted into the tool sandbox). Therefore:

- **No commit hashes are recorded by the tool.** Each finding below lists the files to stage; commit locally and paste the hash into the "Commit" column.
- **Lint / test / build must be run locally.** Suggested per-milestone commands:
  ```bash
  git checkout -b feat/hr-payroll-audit-remediation
  npx vitest run src/hr-payroll/lib          # unit tests for the new pure helpers
  npx eslint src/hr-payroll --max-warnings=0
  npm run build
  git add -A && git commit -m "HR-XX: <summary>"
  ```
- Pure-logic tests **were** executed in the assistant sandbox; results are noted per finding.

## Production-readiness pass (2026-07-02)

- **Phase 1 (complete implementation):** All approved engineering findings are done. No remaining approved items to finish. Cleanup performed — removed the obsolete local `parseCsv`/`ParsedRow`/`buildPreview`/`setPreview` from `HrImportPage` (logic now in the tested `attendanceImport` helper); removed a redundant `?? 0` in the register sort comparator; verified no unused imports/vars were introduced by the remediation. No new features added.
- **Phase 2 (verify):** **Pure-logic unit tests executed here and PASS** — 59 assertions across 6 helper suites (`payrollValidation` 18, `payrollConfirm` 10, `payrollReadiness` 11, `payrollWorkflowGuide` 9, `payrollAuditTrail` 5, `attendanceImport` 6). **`tsc --noEmit`, `eslint`, `vitest` (repo runner), and `vite build` could NOT be run** — the repo working tree is not mounted into the assistant's shell sandbox. These MUST be run locally (commands below). No results for them are claimed.
- **Phase 3 (consistency review):** Reviewed the edited files for wording, broken imports, navigation, and obvious UI/a11y issues; reused existing components/CSS throughout; added `aria-label`s on the new bulk/select checkboxes. No inconsistencies left outstanding from the remediation edits (subject to the local type/lint/build run).
- **Phase 5 (git):** **Not executed** — the assistant environment has no git access to this repo, so the branch could not be created/committed/pushed and **no commit hash or push confirmation exists**. Run the git commands below locally.

## Legend
Status: ✅ done · 🟡 in progress · ⏸ blocked on business decision · 🅿 deferred to Phase 2 · ⬜ not started

---

## Summary table

| ID | Title | Severity | Status | Commit |
|----|-------|----------|--------|--------|
| HR-15 | Payroll validation gate | Critical | ✅ | _run locally_ |
| HR-14 | Structured confirmation dialogs (+ readiness checklist) | High | ✅ | _run locally_ |
| HR-13 | Guided payroll pipeline (stepper + next-action) | High | ✅ | _run locally_ |
| HR-19 | Payroll cycle audit trail (surfaced) | Medium | ✅ | _run locally_ |
| HR-18 | Surface pending approvals on the cycle (informational only) | Medium | ✅ | _run locally_ |
| HR-17 | Override reason capture (required) | Medium | ✅ | _run locally_ |
| HR-16 | Register pagination + column sort | Medium | ✅ (sticky/grouping → follow-up) | _run locally_ |
| HR-11 | Leave list search + bulk approve/reject | Medium | ✅ | _run locally_ |
| HR-06 | Employee directory disambiguation | Medium | ✅ | _run locally_ |
| HR-04 | Acronym expansion (WPMS) | Medium | ✅ | _run locally_ |
| HR-23 | Manager team-context quick link (ESS) | Medium | ✅ (partial — manager dashboard → Phase 2) | _run locally_ |
| HR-08 | ESS employment-status banner | Low–Med | ✅ | _run locally_ |
| HR-22 | Import live/inline validation | Low | ✅ | _run locally_ |
| HR-20 | Calculator "sandbox" clarity | Low | ✅ | _run locally_ |
| HR-05 | Remove dev/implementation jargon from UI | Low | ✅ | _run locally_ |
| HR-07 | Emp360 workspace | (strength) | ✅ no change needed | — |
| HR-02 | "View as" role preview re-architecture | High | ⏸ business decision | — |
| HR-09 | Holidays single source of truth | High | ⏸ business decision | — |
| HR-03 | Flatten hub-within-hub nav + breadcrumbs | Medium | 🅿 Phase 2 (= redesign; baseline wayfinding exists) | — |
| HR-21 | Reports drill-through / shared filters | Low–Med | 🅿 Phase 2 | — |
| HR-10 | Org master-data ownership (HR-SSOT) | High | 🅿 Phase 2 (architecture) | — |
| HR-01 | Design-system migration to shared shell/shadcn | High | 🅿 Phase 2 (large rewrite) | — |

---

## Completed findings (detail)

### HR-15 — Payroll validation gate (Critical) ✅
- **Change:** Hard-error validation blocks Process/Approve/Lock/Mark-paid and bank export; admin (`configure`) override is audited; validation summary shown under the stepper.
- **Files:** `src/hr-payroll/lib/payrollValidation.ts` (new), `src/hr-payroll/lib/payrollValidation.test.ts` (new), `src/hr-payroll/pages/HrVerifyPage.tsx`.
- **Tests:** 18 pure-logic assertions passed in sandbox. Migration: none.

### HR-14 — Structured confirmation dialogs + readiness checklist (High) ✅
- **Change:** Replaced native `confirm()` on the four transitions with a `ModalShell` dialog showing status transition, impact figures, a **data-driven readiness checklist** (attendance, leave approvals, validation, bank details, register, overrides, warnings), and a type-to-confirm challenge for Lock/Mark-paid.
- **Files:** `src/hr-payroll/lib/payrollConfirm.ts` (new + test), `src/hr-payroll/lib/payrollReadiness.ts` (new + test), `src/hr-payroll/pages/HrVerifyPage.tsx`.
- **Tests:** 10 confirm + 11 readiness assertions passed in sandbox. Migration: none.

### HR-13 — Guided payroll pipeline (High) ✅
- **Change:** Current-step / next-action callout under the stepper (with "irreversible" tag); pipeline preview + "select a cycle" prompt when none selected. No new route (full cycle-hub page intentionally left for Phase 2).
- **Files:** `src/hr-payroll/lib/payrollWorkflowGuide.ts` (new + test), `src/hr-payroll/pages/HrVerifyPage.tsx`.
- **Tests:** 9 assertions passed in sandbox. Migration: none.

### HR-19 — Payroll cycle audit trail (Medium) ✅
- **Change:** Surfaces the existing `audit_log` payroll events for the selected cycle as a "Cycle history" timeline (who/when/status change) on the Verify page. Read-only; reuses the existing `useHrAuditLogs` hook — no new storage.
- **Files:** `src/hr-payroll/lib/payrollAuditTrail.ts` (new + test), `src/hr-payroll/pages/HrVerifyPage.tsx`.
- **Tests:** 5 assertions passed in sandbox. Migration: none.

### HR-05 — Remove dev/implementation jargon (Low) ✅
- **Change:** Sidebar "Apply HR SQL migrations" → "HR data setup incomplete — contact your administrator"; six Verify action error fallbacks no longer expose migration numbers to users.
- **Files:** `src/hr-payroll/components/HrPayrollLayout.tsx`, `src/hr-payroll/pages/HrVerifyPage.tsx`.
- **Tests:** copy-only change; covered by existing render. Migration: none.

### HR-20 — Calculator "sandbox" clarity (Low) ✅
- **Change:** Reworded the calculator banner to "Salary calculator (sandbox)" making clear it does not affect real payroll, removed the `fn_compute_payroll` code reference (dev jargon), and added a prominent "Go to live payroll →" button. Route unchanged.
- **Files:** `src/hr-payroll/pages/HrCalculatorPage.tsx`.
- **Tests:** copy/UI-only. Migration: none.

### HR-06 — Employee directory disambiguation (Medium) ✅
- **Change:** Added a one-line descriptor + reciprocal cross-link on both employee list pages so their distinct purposes are clear at the point of use — Employee Master ("create, edit and manage records") links to Employee 360, and Employee 360 ("browse full profiles") links to Employee Master. Also softened a dev-jargon empty/error message on the Master page (HR-05 overlap). No route or nav changes.
- **Files:** `src/hr-payroll/pages/HrEmployeesPage.tsx`, `src/hr-payroll/pages/HrEmp360ListPage.tsx`.
- **Tests:** copy/UI-only. Migration: none.

### HR-04 — Acronym expansion (Medium) ✅
- **Change:** Expanded the only bare acronym in nav/titles: "WPMS" → "Workforce Policies (WPMS)". ESS and Attendance Exceptions were already spelled out.
- **Files:** `src/hr-payroll/lib/constants.ts`, `src/hr-payroll/lib/nav.ts`. Migration: none.

### HR-18 — Pending approvals surfaced on the cycle (informational) (Medium) ✅
- **Change:** On the Verify cycle card, an informational line shows counts of pending leave/comp-off/late/mispunch approvals with a link to the Approval Center. **Read-only — introduces no new blocking rule** (per instruction).
- **Files:** `src/hr-payroll/pages/HrVerifyPage.tsx`. Migration: none.

### HR-17 — Override reason capture (Medium) ✅
- **Change:** The payroll line override modal now requires a free-text reason before applying; the reason is stored in the existing `override_json._reason` (no schema change) and prefilled when re-opening. Apply is disabled until a reason is entered.
- **Files:** `src/hr-payroll/pages/HrVerifyPage.tsx`. Migration: none.

### HR-16 — Register pagination (Medium) ✅ (partial)
- **Change:** Added client-side pagination (25/page) with Prev/Next + "showing X–Y of N" to the salary register; footer currency totals still reflect all filtered rows. Page resets on filter change.
- **Deferred (follow-up):** column sorting, frozen Employee column, and column grouping/visibility (see technical debt).
- **Files:** `src/hr-payroll/pages/HrVerifyPage.tsx`. Migration: none.

### HR-11 — Leave list search + bulk approve/reject (Medium) ✅
- **Change:** Added an employee name/code search box to the Leave list; added row + select-all checkboxes (pending rows only, `can("approve")`), a bulk action bar ("Approve selected" / "Reject selected" / "Clear"), and a bulk-reject reason modal. All bulk actions reuse the existing `setStatus` → `processApprovalDecision` path (same audit, payroll rebuild, and cache invalidation as single-row actions) — **no new approval rules**. Attendance already has employee filtering via its FilterBar.
- **Files:** `src/hr-payroll/pages/HrLeavePage.tsx`. Migration: none.

### HR-16 — Register column sort (Medium) ✅
- **Change:** Employee / Payable / Gross / Net Salary headers are now click-to-sort (asc/desc, arrow indicator); sort applies before pagination; footer totals unaffected.
- **Deferred (follow-up):** frozen Employee column + column grouping/visibility (layout-regression risk in the 25-column table without a runnable build).
- **Files:** `src/hr-payroll/pages/HrVerifyPage.tsx`. Migration: none.

### HR-23 — Manager team context on ESS (Medium) ✅ (partial)
- **Change:** Added a "Team approvals" quick-action card on the ESS portal for users who can approve, linking to the Approval Center — gives managers team context from their own portal.
- **Deferred (Phase 2):** a full role-aware manager dashboard (team roster + per-report-team metrics) needs team-scoped queries.
- **Files:** `src/hr-payroll/pages/HrEssPage.tsx`. Migration: none.

### HR-08 — ESS employment-status banner (Low–Med) ✅
- **Change:** ESS now shows a status banner when the employee is not Active (e.g. On Notice / Probation / Inactive), noting some actions may be limited and to contact HR.
- **Files:** `src/hr-payroll/pages/HrEssPage.tsx`. Migration: none.

### HR-22 — Import live validation (Low) ✅
- **Change:** Attendance CSV import now validates **live as you type** (removed the separate "Preview" step), shows a running "N valid · N errors" count, highlights error rows, and drops the "Phase 6" dev jargon. Parse/validate logic extracted to a pure, tested helper.
- **Files:** `src/hr-payroll/lib/attendanceImport.ts` (new + test), `src/hr-payroll/pages/HrImportPage.tsx`.
- **Tests:** 6 pure-logic assertions passed in sandbox. Migration: none.

---

## Architecture decision (2026-07-01, from stakeholder)

> **HR is the System of Record (SSOT)** for all employee information and the full employee
> lifecycle (onboarding, employment details, documents, attendance, leave, payroll, performance,
> training, transfers, offboarding). Every employee is created in HR first; all other ERP modules
> **reference** the HR employee record. **Authorization is module-specific** — each module (CRM,
> Accounting, Institution, etc.) owns its own roles/permissions for the same employee. HR does not
> own module permissions.

Implications for the findings:
- **HR-10:** Confirms ownership *direction* (HR is SoR for employee data; modules reference it). But
  making HR the referenced SSOT that CRM/Accounting/Institution read from is a **cross-module
  architecture programme, not a contained HR UX fix** → moved to **Phase 2**. Note: branches /
  departments / designations are *organisational* master data (not employee records); the decision
  doesn't explicitly assign their ownership, so the current CRM `/masters` source is left as-is for
  now. The contained UX improvement (surface them inside HR context instead of a raw redirect)
  remains available but is deferred with the Phase-2 SSOT work to avoid half-implementing it.
- **HR-02 / HR-09:** Not decided by this architecture note (they concern permissions-UX and holiday
  routing respectively). Still **awaiting decision** — see chat options.

## Blocked on business decision (still open)

- **HR-02** — "View as role" behaviour (admin-only+audited / remove / clarify-only).
- **HR-09** — Canonical holidays surface & who may edit.
- **HR-10** — Full HR-SSOT reference architecture → **Phase 2** (per decision above).

---

## Final implementation report

**Delivered (15 findings):** HR-15 (Critical); HR-14, HR-13 (High); HR-19, HR-18, HR-17, HR-16*, HR-11, HR-06, HR-04, HR-23* (Medium); HR-08, HR-22, HR-20, HR-05 (Low). *= partial (remainder listed under technical debt / Phase 2).

**Approach:** incremental, backward-compatible edits reusing the module's existing components (`ModalShell`, `PayrollWorkflowStepper`, `useHrAuditLogs`, HR CSS classes). All new business logic was extracted into pure, unit-tested helpers under `src/hr-payroll/lib/`. No database schema, RPC, or existing export signatures were changed; the override reason reuses `override_json`, and the audit trail reuses `audit_log`.

**New pure helpers (all unit-tested):** `payrollValidation`, `payrollConfirm`, `payrollReadiness`, `payrollWorkflowGuide`, `payrollAuditTrail`, `attendanceImport` (+ `.test.ts` for each).

**Test status:** 59 pure-logic assertions pass in the assistant sandbox (validation 18, confirm 10, readiness 11, guide 9, audit-trail 5, import 6). Remaining changes are copy/markup. **`git`, `eslint`, `vitest`, and `vite build` were NOT run against the repo** (working tree not mounted) — these must be run locally; see the Environment note at the top.

**Blocked on Future Link decision (not implemented):** HR-02 (View-as role), HR-09 (canonical holidays).

**Files touched (net):**
- New: `lib/payrollValidation.ts`, `payrollConfirm.ts`, `payrollReadiness.ts`, `payrollWorkflowGuide.ts`, `payrollAuditTrail.ts`, `attendanceImport.ts` (+ 6 matching `.test.ts`).
- Edited: `pages/HrVerifyPage.tsx` (HR-15/14/13/19/18/17/16/05), `pages/HrLeavePage.tsx` (HR-11), `components/HrPayrollLayout.tsx` (HR-05), `pages/HrCalculatorPage.tsx` (HR-20), `pages/HrEmployeesPage.tsx` + `pages/HrEmp360ListPage.tsx` (HR-06), `lib/constants.ts` + `lib/nav.ts` (HR-04), `pages/HrEssPage.tsx` (HR-08/23), `pages/HrImportPage.tsx` (HR-22).

## Local commands to run before UAT

```bash
# 1. Branch
git checkout -b feat/hr-payroll-audit-remediation

# 2. Type-check + lint the HR module (fix anything my edits introduced)
npx tsc --noEmit
npx eslint src/hr-payroll --max-warnings=0

# 3. Unit tests for the new pure helpers
npx vitest run src/hr-payroll/lib

# 4. Production build
npm run build

# 5. Commit (suggested grouping: one commit per finding or per closely-related group)
git add -A && git commit -m "HR-15..HR-05: payroll safety, workflow, UX remediation (see docs/HR_IMPLEMENTATION_PROGRESS.md)"
```

I could not run these in my environment (repo not mounted into the tool sandbox); the pure-helper tests were run separately and pass. Run the above locally and resolve anything before UAT.

## Suggested UAT checklist

Payroll Verification (`/hr/payroll/verify`):
1. Select a cycle with a known-bad line (negative net or net > earnings): the **validation summary** shows an error and **Process/Approve/Lock/Mark-paid and Bank export are blocked** (gate modal lists offenders). *(HR-15)*
2. As a finance-admin (`configure`), the gate offers **Override & continue**, and doing so writes a "Payroll Validation Overridden" audit row. As a non-admin, only Close is available. *(HR-15)*
3. Each transition opens the **confirmation dialog** with status transition, employees affected, net totals, and the **readiness checklist**; Lock and Mark-paid require typing the exact cycle name. *(HR-14)*
4. Stepper shows **current step + next action** ("irreversible" tag on Lock/Pay); with a date range but no cycle selected, the **pipeline preview + "select a cycle"** prompt appears. *(HR-13)*
5. **Cycle history** lists Processed/Approved/Locked/Paid with actor + timestamp. *(HR-19)*
6. If there are pending approvals, the **informational pending-approvals line** appears with an Approval Center link and does **not** block anything. *(HR-18)*
7. Override on a line **requires a reason**; Apply is disabled until entered; reason persists on re-open. *(HR-17)*
8. Register **paginates** at 25/page; footer totals reflect all filtered rows; page resets on filter change. Clicking **Employee / Payable / Gross / Net Salary** headers sorts (arrow shows direction). *(HR-16)*
9. Error toasts no longer mention migration numbers. *(HR-05)*

Other screens:
10. Payroll Calculator banner reads "Salary calculator (sandbox)" with a **Go to live payroll** link. *(HR-20)*
11. Employee Master and Employee 360 each show a descriptor + cross-link to the other. *(HR-06)*
12. Sidebar shows "Workforce Policies (WPMS)". *(HR-04)*
13. ESS: a non-Active employee sees a **status banner**; a manager (`approve`) sees a **Team approvals** quick card. *(HR-08, HR-23)*
14. Attendance import validates **as you type** (no Preview button), shows valid/error counts, highlights error rows. *(HR-22)*

Leave management (`/hr/leave`) *(HR-11)*:
15. Search filters the list by employee name/code. As an approver, pending rows show checkboxes + a select-all; selecting shows a bulk bar.
16. "Approve selected" approves all selected pending rows; "Reject selected" opens a single reason modal applied to all; both write audit rows and refresh balances/counts exactly like single-row actions. Non-approvers see no checkboxes.

Regression:
17. Run a full clean payroll cycle end-to-end (no validation errors) and confirm every transition still works and audit rows are written.

## Phase 2 recommendations

- **HR-01** — Migrate HR off bespoke CSS onto the shared shell/shadcn primitives (large rewrite; do as a dedicated track).
- **HR-10** — HR-as-SSOT reference architecture so CRM/Accounting/Institution read the HR employee record (cross-module programme; per the stakeholder architecture decision above).
- **HR-21** — Reports shared date/department filters + row/segment drill-through. (Deferred: adding cross-report filter state + drill navigation is a feature addition to the reports area beyond an incremental change — rules #3/#4.)
- **HR-03** — Flatten the config/admin/master-data hub-within-hub nesting (this is a navigation **redesign** — rule #3; baseline wayfinding via topbar Back/Main-menu + hub intros + sub-page back-links already exists).
- **HR-16 remainder** — Frozen Employee column + column grouping/visibility (sorting + pagination are done; the freeze/grouping carry layout-regression risk in the 25-column table without a runnable build).
- **HR-23 remainder** — Full role-aware manager dashboard (team roster + team metrics).

## Technical debt summary

- **Verification gap:** none of the changes have been through `tsc`/`eslint`/`vitest`/`vite build` or a live click-through in this environment; a local build + manual UAT is required before merge. Highest-attention file: `HrVerifyPage.tsx` (received the most edits).
- **Module-scoped pending counts:** HR-18's pending-approval figures come from `pendingCounts`, which is module-wide, not cycle-scoped; the copy says "to review before locking" but a future improvement is cycle-scoped counts.
- **Override reason storage:** stored in `override_json._reason` to avoid a schema change; if reporting on override reasons is needed later, promote it to a typed column.
- **Bespoke design system (HR-01)** remains the largest debt — HR still diverges from the rest of the ERP visually and in primitives.
- **Register width:** pagination + column sort added, but the 25-column horizontal-scroll table still needs a frozen Employee column + column grouping/visibility (HR-16 remainder).
- **HR-11 bulk loop:** bulk approve/reject iterates `setStatus` per row (each re-invalidates caches); correct but not batched — fine for typical selection sizes, could be optimized to a single RPC + one invalidation later.

Last updated: 2026-07-02.
