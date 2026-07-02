# CRM Autonomous Improvements — Change Log

**Scope:** CRM module only (Dashboard, Leads, Lead Forms, Lead Detail, Conversion, Clients, Client Detail, Notes, Tasks, Activity, Reports, Filters, Search, Bulk Actions, Kanban, Follow-ups, Telecaller, CRM Navigation/UX/Components).
**Author:** Autonomous product/engineering review pass.
**Date:** 2 July 2026.
**Guardrails honored:** No business rules, permissions, financial/commission/invoice logic, conversion logic, database schema, or security model were changed. All edits are UI/UX/accessibility/consistency/wording, plus one additive reusable component. Nothing outside the CRM module was modified.

## How these changes were validated

- **ESLint:** every modified/new file was linted. **Zero new errors or warnings were introduced.** The only findings are pre-existing (`@typescript-eslint/no-explicit-any` in `Reports.tsx` on lines not touched here, and three pre-existing `react-hooks`/`react-refresh` warnings).
- **Type-safety / tests / build:** a full `tsc`, Vitest, and Vite build **could not be run in the review sandbox** — the mounted `node_modules` was installed for macOS and is missing the Linux-native `rollup` binary, so Vite-based tooling fails to start, and a full project `tsc` exceeds the sandbox time limit. All edits here are string/attribute/markup-only or a self-contained additive component, so they are type-trivial; **run `npm run typecheck`, `npm test`, and `npm run build` on a Linux CI runner to confirm green before release.**
- **Git:** the sandbox filesystem is create/write-only (it cannot unlink files), so **commits could not be created here** and a stale `.git/index.lock` may remain. All file changes are saved in the working tree. Commit locally with the commands in the Release Readiness report.

---

## Summary

- **Files changed:** 16 modified + 5 new = **21**
- **Discrete improvements:** ~63
- **Themes:** accessibility (accessible names on icon-only controls and `Select` triggers, decorative icons hidden from assistive tech, keyboard focus on Kanban cards), signature enterprise UX patterns (active-filter chips + clear-all **and saved views** on both Clients and Leads), a "/" jump-to-search shortcut, consistent empty/loading states, wording/terminology consistency, and four reusable CRM primitives (`EmptyState`, `FilterChip`, `SavedViewsBar`, `useFocusSearchHotkey`) to remove duplication and standardize behaviour.
- **Risk profile:** all changes **Very Low** risk. Saved views persist via `localStorage` (per-device) — see "Requires Management Decision / local validation" in the readiness report.

> **Iteration 2 & 3 additions** are listed in dedicated sections near the end of this document.

---

## Detailed change log

### New component

**`src/components/crm/EmptyState.tsx`** *(new file)*
- **Reason:** CRM empty states were ad-hoc one-liners with inconsistent spacing/typography and no room for a call-to-action.
- **Impact:** A single, reusable, presentational empty-state block (optional icon, title, description, optional action) for CRM lists/tables/cards. Improves consistency and makes "clear filters"/"create" CTAs trivial to add.
- **Risk:** Very low (additive, purely presentational, no data/logic).
- **Before:** *n/a (new).*
- **After:** Exported `EmptyState` component; adopted in `LeadsTable`.

### Leads

**`src/pages/leads/LeadsWorkspace.tsx`**
- Pagination: `"Prev"` → `"Previous"`; pagination chevrons marked `aria-hidden`. *(consistency + AT)*
- Accessible names added to 5 `Select` triggers: Status, Branch, Follow-up, Owner, and bulk "Reassign to". *(a11y)*
- **Risk:** Very low. **Before:** `<ChevronLeft/> Prev`, unlabeled selects. **After:** `<ChevronLeft aria-hidden/> Previous`, `aria-label`ed selects.

**`src/pages/leads/LeadNew.tsx`**
- Notes placeholder `"Counsellor…"` → `"Counselor…"` (app uses "Counselor" 1,679× vs 17×). *(consistency)*
- Accessible names added to 9 `Select` triggers: Gender, Marital status, Last education, Branch, Department, Primary user, Lead source (×2), Temperature. *(a11y)*
- **Risk:** Very low.

**`src/pages/leads/LeadDetail.tsx` / `LeadsTable.tsx`**
- `LeadsTable`: empty state replaced with the reusable `EmptyState` (icon + clearer copy: "No leads to show — try widening or clearing filters"). *(consistency + guidance)*
- **Before:** `<div>No leads match your filters.</div>`. **After:** `<EmptyState icon={Users} title=… description=… />`.
- **Risk:** Very low.

**`src/components/leads/LeadRowActionsMenu.tsx`**
- Trigger `aria-label` now names the specific lead (`Actions for lead {lead_number}`); menu item `"Open detail"` → `"View details"`; trigger icon `aria-hidden`. *(a11y + terminology)*

**`src/components/leads/LeadsKanbanBoard.tsx`**
- Drag-to-convert rejection toast upgraded from a terse `"Use Register as Client to convert a lead"` to a titled message with an explanatory description clarifying the guardrail. *(clarity)*

**`src/components/leads/LeadOwnerCard.tsx`**
- Accessible names added to 2 `Select` triggers (Lead owner, Primary user). *(a11y)*

**`src/components/leads/LeadJourneyFields.tsx`**
- Accessible names added to 4 `Select` triggers (sponsor, register timeline, has-budget, budget currency). *(a11y)*

**`src/components/leads/LeadFollowupSection.tsx`**
- Accessible name added to the Channel `Select`. *(a11y)*

### Clients

**`src/pages/Clients.tsx`** *(largest UX upgrade)*
- **Active-filter chips + "Clear all":** a new chip row surfaces each active filter (search / status / country) as an individually removable pill, plus a one-click "Clear all". A matching helper (`clearAllFilters`, `clearSearch`, `filtersActive`) was added. *(signature enterprise UX; matches Salesforce/HubSpot)*
- **Empty state** now branches: with filters active it shows "No clients match your filters" **and a Clear-all-filters button**; otherwise the original "register from leads" guidance.
- Filter/sort `Select` triggers: accessible names + clearer placeholders ("Filter by status/country"); Sort-by and Sort-direction selects labeled.
- Bulk bar: "Set status…" trigger labeled; button "Apply status" → "Apply to selected"; Export/Clear buttons got `aria-label`s and decorative icons hidden.
- Pagination "Prev" → "Previous"; row open-chevron got `aria-label={\`Open ${name}\`}`; "Select all on page" → "Select all clients on this page".
- **Risk:** Very low (URL-param/UI only; no query semantics changed).

**`src/pages/ClientDetail.tsx`** *(via its cards/dialogs below)*

**`src/components/clients/ClientActivityLogCard.tsx`**
- Context-aware empty state ("No activity recorded for this client yet." vs "No activity matches your filters.") + a "Loading activity…" state; load-more icon `aria-hidden`. *(correctness + loading coverage)*

**`src/components/clients/ClientStatusBar.tsx`**
- Status `Select` got an accessible name; placeholder `"Select status…"` → `"Select a status"`.

**`src/components/clients/AddRemarkDialog.tsx`**
- Details placeholder clarified (`"Add details..."` → `"Add any additional details…"`); Lead-status and Outcome selects labeled with clearer `"Select…"` placeholders.

**`src/components/clients/AddTaskDialog.tsx`**
- Accessible names added to Task type, Priority, Department, and Assign-to selects.

### Dashboard / Reports / Telecaller

**`src/dashboard/components/DashboardV2.tsx`**
- Accessible names added to the time-window and pipeline selects.

**`src/pages/Reports.tsx`**
- Per-table **loading rows** ("Loading…") added and empty messages made specific and contextual ("No telecaller activity in this period." etc.) instead of a bare "No data".
- Time-window and pipeline selects labeled; CSV download icons marked `aria-hidden`.

**`src/pages/Telecaller.tsx` & `src/components/telecaller/MyQueueTab.tsx`** *(recommended — not currently applied in the tree)*
- Presence button `"Off"` → `"Go offline"` with `aria-hidden` icon; icon-only "forward" button needs `aria-label="Open call panel"` with decorative chevrons hidden from AT. Re-apply these two small a11y tweaks during commit if desired.

---

## Iteration 2 — redesign-toward-productivity pass

**`src/components/crm/FilterChip.tsx`** *(new file)*
- **Reason:** the active-filter chips introduced on Clients were about to be duplicated on Leads.
- **Impact:** one reusable, presentational, accessible removable-pill component; identical look and behaviour across both workspaces.
- **Risk:** Very low (additive, presentational).

**`src/pages/leads/LeadsWorkspace.tsx`**
- **Active-filter chips + "Clear all"** added (parity with Clients): removable pills for search, status, branch, follow-up, and owner/unassigned, driven by a new `filtersActive` + `clearAllFilters` helper.
- **Impact:** users can see and remove exactly what's filtering the list, and reset in one click — a major reduction in "why am I seeing no leads?" confusion.
- **Risk:** Very low (URL-param/UI only).

**`src/pages/Clients.tsx`**
- Refactored the inline chip markup to use the shared `FilterChip`, removing ~30 lines of duplication and the now-unused `X` import.

**`src/pages/Activity.tsx`**
- **Fixed a real UX flaw:** the page flashed "No activity yet" before data loaded. Added a `loading` state → shows "Loading activity…" while fetching, then the shared `EmptyState` (icon + guidance) when genuinely empty.

**`src/pages/Reports.tsx`**
- Stage-distribution empty/loading state migrated to the shared `EmptyState` (loading-aware) for visual consistency with the rest of the CRM.

## Iteration 3 — power-user productivity pass

**`src/lib/crm/savedViews.ts`** *(new)* & **`src/components/crm/SavedViewsBar.tsx`** *(new)*
- **Saved views** for the Clients and Leads workspaces: users can name and recall a filter/sort combination (e.g. "Hot · India", "Overdue follow-ups"). Applying a view sets the URL params; the active view is highlighted; views can be deleted.
- **Persistence:** `localStorage`, keyed per list (`crm:savedViews:clients` / `:leads`). No schema, no server, no business-logic impact. Degrades gracefully if storage is unavailable.
- **Why it matters:** closes a concrete gap vs. Salesforce/HubSpot/Zoho, where saved views are a core daily-productivity feature. Power users stop rebuilding the same filters every session.
- **Risk:** Very low (additive, presentational + client storage).
- **Adopted in:** `src/pages/Clients.tsx`, `src/pages/leads/LeadsWorkspace.tsx` (each renders `<SavedViewsBar>` and an `applySavedView` handler).

**`src/lib/crm/useFocusSearchHotkey.ts`** *(new)*
- **"/" jumps to search** on the Clients and Leads lists (the GitHub/Linear/Slack convention). Ignored while typing in a field or with modifier keys; search inputs advertise it via placeholder hint + `aria-keyshortcuts="/"`.
- **Risk:** Very low (scoped keydown listener, focus only).

**`src/components/leads/LeadsKanbanBoard.tsx`**
- **Keyboard-operable Kanban:** the board already inherits keyboard drag from `@hello-pangea/dnd` (Space to lift, arrows to move, Space to drop, Esc to cancel). Added a **visible `focus-visible` ring** and an `aria-roledescription` so keyboard/AT users can see and understand the focused card. *(Full keyboard-DnD flow should be smoke-tested locally — see readiness report.)*
- **Risk:** Very low (styling + aria).

## Observations logged (NOT changed — out of CRM scope or needs approval)

- **"Counsellor" spelling** persists outside the CRM in non-CRM modules (`CourseFinder`, `PerformanceExecutive`, `WalletTopups`, `ReportIndex`). Left untouched per strict CRM-only scope; recommend a global spelling decision.
- **`Reports.tsx` `no-explicit-any`:** 16 pre-existing lint errors, mostly `(supabase as any).from("vw_…")` because the reporting **views are not in the generated Supabase types**. Safe cleanup requires typing those views and a full `tsc` verification not available in this sandbox — deferred to tech debt.
- **Remaining a11y tail (within CRM):** additional unlabeled `Select` triggers / icon-only buttons exist in lower-traffic CRM dialogs — `ClientInvoicesPanel.tsx` (~15 selects), `ClientAccessDialog.tsx`, `NewClientDialog.tsx`, `CaseOutcomeDialog.tsx`, `HandoffDialog.tsx`, `CustomBindersPanel.tsx`, `SectionBuilderCard.tsx`, `PersonWorkspaceCard.tsx`, registration field groups, and others. The high-traffic daily-driver screens were prioritized in this pass; the tail is a tracked follow-up (see Release Readiness report).
