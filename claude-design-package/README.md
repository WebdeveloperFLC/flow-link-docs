# Claude UX Design Package — Performance Hub

**Temporary folder.** Delete `claude-design-package/` after the design exercise. Regenerate anytime:

```bash
node scripts/build-claude-design-package.mjs
```

## Purpose

Curated **UI-only** snapshot of Future Link Consultants **Performance Hub** (`/performance/*`, `/incentives/*`) for Claude (or Figma) UX redesign. No database, services, migrations, or secrets.

## Project overview

Single React SPA (Vite + TypeScript + Tailwind + shadcn/ui) for an international education consultancy CRM. Performance Hub unifies **cash incentives**, **discount wallets**, and **offers/promotions** under one shell with period-first navigation.

## Current architecture (summary)

- **Shell:** `AppLayout` detects hub paths → `data-performance-hub` wrapper + `PerformanceHubContextBar`
- **Workspaces:** 8 sidebar areas (see `CURRENT_NAVIGATION.md`)
- **Dashboards:** Employee (`/performance`), Executive (`/performance/executive`), Branch (`/performance/team`), Admin (`/performance/admin`), Finance (`/performance/finance`)
- **Roles:** counselor, manager, director, viewer, commission_admin, administrator (see `CONSTITUTIONS/system-map/05-roles-and-permissions.md`)

## Design philosophy (as built)

1. **Period-first** — global period + branch selector in context bar
2. **Module accents** — cash (green), wallet (amber), offers (red) via `.ph-module-*` tokens
3. **Workspace sidebar** — business-oriented grouping, not legacy Incentives/Wallet/Offers silos
4. **shadcn primitives** — cards, tables, dialogs; hub adds `.ph-*` scoped utilities
5. **Prototype gaps documented** — see `CONSTITUTIONS/guides/performance-hub-prototype-gaps.md` for target UX not yet built

## Folder contents

| Folder | Contents |
|--------|----------|
| `PERFORMANCE_HUB/pages/` | All Performance & Incentive page components |
| `LAYOUT/` | App shell, hub context bar, period bar, notifications |
| `COMPONENTS/` | Hub widgets, shadcn/ui, theme, offers, incentives tabs |
| `ROUTES/` | `AppRoutes.tsx`, `performanceWorkspaceNav.ts` |
| `STYLES/` | Tailwind, global CSS, hub theme tokens |
| `DESIGN_SYSTEM/` | Pointer to shadcn + token files |
| `CONSTITUTIONS/` | Governance, guides, architecture, diagrams |
| `CURRENT_UI_ANALYSIS/` | **UI critique** — strengths, weaknesses, opportunities |
| `COMPETITOR_REFERENCE/` | Quality bar (Stripe, Linear, SAP Fiori, etc.) + screenshot folder |
| `SAMPLE_DATA/` | Demo data & tester quickstart (docs) |
| `SCREENSHOTS/` | Empty — add captures before Claude session |
| `ASSETS/` | Public placeholders |
| `ICONS/` | lucide-react note (no local icon pack) |

Also read: `DESIGN_SCOPE.md`, `CURRENT_ARCHITECTURE.md`, `CURRENT_NAVIGATION.md`, `CURRENT_THEME.md`, `CURRENT_COMPONENTS.md`, `CURRENT_UI_ANALYSIS/CURRENT_UI_ANALYSIS.md`, `UX_EXPECTATIONS.md`, `BUSINESS_CONTEXT.md`, `PACKAGE_SUMMARY.md`.

## How Claude should use this package

1. Read `BUSINESS_CONTEXT.md` and `UX_EXPECTATIONS.md` first.
2. Read `CURRENT_UI_ANALYSIS/CURRENT_UI_ANALYSIS.md` — known UI problems are already documented.
3. Review `COMPETITOR_REFERENCE/QUALITY_BENCHMARKS.md` (+ screenshots if provided) for craft level.
4. Read `DESIGN_SCOPE.md` and `CONSTITUTIONS/guides/performance-hub-prototype-gaps.md`.
2. Respect **workspace nav** and **role visibility** in `ROUTES/performanceWorkspaceNav.ts` — do not invent new top-level modules without mapping.
3. Use `CURRENT_THEME.md` tokens; extend `.ph-*` patterns rather than replacing shadcn wholesale.
4. Propose **UI/layout/copy** only — backend, RLS, and engine behavior are out of scope.
5. Compare against `CONSTITUTIONS/guides/FutureLink_PerformanceHub_FULL REVISED.jsx` for aspirational layout ideas.
6. Do **not** assume files compile standalone; imports point at full repo paths for reference.

## Excluded (intentionally)

Supabase migrations/SQL, `src/incentives/lib/*` business logic, hooks, CAE/FOE/EWE platform code, tests, `.env`, `node_modules`, build output.
