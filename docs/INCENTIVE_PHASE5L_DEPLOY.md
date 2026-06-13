# Performance Hub — Phase 5L Deploy

## Phase 5L deliverables (review-ready closure)

| # | Feature | Surface |
|---|---------|---------|
| 5L.1 | Offer influence revenue (O10) | `/performance/offers/analytics` — direct / assisted / multi-service breakdown |
| 5L.2 | Wallet impact analytics | Same page — per-counselor ROI from `counselor_performance_scores` |
| 5L.3 | Branch pooled wallet (W2) | `/performance/wallet/branch-pool` — fund (admin), allocate to counselors |
| 5L.4 | Contest prize settlement (X6) | `/incentives/competitions` — `cash` vs `wallet_topup` on create |
| 5L.5 | Contest wallet prizes on calculate | `incentive-calculate-run` — `wallet_topups` with `contest_prize` |
| 5L.6 | How-it-works wiring map | `/performance/how-it-works` — static money-rail guide |

## Migrations (apply **both**, in order)

1. **`20260629120000_incentive_platform_phase5l.sql`**
   - `wallet_budget_kind` enum value `branch_pool`
   - `incentive_branch_contests.prize_settlement` (`cash` | `wallet_topup`)

2. **`20260629120001_incentive_platform_phase5l_branch_pool.sql`**
   - Branch pool wallets + `branch_pool_allocations`
   - `fn_get_or_create_branch_pool_wallet`, `fn_allocate_from_branch_pool`
   - `fn_offer_influence_breakdown(date, date)`
   - `fn_wallet_impact_summary(period_key)`

## Edge function

**`incentive-calculate-run`** — when contest `prize_settlement = wallet_topup`, preview returns `contest_wallet_topups`; calculate inserts top-ups instead of cash incentive lines.

## Access

| Action | Who |
|--------|-----|
| View offer influence / wallet impact | Manager, admin, offers_analytics permission |
| Branch pool allocate | Branch manager (same branch) or admin |
| Fund branch pool | Admin (manual top-up on pool wallet) |
| Set contest prize settlement | Admin (competitions page) |

## UAT (batch — module review-ready after 5L publish)

1. **O10** — Offer analytics → influence cards show direct / assisted / multi-service totals for selected range.
2. **Wallet impact** — table lists counselors with ROI for current period.
3. **Branch pool** — admin funds pool → manager allocates ₹X to counselor → pool balance drops, counselor wallet increases.
4. **Contest cash** — create contest with cash settlement → calculate run → incentive line for winning counselors.
5. **Contest wallet** — create contest with wallet top-up → preview shows `contest_wallet_topups` → calculate credits wallets.
6. **How-it-works** — page loads with links to key routes.

## Performance Hub Phase 5 status

Phases **5C–5L** complete the planned Performance Hub slice. Remaining items from the implementation map (schemes library I3, automation journeys O7, dispute threads I6, etc.) are **post–5L** unless explicitly scoped.
