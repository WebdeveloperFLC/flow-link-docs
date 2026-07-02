# CRM Module — Product & UX Audit (Phase 2)

**Scope:** CRM only — Leads, lead pipeline, lead create/edit, lead → client conversion, Clients, client workspace, client lifecycle, CRM tasks/notes/activities, CRM dashboards & reporting, and navigation within CRM.
**Excluded:** All other modules (Accounting, Portal, Institutions, Commissions, Assessment, HR, Performance, Calendar, Digital Success Hub).
**Method:** Read-only source review of the routes in `src/AppRoutes.tsx` and the CRM pages/components, cross-checked against `docs/system-map`. No code was modified.
**Date:** 2026-07-01

### A note on "screenshot references"

This pass is code-based; no running instance was available. Every finding therefore cites a **route + file:line** as its evidence anchor in place of a screenshot. Where a screenshot would materially change the assessment (rendered spacing, real overflow, actual click latency), the finding is flagged **[confirm live]**. I can do a Claude-in-Chrome screenshot pass on request to attach annotated images to each item.

### Severity scale

- **Critical** — blocks correct work or risks data/financial integrity; fix before further rollout.
- **High** — significant friction, error risk, or training burden on a daily workflow.
- **Medium** — noticeable friction; fix soon after go-live.
- **Low** — polish; nice to have.

### CRM route map (authoritative, from `AppRoutes.tsx`)

| Route | Page | File |
|---|---|---|
| `/` | Dashboard | `src/pages/Dashboard` → `src/dashboard/components/DashboardV2.tsx` |
| `/leads` | Current Leads (warm/hot) | `src/pages/leads/LeadsList.tsx` |
| `/leads/cold` | Cold Pool | `src/pages/leads/ColdPool.tsx` |
| `/leads/new` | Lead create / client registration | `src/pages/leads/LeadNew.tsx` |
| `/leads/:id` | Lead detail | `src/pages/leads/LeadDetail.tsx` |
| `/clients` | Clients list | `src/pages/Clients.tsx` |
| `/clients/new` | **Redirect** → `/leads/new?register_client=1` | `src/pages/clients/ClientNew.tsx` |
| `/clients/:id` | Client workspace | `src/pages/ClientDetail.tsx` |
| `/activity` | Activity log | `src/pages/Activity.tsx` |
| `/reports` | Reports & analytics | `src/pages/Reports.tsx` |

Conversion logic: `src/lib/convertLeadToClient.ts`. Tab model: `src/components/clients/ClientDetailTabNav.tsx`.

---

## 1. Executive summary

The CRM is functionally deep and, in places, genuinely well built — the **Dashboard (`DashboardV2`) is the strongest screen in the module**: role-aware, with skeletons, error+retry, KPI tooltips, and deep links. The problems cluster in four areas, in priority order:

1. **The lead → client conversion is the weakest high-stakes workflow in the module** — irreversible, one action, no review step, no duplicate guard, and post-conversion side-effects (service enrollment, invoice draft) can fail silently.
2. **Lists are under-powered.** Leads and Clients each have a single search box and (for clients) a sort control, but no status/owner/temperature/country filters, no bulk actions, and no inline actions — so triage and reassignment are slow, per-row, detail-page round-trips.
3. **Save semantics are ambiguous.** The lead form mixes autosave-on-blur with an explicit "Save & View" button and a *separate* "Save follow-up" button; it's easy to lose a scheduled follow-up or to not know whether anything was saved.
4. **The client workspace carries 11 top-level tabs** with mobile labels that collapse to ambiguous single words, and lifecycle/status changes commit without confirmation despite having downstream effects.

None of these are "the CRM is broken" — they are concentrated, fixable friction. The conversion and status-change items are the ones with real business/data risk; the rest are productivity and consistency.

**There is no working pipeline board.** Pipeline/stage data exists but only as read-only charts on the Dashboard and Reports (`DashboardV2.tsx:415`, `Reports.tsx:267`). Leads themselves are managed in a flat table — a notable gap versus every comparator CRM (HubSpot, Salesforce, Odoo all lead with a Kanban).

---

## 2. Findings

Each finding: **Severity · Business impact · Current workflow (evidence) · Recommended workflow · Effort (S <1d / M 1–3d / L >3d) · Change type (UX-only vs business-rule).**

### Navigation & information architecture

#### CRM-01 · Two client-creation paths, both labelled "Lead" — High
- **Business impact:** New staff don't know how to "add a client." `/clients/new` silently redirects into the *lead* form, whose header and labels say "Lead," so users aren't sure whether they created a lead or a client. Drives training questions and mis-created records.
- **Current workflow:** `/clients/new` → `ClientNew.tsx:4-13` rewrites the URL to `/leads/new?register_client=1` and renders `LeadNew`. The empty-state CTAs even point here (`DashboardV2.tsx:626`, `Clients.tsx:183` says "Register clients from Warm, Hot, or Cold leads"). There is no distinct "New client" screen. [confirm live]
- **Recommended workflow:** Keep the single underlying form, but when `register_client=1` set an unambiguous heading ("Register client") and a short mode banner ("You're registering a client from a lead record"). Make the concept — *every client starts as a lead* — explicit in copy rather than implicit in a redirect.
- **Effort:** S · **Type:** UX-only.

#### CRM-02 · CRM nav labels drift from concepts — Medium
- **Business impact:** "Current Leads" vs "Cold Pool" as two separate top-level items (rather than one Leads area with a filter) fragments the mental model; users miss leads that "moved" between them.
- **Current workflow:** `AppLayout.tsx:112-141` lists Cold Pool (`/leads/cold`) and Current Leads (`/leads`) as sibling nav items; they are two pages with near-identical search-only UIs (`ColdPool.tsx`, `LeadsList.tsx`).
- **Recommended workflow:** Present one "Leads" destination with a temperature filter/segment control (All / Cold / Warm / Hot), preserving deep links. Reduces nav items and unifies the list experience.
- **Effort:** M · **Type:** UX-only.

### Leads list & pipeline

#### CRM-03 · No working pipeline / Kanban board — High
- **Business impact:** Managers can't see funnel health or bottlenecks in the working view, and reps can't move a lead through stages by direct manipulation. Every comparator CRM leads with this. Pipeline data already exists — it's just not actionable.
- **Current workflow:** Leads are a flat table (`LeadsList.tsx`). Stage/temperature distribution is visible only as read-only charts (`DashboardV2.tsx:415-456`, `Reports.tsx:267-307`). No drag-to-stage, no per-stage WIP counts in the leads view.
- **Recommended workflow:** Add a Kanban view toggle on `/leads` (columns = stage or temperature), drag-to-advance with optimistic update, per-column counts and overdue badges. Keep the table as the alternate dense view.
- **Effort:** L · **Type:** business-rule (stage transitions, permissions) + UX.

#### CRM-04 · Leads list has no filters, sort, or bulk actions — High
- **Business impact:** Triage is manual. Can't isolate "overdue follow-ups," "unassigned," "hot & no next action," or bulk-reassign when a counselor leaves. Follow-ups get missed; reassignment is per-lead.
- **Current workflow:** `LeadsList.tsx` (and `ColdPool.tsx`) expose a single text search across name/email/phone/lead#; no filter bar, no column sort, no checkboxes/bulk menu, no next-follow-up column. Rows are click-to-open only.
- **Recommended workflow:** Add a filter bar (Temperature, Owner, Status, Branch, Next-follow-up = overdue/today/week, Source), sortable columns, a "next action / due" column, and multi-select with bulk reassign / change-temperature / archive.
- **Effort:** M (L if bulk endpoints don't exist) · **Type:** UX-only for filters/sort; business-rule for bulk mutations.

#### CRM-05 · No inline/quick actions on lead rows — Medium
- **Business impact:** Common daily action ("mark this lead hot," "reassign," "log a call-back") costs a full List → Detail → Edit → Save → Back round-trip (~20–30s each).
- **Current workflow:** Lead table rows navigate to detail on click; there is no row `⋮` menu or inline control.
- **Recommended workflow:** Row overflow menu: Mark Hot/Warm, Reassign, Schedule follow-up, Convert, Archive. One click from the list.
- **Effort:** S–M · **Type:** UX-only (reuses existing mutations).

### Lead create / edit form (`LeadNew.tsx`)

#### CRM-06 · Ambiguous save model — autosave + explicit save + separate follow-up save — High
- **Business impact:** Users don't trust or understand when data is persisted; a scheduled follow-up can be **lost** if they save the lead without first clicking the follow-up's own save. Real data loss on a core action.
- **Current workflow:** Fields autosave on blur (debounced, `LeadNew.tsx:~438-444`) with only a small "Saving…" text (`~799`); a bottom "Save & View" button also exists (`~1095`); the follow-up section has its *own* "Save follow-up" button (`LeadFollowupSection`), and follow-up fields are not part of the main upsert. [confirm live]
- **Recommended workflow:** One save model. Autosave everything (including follow-up) as one unit, with a persistent, unmissable status ("Saved · 2:03 pm" / "Saving…" / "Unsaved — retry"). Remove the separate follow-up save; "Save & View" becomes navigation only.
- **Effort:** M · **Type:** business-rule-lite (fold follow-up into the lead upsert) + UX.

#### CRM-07 · High field density; conditional requirements not signalled — Medium
- **Business impact:** ~30 fields across many cards; cold vs warm/hot have *different* required fields (`leadSchemas.ts`) that only surface as a submit-time toast, so users fill everything then hunt for the missing field. Slows first-time completion and increases abandonment.
- **Current workflow:** Multiple full-width card sections in `LeadNew.tsx`; validation via schema on submit, errors shown as toasts, no scroll-to-error, required markers inconsistent.
- **Recommended workflow:** Group into a short stepper or clearly labelled collapsible sections; show required markers up front; validate inline on blur; on failed submit, scroll to and focus the first error. Show cold-vs-warm required differences before the user switches modes.
- **Effort:** M · **Type:** UX-only.

#### CRM-08 · Cold → warm upgrade loses context — Medium
- **Business impact:** When a cold lead shows interest mid-conversation, upgrading re-renders the form with new required sections; there's no inline preview of what unlocks, and unsaved cold fields are at risk.
- **Current workflow:** `UpgradeColdLeadCard` toggles `mode` to warm/hot and reveals the full form; no confirmation, no preview, autosave-before-upgrade not guaranteed. [confirm live]
- **Recommended workflow:** Autosave current fields before upgrade; reveal new sections as greyed, expandable previews so the user sees what's coming; animate the transition.
- **Effort:** S · **Type:** UX-only.

#### CRM-09 · Visa-lock reason is free text — Low
- **Business impact:** Inconsistent phrasing ("coaching only," "no visa," "not pursuing") makes reporting/filtering on lock reasons unreliable.
- **Current workflow:** Locking visa services reveals a free-text reason input (`LeadNew.tsx`), auto-fills a note template.
- **Recommended workflow:** Replace with a required dropdown (Coaching only / Timeline too short / Not interested / Other → specify).
- **Effort:** S · **Type:** business-rule (enum) if you want structured reporting.

### Lead → Client conversion (`convertLeadToClient.ts`, `LeadDetail.tsx`)

#### CRM-10 · Conversion is irreversible, one-click, with no review or duplicate guard — Critical
- **Business impact:** The single most consequential CRM action. An accidental click creates a client file (and downstream service enrollment + draft invoice) with no confirmation and no easy undo; the same person can be converted twice → duplicate client records and duplicate invoices. Directly touches billing integrity.
- **Current workflow:** `LeadDetail.tsx:~166-170` renders a bare "Register as Client" button → `convertLeadToClient()` runs an atomic sequence (client create, service enrollment, invoice draft, activity log, follow-up task). No pre-flight summary, no similar-client check, no revert path (`converted_to_client_id` is checked only to swap the button for a "Client file" link). [confirm live — verify no confirm dialog is wired above the button]
- **Recommended workflow:** A review modal before commit: name/contact, selected services (with counts), budget, assigned counselor, and a **duplicate warning** if phone/email matches an existing client. Post-commit, offer "View client" and a short grace window / explicit "unlink" path for corrections.
- **Effort:** M · **Type:** business-rule (duplicate detection, revert policy) + UX.

#### CRM-11 · Post-conversion side-effects fail silently — High
- **Business impact:** After "Client file created," service enrollment or auto-draft invoice can fail while the user sees only success; they later discover a client with no pipeline stage or no invoice and redo it manually (~10 min each).
- **Current workflow:** `convertLeadToClient.ts` logs failures of enrollment / invoice draft / background sync but surfaces only the success toast (`LeadDetail.tsx:~114-116`).
- **Recommended workflow:** Return a per-step result and show a summary ("✓ Client · ✓ Services · ✗ Invoice — Retry"), with retry actions. Never report blanket success when a sub-step failed.
- **Effort:** M · **Type:** UX-only (logging already exists).

### Clients list (`Clients.tsx`)

#### CRM-12 · No filters, bulk actions, or inline editing — Medium (High for large books)
- **Business impact:** Everything is a per-client detail-page trip. No bulk reassign/tag/export; no filter by status/country/type; no quick status change. Scales poorly past a few hundred clients.
- **Current workflow:** `Clients.tsx:132-157` — search + sort key + sort direction only. Five columns (`:160-166`), rows are links (`:186-194`), 25/page with prev/next (`:206-214`). Skeletons and empty state are present and good (`:168-185`).
- **Recommended workflow:** Add a filter bar (Status, Country, Application type, Owner), multi-select + bulk actions, and optionally inline status change. Adopt the same standard table as leads (see design standard §6).
- **Effort:** M–L · **Type:** UX-only for filters; business-rule for bulk mutations.

### Client workspace (`ClientDetail.tsx`, `ClientDetailTabNav.tsx`)

#### CRM-13 · 11 top-level tabs; mobile labels collapse to ambiguous words — Medium
- **Business impact:** High cognitive load locating features; on smaller screens tabs render only the first word (`ClientDetailTabNav.tsx:84`, `tab.label.split(" ")[0]`), so "Client Services" → "Client" (collides with the Clients concept), "Forms & Letters" → "Forms," "Team & Access" → "Team." Users click the wrong tab.
- **Current workflow:** `CLIENT_DETAIL_TABS` = 11 items (`:17-29`): Overview, Profile, Client Services, Applications, Documents, Forms & Letters, Payments, Comms, Tasks, Team & Access, Activity Log. Sticky, horizontally scrolling pill bar (`:66-93`).
- **Recommended workflow:** Group into ~5 primary tabs (e.g., Overview · Case [Profile/Services/Applications] · Documents & Forms · Money [Payments] · Activity [Comms/Tasks/Activity/Team]) with secondary nav inside; on mobile use icon + accessible tooltip instead of an ambiguous truncated word. Keep badge counts.
- **Effort:** M · **Type:** UX-only.

#### CRM-14 · Legacy tab URLs silently remap — Low
- **Business impact:** Old bookmarks (`?tab=family`, `services`, `programs`, `setup`) land on a *different* tab with no notice (`resolveClientDetailTab`, `ClientDetailTabNav.tsx:45-54`). Minor disorientation.
- **Current workflow:** Silent remap in code.
- **Recommended workflow:** One-time subtle toast ("'Family' is now under 'Team & Access'") on redirect.
- **Effort:** S · **Type:** UX-only.

### CRM tasks (`ClientTasksCard`, `AddTaskDialog`, `lib/clientTasks.ts`)

#### CRM-15 · No inline quick-add for tasks — Medium
- **Business impact:** Creating a task requires finding the header "Task" button and completing a modal; low task-capture rate vs. an inline quick-add.
- **Current workflow:** Task creation is triggered from a header button (`ClientIdentityHeader.tsx:~407`) opening `AddTaskDialog`; the tasks card has no inline "+ add task" affordance. [confirm live]
- **Recommended workflow:** Inline quick-add row in the tasks card (type title + Enter → creates normal-priority task; edit details after). Keep the full dialog for detailed tasks.
- **Effort:** S · **Type:** UX-only.

#### CRM-16 · Overdue tasks under-emphasised; completion has no save feedback — Medium
- **Business impact:** Overdue items are bucketed but only styled as red text, easy to miss; completing a task optimistically flips the checkbox with no success confirmation, so failed saves can go unnoticed.
- **Current workflow:** `bucketize()` (`lib/clientTasks.ts:~208-217`) separates overdue; `ClientTasksCard.tsx` renders red text (`~75`) but no card-level alert; complete handler (`~41-46,70`) toasts only on error.
- **Recommended workflow:** Card-header overdue badge + row background emphasis; brief success toast / spinner on completion with rollback on failure.
- **Effort:** S · **Type:** UX-only.

#### CRM-17 · "Application mode" task rules are hidden — Medium
- **Business impact:** In application mode, assignee + due date become mandatory and department auto-selects "Immigration" with a 24h due default — but the rule and its rationale aren't shown, so users are blocked or confused inconsistently.
- **Current workflow:** `AddTaskDialog.tsx:~36-67` — `applicationMode` toggles enforcement and presets, with no explanatory UI.
- **Recommended workflow:** Rename to something meaningful ("Tracked task"), show the enforcement reason inline, keep department visible in all modes.
- **Effort:** M · **Type:** business-rule clarification + UX.

### CRM notes / remarks

#### CRM-18 · "Notes" vs "Remarks" overlap; scope unclear — Medium
- **Business impact:** Both flow through `AddRemarkDialog` into `lead_remarks` (`AddRemarkDialog.tsx:~68-80`) even when adding to a client; there's no dedicated client-notes concept, so users can't tell whether a note is lead-scoped or client-scoped. Notes end up in the wrong place or get "lost."
- **Current workflow:** `AddRemarkDialog` accepts `clientId` or `leadId`, writes to `lead_remarks`, and appends a timeline entry for clients. Surfaced via `remark` timeline events.
- **Recommended workflow:** Decide and label the scope. Standardise on one term ("Note"), and if client-scoped notes are needed, give them a first-class home (and, if required, a table). Make scope visible in the UI.
- **Effort:** M · **Type:** business-rule (data model/scope decision) + UX.

### CRM activity / timeline

#### CRM-19 · Activity log filter bar is overwhelming (12 categories) — Low–Medium
- **Business impact:** ~12 inline filter buttons wrap awkwardly and are largely ignored; users scroll the full 50-item page instead.
- **Current workflow:** `ClientActivityLogCard.tsx:~18-116`, `PAGE_SIZE = 50`.
- **Recommended workflow:** Top ~5 filters as a segmented control + "More" dropdown; consistent horizontal-scroll pattern with the timeline card.
- **Effort:** M · **Type:** UX-only.

### Client lifecycle / status

#### CRM-20 · Status changes commit with no confirmation and undocumented side-effects — High
- **Business impact:** Status changes can trigger downstream effects (notifications, accounting-client sync via `fn_sync_accounting_client`, timeline/notify triggers per `flows/clients-crm.md`) yet commit on a single Save with no confirmation or explanation. Accidental or uninformed changes cascade.
- **Current workflow:** `ClientStatusBar.tsx:~19-74` — Select → Save → `clients.status` update + activity log; no confirm modal, no side-effect preview. [confirm live]
- **Recommended workflow:** Confirmation modal showing current → new status and known consequences; require explicit confirm for stage/lifecycle-changing transitions.
- **Effort:** M · **Type:** business-rule (enumerate per-status effects) + UX.

### CRM dashboard (`DashboardV2.tsx`) — mostly a strength

#### CRM-21 · Internal jargon leaks into user-facing copy — Low
- **Business impact:** The header reads "CRM metrics only — Odoo data not included" (`:346`) and a card mentions "during migration" (`:664`). Implementation/migration language confuses end users.
- **Current workflow:** Hardcoded description strings.
- **Recommended workflow:** Replace with user-facing copy; move migration notes to admin-only surfaces.
- **Effort:** S · **Type:** UX-only.

#### CRM-22 · Some KPI cards look clickable but aren't; window fixed at 30 days — Low
- **Business impact:** KPIs with a `to` deep-link (Hot Leads, Clients) navigate; others (Overdue Tasks, Study Permits, Final Programs) don't, so identical-looking cards behave inconsistently. All metrics are hardwired to "last 30 days" with no range control.
- **Current workflow:** `buildOperationsKpis`/`buildExecutiveKpis` set `to` on some items only (`:213-278`); no date-range selector anywhere on the page.
- **Recommended workflow:** Give every KPI a destination (even a filtered list) or visibly de-emphasise non-clickable ones; add a date-range control feeding the queries.
- **Effort:** M · **Type:** UX-only (range control may touch data hooks).

### CRM reporting (`Reports.tsx`)

#### CRM-23 · Reports are fixed-window, non-interactive, no drill-through — Medium
- **Business impact:** Analysts can't change the period, filter, or click a number to see the underlying leads/clients; they export CSV and pivot elsewhere. Limits self-serve insight.
- **Current workflow:** `Reports.tsx:52-76` hardcodes a 30-day window; six tables + charts, per-table CSV export (`:33-39`), a single pipeline selector (`:271-283`); no date picker, no cross-filter, no row → record navigation, no scheduling.
- **Recommended workflow:** Add a global date range + a few shared filters; make table rows/chart segments drill through to filtered lead/client lists; optionally schedule/email a report.
- **Effort:** L · **Type:** UX + data (parameterised queries).

---

## 3. Findings summary table

| ID | Area | Title | Severity | Effort | Type |
|---|---|---|---|---|---|
| CRM-10 | Conversion | Irreversible one-click convert, no review/duplicate guard | **Critical** | M | Biz+UX |
| CRM-03 | Pipeline | No working Kanban/pipeline board | High | L | Biz+UX |
| CRM-04 | Leads list | No filters/sort/bulk | High | M–L | UX(+Biz) |
| CRM-06 | Lead form | Ambiguous save model; follow-up can be lost | High | M | Biz-lite+UX |
| CRM-11 | Conversion | Silent post-conversion failures | High | M | UX |
| CRM-20 | Lifecycle | Status change: no confirm, hidden side-effects | High | M | Biz+UX |
| CRM-01 | Nav | Two creation paths both labelled "Lead" | High | S | UX |
| CRM-12 | Clients list | No filters/bulk/inline edit | Medium | M–L | UX(+Biz) |
| CRM-13 | Workspace | 11 tabs; ambiguous mobile labels | Medium | M | UX |
| CRM-07 | Lead form | Field density; conditional requirements unclear | Medium | M | UX |
| CRM-15 | Tasks | No inline quick-add | Medium | S | UX |
| CRM-16 | Tasks | Overdue under-emphasised; no save feedback | Medium | S | UX |
| CRM-17 | Tasks | Hidden "application mode" rules | Medium | M | Biz+UX |
| CRM-18 | Notes | Notes/remarks overlap; scope unclear | Medium | M | Biz+UX |
| CRM-23 | Reporting | Fixed window, no drill-through | Medium | L | UX+Data |
| CRM-02 | Nav | Cold Pool vs Current Leads split | Medium | M | UX |
| CRM-05 | Leads list | No inline/quick row actions | Medium | S–M | UX |
| CRM-08 | Lead form | Cold→warm upgrade loses context | Medium | S | UX |
| CRM-19 | Activity | 12-filter bar overwhelming | Low–Med | M | UX |
| CRM-22 | Dashboard | Inconsistent clickable KPIs; fixed window | Low | M | UX |
| CRM-21 | Dashboard | Migration jargon in user copy | Low | S | UX |
| CRM-14 | Workspace | Silent legacy tab remap | Low | S | UX |
| CRM-09 | Lead form | Visa-lock reason free text | Low | S | Biz-lite |

---

## 4. Prioritized implementation roadmap

### Wave 1 — high impact, low effort (safety + trust; target: first sprint)
- **CRM-10 (partial):** add the conversion **review + confirm modal** and a duplicate warning. *(Critical; ship the confirmation even before the revert path.)*
- **CRM-11:** surface per-step conversion results instead of blanket success.
- **CRM-06:** single, unmissable save-state indicator on the lead form; fold follow-up into the main save.
- **CRM-01 / CRM-21:** fix "Register client" heading/copy and remove migration jargon.
- **CRM-15 / CRM-16:** inline task quick-add; overdue emphasis + completion feedback.
- **CRM-14:** toast on legacy tab redirect.

### Wave 2 — medium effort (productivity)
- **CRM-04 / CRM-05:** leads filter bar, sortable columns, next-action column, row quick-actions, bulk reassign/temperature.
- **CRM-12:** clients filter bar + bulk actions (via the standard table, §6).
- **CRM-13:** regroup the 11 tabs into ~5; fix mobile labels.
- **CRM-07 / CRM-08:** lead form grouping/stepper, inline validation + scroll-to-error, safer cold→warm upgrade.
- **CRM-17 / CRM-18 / CRM-20:** clarify tracked-task rules; decide notes scope + terminology; add status-change confirmation with side-effect preview.
- **CRM-02:** unify Cold Pool + Current Leads behind a segment filter.
- **CRM-19 / CRM-22:** activity filter simplification; consistent KPI click behaviour + date range.

### Wave 3 — major redesign
- **CRM-03:** the pipeline/Kanban board for leads.
- **CRM-23:** interactive reporting (date range, filters, drill-through, scheduling).
- **CRM-10 (full):** conversion revert/unlink policy and grace window.
- Client-workspace IA redesign built on the design standard (§6).

---

## 5. Quick wins (<1 day each)

1. Conversion **confirm dialog** (title, contact, services, counselor) — the single highest safety-per-effort change (start of CRM-10).
2. Duplicate-client **warning** on the convert action (phone/email match).
3. Lead-form **save-state badge** ("Saved 2:03 pm / Saving… / Unsaved").
4. Fold the follow-up **into the main save** and drop the separate button (CRM-06).
5. **Per-step conversion result** toast/summary (CRM-11).
6. **Inline "+ add task"** on the tasks card (CRM-15).
7. Overdue **card badge + row emphasis** and completion **success toast** (CRM-16).
8. "**Register client**" heading when `register_client=1`; remove "Odoo/migration" jargon from the dashboard (CRM-01, CRM-21).
9. Lead row **quick-action menu** (Mark Hot / Reassign / Schedule follow-up) (CRM-05).
10. Legacy-tab **redirect toast** (CRM-14).

---

## 6. High-impact redesign opportunities

1. **Lead pipeline board (CRM-03).** Turn passive stage charts into a working Kanban with drag-to-advance and per-stage counts. Biggest perceived-modernity and manager-visibility gain in the module.
2. **Unified conversion experience (CRM-10/11).** A guided "Convert lead → client" flow: review → duplicate check → confirm → transparent multi-step result with retries → land in the client workspace. Removes the module's only data-integrity risk.
3. **Power lists (CRM-04/12).** One standard list experience (filters + saved views + sort + bulk) shared by Leads and Clients. Converts per-row detail trips into batch operations.
4. **Client-workspace IA (CRM-13).** Collapse 11 tabs into a ~5-group structure with secondary nav, consistent counts, and real mobile behaviour.
5. **Interactive reporting (CRM-23).** Date range + filters + drill-through so CRM data is self-serve rather than export-and-pivot.

---

## 7. Recommended CRM design standard (template for the wider ERP)

This standard captures the patterns that would resolve most findings above *and* the inconsistencies flagged in the Phase 1 broad audit. It is deliberately built on the stack already in use (React + shadcn/ui + Tailwind tokens) so it can be adopted incrementally, screen by screen.

**7.1 Forms.** One framework: `react-hook-form` + `zod` (already used in `leadSchemas.ts` — generalise it). Every form: required markers on labels; inline, field-level errors (`aria-describedby`); validate on blur, block submit with focus+scroll to the first error; **one** save model per form with a persistent status indicator ("Saved · time / Saving… / Unsaved — retry"). No screen mixes autosave with a competing manual save, and no sub-section has its own hidden save.

**7.2 Data tables/lists.** A single `DataTable` component providing: search, a filter bar, column sort, optional multi-select + bulk-action menu, pagination (with a page-size choice), sticky header, empty/loading/skeleton/error states, and a responsive card fallback below `md`. Leads and Clients are the first adopters; the same component then serves Accounting AP/AR (which need pagination) and the rest of the ERP.

**7.3 Destructive / irreversible actions.** Any create-with-side-effects, delete, or state transition that cascades uses a standard confirmation dialog: what will happen, what's affected, and (where possible) a duplicate/collision warning. Conversion (CRM-10) and status change (CRM-20) are the canonical cases.

**7.4 Multi-step results.** Operations that fan out into sub-steps (conversion, imports, bulk actions) return a per-step outcome and render a checklist summary with retry — never a blanket success toast masking a partial failure.

**7.5 Workspace / tabs.** Cap primary tabs at ~5–6; nest the rest. Show count badges. On mobile use icon + accessible tooltip, never an ambiguous truncated word. Preserve legacy deep links with a one-time, human-readable redirect notice.

**7.6 Terminology & copy.** A shared glossary: one word per concept (Note, not Note/Remark), user-facing labels that match nav routes, and **no** implementation/migration jargon in end-user copy. Labels in the sidebar match the destination's own title.

**7.7 States.** Every async surface ships all four states — loading (skeleton), empty (with a clear next action), error (with retry), and content. `DashboardV2` and `Clients.tsx` are the reference implementations already in the codebase.

**7.8 Feedback & saving.** Optimistic updates always pair with a success confirmation and rollback-on-error. "Did it save?" should never be a question the user has to ask.

**7.9 Visual tokens.** Keep the existing shadcn/Tailwind token system (spacing, `shadow-elev-*`, radius, brand colours, `StatCard`/`Card` primitives). The goal is consistent *application* of these tokens, not a new palette — status colour must not be the only signal (pair with icon/text for accessibility).

Adopting §7.1, §7.2, §7.3 and §7.7 first would neutralise the majority of both this CRM audit and the Phase-1 cross-module findings, and gives every other module a ready-made pattern library.

---

## 8. Caveats & confidence

- Code-based audit; no live instance. Items tagged **[confirm live]** (CRM-01, 06, 08, 10, 15, 20) should be verified with a short click-through before build — I can attach annotated screenshots via a Chrome pass on request.
- Coverage is comprehensive for the named CRM surface (leads, conversion, clients, workspace, tasks/notes/activity, dashboard, reporting, nav). Adjacent-but-excluded areas (Telecaller dialer, Messages/WhatsApp inbox, Course Finder) were noted only where they intersect CRM navigation.
- A few finding details (e.g., exact conversion sub-steps, `ClientStatusBar` save path) come from focused reads of the cited files; line numbers are anchors, not guarantees against subsequent edits.
- Effort estimates are engineering-rough (S <1d, M 1–3d, L >3d) and assume the design standard components are built once and reused.

*No code was changed. Awaiting your approval before any implementation — and happy to start with the Wave 1 quick wins or a live screenshot pass, whichever you prefer.*
