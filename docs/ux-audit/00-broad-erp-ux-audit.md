# ERP Broad UX Audit — Phase 1

**Scope:** All modules except Digital Success Hub.
**Method:** Read-only review of source (`src/`, `src/accounting/`, `src/institutions/`, `src/incentives/`, `src/pages/portal/`, `src/hr-payroll/`) and the `docs/system-map` documentation. No code was modified.
**Nature:** High-level product & UX assessment answering five strategic questions. This is *not* a screen-by-screen redesign or an implementation plan — it is the evidence base a redesign would be built on.
**Date:** 2026-07-01

---

## How to read this

The ERP is large and genuinely capable: 100+ routes, a documented backend, RLS everywhere, realtime, and a rich accounting engine. The problems below are **not** "the app is bad." They are the predictable UX debt of a system that grew module-by-module, each shipped by a different pattern, without a shared design system or interaction contract holding them together. The single highest-leverage theme, repeated in every section, is **inconsistency**: four navigation paradigms, no shared form framework, and tables that each reinvent (or omit) filtering, search, and pagination.

Scores below are on a 0–10 scale, judged at the **module level** against mainstream ERP/CRM norms (Dynamics, Fiori, Oracle Fusion, Salesforce Lightning, HubSpot, Odoo). They are directional, meant for prioritization, not precision.

---

## 1. Which modules have the weakest UX?

Ranked weakest → strongest. Dimensions: **VD** Visual Design · **Nav** Navigation · **Use** Usability · **Prod** Productivity · **A11y** Accessibility · **Con** Consistency.

| Rank | Module | VD | Nav | Use | Prod | A11y | Con | Avg | One-line verdict |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **Accounting** | 6 | 3 | 4 | 4 | 4 | 5 | **4.3** | Feature-complete, but 30+ nav items, overlapping pages, giant single-screen forms, and pagination coded but not rendered. |
| 2 | **Assessment funnel** | 7 | 5 | 5 | 5 | 5 | 2 | **4.8** | Well-built in isolation, but a visual island (`flc-*` CSS) that shares nothing with the rest of the app. |
| 3 | **Leads / conversion (CRM)** | 6 | 5 | 4 | 5 | 5 | 6 | **5.2** | The core money workflow. ~30-field form, unclear save state, irreversible convert with no confirmation. |
| 4 | **Global navigation (shell)** | 6 | 4 | 5 | 5 | 5 | 5 | **5.0** | 10+ top-level sections, 40+ items, label/route drift ("Knowledge Centre" = `/service-library`). |
| 5 | **Institutions / Commissions** | 6 | 6 | 5 | 5 | 5 | 5 | **5.3** | Detail page is a 30-tab monster; mixed inline-edit vs dialog vs panel save models. |
| 6 | **Settings / Admin** | 6 | 5 | 5 | 5 | 5 | 4 | **5.0** | No settings home; config scattered across many URLs, card-nav that doesn't match any other module. |
| 7 | **Client Portal** | 7 | 7 | 6 | 5 | 6 | 7 | **6.3** | The most coherent module, but client-facing tables have no search/sort/filter and overflow on phones. |
| 8 | **Clients (CRM detail)** | 7 | 6 | 6 | 6 | 6 | 7 | **6.3** | Solid tabbed workspace; autosave is invisible and legacy tab URLs silently remap. |

**Weakest overall: Accounting**, both because its UX friction is highest *and* because it carries the most operationally critical, error-sensitive work (money movement, approvals, reconciliation). **Assessment** scores low almost entirely on consistency — it's fine on its own but jarring to move into.

---

## 2. Which workflows are confusing?

These are the workflows most likely to produce errors, rework, or a support ticket.

**Lead → Client conversion (highest concern).** This is the revenue-critical, effectively irreversible step, and it has the weakest guardrails. "Register as Client" sits next to "Save & View" with only a dense info card to distinguish them (`LeadNew.tsx`), fires conversion with **no confirmation dialog and no pre-conversion review** of what client record will be created, and on validation failure shows a toast without scrolling to the offending field in a ~30-field form. Cold vs. warm/hot leads have *different* required-field rules (`leadSchemas.ts`) that aren't signaled until submit.

**Payment verification / approvals (accounting).** The mental model is genuinely unclear: "Finance queue" (a real page, `AccountingRoutes.tsx:203`, backed by the work-queue engine in `src/platform/workQueue`), "Approvals" (`AccountingApprovalsPage`), and inline verification inside `ClientInvoicesPanel` all touch the same money. A user asked to "verify a payment" has three plausible places to go and no signpost telling them which. The approval chain itself (SUBMITTED → AUDITOR1 → AUDITOR2 → FINAL → OTP → APPROVED) is powerful but opaque at the UI level.

**Creating a bill or invoice (accounting).** `AccountingNewBillPage`/`AccountingNewInvoicePage` are single screens with 20–25 fields each (23+ `useState` calls in the bill page), no wizard, and validation that only fires on submit as a generic "Please complete required fields" toast. Downstream fields (COA account) silently depend on upstream choices (entity, currency) with no explanation of the dependency.

**Chart-of-accounts maintenance.** Creating one ledger account can require opening three nested inline dialogs (Add Group → Add Type → Add SubType) before filling 15+ fields. Focus is repeatedly lost; a non-accountant cannot self-serve this.

**Portal micro-workflows (points redemption, referral, file upload, booking).** Each validates on click-then-toast rather than as-you-type, has no inline error states, and no live feedback (e.g., the redemption discount only updates after you change the value; there's no `min` on the points input despite a "minimum 50" rule).

**Client-detail tab navigation.** Tabs were reorganized and legacy URLs (`family`→`team`, `services`→`client-services`) are **silently remapped** via `useEffect`, so bookmarks land somewhere other than expected with no notice.

---

## 3. Which screens are inconsistent?

Inconsistency is the audit's dominant finding. It shows up at three levels:

**Navigation paradigms — four different ones.** The main CRM uses a collapsible left sidebar (`AppLayout`). Accounting uses its own permission-gated sidebar. The Portal uses a flat fixed `w-60` sidebar (`PortalLayout`). Settings/Institutions use `AppLayout` + `PageHeader` with navigation embedded in **content cards** (no sidebar of their own). Assessment uses a bespoke `flc-shell` with its own header. A user crossing modules re-learns "where is the menu" each time.

**Design language — Assessment is a visual island.** Assessment renders with custom classes (`flc-shell`, `flc-card`, `flc-cta`, `flc-display`, `flc-chip`) and its own color tokens instead of the shared shadcn/ui components used everywhere else. Buttons, spacing, and type look like a different product.

**Terminology / label ↔ route drift.** Sidebar labels don't match their routes or each other:
- "Knowledge Centre" → `/service-library`; "Knowledge Centre Admin" → `/service-library-admin`
- "Settle Abroad" → `/assessment-admin` (currently hidden behind `SHOW_SETTLE_ABROAD_NAV = false`)
- "Client invoices" (nav) vs `/accounting/ar` (route) vs "Receivables aging" (reports) — three names for one concept.
- Two "Clients" entries (CRM `/clients` and Accounting `/accounting/clients`) with no cue that the accounting one is a read-only mirror synced by `fn_sync_accounting_client`.

**Overlapping / near-duplicate destinations.** Three reconciliation pages that do unrelated things — "Bank reconciliation" (`/accounting/reconciliation`, statement matching), "Report reconciliation" (`/accounting/reports/reconciliation`, trial-balance cross-checks), and "Card reconciliation" (`/accounting/card-reconciliation`). "Finance queue" and "Approvals" both live under the `approvals` nav section. Multiple settings entry points with no unifying home.

**Save models — no two the same.** Field-level debounced autosave (Client Overview), on-blur block autosave (Notes/Address), optimistic toggle (Tasks), explicit dual-button save/convert (Leads), and submit-then-toast dialogs (Portal/Settings). There is **no shared form framework** — most forms are hand-rolled `useState` with ad-hoc validation; react-hook-form/zod appears only in places (e.g. `leadSchemas.ts`). The result is that "how do I know it saved?" has a different answer on every screen.

**Tables — each reinvents or omits the basics.** Filtering, search, sorting, bulk actions, inline edit, and pagination are present in some tables and absent in others with no consistent pattern. Notable gaps: Leads/Cold Pool have a single search box and no status/temperature/branch filters or bulk actions; AP/AR tables compute `PAGE_SIZE`/`totalPages` but **render no pagination controls**, so rows past 15 are unreachable; Portal Files/Payments tables have no search/sort/filter and overflow horizontally on mobile.

---

## 4. Where are users likely to struggle?

**New employees, without training, will most likely fail or hesitate at:**

- **Finding anything in the sidebar.** With 10+ top-level sections and 40+ items (many role-gated so the menu differs per person), plus labels that don't match mental models, wayfinding is slow. This is the first thing every new hire hits.
- **Knowing whether their work saved.** Invisible autosave (only a small "Saving…" text, easy to miss) on high-stakes records trains users to distrust the system or to re-enter data.
- **Completing long forms correctly on the first try.** ~30-field lead form and 20–25-field bill/invoice forms with submit-only validation mean users fill everything, get a generic error, and hunt for the problem field. Conditional required fields (cold vs warm/hot) compound this.
- **Converting a lead** without accidentally doing it (or not realizing they did) — no confirmation, no review, buttons easily confused.
- **Choosing the right accounting destination** for a common task ("where do I verify this payment / approve this bill?") given Finance queue vs Approvals vs inline verification.
- **Reaching data past the first page** of AP/AR tables (no pagination UI) — likely to conclude records are "missing."
- **Portal clients on phones** — file and payment tables with 5–6 columns overflow; the portal sidebar is a fixed `w-60` with no clear mobile collapse.

**Experienced users will struggle with throughput**, not comprehension: no bulk actions or inline edits on high-volume tables means reconciling 20 bills is ~20 round-trips through detail pages; no saved filters/views on Leads, Clients, Institutions, or Course Finder.

**Accessibility** was not deeply audited in Phase 1, but structural signals are middling across the board: icon-only affordances rely on tooltips, validation errors are toast-only (not associated with fields via `aria-describedby`), and color is used to carry status in several tables. This warrants a dedicated pass.

---

## 5. Which improvements will have the biggest productivity impact?

Ordered by impact-to-effort. These are recommendations to *scope*, not changes to make now.

1. **Add a shared form framework + visible save state.** Standardize on react-hook-form + zod with a common field component that shows required markers, inline errors, and a single unambiguous save/saved indicator. This one change removes friction from *every* form in the app and is the root cause behind several separate findings. High impact, medium effort.
2. **Put a confirmation + review step on Lead → Client conversion.** Cheap, and it protects the most important and least reversible workflow in the business. High impact, low effort.
3. **Render pagination controls on AP/AR (and any table with `PAGE_SIZE` logic already present).** The logic exists; only the UI is missing. Users currently cannot reach most of their data. High impact, very low effort.
4. **Standardize the data table.** One table component with search, column sort, a filter bar, optional bulk-select, and responsive overflow — rolled out first to Leads, Clients, AP, AR, Portal Files/Payments. Turns per-row click-throughs into batch operations for power users. High impact, medium effort.
5. **Consolidate & rename accounting navigation.** Merge/clearly separate the three reconciliation pages, clarify Finance queue vs Approvals, add a single Accounting Settings home, and align labels with concepts. High impact, low–medium effort.
6. **Fix label ↔ route drift and duplicate-name confusion app-wide** (Knowledge Centre, Client invoices/AR, the two "Clients"). Low effort, removes a recurring source of "I can't find X."
7. **Break the biggest forms into steps.** Wizardize New Bill/New Invoice and the Lead form (or at minimum group fields into clearly labeled sections with progressive disclosure). Medium effort, high error-reduction.
8. **Bring Assessment into the shared design system.** Retire `flc-*` in favor of shadcn/ui tokens so the funnel stops feeling like a different product. Medium effort, high consistency payoff.

---

## Suggested wave grouping (for a later plan — not yet approved)

- **Wave 1 — high impact, low effort:** render AP/AR pagination; Lead-conversion confirmation; fix label/route drift and duplicate names; add a visible global "saved" indicator.
- **Wave 2 — medium effort:** shared form framework (rhf+zod) rollout; standardized data table; accounting nav consolidation + Settings home.
- **Wave 3 — larger:** wizardize the heaviest forms; unify navigation paradigm across CRM/Portal/Settings/Institutions; migrate Assessment to the design system; dedicated accessibility pass.

---

## Caveats & confidence

- This is a **code-and-docs** audit; no running instance or screenshots were reviewed. Findings about *rendered* behavior (e.g., "pagination controls not rendered," "autosave indicator easy to miss") are inferred from source and should be confirmed with a quick click-through before committing engineering effort.
- Coverage was **broad, not exhaustive** — representative screens per module, not every screen. Digital Success Hub was excluded per scope.
- One claim was corrected during verification: `/accounting/finance-queue` **is** a real, routed page (not a dead link); the issue is overlap/ambiguity with Approvals, not a 404.
- Module scores are directional and intended for prioritization.

*Next step is yours: tell me which of the five questions (or which module) you want to go deep on, and whether to proceed toward a prioritized issue list / design-system recommendations. No changes will be made without your approval.*
