# Performance Hub — Phase 5X Deploy

## Phase 5X deliverables (multi-variant A/B · O11b)

| # | Feature | Surface |
|---|---------|---------|
| 5X.1 | Multi-variant create RPC | `fn_create_offer_ab_experiment_multi` — 2–5 offers, codes A–E |
| 5X.2 | Balanced assignment | `fn_assign_offer_ab_variant` — picks variant with fewest assignments |
| 5X.3 | Backward compat | `fn_create_offer_ab_experiment` delegates to multi RPC |
| 5X.4 | A/B tests UI | Dynamic variant rows (add/remove up to 5) on `/performance/offers/ab-tests` |

## Migration

**`20260710120000_incentive_platform_phase5x.sql`**

- Relax `offer_ab_variants.variant_code` to A–E
- `fn_create_offer_ab_experiment_multi`
- Updated `fn_assign_offer_ab_variant`

No edge function changes in 5X.

## UAT

1. **Create 3-variant test** — Offers studio → A/B tests → add Variant C → create draft → start.
2. **Assignment balance** — Open several client records; Promotions strip shows A/B/C badge; assignments spread evenly.
3. **Promote winner** — After min conversions on one variant → promote → winner active, others archived.
4. **Legacy two-variant** — Still works via old RPC path (used by any scripts calling `fn_create_offer_ab_experiment`).

## Post–5X (not in scope)

ML propensity model (D4), custom WebSocket server, weighted variant traffic splits.

## YOUR ACTION

```bash
cd /Users/santoshramrakhiani/Downloads/REPOSITORY/flow-link-docs

npm run ship -- "feat(performance): Phase 5X — multi-variant A/B tests O11b" -- \
  supabase/migrations/20260710120000_incentive_platform_phase5x.sql \
  src/pages/PerformanceOffersAbTests.tsx \
  src/pages/PerformanceHowItWorks.tsx \
  docs/INCENTIVE_PHASE5X_DEPLOY.md \
  scripts/ship.sh
```

Then: **Supabase SQL editor** → run migration → **Lovable Sync + Publish**.
