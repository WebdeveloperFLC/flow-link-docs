# Performance Hub — Phase 5R Deploy

## Phase 5R deliverables (offer A/B tests · shared period bar)

| # | Feature | Surface |
|---|---------|---------|
| 5R.1 | Offer A/B experiments O11 | `/performance/offers/ab-tests` — create, start, stats, promote winner |
| 5R.2 | Variant assignment | `fn_assign_offer_ab_variant` + `fn_suggest_offer_for_client` returns `ab_variant_code` |
| 5R.3 | Counselor badge | Client record → Promotions strip shows **A/B · variant** when assigned |
| 5R.4 | Shared period bar X8 | Period Close, Team, Offers studio, Incentive Plans (stacking tab), Performance home |

## Migration

**`20260704120000_incentive_platform_phase5r.sql`**

- Tables: `offer_ab_experiments`, `offer_ab_variants`, `offer_ab_assignments`
- RPCs: `fn_create_offer_ab_experiment`, `fn_start_offer_ab_experiment`, `fn_assign_offer_ab_variant`, `fn_offer_ab_experiment_stats`, `fn_promote_offer_ab_winner`
- Enhanced `fn_suggest_offer_for_client` — assigns running experiment variant before returning suggestion

## Edge functions

No edge function changes in 5R.

## UAT

1. **Create experiment** — Offers studio → A/B tests → pick two live offers → Create draft → Start.
2. **Assignment** — Open a client with a matching suggestion → strip shows **A/B · A** or **B** badge; repeated visits keep same variant.
3. **Stats** — Send/convert offers on assigned clients → stats table updates assignments / sent / conversions.
4. **Promote winner** — After min conversions → Promote winner → experiment completes; non-winner offer archived.
5. **Period bar X8** — Change period on Command Center → Period Close / Team / Offers studio / Plan stacking follow the same period.

## Post–5R (not in scope)

ML propensity (I5), WebSocket I8 ticker, O16 floor price, multi-variant experiments.

## YOUR ACTION

```bash
cd /Users/santoshramrakhiani/Downloads/REPOSITORY/flow-link-docs

npm run ship -- "feat(performance): Phase 5R — offer A/B tests O11 + period bar X8" -- \
  supabase/migrations/20260704120000_incentive_platform_phase5r.sql \
  src/pages/PerformanceOffersAbTests.tsx \
  src/App.tsx \
  src/components/offers/OffersStudioNav.tsx \
  src/components/clients/ClientPromotionsStrip.tsx \
  src/pages/PeriodClose.tsx \
  src/pages/PerformanceTeam.tsx \
  src/pages/PerformanceOffersStudio.tsx \
  src/pages/PerformanceHome.tsx \
  src/pages/IncentivePlans.tsx \
  src/incentives/components/IncentivePlanAssignmentsTab.tsx \
  docs/INCENTIVE_PHASE5R_DEPLOY.md \
  scripts/ship.sh
```

Then: **Supabase SQL editor** → run migration → **Lovable Sync + Publish**.
