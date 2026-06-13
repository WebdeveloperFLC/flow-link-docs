# Performance Hub — Phase 5P Deploy

## Phase 5P deliverables (I4 split attribution · I7 multi-plan stacking)

| # | Feature | Surface |
|---|---------|---------|
| 5P.1 | Split attribution (I4) | `/incentives/plans` → **Attribution splits** — 50/50 (or custom) per client |
| 5P.2 | Multi-plan stacking (I7) | Same page → **Plan stacking** — assign base + overlay plans per counselor/period |
| 5P.3 | Plan stack role | Create plan → **Stack role** base vs overlay |
| 5P.4 | Rule stacking modes | Rules tab → additive / exclusive / cap per rule |
| 5P.5 | Engine | `incentive-calculate-run` — splits revenue, filters by assignments, applies rule stacking |
| 5P.6 | Counselor home | `/performance` — stacked plan earnings when assignments exist |

## Migration

**`20260702120000_incentive_platform_phase5p.sql`**

- `incentive_attribution_splits` + `fn_set_client_attribution_splits`, `fn_clear_client_attribution_splits`, `fn_resolve_client_incentive_attribution`
- `incentive_plans.plan_stack_role` (`base` \| `overlay`)
- `incentive_counselor_plan_assignments` + assignment RPCs
- `fn_counselor_plan_stack_summary` for counselor home

## Edge function

**`incentive-calculate-run`** — redeploy after ship (Lovable Publish).

## UAT

1. **I4** — Plans → Attribution splits → find client → set Counselor A 50% / B 50% → calculate run → both counselors get half revenue on that client&apos;s payments.
2. **I7** — Create overlay plan → Plan stacking → assign counselor to base + overlay → calculate both runs → Performance home shows stack total.
3. **Stacking** — Two exclusive rules on same plan → only highest rule pays; cap rule respects `cap_amount`.
4. **Clear split** — Clear split on client → next run uses closer-wins again.

## Post–5P (not in scope)

Cross-sell journey templates, counselor suggestion card (O13), real-time earning ticker (I8).

## YOUR ACTION

```bash
cd /Users/santoshramrakhiani/Downloads/REPOSITORY/flow-link-docs

npm run ship -- "feat(performance): Phase 5P — split attribution I4 + multi-plan stacking I7" -- \
  supabase/migrations/20260702120000_incentive_platform_phase5p.sql \
  supabase/functions/incentive-calculate-run/index.ts \
  src/incentives/lib/incentiveEngineLogic.ts \
  src/incentives/lib/incentiveEngineLogic.test.ts \
  src/incentives/components/IncentiveAttributionSplitsTab.tsx \
  src/incentives/components/IncentivePlanAssignmentsTab.tsx \
  src/incentives/components/IncentiveRulesTab.tsx \
  src/pages/IncentivePlans.tsx \
  src/hooks/usePerformanceHomeData.ts \
  src/pages/PerformanceHome.tsx \
  docs/INCENTIVE_PHASE5P_DEPLOY.md \
  scripts/ship.sh
```

Then: **Supabase SQL editor** → run migration file → **Lovable Sync + Publish** → redeploy `incentive-calculate-run`.
