# CMS Phase 2O — Deploy (Incentive ledger & payouts CMS UI)

## Shipped (agent)

| Item | Change |
|------|--------|
| `/performance/incentives/payouts` | Incentive ledger & payouts CMS workspace |
| Prototype ref | `04_Screenshots/12_Incentive_Ledger_Payouts.png` |
| KPI strip | Earned, approved, eligible, paid, clawback |
| Ledger table | Per-counselor lifecycle from line items, payouts, adjustments |
| Panels | Payout cycle config (from plan period types), liability forecast |
| Data | `incentive_line_items`, `incentive_payouts`, `incentive_adjustments`, `incentive_runs`, `incentive_plans` |
| Operations link | Generate / export / approve remains at `/incentives/payouts` |

**No migration.** §5.5 threshold columns (`min_payout_threshold`, `carry_below_threshold`) remain a follow-up.

---

## YOUR ACTION

### Lovable → Sync from GitHub → Publish

UI-only — **no SQL**.

### Verify (optional)

| Login | Route | Expect |
|-------|-------|--------|
| Admin | `/performance/incentives/payouts` | KPI strip + employee ledger table |
| Forecast panel | Same page | Bars from locked runs + liability rows |
| Payout desk link | `/incentives/payouts` | Generate, approve, CSV export |
| Nav | Performance Hub | Ledger & payouts (admin) |

---

*Next: §5.5 threshold payout columns, commission tracking CMS (`13`), or remaining prototype screens.*
