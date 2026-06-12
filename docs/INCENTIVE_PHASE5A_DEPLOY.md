# Performance Hub — Phase 5A Deploy

Deploy: **GitHub → Lovable → Publish** (no migration)

## Phase 5A deliverables

| # | Feature | Where |
|---|---------|--------|
| 5A.1 | Unified sidebar **Performance Hub** | Replaces Incentives + Wallet + Offers groups |
| 5A.2 | Counselor home (prototype-aligned) | `/performance` and `/incentives` |
| 5A.3 | Three-module color system | Emerald cash · Amber wallet · Violet offers |
| 5A.4 | Cross-module discount impact banner | Wallet allocations → incentive base |
| 5A.5 | Admin command center shell | `/performance/admin` — workflow + tool links |
| 5A.6 | Give discount CTA | Primary action on counselor home |

## Design tokens

See `src/lib/performanceHubTheme.ts` — aligned with [Claude prototype v1](https://claude.ai/public/artifacts/52ced69e-84cb-4f6f-b905-c3fa5314d157).

## Routes

| Route | Page |
|-------|------|
| `/performance` | PerformanceHome |
| `/performance/admin` | PerformanceCommandCenter |
| `/incentives` | Same as PerformanceHome (alias) |
| `/incentives/*` | Unchanged admin tools |

## UAT checklist

1. Sidebar shows single **Performance Hub** section (not three groups).
2. **My performance** — target %, wallet spendable/unlocked/potential, cash projected/locked.
3. **Give discount** button works.
4. Discount impact banner when wallet allocations exist.
5. Revenue mix + leaderboard render with qualifying data.
6. **Command center** — workflow links open correct legacy pages.

## Next (5B — not in this deploy)

- Hard wallet unlock block on Give Discount
- Auto wallet sizing from rules
- KPI tiles on command center
- Client promotions strip on client record
- Full prototype tabs (branch manager, client view)

## Depends on

- Incentive Phases 0–4 deployed
- Wallet / offers modules live
