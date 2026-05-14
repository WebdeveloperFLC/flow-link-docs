
# Accounting Module — Additive Build Plan

100% additive. Only **two existing files** are modified: `src/components/layout/AppLayout.tsx` (sidebar) and `src/App.tsx` (router). Everything else lives in `src/accounting/`.

## Confirmed file targets

- Sidebar: `src/components/layout/AppLayout.tsx`
- Router: `src/App.tsx`
- Layout wrapper for authenticated pages: `AppLayout` rendered inside each accounting page (matches existing pattern e.g. `Clients`, `Dashboard`)
- Auth gate: existing `<ProtectedRoute>` from `src/components/ProtectedRoute.tsx`
- Design tokens: `src/index.css` + `tailwind.config.ts` (HSL semantic tokens — no hardcoded colors)

## Decisions locked from clarifications

- **State**: React Context (no Zustand dep added). `accountingEntityStore.ts` exports a `<AccountingEntityProvider>` + `useAccountingEntity()` hook with the same shape (activeEntity, availableEntities, fiscalYear, quarter, setActiveEntity).
- **Colors**: All colors map to HSL semantic tokens. Status pill palette is centralized in `AccountingStatusBadge` using `bg-muted`, `bg-primary/10 text-primary`, `bg-destructive/10 text-destructive`, plus a small set of new semantic tokens added to `index.css` + `tailwind.config.ts` under `--accounting-success`, `--accounting-warning`, `--accounting-info` (additive only — no existing tokens changed). Recharts strokes/fills use `hsl(var(--primary))`, `hsl(var(--destructive))`, etc.

## Step 1 — Sidebar

Edit `src/components/layout/AppLayout.tsx`:
- Extend the existing `nav` array shape with optional `section?: string` and a divider sentinel, OR render Accounting as a second mapped block beneath the current nav with a divider + label.
- Section label styling matches existing token system (`text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/60 px-3 py-2`) plus a `border-t border-sidebar-border my-2` divider above it.
- Append 14 NavLinks reusing the **exact same `NavLink` className** as existing items (active = `bg-sidebar-accent text-sidebar-accent-foreground shadow-elev-sm`).
- Icons: `LayoutDashboard, BookOpen, Layers, Users, ArrowDownCircle, ArrowUpCircle, ScanLine, CheckSquare, BarChart2, Receipt, ShieldAlert, GitMerge, PieChart, Sparkles` — all already available from lucide-react.
- No role gating (visible to all signed-in users); can be tightened later.

## Step 2 — Router

Edit `src/App.tsx`:
- Add 27 new `<Route>` entries inside the existing `<Routes>`, each wrapped with `<ProtectedRoute>` (matches `/clients`, `/dashboard` pattern).
- Lazy-import accounting pages at the top of `App.tsx` to keep bundle hygiene (`import AccountingOverviewPage from "./accounting/pages/AccountingOverviewPage"` etc.).
- Wrap the whole `<Routes>` subtree's accounting paths' children (the page components themselves) so the Provider is mounted only when needed: add `<AccountingEntityProvider>` *inside* each accounting page's top-level component, OR mount the provider once around the accounting routes via a tiny `AccountingShell` wrapper. Plan: mount `AccountingEntityProvider` inside each page (cheap, isolated, no router restructuring needed).

Route → component map: exactly the 27 routes you listed (Overview, journals/new/:id, coa, owners/:id/wealth-summary, ap, ar, documents/upload/ocr, approvals/:id, reports/pl/bs/cashflow/consolidated, tax/calendar/notices, fraud, reconciliation, ai-assistant, wealth).

Note: `/accounting/owners/wealth-summary` and `/accounting/wealth` both → `AccountingWealthPage` (per spec).

## Step 3 — Folder structure

Create `src/accounting/` with the exact tree from your spec:
- `components/shared/` (4 files)
- `data/` (4 mock files — minimal seed data)
- `lib/` (`format.ts`, `crmBridge.ts`)
- `stores/accountingEntityStore.ts` (Context implementation)
- `pages/` (overview + 12 subfolders, 27 page files total)

## Step 4 — Shared components

All wrap children in semantic-token classes:
- `AccountingPageHeader` — flex header, `h1` matches existing CRM page titles (`text-2xl font-semibold tracking-tight`), subtitle `text-[13px] text-muted-foreground mt-0.5`.
- `AccountingEmptyState` — centered, icon `text-muted-foreground/40`, title `text-[15px] font-medium text-foreground`, description `text-[13px] text-muted-foreground`.
- `AccountingStatusBadge` — switch on status; uses semantic-token classes (e.g. `bg-muted text-muted-foreground` for DRAFT, `bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400` style mapped to the new accounting tokens).
- `AccountingKPICard` — matches existing `Dashboard` stat cards (will inspect Dashboard.tsx during implementation): `rounded-xl border border-border bg-card p-5 shadow-sm` shell, label small/muted, value `text-2xl font-semibold`, delta colored by `deltaDirection`.

## Step 5 — Format helpers

`src/accounting/lib/format.ts` as specified. **Adds `decimal.js`** as a new dependency (lightweight, no existing conflict).

## Step 6 — CRM Bridge (read-only)

`src/accounting/lib/crmBridge.ts`:
- `getCRMClients()` → async, queries `supabase.from('clients').select('id,name,email,phone,country')` and returns the array. (Project uses Supabase, not a local store, so this is the right read path.)
- `getCRMVendors()` → returns `[]` with `// Wire when CRM vendor module exists`.
- `getCRMDeals()` → returns `[]` with `// Wire when CRM deals module exists`.

## Step 7 — Entity "store" (Context)

`src/accounting/stores/accountingEntityStore.ts` exports:
- `AccountingEntity` type
- `AccountingEntityProvider` (seeded with the 5 entities you listed)
- `useAccountingEntity()` returning `{ activeEntity, availableEntities, fiscalYear, quarter, setActiveEntity }`
- Persists `activeEntity.id` to `localStorage` under `accounting:activeEntityId` so navigation between pages keeps selection.

## Step 8 — Overview page (full build)

Built exactly as specified, with these token swaps:
- Bar fill `hsl(var(--primary))` instead of `#2563eb`
- Line strokes `hsl(var(--primary))` and `hsl(var(--destructive))`
- Grid `hsl(var(--border))`
- Dot colors in alert rows use the new `--accounting-success/warning/danger/info` tokens
- "Future Link Flow" pill uses `bg-primary/10 text-primary`
- Quick-action card icons `text-primary`
- All layout, spacing, copy, KPI numbers, chart data points, row contents, and route targets match your spec exactly
- Recharts is **already installed** (used in `src/components/ui/chart.tsx`) — no new dep.

Wraps content in `<AppLayout>` like other CRM pages. Mounts `<AccountingEntityProvider>` at the top.

## Step 9 — Stub pages (26)

Each remaining page renders `<AppLayout>` → `<AccountingPageHeader>` + `<AccountingEmptyState icon={UniqueIcon} title="Coming soon" description="This module will be built in the next phase." />`. Unique icon per stub from the lucide-react set (Receipt, FileText, ListTree, UserCircle, Wallet, FileInput, FileScan, ListChecks, FileBarChart, ScrollText, ShieldCheck, ArrowLeftRight, Bot, Calendar, BellRing, etc.).

## Dependencies added

- `decimal.js` (new)
- No other new deps (recharts already present, lucide-react already present, no Zustand)

## Files modified (exactly 2)

1. `src/components/layout/AppLayout.tsx` — append divider + label + 14 NavLinks
2. `src/App.tsx` — import 22 page components, register 27 routes

## Files created (~46)

- 4 shared components
- 4 mock data files
- 2 lib files (`format.ts`, `crmBridge.ts`)
- 1 entity store/provider
- 27 page files (1 full Overview + 26 stubs)

## Post-build verification I will run

1. Confirm only 2 existing files modified via diff summary
2. Build/typecheck via harness auto-run
3. Note new file count
4. Visit `/accounting` in preview — confirm Overview renders with KPIs, both charts, all four bottom cards, quick actions
5. Spot-check 3 existing routes (`/`, `/clients`, `/settings/email-smtp`) still render
6. Walk all 14 new sidebar links — confirm each loads (full page or stub) without console errors

