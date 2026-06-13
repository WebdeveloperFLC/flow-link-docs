# Performance Hub — Phase 5V Deploy

## Phase 5V deliverables (counselor O10 · analytics period bar)

| # | Feature | Surface |
|---|---------|---------|
| 5V.1 | Counselor influence O10 | `fn_counselor_offer_influence` — direct / assisted / multi-service for period |
| 5V.2 | Performance home | “Your offer influence (O10)” card with sent / redeemed / wallet spend |
| 5V.3 | Analytics period X8 | `/performance/offers/analytics` — shared `PerformancePeriodBar` drives wallet impact table |

## Migration

**`20260708120000_incentive_platform_phase5v.sql`**

- `fn_counselor_offer_influence(period_key, counselor_id)`

## Edge functions

No edge function changes in 5V.

## UAT

1. **O10 home** — Counselor with wallet discounts in period → home shows direct/assisted/multi/total + activity line.
2. **Empty period** — Card hidden when no offers activity in selected month.
3. **Analytics period** — Change period on Command Center → Offer analytics wallet impact table follows same period.
4. **Cross-check** — Home O10 totals subset of branch-wide influence on analytics (counselor filter).

## Post–5V (not in scope)

ML propensity model, multi-variant A/B, custom WebSocket server.

## YOUR ACTION

```bash
cd /Users/santoshramrakhiani/Downloads/REPOSITORY/flow-link-docs

npm run ship -- "feat(performance): Phase 5V — counselor O10 influence + analytics period" -- \
  supabase/migrations/20260708120000_incentive_platform_phase5v.sql \
  src/pages/PerformanceHome.tsx \
  src/pages/PerformanceOffersAnalytics.tsx \
  src/pages/OffersAnalytics.tsx \
  docs/INCENTIVE_PHASE5V_DEPLOY.md \
  scripts/ship.sh
```

Then: **Supabase SQL editor** → run migration → **Lovable Sync + Publish**.
