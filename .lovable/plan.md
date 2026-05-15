
# Phase 9 — Tax, Compliance, Settings, Final Polish

All work stays inside `src/accounting/` plus the existing `AppLayout` sidebar (sidebar gets a tiny "Settings" subgroup; no CRM files touched). Existing accounting pages (`AccountingTaxPage`, `AccountingNoticesPage`, `AccountingTaxCalendarPage`) currently render "Coming soon" placeholders — those are the ones we replace, so no duplicate routes.

## 1. Tax dashboard — replace `AccountingTaxPage`

- **Header**: title, entity selector reuse, "New filing" button.
- **4 KPI cards** (`AccountingKPICard`): Filed this period, Outstanding, Overdue, Upcoming (next 30 days). Computed from mock filings.
- **Filing status table** (AG Grid via `AccountingAGGrid`):
  - Columns: Entity, Tax type, Period, Amount, Due date, Status, Actions.
  - Status pills: `FILED` (success), `OPEN` (muted), `LATE` (destructive), `DUE_SOON` (warning) — via `AccountingStatusBadge`.
  - Seeded rows: Canada GST/HST Q1–Q4, India GSTR-3B Apr–Mar (12 monthly), India TDS Q1–Q4, USA Sales Tax Q1–Q4 — across the multi-entity seed.
  - Action menu: Mark filed, Upload return, View notice (with confirm dialogs for destructive ops).
- **Upcoming deadlines timeline** (next 90 days): vertical list grouped by week, using semantic tokens; click → opens filing.
- Filters: entity, tax type, status, period.

## 2. Compliance notices — replace `AccountingNoticesPage`

- **List** (AG Grid): authority, notice number, date issued, due date, amount, status badge (`OPEN` / `RESPONDED` / `CLOSED`), linked document name, actions.
- **"Add notice" dialog** (`AddNoticeDialog.tsx`): authority (free text + suggested), notice number, dates, amount + currency, status, optional linked-document upload stub, notes.
- **Detail drawer**: timeline of responses, attachments, change-status action with confirm dialog.
- Filters: authority, status, entity.
- Empty state when no notices.

## 3. Users & roles — `pages/settings/AccountingUsersPage.tsx` (route `/accounting/settings/users`)

- **Table**: avatar/initials, name, email, role badge, entity scope (chips), MFA on/off, last login, status (Active/Suspended), actions (Edit, Resend invite, Suspend → confirm dialog).
- **Invite dialog** (`InviteUserDialog.tsx`): email, role select with descriptions, multi-entity scope select, send invite.
- **Role badge colors** (added to a small `roleStyles.ts` map using semantic tokens with named hues): SUPER_ADMIN purple, FINANCE_ADMIN blue, ACCOUNTANT teal, AUDITOR amber, FINAL_AUDITOR orange, BRANCH_MANAGER green, COMPLIANCE_OFFICER slate, VIEWER gray.
- Backed by `mockAccountingUsers.ts` — unlimited entries, free-form add.

## 4. Entity settings — `pages/settings/AccountingEntitiesPage.tsx` (route `/accounting/settings/entities`)

- Replaces the in-memory `accountingEntityStore` SEED with a configurable store (`accountingEntitiesStore.ts`, `useSyncExternalStore` pattern, persisted to localStorage). Provider keeps reading from the store so the entity switcher updates live.
- **Tree view**: company → branches → sub-branches (recursive, expand/collapse). Shows: name, country flag (emoji), currency, fiscal year start, tax IDs (multiple).
- **Add entity / Edit entity dialog**: name, type (Company/Branch/Sub-branch/Brand), parent, country, currency, fiscal year start (MM-DD), unlimited tax IDs (chip input).
- **No artificial limits** — flat array, free add/edit/delete (delete with confirm dialog).

## 5. Global polish

Shared primitives added under `src/accounting/components/shared/`:

- `AccountingBreadcrumbs.tsx` — auto-builds from route, rendered in a small `AccountingPageShell` wrapper that already-built pages opt into via existing `AccountingPageHeader` (we extend `AccountingPageHeader` with an optional `breadcrumbs` prop so other pages don't need rewrites).
- `AccountingErrorState.tsx` — icon, message, Retry button.
- `AccountingTableSkeleton.tsx` — replaces spinners across new pages.
- `ConfirmDialog.tsx` — generic destructive-action confirm (used for delete/void/reject/suspend on new pages; existing pages can adopt incrementally).
- `useKeyboardShortcuts.ts` — global hook mounted in new pages: `N` (new journal — navigates from journals list), `/` (focus first `[data-search]` input), `Esc` (already native to Radix dialogs; we add a no-op safety).
- `DarkModeToggle.tsx` — placed in a new lightweight `AccountingTopbar` slot inside `AccountingPageHeader` (right side). Toggles `document.documentElement.classList.toggle('dark')`, persists to `localStorage('accounting:theme')`. AG Grid already reacts to the `dark` class.
- `OnboardingChecklist.tsx` — rendered on `AccountingOverviewPage` only when `localStorage('accounting:onboarded')` is unset and entities/COA/etc. counts are zero. 5 items: Add first entity, Set up COA, Upload bank statement, Invite accountant, Configure tax codes — each links to the relevant page; dismissable.
- **Responsive**: new tables get a `useIsMobile()` branch rendering a stacked card list instead of AG Grid; sidebar mobile drawer is out of scope (CRM-owned `AppLayout`); we will only ensure new accounting pages reflow at `<768px`.
- **Empty states**: every new table/list uses existing `AccountingEmptyState`.

## 6. Sidebar additions

Append to `accountingNav` in `AppLayout.tsx`:
- `/accounting/settings/entities` — "Entities"
- `/accounting/settings/users` — "Users & roles"

(Two entries only; CRM nav untouched.)

## File map

```text
src/accounting/
  types/
    tax.ts                       NEW (Filing, Notice, TaxStatus)
    accountingUsers.ts           NEW
    settings.ts                  NEW (extended Entity with parentId, fiscalStart, taxIds[])
  data/
    mockTax.ts                   NEW (filings + upcoming deadlines)
    mockNotices.ts               NEW
    mockAccountingUsers.ts       NEW
  stores/
    accountingEntitiesStore.ts   NEW (configurable, persisted)
    onboardingStore.ts           NEW
    themeStore.ts                NEW
  components/
    shared/
      AccountingBreadcrumbs.tsx  NEW
      AccountingErrorState.tsx   NEW
      AccountingTableSkeleton.tsx NEW
      ConfirmDialog.tsx          NEW
      DarkModeToggle.tsx         NEW
      OnboardingChecklist.tsx    NEW
      AccountingPageHeader.tsx   EDIT (breadcrumbs + topbar slot)
    tax/
      FilingStatusBadge.tsx      NEW
      UpcomingDeadlinesTimeline.tsx NEW
      AddNoticeDialog.tsx        NEW
    settings/
      InviteUserDialog.tsx       NEW
      RoleBadge.tsx              NEW
      EntityTree.tsx             NEW
      EntityFormDialog.tsx       NEW
  hooks/
    useKeyboardShortcuts.ts      NEW
  pages/
    AccountingOverviewPage.tsx   EDIT (mount OnboardingChecklist)
    tax/AccountingTaxPage.tsx    REPLACE
    tax/AccountingNoticesPage.tsx REPLACE
    settings/AccountingUsersPage.tsx     NEW
    settings/AccountingEntitiesPage.tsx  NEW
  stores/accountingEntityStore.ts EDIT (read from accountingEntitiesStore)

src/App.tsx                      EDIT (2 new routes)
src/components/layout/AppLayout.tsx EDIT (2 new sidebar items)
```

No CRM files modified. No new top-level modules. All existing accounting routes preserved.
