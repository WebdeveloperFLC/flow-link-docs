# Performance Hub — Phase 5N Deploy

## Phase 5N deliverables (wallet policy W4 · W5 · W6)

| # | Feature | Surface |
|---|---------|---------|
| 5N.1 | No-full-burn (W4) | `/performance/wallet/policy` — week-1 spend cap; enforced on allocation trigger |
| 5N.2 | Stepped unlock bands (W5) | Same page — `wallet_unlock_bands` CRUD; replaces linear unlock when enabled |
| 5N.3 | Unspent unlock at close (W6) | Same page — forfeit policy; `fn_close_wallet` logs forfeited unlock |
| 5N.4 | Give Discount spend limits | `/performance/give-discount` — shows W4 week-1 cap via `fn_wallet_spend_limits` |

## Migration

**`20260631120000_incentive_platform_phase5n.sql`**

- `wallet_settings`: `no_full_burn_enabled`, `no_full_burn_week1_max_pct`, `use_stepped_unlock_bands`, `unspent_unlock_close_policy`
- `wallet_unlock_bands` table (seeded 0/30/60/100% bands)
- `discount_wallets.forfeited_unlock_amount`
- Updated `fn_sync_wallet_metrics`, `trg_wallet_allocation_apply`, `fn_close_wallet`
- New `fn_wallet_spend_limits`, `fn_wallet_unlock_from_bands`

## UAT

1. **W5** — Policy → enable stepped bands → sync wallet → verify unlock matches band (e.g. 25% achievement → 0% unlock with default seed).
2. **W4** — Enable no-full-burn 40% → in first 7 days of month, try discount exceeding 40% of unlocked → blocked.
3. **W6** — Set forfeit policy → period close wallet with unused unlock → `forfeited_unlock_amount` + ledger `unlock_forfeit`.
4. **Give Discount** — Week 1 banner shows when W4 active.

## Post–5N (not in scope)

Split attribution (I4), multi-plan stacking (I7), automation journeys (O7).
