# Performance Hub — Phase 5S Deploy

## Phase 5S deliverables (margin floor O16)

| # | Feature | Surface |
|---|---------|---------|
| 5S.1 | Margin floor policy | `discount_margin_floor_policies` — default min net 80% of invoice base |
| 5S.2 | Floor evaluation RPC | `fn_evaluate_discount_margin` — preview net, below_floor, waiver, approval level |
| 5S.3 | Submit guard | `fn_submit_discount_request` — escalates below-floor to admin; blocks counselor waivers |
| 5S.4 | Give discount UI | Invoice base field + live margin preview on `/performance/give-discount` |
| 5S.5 | Approvals UI | Depth matrix + floor/waiver badges + admin policy editor on `/performance/approvals` |

## Migration

**`20260705120000_incentive_platform_phase5s.sql`**

- `discount_margin_floor_policies`
- Extends `discount_approval_requests` with `reference_amount`, `net_after_discount`, `below_floor`, `is_waiver`
- `fn_get_discount_margin_floor_policy`, `fn_set_discount_margin_floor_policy`
- `fn_evaluate_discount_margin`
- Updated `fn_discount_approval_level` (floor + waiver escalation)
- Updated `fn_submit_discount_request` (+ `_reference_amount`)

## Edge functions

No edge function changes in 5S.

## UAT

1. **Give discount** — Enter invoice base ₹20,000, discount ₹5,000 (25%) → preview shows below floor if min net 80% → submits to admin queue.
2. **Instant path** — ₹20,000 base, ₹1,500 discount (7.5%) → instant apply when within wallet.
3. **Waiver block** — Counselor: discount = full invoice base → submit blocked. Admin: can submit.
4. **Approvals** — Pending request shows Below floor / Waiver badges and invoice base · net line.
5. **Policy** — Admin changes min net % on Approvals page → preview updates on Give discount.

## Post–5S (not in scope)

ML propensity (I5), WebSocket I8 ticker, per-service floor overrides, multi-variant A/B.

## YOUR ACTION

```bash
cd /Users/santoshramrakhiani/Downloads/REPOSITORY/flow-link-docs

npm run ship -- "feat(performance): Phase 5S — margin floor O16" -- \
  supabase/migrations/20260705120000_incentive_platform_phase5s.sql \
  src/pages/GiveDiscount.tsx \
  src/pages/PerformanceApprovals.tsx \
  docs/INCENTIVE_PHASE5S_DEPLOY.md \
  scripts/ship.sh
```

Then: **Supabase SQL editor** → run migration → **Lovable Sync + Publish**.
