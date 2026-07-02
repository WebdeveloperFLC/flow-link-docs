# CRM Live Smoke Test Report

**Date:** 2 July 2026  
**Tester role:** Owner (full access) — `santoshramrakhiani@gmail.com`  
**Environment:** Local dev — `http://localhost:8080`  
**Scope:** CRM module only (excluded HR, Payroll, Accounting, Finance, Performance Hub, Commission, Marketing)

---

## Executive Summary

| Metric | Count |
|--------|------:|
| Pages tested | 14 |
| Workflows tested | 28 |
| Defects found | 9 |
| Critical | 1 (fixed) |
| High | 1 |
| Medium | 3 |
| Low | 4 |
| Fixes implemented | 2 |
| Production recommendation | **GO WITH MINOR FIXES** |

The CRM core is usable end-to-end: leads workspace, client profiles, telecaller queue, activity log, and reports all load and respond. One **Critical** crash on Kanban card click was found and fixed during this session. Remaining issues are KPI/data-display inconsistencies and cosmetic polish — none block daily counselor or branch-manager workflows after the Kanban fix ships.

---

## Pages Tested

| # | Page | Route | Result |
|---|------|-------|--------|
| 1 | CRM Dashboard | `/` | Pass (KPI/chart issues noted) |
| 2 | Leads — table | `/leads` | Pass |
| 3 | Leads — pipeline/kanban | `/leads?view=board` | Pass after fix |
| 4 | Leads — cold pool | `/leads/cold` → `/leads?segment=cold` | Pass |
| 5 | Lead detail / workspace | `/leads/:id` | Pass |
| 6 | Lead form — new | `/leads/new` | Pass |
| 7 | Lead form — edit | `/leads/new?id=:id` | Pass |
| 8 | Clients list | `/clients` | Pass |
| 9 | Client detail | `/clients/:id` | Pass |
| 10 | Client detail — Activity tab | `/clients/:id?tab=communications` | Pass |
| 11 | Activity log | `/activity` | Pass |
| 12 | Telecaller workspace | `/telecaller` | Pass |
| 13 | Reports & Analytics | `/reports` | Pass (KPI mismatch noted) |
| 14 | CRM navigation / sidebar | All CRM links | Pass |

**Not deeply tested (CRM-adjacent):** Messages, WhatsApp inbox, Course finder, Knowledge Centre — sidebar links present and reachable; no functional defects observed on navigation.

---

## Workflows Tested

| # | Workflow | Result |
|---|----------|--------|
| 1 | Login / session restore | Pass (existing session) |
| 2 | CRM sidebar expand/collapse | Pass |
| 3 | Leads search with URL sync (`?q=`) | Pass |
| 4 | Filter chips + Clear all | Pass |
| 5 | Save view control visible | Pass |
| 6 | Temperature tabs (All, Warm & Hot, Cold, Warm, Hot) | Pass |
| 7 | Table ↔ Pipeline view toggle | Pass |
| 8 | Kanban card click → lead detail | **Fail → Fixed** |
| 9 | Lead detail — View/Hide Details | Pass |
| 10 | Lead detail — Edit → form prefill | Pass |
| 11 | Lead form — section nav (8 steps) | Pass |
| 12 | Lead form — Save disabled until valid | Pass |
| 13 | Lead assignment combobox | Pass |
| 14 | Bulk select all on page | Pass |
| 15 | Bulk actions (Mark hot, Mark warm, Reassign, Clear) | Pass |
| 16 | Pagination (Previous/Next) | Pass |
| 17 | Column sorting controls present | Pass |
| 18 | Cold pool — Import CSV / New Cold Lead | Pass |
| 19 | Clients search/filters/sort | Pass |
| 20 | Client detail — Overview tab | Pass |
| 21 | Client detail — pipeline stepper | Pass |
| 22 | Client detail — tab nav (Overview, Case, Documents, Money, Activity) | Pass |
| 23 | Client quick actions (Task, Note, temperature) | Pass |
| 24 | Telecaller — queue tabs + Start calling controls | Pass |
| 25 | Telecaller — Next Up card + Call/Skip | Pass |
| 26 | Reports — time window + CSV export buttons | Pass |
| 27 | Activity log — audit entries render | Pass |
| 28 | Browser refresh on deep links | Pass (loading states ~3–5s) |

**Not executed (avoid production data mutation):** Full lead conversion (Register as Client), lead deletion, duplicate-client creation test, CSV import upload, actual outbound call.

---

## Defects

### CRM-001 — Kanban card click crashes app

| Field | Value |
|-------|-------|
| **Severity** | Critical |
| **Status** | **Fixed in this session** |
| **Steps to reproduce** | 1. Go to Leads → Pipeline view. 2. Click any lead card. |
| **Expected** | Navigate to lead detail page. |
| **Actual** | White screen; error boundary: `Uncaught ReferenceError: nav is not defined` in `LeadsKanbanBoard.tsx`. |
| **Screenshot** | Browser capture during test (kanban → crash overlay) |
| **Recommendation** | Use `useNavigate()` hook — **implemented**. |

---

### CRM-002 — Dashboard "Total Clients" shows 0

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Steps to reproduce** | 1. Open Dashboard (`/`). 2. Compare "Total Clients" KPI with Clients page. |
| **Expected** | Count matches clients list (24+ visible on page 1 with pagination). |
| **Actual** | Dashboard shows **Total Clients: 0** while `/clients` lists many active client files. "Linked records: 189" banner suggests data exists. |
| **Screenshot** | Dashboard KPI row during initial test |
| **Recommendation** | Investigate `executive.clients` aggregation in dashboard data hook/RPC — likely wrong filter (branch, date window, or status). **Do not change without product sign-off (business logic).** |

---

### CRM-003 — Reports "Total Calls" KPI inconsistent with productivity table

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Steps to reproduce** | 1. Open `/reports`. 2. Observe top KPI cards vs Telecaller productivity table. |
| **Expected** | Total Calls KPI equals sum of agent call counts in table. |
| **Actual** | KPI shows **0** calls; table lists Sneha (12), Vani (6), Jayesh (4), Maya (1) = 23 calls. |
| **Screenshot** | Reports page capture |
| **Recommendation** | Align KPI query with telecaller productivity data source. **Business logic — document only.** |

---

### CRM-004 — Telecaller queue phone in scientific notation

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Steps to reproduce** | 1. Open `/telecaller`. 2. Scroll queue list. |
| **Expected** | Phone numbers formatted as dialable strings (e.g. `+91 90810…`). |
| **Actual** | Lead "New Admin" shows phone as `9.19081E+11`. |
| **Screenshot** | Telecaller workspace capture |
| **Recommendation** | Store/display phones as strings; format with libphonenumber or `String()` before render. |

---

### CRM-005 — Client pipeline stage counter mismatch

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Steps to reproduce** | 1. Open any client detail (e.g. Manav Yogesh Patel). 2. Compare header vs Stages button. |
| **Expected** | Consistent stage progress (e.g. 1/15 in both places). |
| **Actual** | Header: "stage **1** of 15"; Stages button: "**0 / 15**". |
| **Screenshot** | Client detail capture |
| **Recommendation** | Unify stage-completed count logic between stepper header and dropdown label. |

---

### CRM-006 — Dashboard chart raw status slug

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Status** | **Fixed in this session** |
| **Steps to reproduce** | 1. Open Dashboard. 2. View "Applications by status" chart Y-axis. |
| **Expected** | Human-readable labels (e.g. "In Progress"). |
| **Actual** | Raw slug `in_progress` displayed. |
| **Recommendation** | Humanize chart tick/tooltip labels — **implemented** in `DashboardV2.tsx`. |

---

### CRM-007 — Pipeline stage distribution empty on Dashboard and Reports

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Steps to reproduce** | 1. Open Dashboard or Reports. 2. View "Pipeline stage distribution" / "Stage distribution". |
| **Expected** | Stage counts when clients are active in pipelines. |
| **Actual** | "No pipeline data yet" despite 24+ clients with visible steppers on client detail. |
| **Recommendation** | Verify pipeline analytics RPC and pipeline_id linkage. May be data/config issue rather than UI bug. |

---

### CRM-008 — Reports lead temperature chart label clipped

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Steps to reproduce** | 1. Open `/reports`. 2. View Lead temperature pie chart. |
| **Expected** | All segment labels visible inside card. |
| **Actual** | "Cold (23)" label appears cut off at card bottom edge. |
| **Recommendation** | Increase chart margin/padding or move legend outside pie. |

---

### CRM-009 — Inconsistent client name casing in list

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Steps to reproduce** | 1. Open `/clients`. 2. Scan Name column. |
| **Expected** | Consistent title case for display names. |
| **Actual** | Mix of "Manav Yogesh Patel", "mahi khan", "MEHRUNNISHA MAHAMAD KOYLA". |
| **Recommendation** | Apply display-name normalizer on list render or enforce on save. |

---

## Fixes Implemented This Session

| ID | File | Change |
|----|------|--------|
| CRM-001 | `src/components/leads/LeadsKanbanBoard.tsx` | Added `useNavigate()`; replaced undefined `nav()` with `navigate()`. |
| CRM-006 | `src/dashboard/components/DashboardV2.tsx` | Added `formatStatusLabel()` for chart Y-axis and tooltip. |

---

## Observations (Non-defect)

- **Loading states:** Initial route loads show "Loading workspace…" / "Loading app…" for 3–5 seconds — acceptable locally; monitor in production.
- **Autosave:** Lead edit form pre-fills correctly; Save buttons disabled until changes — good UX.
- **Accessibility:** Search fields expose keyboard hint `( / )`; bulk actions expose ARIA labels.
- **Console:** No persistent JS errors after Kanban fix (prior crash was fatal).
- **Responsive:** Desktop 1440px layout clean; mobile not tested in this pass.
- **Register as Client / conversion:** Button present on lead detail and form; not executed to avoid creating test production records.

---

## Production Recommendation

### **GO WITH MINOR FIXES**

**Rationale:**
- Critical Kanban navigation crash is **fixed** — restores a primary counselor workflow.
- Core CRM paths (leads, clients, telecaller, activity, reports) are functional.
- Remaining High/Medium items are **data accuracy/display** issues, not navigation blockers.
- Recommend shipping Kanban + chart label fixes immediately; schedule CRM-002/003/004/005 for next sprint.

**Blockers for full GO:** None after CRM-001 fix deploys.

**Before production hardening:**
1. Fix dashboard client count (CRM-002).
2. Reconcile reports call KPI (CRM-003).
3. Fix telecaller phone formatting (CRM-004).
4. Run full conversion + duplicate-client test on staging with disposable leads.

---

## Test Artifacts

Screenshots captured via browser automation during live session (Cursor IDE browser). Key views: Dashboard, Leads table/kanban, Lead detail, Lead form, Clients list, Client detail, Telecaller, Reports, Activity log, Cold pool.

---

*Report generated from live manual QA session on running application — not a code review or unit test run.*
