# CMS Phase 3Y — Deploy (Prototype modals 23, 25–27)

## Shipped (agent)

| Item | Change |
|------|--------|
| Modal 23 — Wallet detail | `PerformanceWalletDetailDialog` on `/performance/wallets` (Detail row action) |
| Modal 24 — Client invoice lock | Already live as `PerformanceClientCommercialDetail` on client commercials (no change) |
| Modal 25 — New wallet | `PerformanceNewWalletDialog` on `/performance/wallets` (admin New wallet) |
| Modal 26 — New offer code | `PerformanceNewOfferCodeDialog` on `/performance/offers/codes` |
| Modal 27 — Run payout | `PerformanceRunPayoutDialog` on `/performance/incentives/ledger` |
| Logic | `walletDetailModalLogic.ts`, `payoutRunModalLogic.ts` + unit tests |

**No migration.**

## Prototype coverage

Modals **23, 25, 26, 27** from `04_Screenshots/00_INDEX.md` are wired in Performance Hub. Next: mobile polish **28–29**.

## Guardrail (PH-R-020)

Runs automatically when shipping Performance Hub pages/components.

---

## YOUR ACTION

### Lovable → Sync from GitHub → Publish

UI-only — **no SQL**.

### Verify (optional)

| Login | Route | Action | Expect |
|-------|-------|--------|--------|
| Admin | `/performance/wallets` | Detail on a row | Wallet detail modal (allocation, rules, lifecycle) |
| Admin | `/performance/wallets` | New wallet | Create-wallet dialog (links to wallet admin desk) |
| Manager | `/performance/offers/codes` | New code | Generate counselor tracking code dialog |
| Finance | `/performance/incentives/ledger` | Run payout cycle | Preview modal → Open payout desk |
| Counselor | `/performance/wallets` | Detail | Read-only wallet detail |

---

*Phase 3Y completes CMS modal wiring. Batch UAT on Lovable when migrations are approved.*
