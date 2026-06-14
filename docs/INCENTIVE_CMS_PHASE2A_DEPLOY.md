# CMS Phase 2A — Deploy (Counselor dashboard UI)

## Shipped (agent)

| Screen | Change |
|--------|--------|
| `/performance` | CMS counselor dashboard — 4 KPI strip, wallet allocation card with utilization bar, incentive progress card |
| Prototype ref | `04_Screenshots/02a_Dashboard_Counselor.png` |
| Data | Reuses `usePerformanceHomeData` + existing RPCs — no schema change |
| E2E hooks | `data-testid="kpi-revenue"`, `kpi-incentive-earned`, `kpi-wallet-spendable`; executive `kpi-wallet-unlocked` |

**No migration.**

---

## YOUR ACTION

### Lovable → Sync from GitHub → Publish

UI-only — **no SQL**.

### Verify (optional)

Login **`ph.counselor1@flowlink.demo`** → `/performance`:

- 4 KPI cards across the top
- Wallet card shows spendable amount + utilization bar
- Incentive progress shows target bar + earned breakdown
- Period bar visible below header

---

*Next: Phase 2B — Discount Wallets list (`05_Discount_Wallets.png`)*
