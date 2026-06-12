# Performance Hub — Phase 5B Deploy

Deploy: **GitHub → Lovable → Publish** (no migration)

## Phase 5B deliverables

| # | Feature | Route |
|---|---------|--------|
| 5B.1 | Command center KPI tiles + money rail | `/performance/admin` |
| 5B.2 | Executive dashboard (firm-wide) | `/performance/executive` |
| 5B.3 | Branch team dashboard | `/performance/team` |
| 5B.4 | Give discount — hub route + unlock UI | `/performance/give-discount` (alias `/incentives/give-discount`) |
| 5B.5 | Wallet policy (read bands/rules + apply sizing) | `/performance/wallet/policy` |
| 5B.6 | Client promotions strip | Client record |
| 5B.7 | Period close — Apply sizing rules button | `/incentives/period-close` |

## Depends on

- Phase 5A deployed
- Incentive Phases 0–4 + wallet sizing RPCs (`fn_size_wallets_for_period`, achievement RPCs)

## UAT checklist

1. **Command center** — 6 KPI tiles + money flow rail populate for current period.
2. **Executive** — admin sees branch comparison + all-team table; links to command center.
3. **Team** — branch manager sees branch-scoped team table; admin sees all.
4. **Give discount** — metric row (spendable/unlocked/potential/spent); red bar + blocked submit when over unlocked; `?client=` pre-selects client from promotions strip.
5. **Client record** — Promotions strip with headroom + Give discount link + suggestion placeholder.
6. **Wallet policy** — bands/rules visible; Apply sizing runs without error.
7. **Period close** — Apply sizing rules button next to Close & reseed.

## Next (5C — not in this deploy)

- Unclassified payments queue
- Approval depth-matrix queue on Give Discount submit
- Promotion request workflow
- Live suggestion card (L0 rules engine)

## YOUR ACTION

```bash
git add src/hooks/usePerformancePeriodMetrics.ts src/hooks/usePerformanceTeamRows.ts \
  src/components/performance/PerformanceMoneyRail.tsx \
  src/components/clients/ClientPromotionsStrip.tsx \
  src/pages/PerformanceCommandCenter.tsx src/pages/PerformanceExecutive.tsx \
  src/pages/PerformanceTeam.tsx src/pages/PerformanceWalletPolicy.tsx \
  src/pages/GiveDiscount.tsx src/pages/PerformanceHome.tsx src/pages/PeriodClose.tsx \
  src/pages/ClientDetail.tsx src/App.tsx src/components/layout/AppLayout.tsx \
  docs/INCENTIVE_PHASE5B_DEPLOY.md
git commit -m "feat(performance): Phase 5B — KPIs, executive/team, give discount wiring, client strip"
git push origin HEAD
# Lovable → Publish (no migration)
```
