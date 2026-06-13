# Performance Hub — Phase 5J Deploy

## Phase 5J deliverables

| # | Feature | Surface |
|---|---------|---------|
| 5J.1 | Admin unlock locked run | `/incentives/admin` — Unlock button + audit log |
| 5J.2 | Admin void run | `/incentives/admin` — Void button (clears line items) |
| 5J.3 | Next-month wallet preview (X4) | `fn_preview_next_period_wallets` — Period Close + Command Center |
| 5J.4 | Command center snapshot | `fn_period_command_center` — close status + preview totals |

## Migration

**`20260627120000_incentive_platform_phase5j.sql`**

- `fn_can_admin_incentive_runs()` — admin/administrator only
- `incentive_run_admin_actions` — audit table
- `fn_admin_unlock_incentive_run(run_id, reason)` — blocks if payouts approved/paid
- `fn_admin_void_incentive_run(run_id, reason)` — blocks if any payouts exist
- `fn_preview_next_period_wallets(period_key)` — read-only X4 preview
- `fn_period_command_center(period_key, branch_name)` — KPI snapshot

## Access

Unlock/void buttons visible only to **admin** / **administrator** roles.

## UAT (batch at end of all phases)

1. **Unlock** — lock a run with no payouts → Unlock with reason → Calculate & save enabled again.
2. **Unlock blocked** — generate payouts and approve → Unlock returns error.
3. **Void** — void unlocked/calculated run with no payouts → status `void`, line items cleared.
4. **Preview** — Period Close shows next-month potential table before Close & reseed.
5. **Command center** — banner shows open/closed wallet count + next period total potential.

## Not in 5J

- Wallet policy CRUD editor (still read-only + sizing button)
- Automation journeys (O7)
- Offer Influence Revenue (O10)
