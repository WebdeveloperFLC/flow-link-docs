# Performance Hub — Phase 5E Deploy

Deploy: **GitHub → Lovable → Publish** (migration + edge function redeploy)

## Phase 5E deliverables

| # | Feature | Surface |
|---|---------|---------|
| 5E.1 | Period lock readiness RPC | `fn_period_lock_readiness` |
| 5E.2 | Lock gate on edge function | `incentive-calculate-run` action=`lock` |
| 5E.3 | Shared period + branch bar | `PerformancePeriodContext` + `PerformancePeriodBar` |
| 5E.4 | UI lock guards | Runs admin + command center banners |
| 5E.5 | Director read-only executive view | `/performance/executive` for `viewer` role |

## Migration

Apply on Lovable publish:

**`20260622120000_incentive_platform_phase5e.sql`**

Creates:

- `fn_period_lock_readiness(_period_key)` — returns `can_lock`, queue counts, and `blockers[]`

**Blocks lock when:**

- Unclassified payments remain for the period
- Discount approval requests are still `pending`

Promotion requests are reported in the payload but do **not** block lock (MarCom workflow is separate).

## Edge function

Redeploy **`incentive-calculate-run`** — lock path calls `fn_period_lock_readiness` and returns **409** with blocker messages when queues are open.

## UI

| Route | Change |
|-------|--------|
| `/incentives/admin` | Shared period/branch bar; disable Calculate when locked; disable Lock when queues open |
| `/performance/admin` | Shared period/branch bar; lock-readiness banner + workflow hints |
| `/performance/executive` | Shared period/branch bar; `viewer` role read-only access |

Period + branch persist in `localStorage` (`flc-performance-period-v1`) across Performance Hub admin screens.

## Depends on

- Phase 5C (`fn_unclassified_payment_count`, `discount_approval_requests`)
- Phase 5D deployed
- Prior run-lock fixes (duplicate run handling)

## UAT checklist

1. **Queues block lock** — leave unclassified payments or pending discount approvals → Approve & lock disabled with banner + links.
2. **Edge enforcement** — bypass UI (or stale tab) → lock returns clear 409 message.
3. **Period bar sync** — change period on command center → open Runs admin → same period/branch pre-filled.
4. **Already locked run** — Calculate & save stays disabled with R2 message (from prior fix).
5. **Executive viewer** — user with `viewer` role sees executive dashboard read-only; command center still admin-only.

## Not in 5E

- Enrolment / stage_change event emitters (5F)
- Offers studio wizard (5G)
- AI suggestion layer (5H)
- Admin unlock / void locked run

## YOUR ACTION

```bash
git add supabase/migrations/20260622120000_incentive_platform_phase5e.sql \
  supabase/functions/incentive-calculate-run/index.ts \
  src/contexts/PerformancePeriodContext.tsx \
  src/components/performance/PerformancePeriodBar.tsx \
  src/hooks/usePerformanceLockReadiness.ts \
  src/pages/IncentivesAdmin.tsx \
  src/pages/PerformanceCommandCenter.tsx \
  src/pages/PerformanceExecutive.tsx \
  src/components/layout/AppLayout.tsx \
  src/App.tsx \
  docs/INCENTIVE_PHASE5E_DEPLOY.md
git commit -m "feat(performance): Phase 5E — period lock gates, shared period bar, executive read-only"
git push origin HEAD
# Lovable → Publish (migration: 20260622120000_incentive_platform_phase5e.sql + edge function)
```
