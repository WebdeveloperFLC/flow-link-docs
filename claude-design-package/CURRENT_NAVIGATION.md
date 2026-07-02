# Current navigation — Performance Hub

## Menu hierarchy

### CRM sidebar (AppLayout)

Single collapsible group **"Performance Hub"** listing visible workspaces from `visiblePerformanceWorkspaceSidebar()`.

Each workspace item links to its primary route (e.g. Discounts → `/performance/wallets`).

Expanded sub-links render under the active workspace (see `renderPerformanceWorkspaceLinks` in `LAYOUT/AppLayout.tsx`).

### Eight workspaces → primary routes

| Workspace | Primary route | Icon family |
|-----------|---------------|-------------|
| Dashboard | `/performance` | LayoutGrid |
| Discounts & Wallets | `/performance/wallets` | Wallet |
| Offers & Promotions | `/performance/offers` | Megaphone |
| Incentives & Payouts | `/performance/incentives/payouts` | Banknote |
| Teams & Performance | `/performance/team` | Users |
| Analytics & Reports | `/performance/analytics` | BarChart2 |
| Finance & Profitability | `/performance/finance` | Coins |
| Administration | `/performance/configuration` | Settings |

Icons are **lucide-react** components assigned in `ROUTES/performanceWorkspaceNav.ts`.

## Key routes (dashboard flow)

### Dashboard workspace

| Route | Label | Audience |
|-------|-------|----------|
| `/performance` | My performance | All |
| `/performance/executive` | Executive overview | director, viewer, admin |
| `/performance/finance` | Finance overview | admin |
| `/performance/admin` | Command center | admin |
| `/performance/how-it-works` | How it works | All |

### Incentives & rewards

| Route | Label |
|-------|-------|
| `/performance/incentives/payouts` | Ledger & liability |
| `/performance/incentives/plans` | Incentive plans (admin) |
| `/incentives/competitions` | Competitions / rewards |
| `/incentives/payouts` | Payout desk |
| `/incentives/admin` | Runs |

### Wallets & claims context

| Route | Label |
|-------|-------|
| `/performance/wallets` | My wallets |
| `/performance/give-discount` | Give discount |
| `/performance/offers/analytics` | Offer ROI / claims analytics |

Full route table: `ROUTES/AppRoutes.tsx` (search `/performance` and `/incentives`).

## User entry points

| Entry | Path |
|-------|------|
| Sidebar → Performance Hub → Dashboard | `/performance` |
| Legacy "My Incentives" | `/incentives` → same home |
| Deep link executive | `/performance/executive` |
| Deep link branch manager | `/performance/team` |
| Offers studio | `/performance/offers` |
| Admin configuration | `/performance/configuration` |

## Redirects

- `/offers-admin` → `/performance/offers/library`
- `/incentives/give-discount` → `/performance/give-discount`

## Role gating pattern

Sub-links may specify `adminOnly`, `roles: [...]`, or `hideFromCounselor`. Counselors see a reduced subtree (e.g. no branch pool, no offers studio admin tabs).
