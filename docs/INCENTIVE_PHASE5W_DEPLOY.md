# Performance Hub — Phase 5W Deploy

## Phase 5W deliverables (readiness gate · batch UAT wrap)

| # | Feature | Surface |
|---|---------|---------|
| 5W.1 | Hub readiness RPC | `fn_performance_hub_readiness_check(period_key)` — queues, intelligence, period state |
| 5W.2 | Command center | Hub readiness card — blockers + offers intelligence counts |
| 5W.3 | How it works | Intelligence layer section (5Q–5V features + links) |
| 5W.4 | Batch UAT doc | `docs/INCENTIVE_PHASE5_BATCH_UAT.md` — sign-off checklist 5Q–5W |

## Migration

**`20260709120000_incentive_platform_phase5w.sql`**

- `fn_performance_hub_readiness_check`

No edge function changes in 5W.

## UAT

1. **Readiness RPC** — `select fn_performance_hub_readiness_check('2026-06');` returns queues + `ready_for_period_lock`.
2. **Command center** — Card shows blockers when approvals/unclassified pending.
3. **Batch UAT** — Walk `INCENTIVE_PHASE5_BATCH_UAT.md` end-to-end; sign off before production cutover.

## Performance Hub phase map (5Q–5W)

| Phase | Theme |
|-------|--------|
| 5Q | Cross-sell journeys, O13 suggestion, I8 poll |
| 5R | A/B tests O11, shared period bar X8 |
| 5S | Margin floor O16 |
| 5T | Propensity I5, realtime I8 |
| 5U | Service floors O16b, WIR lite |
| 5V | Counselor O10, analytics period |
| 5W | Readiness gate, batch UAT wrap |

## Post–5W (not in scope)

ML propensity, multi-variant A/B, Phase 6+ items from implementation map.

## YOUR ACTION

```bash
cd /Users/santoshramrakhiani/Downloads/REPOSITORY/flow-link-docs

npm run ship -- "feat(performance): Phase 5W — hub readiness gate + batch UAT wrap" -- \
  supabase/migrations/20260709120000_incentive_platform_phase5w.sql \
  src/pages/PerformanceCommandCenter.tsx \
  src/pages/PerformanceHowItWorks.tsx \
  docs/INCENTIVE_PHASE5W_DEPLOY.md \
  docs/INCENTIVE_PHASE5_BATCH_UAT.md \
  scripts/ship.sh
```

Then: **Supabase SQL editor** → run migration → **Lovable Sync + Publish** → run batch UAT doc.
