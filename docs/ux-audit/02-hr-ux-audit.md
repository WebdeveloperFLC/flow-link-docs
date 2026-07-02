# HR / Payroll Module — Product & UX Audit (Phase 2)

**Scope:** HR & Payroll only — the module mounted at `/hr/*` (`src/hr-payroll/`). Covers navigation & shell, Dashboard, Employee Self-Service (ESS), Employee directory / Employee-360, Attendance & exceptions, Leave & holidays, the full Payroll pipeline (process → validation → register → verify → approve → lock → pay → history), Approvals, Reports, Import, and Configuration / Administration / Master-Data / WPMS.
**Excluded:** All other modules.
**Method:** Read-only review of `src/hr-payroll/HrPayrollRoutes.tsx`, `HrPayrollLayout.tsx`, and the HR pages/components/hooks/lib, cross-checked against `docs/system-map`. No code was modified.
**Date:** 2026-07-01
**Companion docs:** `00-broad-erp-ux-audit.md` (Phase 1), `01-crm-ux-audit.md` (CRM). This report reuses the CRM audit's severity scale and its **§7 CRM design standard**, which is proposed as the ERP-wide template.

### "Screenshot references"

Code-based pass; no running instance. Each finding cites **route + file:line** as its evidence anchor. Behavioural items that a screenshot would settle are tagged **[confirm live]**; I can run a Claude-in-Chrome screenshot pass to attach annotated images.

### HR route map (authoritative, from `HrPayrollRoutes.tsx`)

| Area | Routes | Notes |
|---|---|---|
| Dashboard / ESS | `/hr` (dashboard), `/hr/me` (+ `me/time-history`, `me/exceptions`) | Self-service is "My Portal" |
| People | `/hr/employee` (Emp360 list), `/hr/employee/:id/*` (360 tabs), **`/hr/employees`** (Employee Master), `/hr/documents`, `/hr/training` | Two employee list pages |
| Attendance | `/hr/attendance/{records,exceptions,compoff,late,mispunch}` (+ legacy redirects) | Tabbed sub-module (AEMS) |
| Leave/Holidays | `/hr/leave`, `/hr/holidays`, `/hr/config/holidays` (masterMode) | Holidays in ≥2 places |
| Payroll | `/hr/payroll/{process,validation,register,history}`, `/hr/payroll/verify/:cycleId?`, `/hr/payroll/:cycleId?` | Pipeline spread across pages |
| Approvals | `/hr/approvals/:type` | Separate inbox |
| Reports | `/hr/reports`, `/hr/reports/:reportId` | Hub + detail |
| Config | `/hr/config` hub + `config/{shifts,holidays,document-types,categories,roles,audit,:slug}`; `config/{branches,departments,designations}` → **redirect to** `/hr/admin/master-data/crm/*` | Config points into Admin |
| Admin | `/hr/admin` hub, `admin/master-data` hub (+ companies, crm/:section, :domain), `admin/wpms/*`, `admin/incidents` | Hub-within-hub |
| Import | `/hr/import` | |

Shell: `HrPayrollLayout.tsx`. Access/roles: `context/HrAccessContext.tsx`, `HrPayrollProvider`, `lib/nav.ts`, `lib/constants.ts`.

---

## 1. Executive summary

HR is the **most functionally complete and the most self-contained** module in the ERP — it is effectively an app-within-the-app, with its own layout, sidebar, topbar, role model, and even its own CSS. That self-containment is also the source of its two biggest problems:

1. **It is a design-system island.** HR does not use the shared `AppLayout` or shadcn/ui primitives that the CRM and the rest of the ERP use. It renders bespoke CSS classes (`app`, `sidebar`, `card`, `btn`, `serif`, `rb-perm`, a custom `toast`) under `data-hr-payroll` (`HrPayrollLayout.tsx`). Moving from CRM to HR feels like changing products. This is the Phase-1 "inconsistency" theme in its most acute form.

2. **The payroll pipeline is powerful but unguided, and its irreversible steps have weak guardrails.** Process → Validation → Register → Verify → Approve → Lock → Pay is spread across five separate pages with no cycle-centric hub or persistent stepper, validation is read-only and does not gate processing, and Lock / Mark-paid / bank-file export are confirmed with generic browser `confirm()` dialogs. Payroll errors are high-stakes (wrong pay, bank rejections, compliance), so this is where the module carries real risk.

Beyond those, HR shows the same shape of issues as CRM — **under-powered tables** (no search/bulk on attendance & leave), **duplication** (two employee pages; holidays in two–three places), **deep hub-within-hub navigation**, and **jargon** (WPMS/AEMS/WTM/ESS/Emp360, plus dev messages like "Apply HR SQL migrations" leaking into the UI). A distinctive HR item is the **"View as" role switcher** sitting permanently in the production topbar.

Net: HR is not broken — the Emp360 workspace and the role-aware nav are genuinely good — but it needs (a) alignment to the shared design standard and (b) a payroll-safety pass before it should be relied on for live pay runs.

---

## 2. Findings

Each finding: **Severity · Business impact · Current workflow (evidence) · Recommended workflow · Effort (S <1d / M 1–3d / L >3d) · Change type.**

### Cross-cutting: shell, navigation, roles

#### HR-01 · HR is a bespoke design-system island — High
- **Business impact:** Users re-learn the interface when crossing from CRM/Accounting into HR (different sidebar, topbar, buttons, spacing, toasts). Developers copy the wrong patterns between modules; accessibility presets from shadcn are absent. This is the single biggest consistency debt in the ERP.
- **Current workflow / evidence:** `HrPayrollLayout.tsx` renders its own `aside.sidebar`, `header.topbar-card`, brand block ("Future Link · HR PAYROLL"), and a custom `<div className="toast">` (`:239`); components use raw class strings (`card`, `btn`, `rb-perm`, `ess-*`, `emp360-*`) and CSS variables (`--ink`, `--sage`, `--clay`…), with no `@/components/ui` imports anywhere in `src/hr-payroll`. No shared `AppLayout`.
- **Recommended workflow:** Adopt the shared shell + shadcn primitives incrementally (start with buttons, cards, inputs, dialogs, tables, toaster), mapping the HR CSS-variable palette onto the shared tokens. If a distinct HR skin is intentional, at minimum unify primitives and document the system. This is the flagship case for the §7 design standard.
- **Effort:** L · **Type:** UX-only (large front-end refactor).

#### HR-02 · "View as role" simulator lives permanently in the production topbar — High
- **Business impact:** A prominent role dropdown that "applies instantly" invites confusion and mistakes: users believe they've changed their permissions (they've only changed which menus render; the backend still enforces their real role), and the disclaimer explaining this is buried in the ESS onboarding card. Approvers acting while "previewing" another role get inconsistent behaviour, and there's no audit distinction between real and simulated context.
- **Current workflow / evidence:** `HrPayrollLayout.tsx:198-205` — a `<select>` bound to `setRole` in the topbar; role banner says "changes apply instantly" (`:229-231`); `HrAccessContext`/`HrPayrollProvider` resolve UI visibility from the previewed role while true permissions come from the assigned role; disclaimer only on `HrEssPage`. [confirm live]
- **Recommended workflow:** Treat role-preview as an admin-only, clearly-labelled mode ("Previewing as X — your real role is Y"), not a persistent production control; disable it for non-admins; log preview usage; never let a previewed role enable an action the real role can't perform.
- **Effort:** M · **Type:** business-rule (who may preview; audit) + UX.

#### HR-03 · Hub-within-hub navigation; 4–5 clicks to reach a setting — Medium
- **Business impact:** Routine maintenance (shifts, holidays, document types, roles) is buried behind stacked landing pages (Admin hub → Master-Data hub → domain → form). Settings are discoverable only by drilling in; new admins assume features are missing.
- **Current workflow / evidence:** `HR_NAV` has ~8 groups (`lib/nav.ts`); Config (`HrConfigHubPage`) and Admin (`HrAdminHubPage` → `HrMasterDataHubPage` → `HrMasterDataDomainPage`) are card-grid hubs that each require another click (`HrPayrollRoutes.tsx:115-147`). No breadcrumbs on hub pages.
- **Recommended workflow:** Flatten to one settings area with a persistent secondary sidebar/tabs (Masters vs Policies vs Security), add breadcrumbs, and expose common masters (shifts, holidays, categories) one click from the hub.
- **Effort:** M–L · **Type:** UX-only.

#### HR-04 · Acronym soup with no in-product glossary — Medium
- **Business impact:** WPMS, AEMS, WTM, ESS, Emp360 appear as nav items, folders, and page titles without being spelled out. New HR users can't predict what a link does; training overhead rises.
- **Current workflow / evidence:** `WpmsHubPage` tags "WPMS"; `/hr/attendance/exceptions` = AEMS (never expanded in UI); `/hr/me` = ESS; `/hr/employee` = Emp360 (informal). `lib/constants.ts` screen titles.
- **Recommended workflow:** Spell acronyms on first use ("Attendance Exceptions (AEMS)"), add hover tooltips, and a short glossary on the config/admin landing.
- **Effort:** S · **Type:** UX-only.

#### HR-05 · Implementation/dev messages leak into the UI — Low
- **Business impact:** End users see "Apply HR SQL migrations" (`HrPayrollLayout.tsx:173-177`) and "UAT"/masterMode wording in cards; erodes trust and confuses.
- **Recommended workflow:** Move DB-readiness/migration and UAT notes behind admin-only surfaces; user-facing copy only.
- **Effort:** S · **Type:** UX-only.

### People

#### HR-06 · Two employee list pages (`/hr/employee` vs `/hr/employees`) — Medium
- **Business impact:** "Employee 360" (card browser) and "Employee Master" (CRUD table) are sibling nav items over the same data with no explanation of which to use; admins edit in the wrong place or think records are missing when filters differ.
- **Current workflow / evidence:** `HrPayrollRoutes.tsx:67` (`/hr/employee` → `HrEmp360ListPage`) and `:79` (`/hr/employees` → `HrEmployeesPage`); both under the "People" nav group with equal prominence (`lib/nav.ts`); no cross-links.
- **Recommended workflow:** Make Master the single directory with view+edit; have Emp360 be the "open profile" destination from it (add "Edit in master" from a 360 profile). Clarify labels/tooltips.
- **Effort:** S–M · **Type:** UX-only.

#### HR-07 · Employee-360 workspace is good; watch tab growth — Low (strength)
- **Business impact:** Positive baseline. The 360 (Summary + Attendance/Leaves/Payroll/Training/Documents/Policy-Bundle) is well organised with a summary that links into detail tabs and sensible back-navigation.
- **Current workflow / evidence:** `pages/emp360/*`, `HrEmp360Layout.tsx:68-76`.
- **Recommended workflow:** Keep; apply the §7.5 tab pattern (cap primary tabs, count badges, icon+tooltip on mobile) as it grows. Reference implementation for the CRM workspace regroup (CRM-13).
- **Effort:** — · **Type:** —.

#### HR-08 · ESS onboarding & status context gaps — Low–Medium
- **Business impact:** New employees must click a one-time "Create my employee profile" button with no proactive prompt; on-notice/probation employees see full salary/leave access with no status banner (a compliance nuance in some regions).
- **Current workflow / evidence:** `HrEssPage.tsx:119-164` (setup card), full ESS at `:168+`; no status-based messaging.
- **Recommended workflow:** Prompt profile completion on first login; show an employment-status banner where relevant; ensure slip availability messaging is explicit.
- **Effort:** S · **Type:** UX-only.

### Attendance & Leave

#### HR-09 · Holidays rendered in two–three places with contradictory edit gating — High
- **Business impact:** No single source of truth. `/hr/holidays` (operational) and `/hr/config/holidays` (masterMode) are the same component with different permissions; an HR executive who lacks `manageEmp` opens Holiday Calendar, finds no "Add" button, and assumes the feature is missing — while an admin edits the same data elsewhere. Duplicate-entry risk.
- **Current workflow / evidence:** `HrPayrollRoutes.tsx:96` and `:118` render `HrHolidaysPage` with/without `masterMode`; edit gate flips between `can("manageEmp")` and `can("configure")`; the "+ Add" affordance is conditionally shown in a way that surprises operational users. [confirm live]
- **Recommended workflow:** One canonical Holidays master (under Config/Masters) for editing; `/hr/holidays` becomes a read-only "my applicable holidays" view with a clear pointer to who manages them.
- **Effort:** M · **Type:** UX (+ routing/masterMode refactor).

#### HR-10 · Config "branches/departments/designations" jump out to the CRM `/masters` page — High
- **Business impact:** Clicking these HR config items redirects into another module's master-data screen (different look, different context, separate audit), breaking the "I'm configuring HR" mental model and creating ambiguity about where org data is owned.
- **Current workflow / evidence:** `HrPayrollRoutes.tsx:121-123` redirect `config/{branches,departments,designations}` → `/hr/admin/master-data/crm/__*`, dispatched by `HrAdminCrmMasterPage` → `HrCrmMasterLinkPage` (CRM-linked). 
- **Recommended workflow:** Decide the ownership model and make it seamless: either surface CRM org-masters inside an HR-styled wrapper that keeps HR navigation/context, or document clearly that org structure is shared and read-through. Avoid a raw cross-module redirect.
- **Effort:** M–L · **Type:** business-rule (data ownership) + UX.

#### HR-11 · Attendance & leave tables lack search and bulk actions — Medium
- **Business impact:** Approving 100+ pending leaves is one-by-one modal work; no keyword search by employee, no select-all/bulk-approve, no persistent filter chips. Slow at scale.
- **Current workflow / evidence:** `HrLeavePage.tsx` filters by date range + "show legacy" only (`~761-777`), per-row modal actions (`~808-916`); `HrAttendancePage` FilterBar supports date/employee but no search/multi-select.
- **Recommended workflow:** Add name/code search, checkbox multi-select with bulk approve/reject, and filter chips — via the §7.2 standard table.
- **Effort:** M · **Type:** UX (+ bulk endpoint).

#### HR-12 · Multi-stage leave approval state is unclear — Medium
- **Business impact:** With a Manager→HR chain, a manager approves and assumes it's final, but the request stays "Pending" for the next approver; employees misread status. No visible chain progress.
- **Current workflow / evidence:** `HrLeavePage.tsx:672-701` fires "Stage approved — awaiting next approver" only when the returned status is still Pending; the leave modal shows plain Approve/Reject with no stage indicator.
- **Recommended workflow:** Show the approval chain with per-stage state (✓ Manager · ⧗ HR), a "Stage 1/2" status badge, and the approver+timestamp trail.
- **Effort:** M · **Type:** UX-only (data largely tracked).

### Payroll (highest-stakes area)

#### HR-13 · Payroll pipeline is scattered across pages with no cycle hub or persistent stepper — High
- **Business impact:** The sequence (Process → Validation → Register → Verify → Approve → Lock → Pay) lives on five separate pages reached by prose links; the workflow stepper only renders after a cycle is selected. New admins can't discover the order and risk out-of-sequence actions; every run costs navigation overhead.
- **Current workflow / evidence:** Separate routes `payroll/process` (`HrCalculatorPage`), `payroll/validation`, `payroll/register`, `payroll/verify`, `payroll/history` (`HrPayrollRoutes.tsx:99-105`); `HrVerifyPage` shows `PayrollWorkflowStepper` only if a cycle is chosen (`~567`); validation/register reachable via in-card links (`HrPayrollValidationPage`, `HrSalaryRegisterPage`).
- **Recommended workflow:** A cycle-centric hub page: cycle header (period, status, headcount), an always-visible stepper, a step checklist, and Validation/Register as tabs — with each step's action inline. Reusable as the ERP pattern for guided multi-step finance flows (mirrors Accounting approvals).
- **Effort:** M · **Type:** UX-only (IA/navigation).

#### HR-14 · Irreversible payroll actions (Lock / Mark-paid / bank export) rely on generic `confirm()` — High
- **Business impact:** Locking a cycle, marking it paid, or exporting the bank file are effectively irreversible, yet they're gated only by a browser `confirm()` with generic text and no summary of readiness, headcount, overrides, or pending approvals. Easy to lock/pay prematurely.
- **Current workflow / evidence:** `HrVerifyPage` — `confirm("Lock payroll? …")` (`~369`), `confirm("… mark paid …")` (`~382`); status shown only as a small badge (`~477`). [confirm live]
- **Recommended workflow:** Replace with a structured confirmation modal: current→target status, employees affected, override count, pending-approval count, a readiness checklist, and a type-to-confirm challenge for Lock/Pay.
- **Effort:** M · **Type:** UX-only (+ light read queries).

#### HR-15 · No validation gate before processing/paying; bad data can reach slips and the bank file — Critical
- **Business impact:** The Validation page is read-only ("does not generate, lock, or post") and does **not** block "Process salary"; the bank-transfer export runs its validation but still lets the user export despite warnings via a generic confirm. Invalid rows (negative payable days, gross/net anomalies, missing statutory deductions, bad IFSC) can flow into processed/locked pay, printed slips, and a bank file that gets rejected. This is the payroll analog of the CRM conversion risk — the module's main data/financial-integrity exposure.
- **Current workflow / evidence:** `HrPayrollValidationPage.tsx` is observational (`~84-92, 216`); `HrVerifyPage` "Process salary" calls `processPayrollCycle` behind a generic confirm (`~345,523`); `exportBankTransfer` computes `bankTransferValidation` but proceeds on `confirm` (`~446-456`).
- **Recommended workflow:** A validation summary ("145 OK · 3 warnings · 1 error") with inline error flagging; **block Process/Lock/Pay when hard errors exist** (explicit, audited override only); convert bank export to a blocking validation modal that hard-stops on critical errors and offers a discrepancy report.
- **Effort:** M · **Type:** business-rule (validation rules, gating policy) + UX.

#### HR-16 · 25-column salary register: no pagination, sort, drill-down, or frozen columns — Medium
- **Business impact:** A ~1,500px-wide, 25-column table with all rows rendered and horizontal scroll makes it hard to spot outliers (zero net, high gross) and can bog down at scale; actions sit at the far right.
- **Current workflow / evidence:** `HrVerifyPage` table `minWidth:1500` (`~675`), 25 columns, no pagination/sort, View/Slip/Ovr buttons at right (`~774-821`).
- **Recommended workflow:** Column grouping (Attendance / Deductions / Totals) with visibility toggle, pagination, header sort, quick filters (overridden only, net<0), a frozen Employee column, and actions in a row menu.
- **Effort:** M · **Type:** UX-only.

#### HR-17 · Override modal lacks source explanation, reason capture, and impact preview — Medium
- **Business impact:** "auto" (computed) vs manual values are distinguished only by a gold highlight; no explanation of what "auto" includes, no required reason, no net-change preview, no audit of prior overrides → wrong overrides get locked in.
- **Current workflow / evidence:** `HrVerifyPage` OverrideModal (`~51-182`), auto hint at `~140`, highlight at `~143`.
- **Recommended workflow:** Rename to "Computed (attendance + approvals)", add a required reason field, show "net will change ₹X → ₹Y", and display last-override audit.
- **Effort:** M · **Type:** UX (+ `override_reason` column).

#### HR-18 · Approvals inbox is decoupled from the payroll pipeline; blocking items aren't surfaced — Medium
- **Business impact:** Pending leaves/late/mispunch that affect gross aren't shown as blockers on the payroll cycle; the payroll approval item just links out to Verify. Approvers process first, discover blockers later, then rework.
- **Current workflow / evidence:** `HrApprovalsPage.tsx` payroll tab shows a single cycle item only when Draft/Processed (`~115-116`) and links to `/hr/payroll/verify` (`~594-602`).
- **Recommended workflow:** Surface "blocking approvals for this cycle: N leaves, M late" with inline quick-approve, and a pre-process checklist on Verify.
- **Effort:** M · **Type:** UX-only.

#### HR-19 · Payroll approval/lock/pay audit trail not surfaced in the UI — Medium
- **Business impact:** After approve/lock/pay, readers can't see who did what and when with what note — a compliance gap (tax audit, labour dispute); details require DB digging.
- **Current workflow / evidence:** `HrVerifyPage` shows status badge + `paid_at` tag only (`~475-486`); `ApprovalTrail` exists for leave but not for payroll cycles.
- **Recommended workflow:** A cycle timeline (Processed/Approved/Locked/Paid — by whom, when, notes); store `*_by`/`*_at` on the cycle if absent.
- **Effort:** M · **Type:** UX (+ schema if fields missing).

#### HR-20 · "Calculator" sandbox vs production payroll can be confused — Low
- **Business impact:** `/hr/payroll/process` is a what-if "Formula sandbox" (clearly disclaimed) but its route name and nav position sit inside the real pipeline; users may expect it to post.
- **Current workflow / evidence:** `HrCalculatorPage.tsx:168-175` disclaimer + link to Verify.
- **Recommended workflow:** Rename route/label to "Calculator / Sandbox", move it out of the linear pipeline slot, add a "Go to live processing" button.
- **Effort:** S · **Type:** UX-only.

### Reports & Import

#### HR-21 · Reports: no drill-through, no shared/persistent filters — Low–Medium
- **Business impact:** Each report is independent; switching reports resets filters; no drill from a number to underlying records; no saved filter sets.
- **Current workflow / evidence:** `HrReportsPage.tsx` hub cards → `HrReportPage` per report (`~16-59`), no shared filter context.
- **Recommended workflow:** Shared date/department filter context (URL/localStorage), row/segment drill-through, saved filter sets. (Same pattern as CRM-23.)
- **Effort:** M · **Type:** UX (+ parameterised queries).

#### HR-22 · Import validation is post-preview, not inline — Low
- **Business impact:** Users paste CSV, click Preview, then hunt errors in a table and re-paste; slower one-time setup.
- **Current workflow / evidence:** `HrImportPage.tsx` buildPreview validates on click (`~48-69`), errors in table (`~175-180`).
- **Recommended workflow:** Debounced live preview, red error rows, a running "valid/errors" summary, downloadable error report.
- **Effort:** S · **Type:** UX-only.

### Dashboard

#### HR-23 · Dashboard is admin-centric; managers get no team view, ESS lacks team context — Medium
- **Business impact:** `HrDashboardPage` is an HR-admin ops view (headcount, liability, approvals, birthdays); a line manager has no consolidated "my team / my approvals" surface, and ESS is purely personal — managers must navigate away to act on reports.
- **Current workflow / evidence:** `HrDashboardPage.tsx` (admin metrics), `HrEssPage.tsx` (personal only).
- **Recommended workflow:** Role-aware dashboard: managers see team roster + pending approvals for direct reports; add first-run/onboarding cues for new joiners.
- **Effort:** M · **Type:** UX-only (assuming team queries exist).

---

## 3. Findings summary table

| ID | Area | Title | Severity | Effort | Type |
|---|---|---|---|---|---|
| HR-15 | Payroll | No validation gate before process/pay; bad data reaches slips & bank file | **Critical** | M | Biz+UX |
| HR-01 | Shell | Bespoke design-system island (no shared shell/shadcn) | High | L | UX |
| HR-02 | Roles | "View as" simulator permanent in production topbar | High | M | Biz+UX |
| HR-09 | Leave | Holidays in 2–3 places; contradictory edit gating | High | M | UX |
| HR-10 | Config | Branches/depts/designations redirect out to CRM `/masters` | High | M–L | Biz+UX |
| HR-13 | Payroll | Scattered pipeline; no cycle hub / persistent stepper | High | M | UX |
| HR-14 | Payroll | Irreversible Lock/Pay/export gated only by `confirm()` | High | M | UX |
| HR-03 | Nav | Hub-within-hub; 4–5 clicks to a setting | Medium | M–L | UX |
| HR-04 | Nav | Acronym soup, no glossary | Medium | S | UX |
| HR-06 | People | Two employee list pages | Medium | S–M | UX |
| HR-11 | Attendance/Leave | No search/bulk on high-volume tables | Medium | M | UX(+Biz) |
| HR-12 | Leave | Multi-stage approval state unclear | Medium | M | UX |
| HR-16 | Payroll | 25-col register; no pagination/sort/drill/freeze | Medium | M | UX |
| HR-17 | Payroll | Override modal lacks context/reason/preview | Medium | M | UX(+Biz) |
| HR-18 | Payroll | Approvals decoupled; blockers not surfaced | Medium | M | UX |
| HR-19 | Payroll | No approval/lock/pay audit trail in UI | Medium | M | UX(+schema) |
| HR-23 | Dashboard | Admin-centric; no manager team view | Medium | M | UX |
| HR-21 | Reports | No drill-through / shared filters | Low–Med | M | UX+Data |
| HR-08 | ESS | Onboarding & status-context gaps | Low–Med | S | UX |
| HR-05 | Shell | Dev/impl messages leak into UI | Low | S | UX |
| HR-20 | Payroll | Calculator sandbox vs production confusion | Low | S | UX |
| HR-22 | Import | Validation post-preview, not inline | Low | S | UX |
| HR-07 | People | Emp360 workspace (strength; watch tab growth) | Low | — | — |

---

## 4. Prioritized implementation roadmap

### Wave 1 — high impact, low effort (payroll safety + trust)
- **HR-15 (start):** validation summary + **block Process/Lock/Pay on hard errors**; make bank export blocking on critical errors. *(Critical.)*
- **HR-14:** structured confirmation modal (with type-to-confirm) for Lock / Mark-paid / bank export.
- **HR-05 / HR-20:** remove dev/UAT/migration jargon; rename Calculator → Sandbox and move it out of the pipeline slot.
- **HR-04:** spell out acronyms + tooltips.
- **HR-06:** clarify the two employee pages (labels, tooltips, cross-link).
- **HR-19 (start):** show the cycle status/approval timeline where the data already exists.

### Wave 2 — medium effort (productivity + coherence)
- **HR-13:** payroll cycle hub with persistent stepper + checklist; Validation/Register as tabs.
- **HR-16 / HR-17 / HR-18:** register table upgrade; override modal context+reason+preview; surface blocking approvals on the cycle.
- **HR-09 / HR-10:** single Holidays master + read-only personal view; resolve org-master cross-module redirect.
- **HR-11 / HR-12:** search + bulk on attendance/leave; visible multi-stage approval chain.
- **HR-03:** flatten config/admin nav + breadcrumbs.
- **HR-23 / HR-21 / HR-08 / HR-22:** manager dashboard; report drill-through/shared filters; ESS onboarding/status; inline import validation.

### Wave 3 — major redesign
- **HR-01:** migrate HR to the shared shell + shadcn primitives (the design-standard alignment).
- **HR-02:** re-architect role preview into an admin-only, audited mode.
- Full payroll pipeline redesign around the cycle hub (building on Wave 2).

---

## 5. Quick wins (<1 day each)

1. **Type-to-confirm modal** for Lock / Mark-paid (start of HR-14) — highest safety-per-effort.
2. **Hard-stop bank export** on critical validation errors (part of HR-15).
3. Validation **summary badge** ("N OK · N warnings · N errors") on the validation page (part of HR-15).
4. Remove **"Apply HR SQL migrations"/UAT/masterMode** jargon from user-facing copy (HR-05).
5. **Acronym tooltips** + spelled-out labels (HR-04).
6. **Cross-link + tooltips** clarifying Employee Master vs Employee 360 (HR-06).
7. Rename **Calculator → Sandbox** and add "Go to live processing" (HR-20).
8. **Cycle status/approval timeline** surfaced on Verify from existing fields (start of HR-19).
9. Read-only banner on **operational Holidays** pointing to who manages them (part of HR-09).
10. Disable form inputs while submitting + spinner on leave/attendance forms (polish from HR-11/agent findings).

---

## 6. High-impact redesign opportunities

1. **Payroll cycle hub (HR-13/14/15).** A single guided, gated, audited cycle experience — stepper + checklist + blocking validation + safe irreversible actions. Removes the module's core risk and becomes the ERP's template for guided finance workflows (shared with Accounting approvals).
2. **Design-standard alignment (HR-01).** Bring HR onto the shared shell/components. Biggest single win for whole-ERP consistency; also the largest.
3. **Role model clarity (HR-02).** Turn "View as" into a safe, admin-only, audited preview.
4. **Master-data unification (HR-09/HR-10).** One coherent, HR-context master-data experience with clear ownership (holidays, org structure).
5. **Power tables for attendance/leave/register (HR-11/HR-16).** Search + bulk + pagination + drill — the same standard table proposed for CRM and Accounting.

---

## 7. Design-standard alignment (HR-specific notes on the shared §7 standard)

HR is the strongest argument for the ERP-wide design standard defined in `01-crm-ux-audit.md §7`, because it is the furthest-drifted module. Mapping HR onto that standard:

- **§7.1 Forms / §7.8 Feedback:** replace ad-hoc HR forms and the custom toast with the shared form framework and toaster; disable controls while submitting.
- **§7.2 Tables:** attendance, leave, and the salary register all adopt the one standard table (search, filters, sort, bulk, pagination, sticky/frozen column, responsive fallback).
- **§7.3 Destructive/irreversible actions:** Lock / Mark-paid / bank export use the standard confirmation (with type-to-confirm for payroll) — the strongest instance of this pattern in the ERP.
- **§7.4 Multi-step results + a new guided-pipeline pattern:** the payroll cycle hub establishes the reusable "stepper + checklist + gated actions + audit timeline" pattern for any multi-stage finance flow.
- **§7.5 Workspace/tabs:** Emp360 is already close; use it as the reference for the CRM workspace regroup.
- **§7.6 Terminology:** an ERP glossary that expands WPMS/AEMS/WTM/ESS/Emp360 and removes implementation jargon.
- **§7.7 States & §7.9 Tokens:** map the HR CSS-variable palette onto shared tokens; keep status colour paired with icon/text for accessibility.

Adopting the payroll-safety items (HR-14/15) and the shared confirmation + table patterns first neutralises the module's risk and the bulk of its friction without waiting for the full shell migration.

---

## 8. Caveats & confidence

- Code-based audit; no live instance. Items tagged **[confirm live]** (HR-02, HR-09, HR-14) should be verified with a short click-through before build; I can attach annotated screenshots via a Chrome pass.
- Structural, high-severity claims (bespoke design system, "View as" control, two employee pages, holidays duplication, config→CRM redirect, scattered payroll pipeline) are verified directly against `HrPayrollRoutes.tsx` and `HrPayrollLayout.tsx`. Payroll interaction details (confirm dialogs, validation non-gating, register columns, override modal) come from focused reads of the cited `HrVerifyPage`/`HrPayrollValidationPage` files; line numbers are anchors, not guarantees against later edits.
- Effort estimates are engineering-rough (S <1d, M 1–3d, L >3d) and assume the shared design-standard components are built once and reused across modules.

*No code was changed. Awaiting your approval before any implementation — I'd suggest starting with the Wave 1 payroll-safety quick wins (HR-14/15) or a live screenshot pass, whichever you prefer.*
