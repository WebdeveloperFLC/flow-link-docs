# CMS Phase 2N — Deploy (Incentive plans CMS UI)

## Shipped (agent)

| Item | Change |
|------|--------|
| `/performance/incentives/plans` | Incentive management CMS workspace |
| Prototype ref | `04_Screenshots/11_Incentive_Plans.png` |
| Table | Plans with basis, rule summary, applies-to, YTD payout |
| KPI strip | Total payout YTD, active plans, staff earning, avg/head |
| Panels | Structure builder chips, base config, client-type rules |
| Data | `incentive_plans`, `incentive_slabs`, `incentive_runs`, assignments |
| Editor link | Full slabs/targets editor remains at `/incentives/plans` |

**No migration.**

---

## YOUR ACTION

### Lovable → Sync from GitHub → Publish

UI-only — **no SQL**.

### Verify (optional)

| Login | Route | Expect |
|-------|-------|--------|
| Admin | `/performance/incentives/plans` | KPI strip + plans table |
| Full editor link | `/incentives/plans` | Slabs, targets, assignments tabs |
| Nav | Performance Hub | Incentive plans (admin) |

---

*Next: Incentive ledger & payouts CMS (`12`) or §5.5 threshold payout columns.*
