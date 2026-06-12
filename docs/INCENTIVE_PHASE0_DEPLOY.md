# Incentive Platform — Phase 0 Deploy Checklist

Deploy path: **local repo → GitHub → Lovable → Supabase (Lovable admin)**.

## What Phase 0 includes

| Area | Change |
|------|--------|
| **DB migration** | `20260618120000_incentive_platform_phase0.sql` — FX buffer columns, closing counselor attribution, plan versions, qualifying events ledger, clawback on refund |
| **Edge function** | `incentive-calculate-run` — closer-wins, FX snapshot, branch filter, allied/B2B channel slabs, target bonuses, discount penalty |
| **Frontend** | My Incentives (period-scoped earned + forecast), Incentive Plans (branch scope), FX Rates admin, Incentives Admin (branch dropdown) |
| **Libs + tests** | `src/lib/fxPolicy.ts`, `src/incentives/lib/incentiveEngineLogic.ts` (11 vitest tests) |

## After Lovable publish — smoke test (admin)

1. **FX Rates** — `/incentives/fx-rates` — add CAD rate for current month; confirm effective = base + 2.
2. **Incentive Plans** — create org-wide plan with a service_revenue slab; optional branch-scoped plan.
3. **Incentives Admin** — Preview run for current period; then Calculate & save; verify line items in DB.
4. **My Incentives** — log in as counselor; confirm earned matches locked run for period.
5. **Closer attribution** — record a verified payment on a client; confirm `closing_counselor_id` is set.

## After Lovable publish — smoke test (counselor)

1. Open **My Incentives** — period total and projected month-end visible.
2. Confirm no errors when no runs exist yet (empty state OK).

## Known V1 limits (Phase 1+)

- No payout desk / adjustments UI yet
- No multi-payee splits (freelancer + counselor separate rows)
- No rule builder UI — slabs configured in Incentive Plans
- Types in `src/integrations/supabase/types.ts` may need Lovable regen after migration

## Rollback

If migration fails on Lovable, do not re-run partial SQL manually without DBA review. Revert GitHub commit and republish previous Lovable version.
