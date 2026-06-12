# Incentive Platform — Phase 4 Deploy

Deploy: **GitHub → Lovable → Publish** + migration `20260618150000_incentive_platform_phase4.sql`

## Phase 4 deliverables

| # | Feature | Where |
|---|---------|--------|
| 4.1 | What-if simulator | **Incentives → Simulator** |
| 4.2 | Auto-suggest targets | **Incentive Plans → Targets** → Suggest targets |
| 4.3 | Finance CSV export + AP bill ID | **Payout Desk** |
| 4.4 | Role-based plans | **Incentive Plans → Create plan** → Role-specific |
| 4.5 | Purpose-specific FX rates | **FX Rates** → Purpose column |

## What-if simulator

1. **Incentives → Simulator**
2. Pick plan, optional branch, period A (and optional period B to compare)
3. **Run simulation** — preview only, nothing saved
4. Compare totals and per-counselor delta

## Auto-suggest targets

1. **Incentive Plans → Targets**
2. Enter target period (e.g. `2026-06`)
3. Optional source period (defaults to prior month)
4. Set growth % (default 10%)
5. **Suggest targets** — bulk inserts from `incentive_qualifying_events` totals

Requires qualifying events in the source period (verified payments from Phase 0 trigger).

## Finance export

1. **Payout Desk → Finance export**
2. Optional run ID filter → **Download CSV**
3. After AP upload, paste **AP bill ID** on each payout row

RPC: `fn_incentive_payout_export(run_id, period_key)`

## Role-based plans

1. **Incentive Plans → Create plan → Scope: Role-specific**
2. Pick role (`counselor`, `telecaller`, `documentation`, etc.)
3. Calculate run — only counselors with that `user_roles` entry earn

## FX purposes

1. **FX Rates → Purpose** when adding a rate:
   - `billing` — client invoices
   - `incentive_settlement` — run calculation (engine default)
   - `payout` — counselor payout conversion
   - `general` — fallback for all uses

Engine prefers purpose-specific rate, then falls back to `general`.

## Depends on

- Phase 0–3 migrations
- Edge function `incentive-calculate-run` (role filter + FX purpose)

## Edge function

Republish via Lovable publish (same bundle as UI). No separate deploy step if already publishing from repo.
