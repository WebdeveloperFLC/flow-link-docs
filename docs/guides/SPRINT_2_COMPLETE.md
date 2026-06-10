# Sprint 2 Complete — Wallet Sizing Wiring

**Date:** 10 June 2026  
**Depends on:** Sprint 0 + Sprint 1 migrations applied

## Delivered

| Item | Location |
|------|----------|
| Sizing columns on `discount_wallets` | `20260610320000_sprint2_wallet_sizing.sql` |
| `wallet_multiplier_bands` + seed bands | same |
| `wallet_settings.target_base_pct`, `unlock_threshold_pct` | same |
| Seed `wallet_topup_rules` (when empty) | same |
| `fn_size_wallet`, `fn_sync_wallet_metrics` | same |
| `fn_auto_fund_wallet`, `fn_auto_fund_wallets_for_period` | same |
| `fn_size_wallets_for_period` | same |
| Wallet Top-ups UI: sizing table + recalculate + auto-fund | `src/pages/WalletTopups.tsx` |
| Counsellor view: unlocked / potential / achievement | `src/pages/MyIncentives.tsx` |
| Types updated | `src/integrations/supabase/types.ts` |

## Sizing logic

1. **Target** — `incentive_targets.target_value` for wallet period + counsellor.
2. **Prior achievement** — `fn_counselor_period_achievement(prior_month)`.
3. **Base wallet** — matching `wallet_topup_rules.topup_amount`, or `target × target_base_pct%` fallback (default 5%).
4. **Multiplier** — from `wallet_multiplier_bands` by prior achievement.
5. **Potential** — `base × multiplier`.
6. **Unlocked** — proportional to *current* achievement above `unlock_threshold_pct` (default 50%); full enforcement on spend in Sprint 3.

## Admin workflow

1. Set `incentive_targets` for the period.
2. Create month-to-month wallets (or use existing).
3. **Recalculate all** — runs `fn_size_wallets_for_period`.
4. **Auto-fund all** — sizes + tops up each wallet to `base_wallet` via `wallet_topups`.

## Deploy

Apply `20260610320000_sprint2_wallet_sizing.sql` on Supabase.

## Finance sign-off still needed

Default bands and rule amounts are **proposed seeds** — adjust in DB or future admin UI before go-live.

## Next: Sprint 3

- `fn_apply_offer_discount` with unlock + funding-aware debit
- Give Discount unlock bar + approved offer picker
