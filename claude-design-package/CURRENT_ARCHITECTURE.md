# Current architecture — Performance Hub (descriptive)

> Description only — not a redesign proposal.

## High-level module list

| Module | Route prefix | UI root |
|--------|--------------|---------|
| Performance Hub | `/performance/*` | `src/pages/Performance*.tsx` |
| Incentives desk (legacy paths) | `/incentives/*` | `src/pages/Incentive*.tsx`, re-exports |
| Hub shell | (layout) | `AppLayout` + `PerformanceHubContextBar` |
| Hub components | — | `src/components/performance/*` (73 files) |

Related but **not bundled**: CRM client panels, Supabase data layer, `src/incentives/lib/*` engines.

## Navigation structure

Eight **workspaces** in sidebar (`PERFORMANCE_WORKSPACE_SIDEBAR`):

- Dashboard
- Discounts & Wallets
- Offers & Promotions
- Incentives & Payouts
- Teams & Performance
- Analytics & Reports
- Finance & Profitability
- Administration

Each workspace has **sub-links** (`PERFORMANCE_WORKSPACE_SUB_LINKS`) rendered in `AppLayout` and/or `PerformanceWorkspaceNav`.

Path detection: `isPerformanceHubPath()` in `performanceHubTokens.ts` matches `/performance` and `/incentives`.

## Dashboard hierarchy

```
AppLayout (CRM sidebar — Performance Hub section)
└── [data-performance-hub]
    ├── PerformanceHubContextBar (period, branch, role, theme)
    └── Page content
        ├── PerformanceHome          → /performance           (employee / counselor)
        ├── PerformanceExecutive     → /performance/executive
        ├── PerformanceTeam          → /performance/team      (branch)
        ├── PerformanceCommandCenter → /performance/admin
        ├── PerformanceFinance       → /performance/finance
        └── … workspace-specific CMS & offers pages
```

Legacy `/incentives` routes render inside the same hub shell (`MyIncentives` → `PerformanceHome`).

## User roles

Visibility is computed in `performanceWorkspaceNav.ts` via `isWorkspaceVisible` / `isWorkspaceSubLinkVisible`:

- **counselor** — dashboard + wallets; many admin/finance links hidden
- **manager / administrator** — team, approvals, branch pool
- **director / viewer** — executive, analytics, finance (read-oriented)
- **commission_admin** — incentives & finance-profitability workspaces
- **isAdmin** — unlocks admin-only sub-links (command center, runs, configuration)

Global role source: `AuthContext` (not bundled).

## Layout philosophy

1. **Dual chrome:** CRM `AppLayout` sidebar persists; hub adds scoped paper/card surfaces via `--paper`, `--card` tokens.
2. **Context bar replaces topbar controls** on hub paths (`Topbar` hides role/theme duplicates).
3. **Period context** shared via `PerformancePeriodContext` — pages read selected accounting period + branch.
4. **In-page workspace tabs** (`PerformanceWorkspaceNav`) for dense CMS areas (offers studio, configuration).
5. **Mobile:** `PerformanceMobileQuickBar` + responsive table/list splits (e.g. wallet mobile list).

## Data boundary (for Claude awareness)

Pages import hooks (`usePerformance*`, `useIncentive*`) and lib logic **not included** in this package. Treat data as opaque; focus on component composition and states documented in guides.
