# CMS Phase 2P — Deploy (§5.5 payout threshold columns)

## Shipped (agent)

| Item | Change |
|------|--------|
| Migration | `20260718120004_incentive_cms_phase2p_payout_threshold.sql` |
| Columns | `incentive_plans.min_payout_threshold`, `incentive_plans.carry_below_threshold` |
| `/incentives/plans` | Per-plan threshold editor on active plan |
| `/incentives/payouts` | Skips sub-threshold rows when carry enabled |
| `/performance/incentives/payouts` | Config panel shows per-plan thresholds |
| Logic | `incentivePayoutThresholdLogic.ts` + tests |

---

## YOUR ACTION

### Lovable → Sync from GitHub → Publish

Approve migration:

- [ ] `20260718120004_incentive_cms_phase2p_payout_threshold.sql`

### Verify (optional)

| Step | Route | Expect |
|------|-------|--------|
| Set threshold | `/incentives/plans` | Save min ₹50,000 + carry on active plan |
| CMS view | `/performance/incentives/payouts` | Config panel lists plan threshold |
| Payout desk | `/incentives/payouts` | Generate from locked run — below-threshold counselors skipped with carry message |

---

*Next: Commission tracking CMS (`13_Commission_Tracking.png`) at `/performance/commissions`.*
