# Sprint 5 Complete — Strategic Wallets & Restricted Builder

**Date:** 10 June 2026  
**Depends on:** Sprints 0–4 + fix migrations 50000/51000 applied

## Delivered

| Item | Location |
|------|----------|
| `wallet_spend_order` enum + `wallet_settings.spend_order` | `20260610352000_sprint5_strategic_wallets.sql` |
| `approved_offer_types` + seed (waiver/scholarship admin-only) | same |
| `fn_wallet_scope_matches` | same |
| `fn_pick_discount_wallet` (spend order + scope) | same |
| `fn_counselor_can_use_offer_type` | same |
| `fn_counselor_wallets_for_period` | same |
| Scope guard on `trg_wallet_allocation_apply` | same |
| `fn_apply_offer_discount` + `_wallet_id` param | same |
| Give Discount: multi-wallet picker, scope labels, offer type filter | `src/pages/GiveDiscount.tsx` |
| Wallet Top-ups: spend order policy + strategic wallet cards | `src/pages/WalletTopups.tsx` |
| Scope helpers + Vitest | `src/lib/walletScope.ts`, `walletScopeLogic.test.ts` |

## Behaviour

1. **Scope enforcement** — Scoped/festive wallets debit only when client/lead country + services match wallet tags.
2. **Spend order** — `strategic_first` (default) debits matching strategic wallet before personal month-to-month.
3. **Offer types** — Counsellors cannot apply waiver/scholarship offers via Give Discount; admins/managers can.
4. **Parallel mode** — Counsellor picks wallet from dropdown when multiple wallets match.

## Admin workflow

1. Create **scoped** wallet in Wallet Top-ups (country/category/service tags).
2. Fund via top-up or auto-fund (festive/scoped are manual top-up today).
3. Set **Spend order** in Wallet policy (default: strategic first).
4. Counsellor applies discount — system picks eligible wallet or shows picker.

## Deploy

Apply `20260610352000_sprint5_strategic_wallets.sql` in Lovable SQL editor.

## UAT (Sprint 5)

1. Create scoped wallet: Germany + coaching for Sneha.
2. Apply discount to Germany coaching client → debits scoped wallet.
3. Apply to Canada client → uses personal wallet only.
4. Set spend order **personal first** → personal debited even when scoped matches.
5. Publish waiver offer → counsellor cannot select it in Give Discount.

## Next: Sprint 6

Promotion Requests, Calendar & Approvals — field input queue + MarCom planning calendar.
